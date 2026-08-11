"use client";

import { useState } from "react";
import { BLANK_SPORT, type Sport } from "@/lib/sports";
import { SportEditor } from "./SportEditor";

/**
 * The list. Owns the array; each row owns its own draft.
 *
 * "Add sport" writes an empty row to the database straight away rather than
 * holding an unsaved card in memory. That way every card on screen is a real
 * row with a real id, and SportEditor only ever has to handle one case.
 */
export function SportsAdmin({ initialSports }: { initialSports: Sport[] }) {
  const [sports, setSports] = useState(initialSports);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Same rule as the landing page, so the admin list is in the page's order. */
  function sortSports(list: Sport[]): Sport[] {
    return [...list].sort(
      (a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title)
    );
  }

  async function handleAdd() {
    setAdding(true);
    setError(null);

    // Ten past the current last card, leaving room to slot things in between.
    const lastOrder = sports.length ? Math.max(...sports.map((sport) => sport.sort_order)) : 0;

    try {
      const response = await fetch("/api/admin/sports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...BLANK_SPORT,
          title: "New sport",
          sort_order: lastOrder + 10,
          // A blank card should not appear on the site until it has been filled in.
          is_visible: false,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not add a sport.");
        return;
      }

      setSports((current) => sortSports([...current, data.sport as Sport]));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  function handleSaved(saved: Sport) {
    setSports((current) =>
      sortSports(current.map((sport) => (sport.id === saved.id ? saved : sport)))
    );
  }

  function handleDeleted(id: string) {
    setSports((current) => current.filter((sport) => sport.id !== id));
  }

  return (
    <div>
      {error ? (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </p>
      ) : null}

      {sports.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/10 px-5 py-10 text-center text-sm text-white/40">
          No sports yet. Add the first one below.
        </p>
      ) : (
        <div className="space-y-5">
          {sports.map((sport) => (
            <SportEditor
              key={sport.id}
              sport={sport}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={adding}
        className="mt-6 w-full rounded-2xl border border-dashed border-white/15 px-5 py-4 font-display text-xs font-bold uppercase tracking-[0.18em] text-white/50 transition hover:border-racing-yellow/50 hover:text-racing-yellow disabled:cursor-not-allowed disabled:opacity-50"
      >
        {adding ? "Adding…" : "+ Add sport"}
      </button>
    </div>
  );
}
