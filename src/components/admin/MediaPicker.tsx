"use client";

import { useRef, useState } from "react";
import { ACCEPT_ATTRIBUTE } from "@/lib/mediaTypes";
import { uploadMedia } from "@/lib/uploadMedia";
import { cn } from "@/lib/utils";

export type MediaValue = {
  url: string;
  key: string | null;
  type: "image" | "video";
  posterUrl: string | null;
  posterKey: string | null;
};

export const EMPTY_MEDIA: MediaValue = {
  url: "",
  key: null,
  type: "image",
  posterUrl: null,
  posterKey: null,
};

/** Guess for pasted URLs, where there is no MIME type to inspect. */
function guessTypeFromUrl(url: string): "image" | "video" {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url) ? "video" : "image";
}

export function MediaPicker({
  value,
  onChange,
  disabled,
}: {
  value: MediaValue;
  onChange: (next: MediaValue) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<{ percent: number; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setProgress({ percent: 0, label: "Preparing" });

    try {
      const result = await uploadMedia(file, (percent, label) => setProgress({ percent, label }));
      onChange(result);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
    } finally {
      setProgress(null);
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("That file is not an image or a video.");
      return;
    }
    void upload(file);
  }

  const busy = disabled || progress !== null;

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!busy) handleFiles(e.dataTransfer.files);
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
              {value.type === "video" ? (
                <video
                  src={value.url}
                  poster={value.posterUrl ?? undefined}
                  controls
                  muted
                  playsInline
                  className="max-h-52 max-w-full rounded-lg"
                  onError={() => setError("That video URL could not be loaded.")}
                />
              ) : (
                <img
                  src={value.url}
                  alt="Selected post media"
                  className="max-h-52 max-w-full object-contain"
                  onError={() => setError("That image URL could not be loaded.")}
                />
              )}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/60">
                {value.type}
              </span>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/70 transition hover:border-racing-yellow/60 hover:text-racing-yellow disabled:opacity-50"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(EMPTY_MEDIA);
                  setError(null);
                }}
                disabled={busy}
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
            disabled={busy}
            className="flex w-full flex-col items-center gap-2 rounded-xl px-4 py-10 text-center"
          >
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-racing-yellow"
              aria-hidden
            >
              <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" strokeLinecap="round" />
            </svg>
            <span className="font-display text-sm font-semibold uppercase tracking-wider text-white">
              Drag &amp; drop image or video
            </span>
            <span className="text-xs text-white/45">
              or click to browse — JPG, PNG, WebP, GIF, AVIF · MP4, WebM, MOV
            </span>
          </button>
        )}

        {progress ? (
          <div className="absolute inset-0 grid place-content-center gap-3 rounded-2xl bg-carbon-950/85 px-8">
            <span className="text-center font-display text-sm uppercase tracking-wider text-racing-yellow">
              {progress.label}… {progress.percent}%
            </span>
            <div className="h-1.5 w-56 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-racing-yellow transition-all duration-200"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        ) : null}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          hidden
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <label className="block">
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
          …or paste an image / video URL
        </span>
        <input
          type="url"
          value={value.url}
          onChange={(e) =>
            onChange({
              url: e.target.value,
              key: null,
              type: guessTypeFromUrl(e.target.value),
              posterUrl: null,
              posterKey: null,
            })
          }
          placeholder="https://…"
          disabled={disabled}
          className="mt-2 w-full rounded-xl border border-white/10 bg-carbon-900 px-4 py-2.5 text-sm text-white outline-none transition focus:border-racing-yellow/60"
        />
      </label>

      {value.url ? (
        <label className="flex items-center gap-3 text-xs text-white/50">
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
            Type
          </span>
          <select
            value={value.type}
            onChange={(e) => onChange({ ...value, type: e.target.value as "image" | "video" })}
            disabled={disabled}
            className="rounded-lg border border-white/10 bg-carbon-900 px-3 py-1.5 text-xs text-white outline-none focus:border-racing-yellow/60"
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
          <span className="text-white/30">Detected automatically — override if it is wrong.</span>
        </label>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}
