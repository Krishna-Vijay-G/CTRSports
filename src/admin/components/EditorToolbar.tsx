"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/admin/ui/Badge";
import { Button } from "@/admin/ui/Button";
import { PanelIcon } from "@/admin/ui/icons";
import { ErrorNote } from "@/admin/components/Fields";

/**
 * The bar across the top of an editor.
 *
 * Everything about the page as a whole lives here — what section is open,
 * whether it is saved, and the two buttons that write — because it is the only
 * part of the screen that neither sidebar can hide. Both panes fold away; this
 * does not, so Save is never more than one glance from wherever the work is.
 *
 * It is also where the right-hand pane is reopened from. A pane that collapses
 * to nothing needs its handle kept somewhere that cannot itself be collapsed.
 */
export function EditorToolbar({
  Icon,
  title,
  hint,
  dirty,
  justSaved,
  busy,
  error,
  onSave,
  onLoadDefaults,
  actions,
  fieldsOpen,
  onToggleFields,
  className,
}: {
  Icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
  title: string;
  hint: string;
  dirty: boolean;
  justSaved: boolean;
  busy: boolean;
  error: string | null;
  onSave: () => void;
  /** Omitted on screens with no built-in copy to fall back to — see below. */
  onLoadDefaults?: () => void;
  /** Screen-specific buttons, placed before Save. */
  actions?: React.ReactNode;
  fieldsOpen: boolean;
  onToggleFields: () => void;
  className?: string;
}) {
  return (
    <div className={cn("shrink-0 space-y-2", className)}>
      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2">
        <Icon className="size-5 shrink-0 text-muted-fg" />

        <div className="mr-auto min-w-0">
          <h1 className="truncate text-[13px] font-medium tracking-tight text-foreground">
            {title}
          </h1>
          <p className="truncate text-[11px] text-muted-fg">{hint}</p>
        </div>

        {dirty ? (
          <Badge variant="default">Unsaved</Badge>
        ) : justSaved ? (
          <span className="shrink-0 text-[11px] text-muted-fg">Saved</span>
        ) : null}

        {actions}

        {/* Only where there IS a set of defaults to fall back to. The circuits
            are rows someone typed, not a document with built-in copy, so that
            screen has nothing this button could honestly refill. */}
        {onLoadDefaults ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadDefaults}
            disabled={busy}
            title="Refills every section with the built-in copy. Nothing is written until you Save."
          >
            Load defaults
          </Button>
        ) : null}

        <Button onClick={onSave} disabled={busy} size="sm">
          {busy ? "Saving…" : "Save"}
        </Button>

        <div className="hidden h-6 w-px bg-border lg:block" />

        {/* Mirrored, so this reads as the pane on the right the way the
            sidebar's own button reads as the pane on the left. */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleFields}
          aria-expanded={fieldsOpen}
          aria-label={fieldsOpen ? "Hide the fields" : "Show the fields"}
          title={fieldsOpen ? "Hide the fields" : "Show the fields"}
          className="hidden lg:flex"
        >
          <PanelIcon className="scale-x-[-1]" />
        </Button>
      </div>

      {error ? <ErrorNote>{error}</ErrorNote> : null}
    </div>
  );
}
