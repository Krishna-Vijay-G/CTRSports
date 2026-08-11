"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/admin/ui/Badge";
import { Button } from "@/components/admin/ui/Button";
import { ErrorNote } from "@/components/admin/Fields";

/**
 * The column down the right of an editor: what saving does, and what the screen
 * is.
 *
 * Everything here is about the page as a whole rather than the section that
 * happens to be open, which is why it is off to one side instead of on top of
 * the fields — and why the preview ends up in the middle of the screen, between
 * the fields that change it and the button that publishes them.
 *
 * Save does not scroll away: the column is its own scroller, and the button sits
 * at the top of it.
 */
export function EditorAside({
  dirty,
  justSaved,
  busy,
  error,
  onSave,
  onLoadDefaults,
  notes,
  children,
  className,
}: {
  dirty: boolean;
  justSaved: boolean;
  busy: boolean;
  error: string | null;
  onSave: () => void;
  onLoadDefaults: () => void;
  /** One line each — how this screen works, in the order it is met. */
  notes: string[];
  /** Anything the open section needs to say about itself. */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3 md:overflow-y-auto",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <p className="mr-auto text-[11px] font-medium text-muted-fg">Publish</p>

        {dirty ? (
          <Badge variant="default">Unsaved</Badge>
        ) : justSaved ? (
          <span className="text-[11px] text-muted-fg">Saved</span>
        ) : null}
      </div>

      <Button onClick={onSave} disabled={busy} className="w-full">
        {busy ? "Saving…" : "Save"}
      </Button>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      {children}

      <div className="h-px bg-border" />

      <div className="space-y-1.5">
        <p className="text-[11px] font-medium text-muted-fg">How it works</p>
        <ul className="space-y-1.5 text-[11px] leading-relaxed text-muted-fg/70">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>

      {/* mt-auto: pinned to the foot on a tall screen, out of the way of the
          things you actually press. */}
      <div className="mt-auto space-y-1.5 border-t border-border pt-2.5">
        <Button
          variant="outline"
          size="xs"
          onClick={onLoadDefaults}
          disabled={busy}
          className="w-full"
        >
          Load defaults
        </Button>
        <p className="text-[11px] leading-relaxed text-muted-fg/70">
          Refills every section with the built-in copy. Nothing is written until you Save.
        </p>
      </div>
    </aside>
  );
}
