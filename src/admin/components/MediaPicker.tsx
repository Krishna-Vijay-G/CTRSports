"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/admin/ui/Dialog";
import { ErrorNote } from "@/admin/components/Fields";

type MediaObject = { key: string; url: string; size: number; uploadedAt: string };

/**
 * Browses everything this site has uploaded to S3 and hands back a URL.
 *
 * Fetches on open rather than on mount, so the list is fresh every time and a
 * screen holding twenty image fields makes no requests until one is opened.
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

  const count = `${media.length} image${media.length === 1 ? "" : "s"}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Media library"
      description={loading ? "Loading…" : `${count} uploaded for this site`}
    >
      {error ? (
        <ErrorNote>{error}</ErrorNote>
      ) : !configured ? (
        <Empty>
          Media storage is not configured. Set the S3_* variables in .env, or paste an image URL
          instead.
        </Empty>
      ) : loading ? (
        <Empty>Loading…</Empty>
      ) : media.length === 0 ? (
        <Empty>Nothing uploaded yet. Use Upload on any image field and it will appear here.</Empty>
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
                className="group block w-full overflow-hidden rounded-md border border-border bg-background outline-none transition hover:border-primary focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
              >
                <img
                  src={object.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="aspect-square w-full object-contain p-1"
                />
                <span className="block truncate border-t border-border px-1.5 py-1 text-[10px] text-muted-fg">
                  {Math.round(object.size / 1024)} KB
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-xs text-muted-fg">{children}</p>;
}
