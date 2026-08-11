"use client";

import { useRef, useState } from "react";
import { toWebp } from "@/lib/client/toWebp";

/**
 * Logo picker: choose a file, it is converted to WebP in the browser, uploaded,
 * and the resulting URL is handed back. The URL box stays visible and editable
 * so a logo can also be pasted in — which is the only way to set one when S3 is
 * not configured.
 *
 * Laid out to sit inside a row of the sports list, so it stays on two short
 * lines rather than a block of its own.
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

  const buttonClass =
    "rounded-lg border border-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div>
      <span className="admin-label">Logo</span>

      <div className="mt-1.5 flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-carbon-900">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-contain p-1" />
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

        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            disabled={disabled || uploading}
            className={`${buttonClass} text-white/45 hover:border-red-400/60 hover:text-red-300`}
          >
            Clear
          </button>
        ) : null}

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
        placeholder="…or paste an image URL"
        className="admin-field mt-2 py-1.5 text-xs"
      />

      {error ? (
        <p role="alert" className="mt-1.5 text-[11px] text-red-300">
          {error}
        </p>
      ) : (
        <p className="mt-1.5 text-[10px] text-white/30">Converted to WebP before upload.</p>
      )}
    </div>
  );
}
