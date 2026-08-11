"use client";

import { useRef, useState } from "react";
import { toWebp } from "@/lib/client/toWebp";
import { cn } from "@/lib/utils";
import { MediaPicker } from "@/components/admin/MediaPicker";

/**
 * Picks an image, three ways: upload a file (converted to WebP in the browser,
 * then stored in S3), choose one already in the bucket, or paste a URL. The URL
 * box stays visible and editable throughout — it is the only route when S3 is
 * not configured.
 *
 * Used for every picture on the site: brand logo, hero background, about
 * photos, sport crests and sport photos.
 */
export function ImageField({
  label,
  value,
  onChange,
  disabled,
  hint,
  className,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
  hint?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browsing, setBrowsing] = useState(false);

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Clear immediately, so picking the same file twice fires this again.
    event.target.value = "";
    if (!file) return;

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

  const buttonClass =
    "rounded-lg border border-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className={cn("block", className)}>
      <span className="admin-label">{label}</span>

      {/*
        Thumbnail and buttons on one line, the URL on its own underneath. All
        four side by side left the URL box about forty pixels wide inside the
        editor's side panel, which is unusable for the S3 URLs that go in it.
      */}
      <div className="mt-1.5 flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-carbon-900">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[9px] uppercase text-white/25">—</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className={`${buttonClass} text-white/70 hover:border-racing-yellow/60 hover:text-racing-yellow`}
        >
          {uploading ? "Uploading…" : "Upload"}
        </button>

        <button
          type="button"
          onClick={() => setBrowsing(true)}
          disabled={disabled || uploading}
          title="Choose from images already uploaded"
          className={`${buttonClass} text-white/70 hover:border-racing-yellow/60 hover:text-racing-yellow`}
        >
          Library
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || uploading}
        placeholder="Image URL, or use Upload / Library"
        className="admin-field mt-1.5 w-full py-1.5 text-xs"
      />

      <MediaPicker open={browsing} onClose={() => setBrowsing(false)} onSelect={onChange} />

      {error ? (
        <p role="alert" className="mt-1 text-[10px] text-red-300">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-[10px] text-white/30">{hint}</p>
      ) : null}
    </div>
  );
}
