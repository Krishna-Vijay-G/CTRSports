"use client";

import { useRef, useState } from "react";
import { BLANK_SPORT, type Sport } from "@/lib/sports";
import { Button } from "@/components/admin/ui/Button";
import { PlusIcon } from "@/components/admin/ui/icons";
import { ErrorNote } from "@/components/admin/Fields";
import { SportRow } from "./SportRow";

/**
 * The sport cards.
 *
 * Controlled by the landing editor, which holds two arrays: `sports` — what is
 * on screen and therefore in the preview — and `saved`, the last copy the server
 * sent back. Every row compares the two to know whether it is unsaved.
 *
 * Array position IS the display order; `sort_order` is only how it is stored.
 * Everything that moves a row reorders the array first and posts the resulting
 * id list afterwards, so the screen never waits on the network.
 *
 * One row is open at a time, which is what keeps the list on one screen.
 */
export function SportsList({
  sports,
  saved,
  onSportsChange,
  onSavedChange,
}: {
  sports: Sport[];
  saved: Sport[];
  onSportsChange: (next: Sport[]) => void;
  onSavedChange: (next: Sport[]) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** The order last written to the database, so a no-op drag posts nothing. */
  const savedOrder = useRef(sports.map((sport) => sport.id).join(","));

  async function persistOrder(list: Sport[]) {
    const ids = list.map((sport) => sport.id);
    const key = ids.join(",");
    if (key === savedOrder.current) return;

    // Optimistic: the list is already in the new order on screen. Only a failure
    // needs saying, and the previous order is still in the database if so.
    savedOrder.current = key;
    setError(null);

    try {
      // PATCH on the collection, not a /sports/reorder path — that would be
      // swallowed by the [id] route.
      const response = await fetch("/api/admin/sports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Could not save the new order.");
      }
    } catch {
      setError("Could not save the new order — the site still shows the old one.");
    }
  }

  /** Moves `id` to sit where `targetId` currently is. */
  function reorder(list: Sport[], id: string, targetId: string): Sport[] {
    const from = list.findIndex((sport) => sport.id === id);
    const to = list.findIndex((sport) => sport.id === targetId);
    if (from < 0 || to < 0 || from === to) return list;

    const next = [...list];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  }

  function handleMove(index: number, delta: -1 | 1) {
    const target = sports[index + delta];
    if (!target) return;

    const next = reorder(sports, sports[index].id, target.id);
    onSportsChange(next);
    persistOrder(next);
  }

  /**
   * Reorders live as the pointer passes over a row, so the list shows where the
   * card will land rather than only rearranging on drop.
   */
  function handleDragEnter(targetId: string) {
    if (!dragId || dragId === targetId) return;
    onSportsChange(reorder(sports, dragId, targetId));
  }

  function handleDragEnd() {
    setDragId(null);
    persistOrder(sports);
  }

  async function handleAdd() {
    setAdding(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/sports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...BLANK_SPORT,
          title: "New sport",
          // A blank card should not reach the site until it has been filled in.
          is_visible: false,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not add a sport.");
        return;
      }

      const created = data.sport as Sport;
      const next = [...sports, created];
      onSportsChange(next);
      onSavedChange([...saved, created]);
      // Open it straight away — an empty card is only useful once filled in.
      setExpandedId(created.id);
      // Whatever sort_order the insert picked, the list's own order is correct.
      persistOrder(next);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  /** A row saved: the draft and the stored copy are the same thing again. */
  function handleSaved(stored: Sport) {
    const replace = (list: Sport[]) =>
      list.map((sport) => (sport.id === stored.id ? stored : sport));
    onSportsChange(replace(sports));
    onSavedChange(replace(saved));
  }

  function handleDeleted(id: string) {
    const next = sports.filter((sport) => sport.id !== id);
    onSportsChange(next);
    onSavedChange(saved.filter((sport) => sport.id !== id));
    if (expandedId === id) setExpandedId(null);
    // The remaining rows close the gap; renumbering keeps the spacing even.
    persistOrder(next);
  }

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-fg">Drag the handle to reorder.</p>

        <Button variant="outline" size="xs" onClick={handleAdd} disabled={adding}>
          <PlusIcon />
          {adding ? "Adding…" : "Add sport"}
        </Button>
      </div>

      {error ? (
        <div className="mb-2.5">
          <ErrorNote>{error}</ErrorNote>
        </div>
      ) : null}

      {sports.length === 0 ? (
        <p className="rounded-md border border-dashed border-input px-4 py-8 text-center text-xs text-muted-fg">
          No sports yet. Add the first one above.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {sports.map((sport, index) => (
            <SportRow
              key={sport.id}
              sport={sport}
              // A row with no stored copy cannot exist, but comparing against
              // itself is the harmless answer if one ever did.
              saved={saved.find((entry) => entry.id === sport.id) ?? sport}
              onChange={(next) =>
                onSportsChange(sports.map((entry) => (entry.id === next.id ? next : entry)))
              }
              expanded={expandedId === sport.id}
              onToggle={() => setExpandedId(expandedId === sport.id ? null : sport.id)}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
              onMove={(delta) => handleMove(index, delta)}
              isFirst={index === 0}
              isLast={index === sports.length - 1}
              dragging={dragId === sport.id}
              onDragStart={() => setDragId(sport.id)}
              onDragEnter={() => handleDragEnter(sport.id)}
              onDragEnd={handleDragEnd}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
