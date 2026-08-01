"use client";

import { useRef, useState } from "react";
import { prepareImageForUpload } from "@/lib/imageCompress";
import { cn } from "@/lib/utils";

export type ImageValue = { url: string; key: string | null };

export function ImagePicker({
  value,
  onChange,
  disabled,
}: {
  value: ImageValue;
  onChange: (next: ImageValue) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setUploading(true);

    try {
      const prepared = await prepareImageForUpload(file);
      const form = new FormData();
      form.append("file", prepared);

      const response = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }

      onChange({ url: data.url, key: data.key });
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file is not an image.");
      return;
    }
    void upload(file);
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative rounded-2xl border-2 border-dashed p-4 transition-colors",
          dragging ? "border-racing-yellow bg-racing-yellow/10" : "border-white/15 bg-carbon-900/60",
          disabled && "opacity-60"
        )}
      >
        {value.url ? (
          <div className="flex flex-col items-center gap-3">
            <div className="flex max-h-56 w-full items-center justify-center overflow-hidden rounded-xl bg-black/40 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={value.url}
                alt="Selected post image"
                className="max-h-52 max-w-full object-contain"
                onError={() => setError("That image URL could not be loaded.")}
              />
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled || uploading}
                className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/70 transition hover:border-racing-yellow/60 hover:text-racing-yellow disabled:opacity-50"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange({ url: "", key: null });
                  setError(null);
                }}
                disabled={disabled || uploading}
                className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/70 transition hover:border-red-400/60 hover:text-red-300 disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || uploading}
            className="flex w-full flex-col items-center gap-2 rounded-xl px-4 py-10 text-center"
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-racing-yellow" aria-hidden>
              <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" />
            </svg>
            <span className="font-display text-sm font-semibold uppercase tracking-wider text-white">
              {uploading ? "Uploading…" : "Drag & drop an image"}
            </span>
            <span className="text-xs text-white/45">or click to browse — JPG, PNG, WebP, GIF, AVIF</span>
          </button>
        )}

        {uploading ? (
          <div className="absolute inset-0 grid place-content-center rounded-2xl bg-carbon-950/70">
            <span className="font-display text-sm uppercase tracking-wider text-racing-yellow">Uploading…</span>
          </div>
        ) : null}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <label className="block">
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
          …or paste an image URL
        </span>
        <input
          type="url"
          value={value.url}
          onChange={(e) => onChange({ url: e.target.value, key: null })}
          placeholder="https://…"
          disabled={disabled}
          className="mt-2 w-full rounded-xl border border-white/10 bg-carbon-900 px-4 py-2.5 text-sm text-white outline-none transition focus:border-racing-yellow/60"
        />
      </label>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
