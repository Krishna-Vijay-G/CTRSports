"use client";

import { useRef, useState } from "react";
import type { Round } from "@/lib/incrcContent";
import type { LandingContent } from "@/lib/landingContent";
import { BLANK_TRACK, type Track } from "@/lib/tracks";
import { cn } from "@/lib/utils";
import { Button } from "@/admin/ui/Button";
import { MapIcon, PanelIcon, PlusIcon } from "@/admin/ui/icons";
import { ErrorNote, Note } from "@/admin/components/Fields";
import { CircuitPreview } from "@/admin/components/previews/CircuitPreview";
import { TrackRow } from "./TrackRow";

/**
 * The circuits.
 *
 * A screen of its own rather than a panel inside the INCRC editor, because a
 * circuit is not part of the INCRC page: it outlives the season, and the same
 * row is pointed at by every round that visits it. Editing it beside one page's
 * copy would suggest otherwise.
 *
 * Every row saves itself, the way sport cards do — there is no document here to
 * write whole, and a screen full of independent records should not have one Save
 * that writes all of them.
 *
 * Array position IS the display order; `sort_order` is only how it is stored.
 * Anything that moves a row reorders the array first and posts the id list
 * afterwards, so the screen never waits on the network.
 *
 * The preview beside the list is the real /circuits page drawn from the draft,
 * and it follows the open row: open one and it is that circuit's page, close it
 * and it is the index. It is the only way to check the one field here whose
 * value cannot be read as text — the outline path.
 */
export function TracksEditor({
  initialTracks,
  chrome,
  rounds,
  year,
}: {
  initialTracks: Track[];
  /** The landing document — the header and footer the preview draws. */
  chrome: LandingContent;
  /** The season, so the preview can show which weekends visit a circuit. */
  rounds: Round[];
  year: number;
}) {
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [saved, setSaved] = useState<Track[]>(initialTracks);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Folds the list away and hands the whole width to the preview. */
  const [listOpen, setListOpen] = useState(true);

  /** The order last written, so a no-op drag posts nothing. */
  const savedOrder = useRef(initialTracks.map((track) => track.id).join(","));

  async function persistOrder(list: Track[]) {
    const ids = list.map((track) => track.id);
    const key = ids.join(",");
    if (key === savedOrder.current) return;

    // Optimistic: the list is already in the new order on screen. Only failure
    // needs saying, and the old order is still in the database if so.
    savedOrder.current = key;
    setError(null);

    try {
      const response = await fetch("/api/admin/tracks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Could not save the new order.");
      }
    } catch {
      setError("Network error while saving the order.");
    }
  }

  function move(id: string, delta: -1 | 1) {
    const from = tracks.findIndex((track) => track.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= tracks.length) return;

    const next = [...tracks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    setTracks(next);
    void persistOrder(next);
  }

  function moveTo(id: string, targetId: string) {
    if (id === targetId) return;

    const from = tracks.findIndex((track) => track.id === id);
    const to = tracks.findIndex((track) => track.id === targetId);
    if (from < 0 || to < 0) return;

    const next = [...tracks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setTracks(next);
  }

  async function add() {
    setAdding(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...BLANK_TRACK,
          name: "New circuit",
          sort_order: (tracks.length + 1) * 10,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not add the circuit.");
        return;
      }

      const track = data.track as Track;
      setTracks((current) => [...current, track]);
      setSaved((current) => [...current, track]);
      savedOrder.current = [...tracks.map((t) => t.id), track.id].join(",");
      setExpandedId(track.id);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  function replace(next: Track) {
    setTracks((current) => current.map((t) => (t.id === next.id ? next : t)));
  }

  function markSaved(next: Track) {
    replace(next);
    setSaved((current) => current.map((t) => (t.id === next.id ? next : t)));
  }

  function remove(id: string) {
    setTracks((current) => current.filter((t) => t.id !== id));
    setSaved((current) => current.filter((t) => t.id !== id));
    savedOrder.current = tracks
      .filter((t) => t.id !== id)
      .map((t) => t.id)
      .join(",");
    if (expandedId === id) setExpandedId(null);
  }

  /** What the preview is showing: the open circuit, or the index. */
  const selected = tracks.find((track) => track.id === expandedId) ?? null;

  return (
    <div className="flex min-h-0 flex-col gap-2 md:h-full">
      <div className="flex shrink-0 items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2">
        <MapIcon className="size-5 shrink-0 text-muted-fg" />

        <div className="mr-auto min-w-0">
          <h1 className="truncate text-[13px] font-medium tracking-tight text-foreground">
            Circuits
          </h1>
          <p className="truncate text-[11px] text-muted-fg">
            {selected
              ? "Previewing this circuit’s page. Each row saves itself."
              : "The tracks the championship runs on. The calendar points at these."}
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={add} disabled={adding}>
          <PlusIcon />
          {adding ? "Adding…" : "Add circuit"}
        </Button>

        <div className="hidden h-6 w-px bg-border lg:block" />

        {/* Mirrored, so it reads as the pane on the right — the same handle
            every other editor puts here. */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setListOpen((open) => !open)}
          aria-expanded={listOpen}
          aria-label={listOpen ? "Hide the list" : "Show the list"}
          title={listOpen ? "Hide the list" : "Show the list"}
          className="hidden lg:flex"
        >
          <PanelIcon className="scale-x-[-1]" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row">
        {/*
          Hidden below lg: at that width the fields already fill the screen, and
          a preview shrunk into what is left would be unreadable rather than
          useful.
        */}
        <CircuitPreview
          tracks={tracks}
          track={selected}
          chrome={chrome}
          rounds={rounds}
          year={year}
          className="hidden lg:block lg:min-w-0 lg:flex-1"
        />

        <div
          className={cn(
            "min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-card md:overflow-y-auto",
            listOpen ? "lg:w-[440px] lg:flex-none xl:w-[520px]" : "lg:hidden"
          )}
        >
          <div className="space-y-2.5 bg-background/40 p-3">
            {error ? <ErrorNote>{error}</ErrorNote> : null}

            {tracks.length === 0 ? (
              <p className="rounded-md border border-dashed border-input px-4 py-10 text-center text-xs text-muted-fg">
                No circuits yet.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {tracks.map((track, index) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    saved={saved.find((t) => t.id === track.id) ?? track}
                    onChange={replace}
                    expanded={expandedId === track.id}
                    onToggle={() => setExpandedId(expandedId === track.id ? null : track.id)}
                    onSaved={markSaved}
                    onDeleted={remove}
                    onMove={(delta) => move(track.id, delta)}
                    isFirst={index === 0}
                    isLast={index === tracks.length - 1}
                    dragging={dragId === track.id}
                    onDragStart={() => setDragId(track.id)}
                    onDragEnter={() => (dragId ? moveTo(dragId, track.id) : undefined)}
                    onDragEnd={() => {
                      setDragId(null);
                      void persistOrder(tracks);
                    }}
                  />
                ))}
              </ul>
            )}

            <Note>
              Racers and teams are not here on purpose. The lap record holder and the car it was
              set in belong to tables of their own, and this screen will point at them once those
              exist.
            </Note>
          </div>
        </div>
      </div>
    </div>
  );
}
