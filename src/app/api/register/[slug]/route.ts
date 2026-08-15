import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  MAX_FORM_FIELDS,
  MAX_SUBMISSION_BYTES,
  MAX_UPLOAD_MB,
  acceptedTypes,
  dayFor,
  encodeFile,
  formState,
  isTakingEntries,
  stateMessage,
  uploadLimit,
  validateSubmission,
} from "@/lib/forms";
import { isRecord } from "@/lib/normalise";
import {
  countEntries,
  countRecentEntries,
  createEntryWithinCap,
} from "@/lib/server/entriesRepo";
import { getFormBySlug } from "@/lib/server/formsRepo";
import { notifyNewEntry } from "@/lib/server/notify";
import { callerIp, take } from "@/lib/server/rateLimit";
import { checkToken, consumeToken } from "@/lib/server/registerToken";
import { entitySegment } from "@/lib/mediaPaths";
import { ENTRY_PREFIX, deleteObjects, isS3Configured, uploadPrivateObject } from "@/lib/server/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * An entry, from anybody.
 *
 * The first public write in this project. Everything else under /api is behind
 * a session, which is why the shape of this file is unlike the others: there is
 * no guard at the top, so the checks ARE the file.
 *
 * They run cheapest-first, and the order is deliberate — a flood should be
 * turned away by a header test long before it reaches the database:
 *
 *    1  the content type          a wrong one is not a form post
 *    2  the declared size         refused before the body is read at all
 *    3  the body, read bounded    stops at the cap whatever the header claimed
 *    4  the parse                 and a check that it is an object
 *    5  the honeypot              answered with a cheerful lie, and logged
 *    6  the nonce and the clock   see registerToken.ts
 *    7  the form itself           the first database read
 *    8  the answers               against the questions as stored NOW
 *    9  the burst limit           spent on an attempt that will be stored
 *   10  the durable rate limit    a count of what actually landed
 *   11  the insert
 *
 * Step 7 is the one that matters most. The page a visitor is looking at may
 * have been open for an hour and may have been closed since — so what decides
 * whether an entry is accepted is the row read HERE, on this request, never
 * what the page believed when it was drawn.
 *
 * Step 9 sits where it does on purpose. Spending the burst budget before the
 * answers were checked meant a handful of ordinary corrections locked a real
 * person out for ten minutes; a 422 is an expected outcome here, not abuse.
 *
 * The middleware needs no change for this: `publicHost` only turns away
 * /api/admin, so this answers on the public site as intended.
 */

/** Per address, per window, before the database is troubled at all. */
const BURST_LIMIT = 5;
const BURST_WINDOW_MS = 10 * 60 * 1000;

/** And, durably, per form: this many in an hour from one address is not a person. */
const HOURLY_LIMIT = 10;

type Params = { params: Promise<{ slug: string }> };

/**
 * The body, read with a ceiling on it.
 *
 * `request.text()` will happily buffer whatever is sent; this stops at the cap
 * and throws, so a body that lies about its length — or does not declare one at
 * all — cannot be read into memory in full before anybody checks its size.
 */
async function readBounded(request: Request, max: number): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let size = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      throw new Error("too large");
    }

    chunks.push(value);
  }

  return new TextDecoder().decode(
    chunks.reduce((all, chunk) => {
      const joined = new Uint8Array(all.byteLength + chunk.byteLength);
      joined.set(all);
      joined.set(chunk, all.byteLength);
      return joined;
    }, new Uint8Array())
  );
}

/**
 * A submission carrying files, as one multipart body.
 *
 * Uploaded WITH the answers rather than ahead of them, which is the whole
 * design. The alternative — a separate upload endpoint that hands back a token
 * — means objects in the bucket belonging to entries that were never finished:
 * an orphan sweep to write, a quota to enforce separately from the entry cap,
 * and a public endpoint that writes to storage before anybody has said anything
 * worth storing. Here nothing reaches the bucket until the entry is about to,
 * and a rejected submission leaves nothing behind. The cost is that correcting
 * a mistake re-sends the file, which at these sizes is a second.
 *
 * The `values` part is the same JSON the form has always sent; each file rides
 * alongside under its own field id.
 */
async function readMultipart(
  request: Request,
  form: Awaited<ReturnType<typeof getFormBySlug>>
): Promise<{ values: unknown; extras: Record<string, unknown>; uploads: string[] } | { error: string; status: number }> {
  if (!form) return { error: "No such form.", status: 404 };
  if (!isS3Configured()) {
    return { error: "Uploads are not set up on this site yet.", status: 503 };
  }

  const body = await request.formData();

  let values: unknown = {};
  try {
    values = JSON.parse(String(body.get("values") ?? "{}"));
  } catch {
    return { error: "Invalid request body.", status: 400 };
  }

  const answers = isRecord(values) ? { ...values } : {};
  const uploads: string[] = [];

  for (const field of form.fields) {
    if (field.type !== "file") continue;

    const sent = body.get(field.id);
    if (!(sent instanceof File) || sent.size === 0) continue;

    const limit = uploadLimit(field);
    if (sent.size > limit) {
      return {
        error: `“${field.label || "That file"}” is larger than ${Math.round(limit / 1024 / 1024)} MB.`,
        status: 413,
      };
    }

    const allowed = acceptedTypes(field);
    if (!allowed.includes(sent.type)) {
      return {
        error: `“${field.label || "That file"}” is not a kind this form accepts.`,
        status: 415,
      };
    }

    // The extension comes from the type we just checked, never from the name
    // the browser sent — that is a string a stranger chose.
    const extension = sent.type.split("/")[1]?.replace(/[^a-z0-9]/gi, "").slice(0, 8) || "bin";

    /*
     * Named after the form's address rather than its uuid, so a folder of these
     * is legible to whoever has to go and look in the bucket.
     *
     * Still under ENTRY_PREFIX, and that is not negotiable. These are licence
     * scans, indemnity forms and passport photographs belonging to named people.
     * `ctr-sports/media/` is served publicly and immutably; this prefix is a
     * SIBLING of it, written `private, no-store`, never given a public URL, and
     * readable only through an authenticated route that streams it. A folder
     * called `registration` under the media prefix would be a readable name on
     * a public bucket, which is the one change this file must never make.
     *
     * `entitySegment` is borrowed from the media paths purely as a name
     * sanitiser — it is where the "a slug is not always a legal folder name"
     * rule lives, and there is no second copy of it.
     *
     * The address can change and this folder does not follow it, which is
     * deliberate: the key is STORED, in `form_entry_files.s3_key` and in the
     * answer itself, so every read, export and delete already works from the
     * stored string. A renamed form simply starts filling a new folder; nothing
     * written before it moves, and nothing breaks.
     */
    const key = `${ENTRY_PREFIX}${entitySegment(form.slug, form.id)}/${randomUUID()}.${extension}`;

    await uploadPrivateObject(key, Buffer.from(await sent.arrayBuffer()), sent.type);
    uploads.push(key);

    answers[field.id] = encodeFile({
      key,
      // The name is shown to an admin and printed in the export, so it is
      // clamped and stripped of anything that is not a filename.
      name: sent.name.replace(/[\\/\r\n\t]/g, "").slice(0, 120) || "file",
      size: sent.size,
    });
  }

  return {
    values: answers,
    extras: {
      company: body.get("company"),
      nonce: body.get("nonce"),
      issuedAt: body.get("issuedAt"),
      tzOffset: body.get("tzOffset"),
    },
    uploads,
  };
}

export async function POST(request: Request, { params }: Params) {
  const { slug } = await params;

  const type = request.headers.get("content-type") ?? "";
  const multipart = type.startsWith("multipart/form-data");

  if (!multipart && !type.startsWith("application/json")) {
    return NextResponse.json({ error: "Expected JSON." }, { status: 415 });
  }

  if (multipart) return postWithFiles(request, slug);

  const ip = callerIp(request);

  /*
   * The size check reads the BODY, not the header.
   *
   * It used to trust `content-length`, which a chunked request simply does not
   * send and a hostile one can lie about — and `Number("garbage")` is `NaN`, so
   * a nonsense header skipped the check altogether. Either way `request.json()`
   * then buffered whatever arrived. The header is still worth a look, because
   * refusing an announced 50 MB before reading it is cheaper than reading it.
   */
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > MAX_SUBMISSION_BYTES) {
    return NextResponse.json({ error: "That is too much to send at once." }, { status: 413 });
  }

  let raw: string;
  try {
    raw = await readBounded(request, MAX_SUBMISSION_BYTES);
  } catch {
    return NextResponse.json({ error: "That is too much to send at once." }, { status: 413 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // `JSON.parse("null")` succeeds, and reading a property off the result threw
  // before the handler's own try block — so a one-word body was a 500 with a
  // stack trace in the log rather than the 400 it plainly is.
  if (!isRecord(parsed)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const body: Record<string, unknown> = parsed;

  /*
   * Filled in means a machine. Answered as a success, and stored nowhere:
   * telling a bot that it failed is telling it what to fix.
   *
   * Logged, though. `autocomplete="off"` is widely ignored, and a password
   * manager that decides to fill a field called "company" turns this into
   * silent data loss with a cheerful thank-you on top. If that is happening,
   * this line is the only way anyone will find out.
   */
  if (typeof body.company === "string" && body.company.trim() !== "") {
    console.warn("[register] honeypot tripped", { slug, ip });
    return NextResponse.json({ ok: true });
  }

  return complete({ request, slug, ip, body, uploads: [] });
}

/**
 * A submission carrying files.
 *
 * The same pipeline, entered a different way: the body is multipart, so the
 * files are read and stored before anything else can look at the answers. If
 * the submission is then refused for any reason, `complete` removes what was
 * uploaded — nothing is left in the bucket for an entry that does not exist.
 */
async function postWithFiles(request: Request, slug: string) {
  const ip = callerIp(request);

  const declared = Number(request.headers.get("content-length") ?? 0);
  // Room for the answers plus the files a form could ask for. Anything past
  // this is refused before a byte is read.
  const ceiling = MAX_SUBMISSION_BYTES + MAX_FORM_FIELDS * MAX_UPLOAD_MB * 1024 * 1024;
  if (Number.isFinite(declared) && declared > ceiling) {
    return NextResponse.json({ error: "That is too much to send at once." }, { status: 413 });
  }

  let form: Awaited<ReturnType<typeof getFormBySlug>>;
  try {
    form = await getFormBySlug(slug);
  } catch (error) {
    console.error("[register] POST", error);
    return NextResponse.json({ error: "Your entry could not be saved." }, { status: 500 });
  }

  const read = await readMultipart(request, form).catch(() => ({
    error: "That upload could not be read.",
    status: 400 as const,
  }));

  if ("error" in read) {
    return NextResponse.json({ error: read.error }, { status: read.status });
  }

  return complete({
    request,
    slug,
    ip,
    body: { ...read.extras, values: read.values },
    uploads: read.uploads,
  });
}

/**
 * Everything both paths do once the answers are in hand.
 *
 * One function so the two entrances cannot drift: the checks, their order, and
 * what each one answers are written once. `uploads` is what has already reached
 * the bucket, so that a refusal further down can take it back out again.
 */
async function complete({
  request,
  slug,
  ip,
  body,
  uploads,
}: {
  request: Request;
  slug: string;
  ip: string;
  body: Record<string, unknown>;
  uploads: string[];
}) {
  const discard = async () => {
    if (uploads.length === 0) return;
    await deleteObjects(uploads).catch((error) => {
      console.error("[register] could not remove a rejected upload", error);
    });
  };

  const refuse = async (payload: Record<string, unknown>, status: number) => {
    await discard();
    return NextResponse.json(payload, { status });
  };

  const verdict = checkToken(slug, body.nonce, body.issuedAt);
  if (verdict === "too-fast") {
    return refuse({ error: "That was a little too quick — try again." }, 400);
  }
  if (verdict === "stale" || verdict === "bad") {
    return refuse(
      { error: "This page has been open a while. Please reload it and try again." },
      400
    );
  }

  try {
    const form = await getFormBySlug(slug);

    // A draft is not on the internet, and saying "this exists but is a draft"
    // would put it there.
    if (!form || form.status === "draft") {
      return refuse({ error: "No such form." }, 404);
    }

    /*
     * Whether it is taking entries — the derived answer, not the switch.
     *
     * `formState` weighs the status, the opening and closing times and the cap
     * together, and it is the same function the page, the cards and the admin
     * use. A form that closed on a timer an hour ago must refuse an entry from
     * a page that was drawn before then, and nobody should have to be awake at
     * midnight to make that true.
     *
     * The count is read here for the message; it is NOT what enforces the cap —
     * see the insert below.
     */
    const taken = form.max_entries > 0 ? await countEntries(form.id) : 0;
    const state = formState(form, taken);

    if (!isTakingEntries(state)) {
      return refuse(
        { error: stateMessage(form, state) },
        // Not-yet and no-longer are both "the state of this thing conflicts
        // with what you asked", which is what 409 means.
        409
      );
    }

    // Against the visitor's own day, not the server's — `dayFor` and the note
    // on `ageFrom` explain why the two are not the same thing.
    const { values, errors } = validateSubmission(
      form.fields,
      body.values,
      dayFor(body.tzOffset),
      form.sections
    );

    if (Object.keys(errors).length > 0) {
      return refuse({ errors }, 422);
    }

    /*
     * The burst budget is spent HERE, on an attempt that is going to be stored.
     *
     * It used to be taken at the top, before parsing, so five corrections to a
     * long form — five perfectly ordinary 422s, or five double-clicks, or five
     * flaky-network retries — locked a real person out for ten minutes. A
     * validation failure is an expected outcome on this path, not abuse.
     */
    const burst = take(`register:${ip}`, BURST_LIMIT, BURST_WINDOW_MS);
    if (!burst.ok) {
      await discard();
      return NextResponse.json(
        { error: "Too many attempts. Please try again in a few minutes." },
        { status: 429, headers: { "retry-after": String(burst.retryAfter) } }
      );
    }

    // The durable half of the rate limit — see rateLimit.ts on why the counter
    // above is not enough on its own.
    if (await countRecentEntries(form.id, ip, 1) >= HOURLY_LIMIT) {
      return refuse(
        { error: "You have sent several of these already. Please get in touch instead." },
        429
      );
    }

    /*
     * Spent here, on an attempt that is about to be stored.
     *
     * Two things at once. It stops the token being replayed for the two hours
     * it stays valid — one fetched page used to be two hours of submissions.
     * And it makes the submission idempotent: a retry after a response that got
     * lost carries the same nonce as the request that actually landed, so
     * instead of a second identical entry the visitor is told the first one
     * arrived, which is true.
     */
    if (!(await consumeToken(body.nonce, body.issuedAt))) {
      return refuse(
        { error: "This entry has already been received — there is no need to send it again." },
        409
      );
    }

    /*
     * The cap is enforced by the INSERT, not by the count above.
     *
     * That count is a read, and between reading it and writing this row
     * somebody else can write theirs — so on the last place, two people would
     * both be told yes. `createEntryWithinCap` puts the count inside the insert,
     * where the database can serialise the two, and hands back null to whoever
     * lost.
     */
    const entry = await createEntryWithinCap(
      form.id,
      values,
      ip,
      request.headers.get("user-agent") ?? "",
      form.max_entries
    );

    if (!entry) {
      return refuse({ error: stateMessage(form, "full") }, 409);
    }

    // Never allowed to fail the submission: the entry is already saved, and a
    // notification that did not go out is not the visitor's problem.
    await notifyNewEntry(form, entry).catch((error) => {
      console.error("[register] could not notify", error);
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[register] POST", error);
    await discard();
    return NextResponse.json(
      { error: "Your entry could not be saved. Please try again." },
      { status: 500 }
    );
  }
}
