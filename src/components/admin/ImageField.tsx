"use client";

import { useRef, useState } from "react";
import { toWebp } from "@/lib/client/toWebp";
import { cn } from "@/lib/utils";

/**
 * Picks an image: choose a file, it is converted to WebP in the browser,
 * uploaded, and the resulting URL is handed back. The URL box stays visible and
 * editable so one can also be pasted — which is the only way to set an image
 * when S3 is not configured.
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

      <div className="mt-1.5 flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-carbon-900">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[9px] uppercase text-white/25">—</span>
          )}
        </div>

        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled || uploading}
          placeholder="Image URL, or upload"
          className="admin-field min-w-0 flex-1 py-1.5 text-xs"
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className={`${buttonClass} shrink-0 text-white/70 hover:border-racing-yellow/60 hover:text-racing-yellow`}
        >
          {uploading ? "…" : "Upload"}
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleFile}
          className="hidden"
        />
      </div>

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
