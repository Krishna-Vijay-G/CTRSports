"use client";

import { useRef, useState } from "react";
import { uploadMedia } from "@/lib/client/upload";
import { cn } from "@/lib/utils";
import { Button } from "@/admin/ui/Button";
import { ProgressRing } from "@/admin/ui/Progress";
import { UploadIcon } from "@/admin/ui/icons";
import { ErrorNote } from "@/admin/components/Fields";

/**
 * Files into the folder currently open, by drop or by button.
 *
 * Modelled on `AddPages` in DeckForm — sequential rather than parallel, with
 * `{done,total}` progress, per-file failure counting, and the FIRST failure's
 * sentence kept, because "3 files failed: that is not a folder" is useful and
 * "3 files failed" is not.
 *
 * The destination is named on the button (`Upload to decks/world-of-ctr`)
 * rather than offered as a separate control. Browsing to a folder IS the folder
 * chooser; a dropdown beside a breadcrumb pointing somewhere else would be two
 * answers to one question.
 *
 * ── Two numbers, because there are two ────────────────────────────────────
 *
 * `done/total` is which file, and `percent` is how far through that one. They
 * used to be one, and a single fifty-megabyte file made the difference obvious:
 * "Uploading 1 of 1…" is the same sentence at the start and forty seconds in.
 * The percentage comes from the transfer itself, and is null while the file is
 * being converted — see src/lib/client/upload.ts.
 */
export function UploadZone({
  folder,
  onDone,
  disabled,
}: {
  folder: string;
  onDone: () => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
    percent: number | null;
  } | null>(null);
  const [dropping, setDropping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = Boolean(disabled) || progress !== null;

  async function send(files: File[]) {
    if (files.length === 0) return;

    setError(null);
    let failed = 0;
    let reason = "";

    for (const [index, file] of files.entries()) {
      setProgress({ done: index, total: files.length, percent: null });

      try {
        // Converted, signed and PUT straight to the bucket by the one uploader
        // the whole admin shares — which is what makes this zone's ceiling the
        // same as every other one's, namely none.
        await uploadMedia(file, {
          folder,
          onProgress: (percent) =>
            setProgress({ done: index, total: files.length, percent }),
        });
      } catch (problem) {
        failed += 1;
        if (!reason && problem instanceof Error && problem.message) reason = problem.message;
      }
    }

    setProgress(null);

    if (failed > 0) {
      setError(
        `${failed === 1 ? "One file" : `${failed} files`} could not be uploaded.${
          reason ? ` ${reason}` : ""
        }`
      );
    }

    // Always, even after failures: the ones that worked are in the bucket and
    // the listing is the only source of truth for what is there.
    onDone();
  }

  return (
    <div>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDropping(true);
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDropping(false);
          if (!busy) send(Array.from(event.dataTransfer.files ?? []));
        }}
        className={cn(
          "flex items-center justify-between gap-3 rounded-md border border-dashed px-3 py-2.5 transition",
          dropping ? "border-primary bg-primary/10" : "border-input",
          Boolean(disabled) && "opacity-60"
        )}
      >
        {progress ? (
          <div className="flex min-w-0 items-center gap-2.5">
            {/* Small and unlabelled: the percentage is already in the sentence
                beside it, and a number inside a twenty-pixel ring is unreadable. */}
            <ProgressRing value={progress.percent} size={20} stroke={2.5} label={false} />

            <p className="min-w-0 truncate text-xs text-muted-fg">
              Uploading {progress.done + 1} of {progress.total}
              {progress.percent === null ? "…" : ` — ${progress.percent}%`}
            </p>
          </div>
        ) : (
          <p className="min-w-0 truncate text-xs text-muted-fg">
            Drop files here to add them to {folder || "the media root"}
          </p>
        )}

        <Button
          variant="outline"
          size="xs"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <UploadIcon />
          Upload
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={(event) => {
          const picked = Array.from(event.target.files ?? []);
          // Cleared at once, so choosing the same files again fires this again.
          event.target.value = "";
          send(picked);
        }}
        className="hidden"
      />

      {error ? (
        <div className="mt-2">
          <ErrorNote>{error}</ErrorNote>
        </div>
      ) : null}
    </div>
  );
}
