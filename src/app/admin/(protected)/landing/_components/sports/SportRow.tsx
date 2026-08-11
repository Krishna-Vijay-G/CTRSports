"use client";

import { useState } from "react";
import { LIMITS, type Sport } from "@/lib/sports";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/admin/ui/Badge";
import { Button } from "@/components/admin/ui/Button";
import { Input, Label, Textarea } from "@/components/admin/ui/Input";
import {
  CaretDownIcon,
  DragIcon,
  EyeIcon,
  EyeSlashIcon,
  TrashIcon,
} from "@/components/admin/ui/icons";
import { ErrorNote } from "@/components/admin/Fields";
import { ImageField } from "@/components/admin/ImageField";

/**
 * One sport, as a collapsed strip that opens into a form.
 *
 * Collapsed is the default so the whole list fits without scrolling. The row is
 * controlled: `sport` is the draft the editor holds, `saved` is the last copy
 * the server sent back. That split is what lets the preview beside the form show
 * unsaved edits while the Unsaved badge still knows what is actually stored —
 * and it means collapsing a row mid-edit cannot lose anything, because the draft
 * was never kept in here.
 *
 * No autosave: nothing is written until Save card. Position is the exception —
 * dragging saves immediately, and is handled by the list.
 */
export function SportRow({
  sport,
  saved,
  onChange,
  expanded,
  onToggle,
  onSaved,
  onDeleted,
  onMove,
  isFirst,
  isLast,
  dragging,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: {
  sport: Sport;
  saved: Sport;
  onChange: (next: Sport) => void;
  expanded: boolean;
  onToggle: () => void;
  onSaved: (sport: Sport) => void;
  onDeleted: (id: string) => void;
  onMove: (delta: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  /**
   * The row only becomes draggable while the handle is held. Without this the
   * whole strip is a drag source, and selecting text in the open form below
   * starts a drag instead.
   */
  const [armed, setArmed] = useState(false);

  const dirty =
    sport.title !== saved.title ||
    sport.text !== saved.text ||
    sport.details !== saved.details ||
    sport.logo_url !== saved.logo_url ||
    sport.photo_url !== saved.photo_url ||
    sport.is_visible !== saved.is_visible;

  function set<K extends keyof Sport>(key: K, value: Sport[K]) {
    onChange({ ...sport, [key]: value });
    setJustSaved(false);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/sports/${sport.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sport),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }

      // The server has trimmed and clamped the fields; the form and the preview
      // should both show what was actually stored.
      onSaved(data.sport as Sport);
      setJustSaved(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/sports/${sport.id}`, { method: "DELETE" });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Could not delete.");
        setBusy(false);
        return;
      }

      onDeleted(sport.id);
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  /** Arrow keys move the row while the handle has focus — drag, for keyboards. */
  function handleHandleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowUp" && !isFirst) {
      event.preventDefault();
      onMove(-1);
    } else if (event.key === "ArrowDown" && !isLast) {
      event.preventDefault();
      onMove(1);
    }
  }

  return (
    <li
      draggable={armed}
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDragEnd={() => {
        setArmed(false);
        onDragEnd();
      }}
      className={cn(
        "rounded-md border bg-background/60 transition-colors",
        dragging ? "border-primary/60 opacity-40" : "border-border",
        expanded && "border-input bg-background"
      )}
    >
      {/* ─── Collapsed strip ─── */}
      <div className="flex items-center gap-2 p-1.5">
        <button
          type="button"
          aria-label={`Reorder ${sport.title || "sport"}. Use the arrow keys.`}
          onPointerDown={() => setArmed(true)}
          onPointerUp={() => setArmed(false)}
          onKeyDown={handleHandleKeyDown}
          className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded text-muted-fg/60 transition hover:bg-muted hover:text-foreground active:cursor-grabbing"
        >
          <DragIcon className="size-4" />
        </button>

        {/* White backing, as on the site: crests carry their own dark ink. */}
        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-white">
          {sport.logo_url ? (
            <img src={sport.logo_url} alt="" className="h-full w-full object-contain p-1" />
          ) : (
            <span className="text-xs font-semibold text-black">
              {sport.title.slice(0, 1).toUpperCase() || "?"}
            </span>
          )}
        </span>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block truncate text-[13px] font-medium text-foreground">
            {sport.title || "Untitled"}
          </span>
          {sport.text ? (
            <span className="block truncate text-[11px] text-muted-fg">{sport.text}</span>
          ) : null}
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          {dirty ? <Badge variant="default">Unsaved</Badge> : null}
          {!sport.is_visible ? <Badge variant="outline">Hidden</Badge> : null}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? "Close editor" : "Edit"}
          >
            <CaretDownIcon className={cn("transition-transform", expanded && "rotate-180")} />
          </Button>
        </div>
      </div>

      {/* ─── Editor ─── */}
      {expanded ? (
        <form onSubmit={handleSave} className="space-y-3 border-t border-border p-3">
          <label className="block">
            <Label>Title</Label>
            <Input
              value={sport.title}
              onChange={(event) => set("title", event.target.value)}
              maxLength={LIMITS.title}
              required
              className="mt-1.5"
            />
          </label>

          <label className="block">
            <Label>Text</Label>
            <Input
              value={sport.text}
              onChange={(event) => set("text", event.target.value)}
              maxLength={LIMITS.text}
              placeholder="Team name"
              className="mt-1.5"
            />
          </label>

          <label className="block">
            <Label>Details</Label>
            <Textarea
              value={sport.details}
              onChange={(event) => set("details", event.target.value)}
              maxLength={LIMITS.details}
              rows={3}
              placeholder="The paragraph under the team name"
              className="mt-1.5"
            />
          </label>

          <ImageField
            label="Crest"
            value={sport.logo_url}
            onChange={(url) => set("logo_url", url)}
            disabled={busy}
            variant="logo"
            hint="Shown as a badge over the photo."
          />

          <ImageField
            label="Photo"
            value={sport.photo_url}
            onChange={(url) => set("photo_url", url)}
            disabled={busy}
            hint="The picture behind the crest."
          />

          {error ? <ErrorNote>{error}</ErrorNote> : null}

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save card"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => set("is_visible", !sport.is_visible)}
              aria-pressed={sport.is_visible}
            >
              {sport.is_visible ? <EyeIcon /> : <EyeSlashIcon />}
              {sport.is_visible ? "On the site" : "Hidden"}
            </Button>

            {/* The touch path for reordering — an HTML5 drag source does not
                work there, and the handle above is drag-only. */}
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onMove(-1)}
              disabled={isFirst}
              aria-label="Move up"
            >
              <CaretDownIcon className="rotate-180" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onMove(1)}
              disabled={isLast}
              aria-label="Move down"
            >
              <CaretDownIcon />
            </Button>

            {justSaved && !dirty ? <span className="text-[11px] text-muted-fg">Saved</span> : null}

            <div className="ms-auto">
              {confirmingDelete ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-fg">Delete?</span>
                  <Button variant="destructive" size="sm" onClick={handleDelete} disabled={busy}>
                    Yes
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={busy}
                  >
                    No
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setConfirmingDelete(true)}
                  disabled={busy}
                  aria-label="Delete this sport"
                  className="hover:text-destructive"
                >
                  <TrashIcon />
                </Button>
              )}
            </div>
          </div>
        </form>
      ) : null}
    </li>
  );
}
