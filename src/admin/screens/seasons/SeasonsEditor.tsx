"use client";

import { useEffect, useState } from "react";
import { folderForEntity, folderForModule } from "@/lib/mediaPaths";
import { SEASON_STATUS_LABELS, type Season } from "@/lib/seasons";
import type { SlugHolder } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { Button } from "@/admin/ui/Button";
import { Label, Select } from "@/admin/ui/Input";
import { PlusIcon, TrophyIcon } from "@/admin/ui/icons";
import { useSite, withSite } from "@/admin/components/SiteScope";
import { AdminRailSlot } from "@/admin/components/AdminShell";
import { EditorToolbar } from "@/admin/components/EditorToolbar";
import { Note, Panel } from "@/admin/components/Fields";
import { NewRecord } from "@/admin/components/NewRecord";
import { SectionRail, type RailItem } from "@/admin/components/SectionRail";
import { UploadFolder } from "@/admin/components/UploadFolder";
import { SeasonForm } from "./SeasonForm";

/**
 * One sport's seasons.
 *
 * The same three-part screen as every other editor — rail, toolbar, fields —
 * with two things left out on purpose:
 *
 *   no preview   a season's page is its rounds, and they are edited on the next
 *                screen along. A preview here would be a heading over a list
 *                nothing on this screen can change.
 *   no dragging  the order is the year, and it is a number on the form. See the
 *                note on that field.
 *
 * A season's round count comes down with it and is kept in step locally, because
 * it is what the delete has to say out loud: 0021 declares the rounds ON DELETE
 * CASCADE, so removing a season removes them unless they are moved first.
 */

/** A season, plus how many rounds would go with it. What `listSeasons` returns. */
export type SeasonRow = Season & { rounds: number };

export function SeasonsEditor({
  initialSeasons,
  siteUrl,
}: {
  initialSeasons: SeasonRow[];
  siteUrl: string;
}) {
  // The sport this screen belongs to. Every write below names it, so the server
  // guards the right one — see SiteScope.
  const site = useSite();
  const [seasons, setSeasons] = useState<SeasonRow[]>(initialSeasons);
  const [saved, setSaved] = useState<SeasonRow[]>(initialSeasons);

  const [activeId, setActiveId] = useState<string | null>(initialSeasons[0]?.id ?? null);
  const [fieldsOpen, setFieldsOpen] = useState(true);

  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** What the server tidied on the last write, and WHICH season it tidied. */
  const [notes, setNotes] = useState<{ id: string; list: string[] } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  /** Where the rounds go when the season is deleted. "" deletes them with it. */
  const [moveTo, setMoveTo] = useState("");
  const [adding, setAdding] = useState(false);

  const active = seasons.find((season) => season.id === activeId) ?? null;
  const activeSaved = saved.find((season) => season.id === activeId) ?? null;

  /*
   * Everything belonging to the OPEN season is dropped when a different one is
   * opened — the delete confirmation above all. Left standing it is a red button
   * aimed at whichever season is now selected, which here would take that
   * season's rounds with it.
   */
  useEffect(() => {
    setConfirmingDelete(false);
    setMoveTo("");
    setJustSaved(false);
    setError(null);
    setAdding(false);
  }, [activeId]);

  const dirty =
    active && activeSaved
      ? (Object.keys(active) as (keyof SeasonRow)[]).some(
          (key) => key !== "rounds" && active[key] !== activeSaved[key]
        )
      : false;

  /* ─────────────────────────── Writes ─────────────────────────── */

  async function handleSave() {
    if (!active) return;

    setBusy(true);
    setError(null);
    setNotes(null);

    try {
      const response = await fetch(withSite(`/api/admin/seasons/${active.id}`, site), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(active),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not save this season.");
        return;
      }

      /*
       * The server's copy replaces the draft. A change of address moves the
       * season's folder and rewrites the cover to the new one, so keeping the
       * sent copy would leave the editor holding a path that no longer exists —
       * and the next save would write it back over the rewritten row.
       *
       * The round count is not in the response and is not meant to be: nothing
       * this route does changes it.
       */
      const season = data.season as Season;
      const merge = (current: SeasonRow[]) =>
        current.map((entry) =>
          entry.id === season.id ? { ...season, rounds: entry.rounds } : entry
        );

      setSeasons(merge);
      setSaved(merge);
      setNotes({ id: season.id, list: Array.isArray(data.notes) ? data.notes : [] });
      setJustSaved(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Creates the season at the name and address the panel collected.
   *
   * The year goes in from the name when it starts with one — `normaliseSeasonInput`
   * reads it the same way for the address, so "2026 Season" lands at `/calendar/2026`
   * ordered above 2025 without anybody filling in a number.
   */
  async function handleCreate(name: string, slug: string) {
    setBusy(true);
    setError(null);
    setNotes(null);

    try {
      const response = await fetch(withSite("/api/admin/seasons", site), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug, status: "draft" }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Left open, holding what was typed. The address is the likely reason,
        // and closing the panel would throw away the name along with it.
        setError(data.error ?? "Could not add a season.");
        return;
      }

      const season = { ...(data.season as Season), rounds: 0 };

      // Newest first, like the server's list — a season being announced belongs
      // at the top, which is also where the eye goes after pressing Add.
      setSeasons((current) => [season, ...current]);
      setSaved((current) => [season, ...current]);
      setActiveId(season.id);
      setAdding(false);
      setNotes({ id: season.id, list: Array.isArray(data.notes) ? data.notes : [] });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * An address handed over from another season's history, dropped from the copy
   * of that season held on this screen.
   */
  function forgetSlug(holder: SlugHolder, slug: string) {
    const drop = (season: SeasonRow) =>
      season.id === holder.id
        ? { ...season, former_slugs: season.former_slugs.filter((entry) => entry !== slug) }
        : season;

    setSeasons((current) => current.map(drop));
    setSaved((current) => current.map(drop));
  }

  async function handleDelete() {
    if (!active) return;

    setBusy(true);
    setError(null);

    /*
     * The round count goes UP with the request.
     *
     * The route refuses unless it matches what it finds, so a season that gained
     * a round in another tab since this dialog opened is refused rather than
     * quietly taking one more than was agreed to. `moveTo` is the other way out:
     * the rounds are moved first and nothing is lost.
     */
    const query = moveTo ? `moveTo=${moveTo}` : `rounds=${active.rounds}`;

    try {
      const response = await fetch(
        withSite(`/api/admin/seasons/${active.id}?${query}`, site),
        { method: "DELETE" }
      );

      const data = await response.json().catch(() => ({}));

      // A 404 means it is already gone, which is what was being asked for.
      if (!response.ok && response.status !== 404) {
        setError(data.error ?? "Could not delete this season.");
        return;
      }

      const gone = active.id;
      const remaining = seasons.filter((season) => season.id !== gone);

      /*
       * The destination's count goes up by what was moved. Nothing re-reads the
       * list here, so without this the next delete would send a stale number and
       * be refused by the check above — which is exactly what that check is for,
       * and not a refusal anybody would understand.
       */
      const moved = moveTo ? active.rounds : 0;
      const bump = (list: SeasonRow[]) =>
        list.map((season) =>
          season.id === moveTo ? { ...season, rounds: season.rounds + moved } : season
        );

      // Open a neighbour rather than nothing: an empty right-hand pane after a
      // delete reads as a screen that has broken.
      const position = seasons.findIndex((season) => season.id === gone);
      setActiveId(remaining[Math.min(position, remaining.length - 1)]?.id ?? null);

      setSeasons(bump(remaining));
      setSaved((current) => bump(current.filter((season) => season.id !== gone)));
      setConfirmingDelete(false);
      setMoveTo("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function update(next: Season) {
    setSeasons((current) =>
      current.map((season) =>
        season.id === next.id ? { ...next, rounds: season.rounds } : season
      )
    );
    setJustSaved(false);
  }

  /* ─────────────────────────── Screen ─────────────────────────── */

  const nameOf = (season: SeasonRow) => season.name || season.slug || "Untitled season";

  const railItems: RailItem<string>[] = seasons.map((season) => ({
    id: season.id,
    short: nameOf(season),
    title: nameOf(season),
    hint: [
      season.rounds === 1 ? "1 round" : `${season.rounds} rounds`,
      SEASON_STATUS_LABELS[season.status],
    ].join(" · "),
    // No `onReorder` is passed to the rail, so nothing here can be dragged.
    visible: true,
    Icon: TrophyIcon,
  }));

  /*
   * Where this season's cover goes — from the SAVED record, never the draft.
   * Using the draft would upload into a folder named after a half-typed slug,
   * and abandoning the save would leave that file orphaned in a folder that
   * never comes to exist.
   */
  const uploadFolder = activeSaved
    ? folderForEntity(site.slug, "seasons", activeSaved.slug, activeSaved.id)
    : folderForModule(site.slug, "seasons");

  /** Somewhere for the rounds to go, when this season is being deleted. */
  const elsewhere = seasons.filter((season) => season.id !== activeId);

  return (
    <UploadFolder folder={uploadFolder}>
      <div className="flex min-h-0 flex-col gap-2 md:h-full">
        <AdminRailSlot>
          <SectionRail
            heading="Seasons"
            items={railItems}
            active={activeId ?? ""}
            onSelect={setActiveId}
          />
        </AdminRailSlot>

        <EditorToolbar
          Icon={TrophyIcon}
          title={active ? nameOf(active) : "Seasons"}
          hint={
            adding
              ? "Give the new season a name and an address."
              : active
                ? "The rounds themselves are on the Rounds screen."
                : "No seasons yet — add the first one."
          }
          dirty={dirty}
          justSaved={justSaved}
          busy={busy}
          // Said once. While the new-season panel is open it owns the failure,
          // because the field that caused it is in that panel.
          error={adding ? null : error}
          onSave={handleSave}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAdding(true);
                setConfirmingDelete(false);
                setError(null);
                setNotes(null);
              }}
              disabled={busy || adding}
            >
              <PlusIcon />
              Add season
            </Button>
          }
          fieldsOpen={fieldsOpen}
          onToggleFields={() => setFieldsOpen((open) => !open)}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row">
          <div
            className={cn(
              "min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-card md:overflow-y-auto",
              fieldsOpen ? "lg:mx-auto lg:w-[560px] lg:flex-none xl:w-[640px]" : "lg:hidden"
            )}
          >
            <div className="space-y-2.5 bg-background/40 p-3">
              {/* Anything the server had to change on the way in. Silence here is
                  how an address quietly stops being the one on the poster. */}
              {active && notes && notes.id === active.id && notes.list.length > 0 ? (
                <Panel title="Saved, with changes">
                  <ul className="space-y-1">
                    {notes.list.map((note) => (
                      <li key={note} className="text-xs leading-relaxed text-foreground">
                        {note}
                      </li>
                    ))}
                  </ul>
                  <Note className="mt-2">
                    These are what the server tidied up. Nothing else was touched.
                  </Note>
                </Panel>
              ) : null}

              {adding ? (
                <NewRecord
                  kind="season"
                  title="New season"
                  namePlaceholder="2026 Season"
                  busy={busy}
                  error={error}
                  onCreate={handleCreate}
                  onCancel={() => {
                    setAdding(false);
                    setError(null);
                  }}
                  onReleased={forgetSlug}
                />
              ) : active ? (
                confirmingDelete ? (
                  <div className="space-y-2.5 rounded-md border border-destructive/40 bg-destructive/10 p-3">
                    <p className="text-xs leading-relaxed text-foreground">
                      Delete <span className="font-medium">{nameOf(active)}</span>? Its address
                      stops working. This cannot be undone.
                    </p>

                    {/* The rounds are the part worth stopping over: they are
                        separate records with their own addresses and reports,
                        and the CASCADE takes them without naming them. */}
                    {active.rounds > 0 ? (
                      <div className="block">
                        <Label>
                          {active.rounds === 1 ? "Its round" : `Its ${active.rounds} rounds`}
                        </Label>
                        <Select
                          value={moveTo}
                          onChange={(e) => setMoveTo(e.target.value)}
                          disabled={busy}
                          className="mt-1.5 w-full"
                        >
                          <option value="">— delete them with the season —</option>
                          {elsewhere.map((season) => (
                            <option key={season.id} value={season.id}>
                              Move to {nameOf(season)}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ) : null}

                    <div className="flex gap-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDelete}
                        disabled={busy}
                      >
                        {busy ? "Deleting…" : "Delete season"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setConfirmingDelete(false);
                          setMoveTo("");
                        }}
                        disabled={busy}
                      >
                        Keep it
                      </Button>
                    </div>
                  </div>
                ) : (
                  <SeasonForm
                    season={active}
                    rounds={active.rounds}
                    siteUrl={siteUrl}
                    onChange={update}
                    onDelete={() => setConfirmingDelete(true)}
                    onReleasedSlug={forgetSlug}
                    busy={busy}
                  />
                )
              ) : (
                <p className="rounded-md border border-dashed border-input px-4 py-10 text-center text-xs text-muted-fg">
                  No seasons yet. Use <span className="text-foreground">Add season</span> above to
                  announce the first one — the rounds are filed under it.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </UploadFolder>
  );
}
