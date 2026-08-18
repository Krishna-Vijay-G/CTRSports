"use client";

import { useRef, useState } from "react";
import { LOGO_EDGE, PHOTO_EDGE } from "@/lib/client/toWebp";
import { uploadMedia } from "@/lib/client/upload";
import { UPLOAD_ACCEPT, isVideoUrl, posterFor } from "@/lib/media";
import { cn } from "@/lib/utils";
import { Button } from "@/admin/ui/Button";
import { Input, Label } from "@/admin/ui/Input";
import { ProgressRing } from "@/admin/ui/Progress";
import { FolderIcon, TrashIcon, UploadIcon } from "@/admin/ui/icons";
import { Hint } from "@/admin/components/Fields";
import { MediaPicker } from "@/admin/components/MediaPicker";
import { useUploadFolder } from "@/admin/components/UploadFolder";

/**
 * Picks a picture OR a video, four ways: drop a file on the tile, click the tile
 * to browse the disk, choose one already in S3, or paste a URL. The URL box
 * stays visible and editable throughout — it is the only route when S3 is not
 * configured.
 *
 * Every slot in this project that took an image now takes a video too, and they
 * all use this one field, so this is where that is true. Nothing about the
 * stored value changed: it is still one URL, and what it points at is read off
 * the extension — see src/lib/media.ts for why that is a fact about the address
 * rather than a second field.
 *
 * ── How it uploads ────────────────────────────────────────────────
 *
 * A signed PUT straight to S3, for a picture exactly as for a video, so neither
 * has a size ceiling — see src/lib/client/upload.ts for why the old four-
 * megabyte one on pictures was refusing files it was about to make small. A
 * picture is still converted to WebP first: that is what keeps the page fast,
 * and it is no longer what keeps the upload under a limit.
 *
 * A video also has a frame captured from it and uploaded beside it, so the slot
 * shows a still rather than a black rectangle while it loads. The capture is
 * allowed to fail; the upload is not held up by it.
 *
 * `variant` decides how the tile shows what is in it:
 *   photo — wide, cropped to fill, on the dark surface
 *   logo  — square, fitted whole, on white, because crests carry their own dark
 *           ink and vanish against a near-black tile
 */
export function ImageField({
  label,
  value,
  onChange,
  disabled,
  hint,
  variant = "photo",
  maxEdge,
  className,
  folder,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  hint?: string;
  variant?: "photo" | "logo";
  /**
   * The longest edge an upload is resized to, when neither default fits.
   *
   * Rarely needed, because `variant` already answers it — a logo is capped at
   * `LOGO_EDGE` and a photograph at `PHOTO_EDGE`, which is the setting that
   * decides whether a banner looks sharp. A deck page passes `DOCUMENT_EDGE`,
   * which is neither of those.
   */
  maxEdge?: number;
  className?: string;
  /**
   * Where this one field's uploads go, when it differs from the screen's.
   *
   * Almost never needed — the folder comes from `UploadFolder` above, which is
   * what keeps the other twelve call sites unchanged. This is the escape hatch
   * for a field whose pictures belong somewhere its neighbours' do not.
   */
  folder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  /** null while the file is being prepared; 0–100 once the bytes are moving. */
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [dropping, setDropping] = useState(false);

  const screenFolder = useUploadFolder();
  const destination = folder ?? screenFolder;

  const isVideo = isVideoUrl(value);

  /**
   * One file into the bucket, and its URL into the field.
   *
   * Everything that used to be here — the WebP conversion, the poster capture,
   * the signing, the PUT — lives in `uploadMedia` now, shared with the media
   * library, the deck uploader and the rich-text editor, so no two of them can
   * drift into having different ceilings again. What is left is this field's
   * own part: what the tile shows while it happens.
   *
   * No size check. The one that was here ran on the file as picked, before the
   * conversion that would have made its size irrelevant, which is how a phone
   * photograph got refused for being too big to send.
   */
  async function upload(file: File) {
    setUploading(true);
    setProgress(null);
    setError(null);

    try {
      const url = await uploadMedia(file, {
        folder: destination,
        // `variant` is already the answer to "what is this picture for", so it
        // decides the ceiling too rather than every call site being asked twice.
        maxEdge: maxEdge ?? (variant === "logo" ? LOGO_EDGE : PHOTO_EDGE),
        onProgress: setProgress,
      });

      onChange(url);
    } catch (problem) {
      setError(
        problem instanceof Error && problem.message
          ? problem.message
          : "Upload failed. Check your connection and try again."
      );
    } finally {
      setUploading(false);
      setProgress(null);
    }
  }

  function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clear immediately, so picking the same file twice fires this again.
    event.target.value = "";
    if (file) upload(file);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDropping(false);
    if (busy) return;

    const file = event.dataTransfer.files?.[0];
    // Anything that is neither a picture nor a video is a mis-drop, not an error
    // worth a message. A file of the right shape but the wrong type DOES get one,
    // from `upload` — that is somebody trying, not somebody slipping.
    if (file && (file.type.startsWith("image/") || file.type.startsWith("video/"))) upload(file);
  }

  const busy = Boolean(disabled) || uploading;

  return (
    <div className={cn("block", className)}>
      <Label>{label}</Label>

      <div className="mt-1.5 flex gap-2.5">
        {/* The tile is the drop target and doubles as the file-browse button, so
            the commonest action is the biggest thing in the field. */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDropping(true);
          }}
          onDragLeave={() => setDropping(false)}
          onDrop={handleDrop}
          disabled={busy}
          title="Click to choose a file, or drop one here"
          className={cn(
            "relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border transition",
            "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40",
            variant === "logo" ? "size-[72px]" : "h-[72px] w-[112px]",
            value ? "border-border" : "border-dashed border-input",
            variant === "logo" && value ? "bg-white" : "bg-background",
            dropping && "border-primary bg-primary/10",
            // Only the disabled prop dims the tile. While uploading, the scrim and
            // the ring already say so, and dimming under them just greys the ring.
            disabled && "opacity-60"
          )}
        >
          {value ? (
            // The tile shows a video the way the page will: muted, looping,
            // playing. What is in the box is what a visitor gets.
            isVideo ? (
              <video
                src={value}
                poster={posterFor(value) || undefined}
                autoPlay
                muted
                loop
                playsInline
                className={cn(
                  "h-full w-full",
                  variant === "logo" ? "object-contain p-1.5" : "object-cover"
                )}
              />
            ) : (
              <img
                src={value}
                alt=""
                className={cn(
                  "h-full w-full",
                  variant === "logo" ? "object-contain p-1.5" : "object-cover"
                )}
              />
            )
          ) : (
            <span className="px-1 text-center text-[10px] leading-tight text-muted-fg">
              Drop
              <br />
              or click
            </span>
          )}

          {/* Over the picture rather than instead of it: on a re-upload the
              slot keeps showing what is currently in it, dimmed, so the ring
              reads as "replacing this" rather than "the field is empty now". */}
          {uploading ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/65 text-white backdrop-blur-[1px]">
              <ProgressRing value={progress} size={variant === "logo" ? 40 : 44} />
            </span>
          ) : null}
        </button>

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            <Button variant="outline" size="xs" onClick={() => inputRef.current?.click()} disabled={busy}>
              <UploadIcon />
              Upload
            </Button>

            <Button
              variant="outline"
              size="xs"
              onClick={() => setBrowsing(true)}
              disabled={busy}
              title="Choose from images already uploaded"
            >
              <FolderIcon />
              Library
            </Button>

            {value ? (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onChange("")}
                disabled={busy}
                aria-label="Clear image"
                title="Clear this image and fall back to the built-in default"
                className="hover:text-destructive"
              >
                <TrashIcon />
              </Button>
            ) : null}
          </div>

          {/* The URL on its own line: beside the buttons it collapsed to about
              forty pixels, which is unusable for the S3 URLs that go in it. */}
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={busy}
            placeholder="Image or video URL"
            className="h-8 text-xs"
          />
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        // Built from the one table both upload routes read, so the picker and
        // the routes cannot come to disagree about what is allowed.
        accept={UPLOAD_ACCEPT}
        onChange={handleFile}
        className="hidden"
      />

      {/* Opens where this field's uploads go. One value, two uses — the picker
          and the uploader cannot disagree about which folder is "here". */}
      <MediaPicker
        open={browsing}
        onClose={() => setBrowsing(false)}
        onSelect={onChange}
        startFolder={destination}
      />

      {error ? (
        <p role="alert" className="mt-1 text-[11px] text-destructive">
          {error}
        </p>
      ) : hint ? (
        <Hint className="mt-1">{hint}</Hint>
      ) : null}
    </div>
  );
}