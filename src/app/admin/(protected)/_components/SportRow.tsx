"use client";

import { useState } from "react";
import { LogoField } from "@/components/admin/LogoField";
import { LIMITS, type Sport } from "@/lib/sports";
import { cn } from "@/lib/utils";

/**
 * One sport, as a collapsed strip that opens into a form.
 *
 * Collapsed is the default so the whole list fits on one screen. The form stays
 * mounted underneath — hidden with a class rather than unmounted — so collapsing
 * a row mid-edit never throws away what was typed.
 *
 * Each row keeps its own draft and its own Save button. No autosave: nothing is
 * written until someone presses Save. Position is the exception — dragging
 * saves immediately, and is handled by the parent.
 */
export function SportRow({
  sport,
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
  const [draft, setDraft] = useState<Sport>(sport);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  /**
   * The row only becomes draggable while the handle is held. Without this the
   * whole strip is a drag source, and selecting text in the open form below
   * starts a drag instead.
   */
  const [armed, setArmed] = useState(false);

  const dirty =
    draft.title !== sport.title ||
    draft.text !== sport.text ||
    draft.details !== sport.details ||
    draft.logo_url !== sport.logo_url ||
    draft.is_visible !== sport.is_visible;

  function set<K extends keyof Sport>(key: K, value: Sport[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/sports/${draft.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }

      // Take the server's copy back — it has trimmed and clamped the fields, and
      // the form should show what was actually stored.
      setDraft(data.sport as Sport);
      onSaved(data.sport as Sport);
      setSaved(true);
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
      const response = await fetch(`/api/admin/sports/${draft.id}`, { method: "DELETE" });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Could not delete.");
        setBusy(false);
        return;
      }

      onDeleted(draft.id);
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

  const nudgeClass =
    "flex h-[15px] w-5 items-center justify-center rounded text-white/35 transition hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-20";

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
        "rounded-xl border bg-white/[0.02] transition-colors",
        dragging ? "border-racing-yellow/50 opacity-40" : "border-white/10",
        expanded && "bg-white/[0.04]"
      )}
    >
      {/* ─── Collapsed strip ─── */}
      <div className="flex items-center gap-2 px-2.5 py-2">
        <button
          type="button"
          aria-label={`Reorder ${draft.title || "sport"}. Use the arrow keys.`}
          onPointerDown={() => setArmed(true)}
          onPointerUp={() => setArmed(false)}
          onKeyDown={handleHandleKeyDown}
          className="flex h-8 w-5 shrink-0 cursor-grab items-center justify-center text-white/25 transition hover:text-white/70 active:cursor-grabbing"
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden>
            <circle cx="2" cy="3" r="1.4" />
            <circle cx="8" cy="3" r="1.4" />
            <circle cx="2" cy="8" r="1.4" />
            <circle cx="8" cy="8" r="1.4" />
            <circle cx="2" cy="13" r="1.4" />
            <circle cx="8" cy="13" r="1.4" />
          </svg>
        </button>

        {/* The touch path — dragging an HTML5 drag source does not work there. */}
        <div className="flex shrink-0 flex-col gap-px">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={isFirst}
            aria-label="Move up"
            className={nudgeClass}
          >
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path d="M2 6.5 5 3.5l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={isLast}
            aria-label="Move down"
            className={nudgeClass}
          >
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path d="M2 3.5 5 6.5l3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-carbon-900">
          {draft.logo_url ? (
            <img src={draft.logo_url} alt="" className="h-full w-full object-contain p-1" />
          ) : (
            <span className="font-display text-xs text-white/25">
              {draft.title.slice(0, 1).toUpperCase() || "?"}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-white">
              {draft.title || "Untitled"}
            </span>
            {draft.text ? (
              <span className="block truncate text-[11px] text-white/40">{draft.text}</span>
            ) : null}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          {dirty ? (
            <span className="rounded-full bg-racing-yellow/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-racing-yellow">
              Unsaved
            </span>
          ) : null}
          {!draft.is_visible ? (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/45">
              Hidden
            </span>
          ) : null}

          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? "Close editor" : "Edit"}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden
              className={cn("transition-transform duration-200", expanded && "rotate-180")}
            >
              <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* ─── Editor. Kept mounted so a draft survives collapsing. ─── */}
      <form onSubmit={handleSave} className={cn("border-t border-white/5 p-3", !expanded && "hidden")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="admin-label">Title</span>
            <input
              type="text"
              value={draft.title}
              onChange={(event) => set("title", event.target.value)}
              maxLength={LIMITS.title}
              required
              className="admin-field mt-1.5 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="admin-label">Text</span>
            <input
              type="text"
              value={draft.text}
              onChange={(event) => set("text", event.target.value)}
              maxLength={LIMITS.text}
              placeholder="Team name"
              className="admin-field mt-1.5 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="admin-label">Details</span>
            <textarea
              value={draft.details}
              onChange={(event) => set("details", event.target.value)}
              maxLength={LIMITS.details}
              rows={4}
              placeholder="The paragraph under the team name"
              className="admin-field mt-1.5 resize-y py-2 text-sm leading-relaxed"
            />
          </label>

          <LogoField
            value={draft.logo_url}
            onChange={(url) => set("logo_url", url)}
            disabled={busy}
          />
        </div>

        {error ? (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-white/5 pt-3">
          <button
            type="submit"
            disabled={busy}
            className="btn-yellow px-5 py-2 text-[11px] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {busy ? "Saving…" : "Save"}
          </button>

          <label className="flex cursor-pointer items-center gap-2 text-xs text-white/60">
            <input
              type="checkbox"
              checked={draft.is_visible}
              onChange={(event) => set("is_visible", event.target.checked)}
              className="h-3.5 w-3.5 accent-racing-yellow"
            />
            Show on the site
          </label>

          {saved ? <span className="text-[11px] text-white/35">Saved.</span> : null}

          <div className="ml-auto">
            {confirmingDelete ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-white/45">Delete?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy}
                  className="rounded-lg border border-red-400/50 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  disabled={busy}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/60 transition hover:text-white disabled:opacity-50"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                disabled={busy}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/45 transition hover:border-red-400/60 hover:text-red-300 disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </form>
    </li>
  );
}
