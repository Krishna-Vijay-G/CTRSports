"use client";

import { useRef, useState } from "react";
import { toWebp } from "@/lib/client/toWebp";
import { cn } from "@/lib/utils";
import { Button } from "@/admin/ui/Button";
import { Input, Label } from "@/admin/ui/Input";
import { FolderIcon, TrashIcon, UploadIcon } from "@/admin/ui/icons";
import { Hint } from "@/admin/components/Fields";
import { MediaPicker } from "@/admin/components/MediaPicker";

/**
 * Picks an image, four ways: drop a file on the tile, click the tile to browse
 * the disk, choose one already in S3, or paste a URL. The URL box stays visible
 * and editable throughout — it is the only route when S3 is not configured.
 *
 * Uploads are converted to WebP in the browser before they are sent, so what is
 * stored is already what the page serves.
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
  className,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  hint?: string;
  variant?: "photo" | "logo";
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);
  const [dropping, setDropping] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    setError(null);

    try {
      const webp = await toWebp(file);

      const form = new FormData();
      form.append("file", webp);

      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }

      onChange(data.url as string);
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
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
    // Anything that is not a picture is a mis-drop, not an error worth a message.
    if (file && file.type.startsWith("image/")) upload(file);
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
            busy && "opacity-60"
          )}
        >
          {value ? (
            <img
              src={value}
              alt=""
              className={cn(
                "h-full w-full",
                variant === "logo" ? "object-contain p-1.5" : "object-cover"
              )}
            />
          ) : (
            <span className="px-1 text-center text-[10px] leading-tight text-muted-fg">
              Drop
              <br />
              or click
            </span>
          )}

          {uploading ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/70 text-[10px] font-medium text-primary">
              Uploading…
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
            placeholder="Image URL"
            className="h-8 text-xs"
          />
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleFile}
        className="hidden"
      />

      <MediaPicker open={browsing} onClose={() => setBrowsing(false)} onSelect={onChange} />

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
