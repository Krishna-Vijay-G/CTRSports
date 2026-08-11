"use client";

import { useEffect, useState } from "react";

type MediaObject = { key: string; url: string; size: number; uploadedAt: string };

/**
 * Browses everything this site has uploaded to S3 and hands back a URL.
 *
 * Fetches on open rather than on mount, so the list is fresh every time and a
 * page holding twenty image fields makes no requests until one is actually
 * opened.
 *
 * There is no delete: an object may still be referenced by content this picker
 * cannot see, and a broken image on the live site is a worse outcome than an
 * untidy bucket.
 */
export function MediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const [media, setMedia] = useState<MediaObject[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/admin/media")
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;

        if (!response.ok) {
          setError(data.error ?? "Could not load the media library.");
          return;
        }

        setConfigured(data.configured !== false);
        setMedia((data.media as MediaObject[]) ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Network error. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  // Escape closes, like any other dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Media library"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      // A click that starts and ends on the backdrop closes; one that merely
      // ends there after dragging out of the panel does not.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-xl border border-white/15 bg-carbon-900">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <h2 className="mr-auto text-sm font-bold text-white">Media library</h2>
          <span className="text-[11px] text-white/35">
            {loading ? "Loading…" : `${media.length} image${media.length === 1 ? "" : "s"}`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/70 transition hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {error ? (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          ) : !configured ? (
            <p className="py-10 text-center text-xs text-white/40">
              Media storage is not configured. Set the S3_* variables in .env, or paste an image URL
              instead.
            </p>
          ) : loading ? (
            <p className="py-10 text-center text-xs text-white/40">Loading…</p>
          ) : media.length === 0 ? (
            <p className="py-10 text-center text-xs text-white/40">
              Nothing uploaded yet. Use Upload on any image field and it will appear here.
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {media.map((object) => (
                <li key={object.key}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(object.url);
                      onClose();
                    }}
                    title={`${object.key} · ${Math.round(object.size / 1024)} KB`}
                    className="group block w-full overflow-hidden rounded-lg border border-white/10 bg-carbon-950 transition hover:border-racing-yellow/70"
                  >
                    <img
                      src={object.url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="aspect-square w-full object-contain p-1"
                    />
                    <span className="block truncate border-t border-white/5 px-1.5 py-1 text-[9px] text-white/35 group-hover:text-white/60">
                      {Math.round(object.size / 1024)} KB
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
