"use client";

import { useState } from "react";
import { TRACK_LIMITS, type Track } from "@/lib/tracks";
import { cn } from "@/lib/utils";
import { Badge } from "@/admin/ui/Badge";
import { Button } from "@/admin/ui/Button";
import { Input, Label, Textarea } from "@/admin/ui/Input";
import { CaretDownIcon, DragIcon, TrashIcon } from "@/admin/ui/icons";
import { ErrorNote, Hint, Panel, Row } from "@/admin/components/Fields";
import { ImageField } from "@/admin/components/ImageField";
// The site's own renderer, so the thumbnail here is drawn by the same code the
// page draws with — the admin has no second copy of it to drift.
import { TrackOutline } from "@/app/(site)/circuits/_components/CircuitMap";

/**
 * One circuit, as a collapsed strip that opens into its record.
 *
 * Controlled the same way a sport row is: `track` is the draft the list holds,
 * `saved` is the last copy the server sent back, and the difference between them
 * is what "Unsaved" means. Nothing is written until Save, except position, which
 * the list saves as it is dragged.
 */
export function TrackRow({
  track,
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
  track: Track;
  saved: Track;
  onChange: (next: Track) => void;
  expanded: boolean;
  onToggle: () => void;
  onSaved: (track: Track) => void;
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

  /** Only draggable while the handle is held — see SportRow for why. */
  const [armed, setArmed] = useState(false);

  // Position is not compared: the list owns it and saves it on drop.
  const dirty = (Object.keys(track) as (keyof Track)[]).some(
    (key) => key !== "sort_order" && track[key] !== saved[key]
  );

  function set<K extends keyof Track>(key: K, value: Track[K]) {
    onChange({ ...track, [key]: value });
    setJustSaved(false);
  }

  /** A plain text field. Every one on this form is the same shape. */
  function field(key: keyof Track & string, label: string, placeholder?: string, hint?: string) {
    return (
      <label className="block">
        <Label>{label}</Label>
        <Input
          value={String(track[key] ?? "")}
          onChange={(event) => set(key, event.target.value as Track[typeof key])}
          maxLength={TRACK_LIMITS[key as keyof typeof TRACK_LIMITS]}
          placeholder={placeholder}
          className="mt-1.5"
        />
        {hint ? <Hint className="mt-1">{hint}</Hint> : null}
      </label>
    );
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/tracks/${track.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(track),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }

      // The server has trimmed and cleaned every field — the path above all.
      onSaved(data.track as Track);
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
      const response = await fetch(`/api/admin/tracks/${track.id}`, { method: "DELETE" });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Could not delete.");
        setBusy(false);
        return;
      }

      onDeleted(track.id);
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
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
          aria-label={`Reorder ${track.name || "circuit"}. Use the arrow keys.`}
          onPointerDown={() => setArmed(true)}
          onPointerUp={() => setArmed(false)}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" && !isFirst) {
              event.preventDefault();
              onMove(-1);
            } else if (event.key === "ArrowDown" && !isLast) {
              event.preventDefault();
              onMove(1);
            }
          }}
          className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded text-muted-fg/60 transition hover:bg-muted hover:text-foreground active:cursor-grabbing"
        >
          <DragIcon className="size-4" />
        </button>

        <span className="flex h-9 w-14 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-background">
          {track.svg_path ? (
            <TrackOutline
              path={track.svg_path}
              viewBox={track.svg_view_box}
              className="p-1 text-primary"
            />
          ) : track.photo_url || track.map_url ? (
            <img
              src={track.photo_url || track.map_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-[10px] text-muted-fg">none</span>
          )}
        </span>

        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block truncate text-[13px] font-medium text-foreground">
            {track.name || "Untitled circuit"}
          </span>
          {track.location ? (
            <span className="block truncate text-[11px] text-muted-fg">{track.location}</span>
          ) : null}
        </button>

        <div className="flex shrink-0 items-center gap-1.5">
          {dirty ? <Badge variant="default">Unsaved</Badge> : null}
          {!track.svg_path ? <Badge variant="outline">No outline</Badge> : null}

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? "Close" : "Edit"}
          >
            <CaretDownIcon className={cn("transition-transform", expanded && "rotate-180")} />
          </Button>
        </div>
      </div>

      {/* ─── The record ─── */}
      {expanded ? (
        <form onSubmit={handleSave} className="space-y-2.5 border-t border-border p-3">
          <Panel title="Identity">
            <div className="space-y-3">
              {field("name", "Name", "Madras International Circuit")}
              {field("location", "Location", "Irungattukottai, Chennai")}
              {field(
                "former_names",
                "Former names",
                "Madras Motor Race Track; Irungattukottai Race Track"
              )}
              <Row>
                {field("owner", "Owner", "Madras Motor Sports Club")}
                {field("website", "Website", "https://…")}
              </Row>
            </div>
          </Panel>

          <Panel title="The circuit">
            <div className="space-y-3">
              <Row>
                {field("length", "Length", "3.717 km (2.310 mi)")}
                {field("turns", "Turns", "17")}
              </Row>
              <Row>
                {field("direction", "Direction", "Clockwise")}
                {field("fia_grade", "FIA grade", "2")}
              </Row>
              <Row>
                {field("opened", "Opened", "1990")}
                {field("broke_ground", "Broke ground", "1988")}
              </Row>
              <Row>
                {field("coordinates", "Coordinates", "13°0′9″N 79°59′9″E")}
                {field("capacity", "Capacity", "25,000")}
              </Row>
            </div>
          </Panel>

          <Panel title="Record">
            <div className="space-y-3">
              <Row>
                <label className="block">
                  <Label>Races held</Label>
                  <Input
                    type="number"
                    min={0}
                    value={String(track.races_held)}
                    onChange={(event) => set("races_held", Number(event.target.value) || 0)}
                    className="mt-1.5"
                  />
                </label>
                {field("lap_record_time", "Lap record", "1:30.323")}
              </Row>
              {field("lap_record_year", "Lap record year", "2020")}
              <Hint>
                Who set it, and in what, are a racer and a team — they get their own tables, so
                there is deliberately nowhere to type a name here.
              </Hint>

              <label className="block">
                <Label>Major events</Label>
                <Textarea
                  value={track.major_events}
                  onChange={(event) => set("major_events", event.target.value)}
                  maxLength={TRACK_LIMITS.major_events}
                  rows={4}
                  placeholder={"Indian Racing League\nF4 India"}
                  className="mt-1.5"
                />
                <Hint className="mt-1">One championship per line.</Hint>
              </label>

              <label className="block">
                <Label>Note</Label>
                <Textarea
                  value={track.note}
                  onChange={(event) => set("note", event.target.value)}
                  maxLength={TRACK_LIMITS.note}
                  rows={2}
                  placeholder="One line on what the circuit is like."
                  className="mt-1.5"
                />
              </label>
            </div>
          </Panel>

          <Panel title="Pictures">
            <div className="space-y-3">
              <ImageField
                label="Photograph"
                value={track.photo_url}
                onChange={(url) => set("photo_url", url)}
                disabled={busy}
                hint="The picture the calendar puts behind the next round."
              />

              <ImageField
                label="Layout map"
                variant="logo"
                value={track.map_url}
                onChange={(url) => set("map_url", url)}
                disabled={busy}
                hint="A drawing of the track, as an image. The outline below is preferred where you have it."
              />
            </div>
          </Panel>

          <Panel title="Outline">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-24 w-36 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-background">
                  {track.svg_path ? (
                    <TrackOutline
                      path={track.svg_path}
                      viewBox={track.svg_view_box}
                      className="p-2 text-primary"
                    />
                  ) : (
                    <span className="px-2 text-center text-[10px] leading-tight text-muted-fg">
                      Nothing drawn yet
                    </span>
                  )}
                </span>

                <Hint>
                  The track drawn as a line, in the page&rsquo;s own colour. Paste the{" "}
                  <code className="text-foreground">d</code> attribute of a single{" "}
                  <code className="text-foreground">&lt;path&gt;</code> — not the whole SVG file.
                  Anything that is not path data is stripped when you save, so a bad paste simply
                  does not draw.
                </Hint>
              </div>

              <label className="block">
                <Label>Path data</Label>
                <Textarea
                  value={track.svg_path}
                  onChange={(event) => set("svg_path", event.target.value)}
                  maxLength={TRACK_LIMITS.svg_path}
                  rows={4}
                  spellCheck={false}
                  placeholder="M72 196C44 188 36 152 58 132…"
                  className="mt-1.5 font-mono text-[11px]"
                />
              </label>

              {field(
                "svg_view_box",
                "View box",
                "0 0 400 260",
                "The coordinate space the path was drawn in. Copy it from the source SVG."
              )}
            </div>
          </Panel>

          {error ? <ErrorNote>{error}</ErrorNote> : null}

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save circuit"}
            </Button>

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
                  aria-label="Delete this circuit"
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
