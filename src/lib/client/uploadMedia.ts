/** Browser-only upload helpers for the admin media picker. */

import { prepareImageForUpload } from "@/lib/client/imageCompress";
import { MAX_VIDEO_BYTES, isVideoType } from "@/lib/mediaTypes";

export type UploadedMedia = {
  url: string;
  key: string | null;
  type: "image" | "video";
  posterUrl: string | null;
  posterKey: string | null;
};

export type UploadProgress = (percent: number, label: string) => void;

async function json(response: Response) {
  return response.json().catch(() => ({}) as Record<string, unknown>);
}

/** Small images go through the API route — that path needs no bucket CORS. */
async function uploadImageViaApi(file: File): Promise<{ url: string; key: string }> {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch("/api/admin/upload", { method: "POST", body: form });
  const data = await json(response);
  if (!response.ok) throw new Error((data.error as string) ?? "Upload failed.");

  return { url: data.url as string, key: data.key as string };
}

/** Large files (all videos) go straight to S3 with a presigned PUT. */
function uploadDirectToS3(
  file: File,
  onProgress?: UploadProgress,
  label = "Uploading"
): Promise<{ url: string; key: string }> {
  return (async () => {
    const signResponse = await fetch("/api/admin/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: file.type, size: file.size }),
    });
    const signed = await json(signResponse);
    if (!signResponse.ok) throw new Error((signed.error as string) ?? "Upload failed.");

    // XHR rather than fetch, because only XHR reports upload progress.
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signed.uploadUrl as string);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.setRequestHeader("Cache-Control", "public, max-age=31536000, immutable");

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress?.(Math.round((event.loaded / event.total) * 100), label);
        }
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(
              new Error(
                xhr.status === 0
                  ? "The browser was blocked from uploading to S3. Check the bucket's CORS rule."
                  : `S3 rejected the upload (${xhr.status}).`
              )
            );
      xhr.onerror = () =>
        reject(new Error("Upload to S3 failed. Check the bucket's CORS rule and try again."));
      xhr.send(file);
    });

    return { url: signed.url as string, key: signed.key as string };
  })();
}

/**
 * Grabs a still from the start of a video so the grid and the banner have
 * something to show before playback begins. Best-effort: a failure just means
 * no poster, which the players handle on their own.
 */
async function capturePosterFrame(file: File): Promise<File | null> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const video = document.createElement("video");
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    await new Promise<void>((resolve, reject) => {
      const fail = () => reject(new Error("video metadata failed"));
      video.onloadeddata = () => resolve();
      video.onerror = fail;
      window.setTimeout(fail, 15000);
    });

    // A frame slightly into the clip is usually more representative than 0s.
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      video.currentTime = Math.min(0.5, (video.duration || 1) / 4);
      window.setTimeout(resolve, 4000);
    });

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    if (!canvas.width || !canvas.height) return null;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.85)
    );
    if (!blob) return null;

    return new File([blob], "poster.webp", { type: "image/webp" });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadMedia(
  file: File,
  onProgress?: UploadProgress
): Promise<UploadedMedia> {
  if (isVideoType(file.type)) {
    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error(`Video is larger than ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB.`);
    }

    const video = await uploadDirectToS3(file, onProgress, "Uploading video");

    onProgress?.(100, "Generating poster");
    let posterUrl: string | null = null;
    let posterKey: string | null = null;
    const poster = await capturePosterFrame(file);
    if (poster) {
      try {
        const uploaded = await uploadImageViaApi(poster);
        posterUrl = uploaded.url;
        posterKey = uploaded.key;
      } catch {
        // A missing poster is cosmetic — keep the video.
      }
    }

    return { url: video.url, key: video.key, type: "video", posterUrl, posterKey };
  }

  onProgress?.(0, "Uploading image");
  const prepared = await prepareImageForUpload(file);
  const image = await uploadImageViaApi(prepared);
  onProgress?.(100, "Uploading image");

  return { url: image.url, key: image.key, type: "image", posterUrl: null, posterKey: null };
}
