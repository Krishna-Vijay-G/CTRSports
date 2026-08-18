/**
 * Browser-side: every file the admin uploads, by one route.
 *
 * ── Why nothing goes through a server any more ────────────────────────────
 *
 * There were two paths. A picture was POSTed to `/api/admin/upload` as form
 * data, which read the whole thing into a serverless function; a video was sent
 * straight to S3 by a signed PUT, because the platform refuses a request body
 * over about four and a half megabytes and no video fits under that.
 *
 * The picture path carried that same limit, and a four-megabyte ceiling sat in
 * front of it — checked against the file AS PICKED, before the WebP conversion
 * that would have taken a twelve-megabyte phone photograph down to a few
 * hundred kilobytes. So the commonest file anybody has was refused for being
 * too big to send, having never been made small.
 *
 * Both are gone. Everything signs and PUTs, which removes the ceiling rather
 * than raising it: the limit was in front of the function, where no constant
 * could reach it, and now there is no function in the way. The conversion still
 * happens — it is what keeps the site fast — but it is an optimisation now
 * rather than the thing standing between an upload and a 413.
 *
 * ── What each kind gets ───────────────────────────────────────────────────
 *
 *   a picture   converted to WebP here and capped at `maxEdge`, then PUT.
 *               SVG passes through untouched; so does anything the browser
 *               could not decode, which now costs an upload nothing.
 *   a video     PUT as it is — there is no transcoder here — with a frame
 *               captured beside it so a slot shows a still rather than black.
 *
 * ── Progress ──────────────────────────────────────────────────────────────
 *
 * `onProgress` is called with null while the file is being prepared (decoding,
 * re-encoding, seeking a video for its poster — all of which can take a second
 * on a large file and report nothing), then with 0–100 as the bytes go out.
 * That distinction is the whole point: a caller can draw a spinning ring for
 * "working" and a filling one for "43% sent", and never claim a percentage it
 * does not have.
 */

import { capturePoster } from "@/lib/client/videoPoster";
import { toWebp } from "@/lib/client/toWebp";
import {
  extensionFor,
  isVideoExtension,
  maxBytesForExtension,
  megabytes,
  unsupportedType,
} from "@/lib/media";

/** null while preparing; 0–100 once bytes are moving. */
export type UploadProgress = (percent: number | null) => void;

export type UploadOptions = {
  /** Where it lands. "" is the media root; the screens pass their own folder. */
  folder: string;
  /** The longest edge a picture is resized to. Ignored for video and SVG. */
  maxEdge?: number;
  onProgress?: UploadProgress;
};

/**
 * Puts one file in the bucket and hands back its public URL.
 *
 * Throws with the server's own sentence when it refuses — the type it will not
 * take, the folder this account may not write to — so a caller can show what
 * was actually wrong instead of "upload failed".
 */
export async function uploadMedia(file: File, options: UploadOptions): Promise<string> {
  const { folder, maxEdge, onProgress } = options;

  /*
   * The one thing still worth refusing before any work is done: a file no route
   * would accept. Resolved to an EXTENSION rather than checked as a MIME type,
   * because the browser frequently has no MIME type to offer — Windows reports
   * nothing at all for a `.mkv` — and the routes resolve it exactly the same
   * way, so what is refused here is what would have been refused there.
   *
   * Size is not checked against a picture at all; see src/lib/media.ts.
   */
  const extension = extensionFor(file.type, file.name);
  if (!extension) throw new Error(unsupportedType(file.type, file.name));

  const cap = maxBytesForExtension(extension);
  if (file.size > cap) throw new Error(`That file is larger than ${megabytes(cap)}.`);

  onProgress?.(null);

  const video = isVideoExtension(extension);

  /*
   * The poster is captured FIRST, while nothing is uploading: it needs the file
   * decoded, and doing that mid-transfer competes for the same decoder. It is
   * allowed to come back null.
   */
  const poster = video ? await capturePoster(file) : null;

  // Video is sent as it is — there is no transcoder here. Everything else goes
  // through `toWebp`, which hands back the original untouched for an SVG or for
  // anything it could not decode, so it is safe to give it a file whose type the
  // browser never managed to name.
  const body = video ? file : await toWebp(file, maxEdge);

  const signed = await fetch("/api/admin/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, name: file.name, type: body.type, size: body.size }),
  });

  const plan = await signed.json().catch(() => ({}));
  if (!signed.ok) throw new Error(plan.error ?? "Upload failed.");

  await put(plan.uploadUrl as string, plan.headers as Record<string, string>, body, onProgress);

  /*
   * Deliberately outside the failure path: the video is already in the bucket,
   * and refusing the whole upload because a placeholder did not stick would be
   * the wrong trade. Without it the video falls back to its own first frame.
   */
  if (poster && plan.poster) {
    try {
      await put(plan.poster.uploadUrl, plan.poster.headers, poster, null);
    } catch {
      // Nothing to say.
    }
  }

  return plan.url as string;
}

/**
 * A PUT with a progress callback.
 *
 * `fetch` cannot report upload progress — there is no way to observe a request
 * body going out, and the streaming-request API that would allow it is not in
 * Safari. `XMLHttpRequest` can, and an upload with no sign of movement reads as
 * a hang, so this one place keeps the older API.
 *
 * The signed headers are echoed back EXACTLY as the route sent them. S3 signs
 * `Content-Type` and `Cache-Control` into the signature, so changing or dropping
 * one is a 403 — that is not a quirk to work around, it is the signature doing
 * its job.
 */
export function put(
  url: string,
  headers: Record<string, string>,
  body: Blob,
  onProgress: UploadProgress | null | undefined
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url, true);

    for (const [name, value] of Object.entries(headers)) request.setRequestHeader(name, value);

    if (onProgress) {
      // A zero straight away, so the ring switches from spinning to filling at
      // the moment the bytes start rather than at the first chunk acknowledged.
      onProgress(0);
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
      };
    }

    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`The storage service refused the upload (${request.status}).`));

    /*
     * An `onerror` here is rarely what it says on the tin.
     *
     * A cross-origin PUT the bucket's CORS rule does not permit is refused by
     * the BROWSER, before anything goes on the wire, and it reports nothing at
     * all: same event, same zero status, same silence as a genuinely dropped
     * connection. There is no way to tell them apart from in here — the failed
     * preflight is not readable from script, by design.
     *
     * So the sentence names the likelier of the two first. "Check your
     * connection" sent somebody to look at their wifi for an hour while the
     * bucket was listing a hostname from a previous deployment.
     *
     * See docs/video.md, "The bucket must allow a cross-origin PUT".
     */
    request.onerror = () =>
      reject(
        new Error(
          "The browser could not reach storage. That is usually the bucket refusing this address rather than the network — its CORS rule has to list the admin's own hostname. See docs/video.md."
        )
      );
    request.ontimeout = () => reject(new Error("The upload timed out."));

    request.send(body);
  });
}
