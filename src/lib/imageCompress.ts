/** Browser-only helper — keeps uploads comfortably under the serverless body limit. */

const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;
const MAX_EDGE = 2400;

function loadBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  return Promise.reject(new Error("createImageBitmap unavailable"));
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Returns the original file when it is already small enough, otherwise a
 * downscaled WebP re-encode. WebP keeps transparency, so PNG logos survive.
 * Any failure falls back to the original file — the server still guards the size.
 */
export async function prepareImageForUpload(file: File): Promise<File> {
  if (file.type === "image/gif") return file; // Re-encoding would drop the animation.
  if (file.size <= MAX_UPLOAD_BYTES) return file;

  try {
    const bitmap = await loadBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    for (const quality of [0.88, 0.75, 0.6]) {
      const blob = await canvasToBlob(canvas, "image/webp", quality);
      if (blob && blob.size <= MAX_UPLOAD_BYTES) {
        const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
        return new File([blob], name, { type: "image/webp" });
      }
    }

    return file;
  } catch {
    return file;
  }
}
