"use client";

import { useState } from "react";
import { LogoField } from "@/components/admin/LogoField";
import { LIMITS, type Sport } from "@/lib/sports";

/**
 * One sport, as a form.
 *
 * Each row keeps its own draft and its own Save button — no autosave, no shared
 * dirty state across the list. Editing one card cannot affect another, and
 * nothing is written until someone presses Save.
 */
export function SportEditor({
  sport,
  onSaved,
  onDeleted,
}: {
  sport: Sport;
  onSaved: (sport: Sport) => void;
  onDeleted: (id: string) => void;
}) {
  const [draft, setDraft] = useState<Sport>(sport);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  /** One setter for every field keeps the handlers below to one line each. */
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

  return (
    <form
      onSubmit={handleSave}
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="admin-label">Title</span>
          <input
            type="text"
            value={draft.title}
            onChange={(event) => set("title", event.target.value)}
            maxLength={LIMITS.title}
            required
            className="admin-field mt-2"
          />
        </label>

        <label className="block">
          <span className="admin-label">Text</span>
          <input
            type="text"
            value={draft.text}
            onChange={(event) => set("text", event.target.value)}
            maxLength={LIMITS.text}
            placeholder="Team name, shown under the title"
            className="admin-field mt-2"
          />
        </label>
      </div>

      <label className="mt-5 block">
        <span className="admin-label">Details</span>
        <textarea
          value={draft.details}
          onChange={(event) => set("details", event.target.value)}
          maxLength={LIMITS.details}
          rows={3}
          placeholder="The paragraph under the team name"
          className="admin-field mt-2 resize-y leading-relaxed"
        />
      </label>

      <div className="mt-5">
        <LogoField value={draft.logo_url} onChange={(url) => set("logo_url", url)} disabled={busy} />
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-5">
        <label className="block w-32">
          <span className="admin-label">Order</span>
          <input
            type="number"
            value={draft.sort_order}
            onChange={(event) => set("sort_order", Number(event.target.value))}
            step={10}
            className="admin-field mt-2"
          />
        </label>

        <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm text-white/70">
          <input
            type="checkbox"
            checked={draft.is_visible}
            onChange={(event) => set("is_visible", event.target.checked)}
            className="h-4 w-4 accent-racing-yellow"
          />
          Show on the site
        </label>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/5 pt-5">
        <button
          type="submit"
          disabled={busy}
          className="btn-yellow px-6 py-2.5 text-xs disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          {busy ? "Saving…" : "Save"}
        </button>

        {saved ? <span className="text-xs text-white/40">Saved — the site is updated.</span> : null}

        <div className="ml-auto">
          {confirmingDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50">Delete this sport?</span>
              <button
                type="button"
                onClick={handleDelete}
                disabled={busy}
                className="rounded-full border border-red-400/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
              >
                Yes, delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={busy}
                className="rounded-full border border-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/60 transition hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={busy}
              className="rounded-full border border-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/50 transition hover:border-red-400/60 hover:text-red-300 disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
