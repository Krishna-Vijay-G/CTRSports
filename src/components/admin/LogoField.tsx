"use client";

import { useRef, useState } from "react";
import { toWebp } from "@/lib/client/toWebp";

/**
 * Logo picker: choose a file, it is converted to WebP in the browser, uploaded,
 * and the resulting URL is handed back. The URL box stays visible and editable
 * so a logo can also be pasted in — which is the only way to set one when S3 is
 * not configured.
 */
export function LogoField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
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

  return (
    <div>
      <span className="admin-label">Logo</span>

      <div className="mt-2 flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-carbon-900">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-contain p-1.5" />
          ) : (
            <span className="text-[10px] uppercase tracking-wider text-white/25">None</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled || uploading}
              className="rounded-full border border-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/70 transition hover:border-racing-yellow/60 hover:text-racing-yellow disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Upload image"}
            </button>

            {value ? (
              <button
                type="button"
                onClick={() => onChange("")}
                disabled={disabled || uploading}
                className="rounded-full border border-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/50 transition hover:border-red-400/60 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove
              </button>
            ) : null}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleFile}
            className="hidden"
          />

          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled || uploading}
            placeholder="…or paste an image URL / /images/… path"
            className="admin-field mt-2"
          />

          <p className="mt-1.5 text-[11px] leading-relaxed text-white/35">
            Converted to WebP and resized in your browser before upload.
          </p>

          {error ? (
            <p role="alert" className="mt-1.5 text-[11px] text-red-300">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
