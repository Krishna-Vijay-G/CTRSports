"use client";

import { useEffect, useRef, useState } from "react";
import { BLANK_DECK, DECK_STATUS_LABELS, type Deck } from "@/lib/decks";
import { DECK_UPLOAD_FOLDER, folderForEntity } from "@/lib/mediaPaths";
import type { LandingContent } from "@/lib/landingContent";
import type { SlugHolder } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { Button } from "@/admin/ui/Button";
import { ImagesIcon, PlusIcon } from "@/admin/ui/icons";
import { AdminRailSlot } from "@/admin/components/AdminShell";
import { EditorToolbar } from "@/admin/components/EditorToolbar";
import { Note, Panel } from "@/admin/components/Fields";
import { NewRecord } from "@/admin/components/NewRecord";
import { UploadFolder } from "@/admin/components/UploadFolder";
import { SectionRail, type RailItem } from "@/admin/components/SectionRail";
import { DeckPreview } from "@/admin/components/previews/DeckPreview";
import { DeckForm } from "./DeckForm";

/**
 * The decks, on the same three-column screen as every other editor.
 *
 * Sidebar, preview, fields — the shape the circuits screen uses, and for the
 * same reason: a deck IS the unit of work here, so the rail lists the decks
 * themselves rather than the sections of one page. Picking one opens its record
 * on the right and its page in the middle.
 *
 * Each deck is its own row, so Save writes the open one and only the open one.
 * Position is the exception: it belongs to the list rather than to any row, so a
 * drag saves itself, debounced, without touching anything else. What that order
 * decides is which deck a picker lists first — a deck's own page does not care.
 */

/** A drag crosses several rows; wait for it to settle before writing. */
const ORDER_SAVE_DELAY = 500;

export function DecksEditor({
  initialDecks,
  chrome,
  siteUrl,
  year,
}: {
  initialDecks: Deck[];
  /** The landing document — the header and footer the preview draws. */
  chrome: LandingContent;
  /**
   * Where the public site answers. The admin is on a different hostname, so a
   * relative link to a deck's page from here would resolve against the admin
   * host and 404.
   */
  siteUrl: string;
  year: number;
}) {
  const [decks, setDecks] = useState<Deck[]>(initialDecks);
  const [saved, setSaved] = useState<Deck[]>(initialDecks);

  const [activeId, setActiveId] = useState<string | null>(initialDecks[0]?.id ?? null);
  const [fieldsOpen, setFieldsOpen] = useState(true);

  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * What the server tidied up on the last write, and WHICH deck it tidied.
   *
   * The id travels with the list because these are shown beside the fields:
   * notes about the deck you just saved, still on screen after you open a
   * different one, read as notes about that one.
   */
  const [notes, setNotes] = useState<{ id: string; list: string[] } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  /**
   * Whether the "new deck" panel is open.
   *
   * Adding is a step now rather than a click, because the address has to be
   * asked for before the row exists — see the note on `NewRecord`.
   */
  const [adding, setAdding] = useState(false);

  const active = decks.find((deck) => deck.id === activeId) ?? null;
  const activeSaved = saved.find((deck) => deck.id === activeId) ?? null;

  /*
   * Everything that belongs to the OPEN deck is dropped when a different one is
   * opened. The delete confirmation above all: left standing, it is a red
   * button aimed at whichever deck is now selected — the one unrecoverable
   * action on the screen, fired by a stale flag. That exact bug was found in
   * the forms editor; it is not being written a second time.
   */
  useEffect(() => {
    setConfirmingDelete(false);
    setJustSaved(false);
    setError(null);
    // Picking a deck out of the rail is a way of saying "not that, this" — a
    // half-filled new-deck panel left over the top of it hides what was asked
    // for. Not in the same breath as `setActiveId(deck.id)` after a create,
    // which sets it false itself: this runs on every change of the open deck.
    setAdding(false);
  }, [activeId]);

  // Position is not compared: the list owns it and saves it on its own.
  const dirty =
    active && activeSaved
      ? (Object.keys(active) as (keyof Deck)[]).some(
          (key) => key !== "sort_order" && active[key] !== activeSaved[key]
        )
      : false;

  /* ─────────────────────────── Order ─────────────────────────── */

  /** The order last written, so a drag that ends where it began posts nothing. */
  const savedOrder = useRef(initialDecks.map((deck) => deck.id).join(","));
  const orderTimer = useRef<number | null>(null);
  const pendingOrder = useRef<string[] | null>(null);

  // A drag left in flight when the screen closes is FLUSHED, not dropped:
  // clearing the timer on its own is how a reorder is silently lost by
  // navigating within half a second of making it.
  useEffect(() => {
    return () => {
      if (orderTimer.current === null) return;
      window.clearTimeout(orderTimer.current);

      const ids = pendingOrder.current;
      if (!ids || ids.join(",") === savedOrder.current) return;

      // `keepalive` so it survives the page it was fired from going away.
      void fetch("/api/admin/decks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
        keepalive: true,
      });
    };
  }, []);

  async function writeOrder(ids: string[]) {
    const key = ids.join(",");
    if (key === savedOrder.current) return;

    setError(null);

    try {
      const response = await fetch("/api/admin/decks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Could not save the new order.");
        return;
      }

      // Only after it has landed. Set beforehand, a failed reorder could never
      // be retried — dragging back would early-return as "already saved".
      savedOrder.current = key;
    } catch {
      setError("Network error while saving the order.");
    }
  }

  function queueOrder(list: Deck[]) {
    pendingOrder.current = list.map((deck) => deck.id);

    if (orderTimer.current !== null) window.clearTimeout(orderTimer.current);
    orderTimer.current = window.setTimeout(() => {
      orderTimer.current = null;
      const ids = pendingOrder.current;
      if (ids) void writeOrder(ids);
    }, ORDER_SAVE_DELAY);
  }

  /** Moves `fromId` to the place `toId` currently holds. */
  function reorder(fromId: string, toId: string) {
    if (fromId === toId) return;

    setDecks((current) => {
      const from = current.findIndex((deck) => deck.id === fromId);
      const to = current.findIndex((deck) => deck.id === toId);
      if (from < 0 || to < 0) return current;

      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);

      queueOrder(next);
      return next;
    });
  }

  /* ─────────────────────────── Writes ─────────────────────────── */

  async function handleSave() {
    if (!active) return;

    setBusy(true);
    setError(null);
    setNotes(null);

    try {
      const response = await fetch(`/api/admin/decks/${active.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(active),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not save this deck.");
        return;
      }

      // The server has trimmed the copy, tidied the address and dropped any
      // page with no picture on it, so the draft is replaced with what actually
      // landed rather than what was sent.
      const deck = data.deck as Deck;
      setDecks((current) => current.map((d) => (d.id === deck.id ? deck : d)));
      setSaved((current) => current.map((d) => (d.id === deck.id ? deck : d)));
      setNotes({ id: deck.id, list: Array.isArray(data.notes) ? data.notes : [] });
      setJustSaved(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Creates the deck at the name and address the panel collected.
   *
   * The address is sent, so the server honours it or refuses it — the suffix
   * loop that used to turn a collision into `new-deck-2` behind the admin's back
   * only runs for a request that names no address at all.
   */
  async function handleCreate(name: string, slug: string) {
    setBusy(true);
    setError(null);
    setNotes(null);

    try {
      const response = await fetch("/api/admin/decks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...BLANK_DECK,
          name,
          slug,
          sort_order: decks.reduce((top, deck) => Math.max(top, deck.sort_order), 0) + 10,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Left open, holding what was typed. The address is the likely reason,
        // and closing the panel would throw away the name along with it.
        setError(data.error ?? "Could not add a deck.");
        return;
      }

      const deck = data.deck as Deck;
      setDecks((current) => [...current, deck]);
      setSaved((current) => [...current, deck]);
      savedOrder.current = [...decks.map((d) => d.id), deck.id].join(",");
      setActiveId(deck.id);
      setAdding(false);
      setNotes({ id: deck.id, list: Array.isArray(data.notes) ? data.notes : [] });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * An address handed over from another deck's history, dropped from the copy of
   * that deck held on this screen.
   *
   * The row itself has already changed in the database; without this the rail's
   * copy still lists an address it no longer answers to, which reads as the
   * take-over having failed.
   */
  function forgetSlug(holder: SlugHolder, slug: string) {
    const drop = (deck: Deck) =>
      deck.id === holder.id
        ? { ...deck, former_slugs: deck.former_slugs.filter((entry) => entry !== slug) }
        : deck;

    setDecks((current) => current.map(drop));
    setSaved((current) => current.map(drop));
  }

  async function handleDelete() {
    if (!active) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/decks/${active.id}`, { method: "DELETE" });

      // A 404 means it is already gone, which is what was being asked for.
      // Treating it as a failure leaves a phantom row nothing can remove.
      if (!response.ok && response.status !== 404) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Could not delete this deck.");
        return;
      }

      const gone = active.id;
      const remaining = decks.filter((deck) => deck.id !== gone);

      // Open a neighbour rather than nothing: an empty right-hand pane after a
      // delete reads as a screen that has broken.
      const position = decks.findIndex((deck) => deck.id === gone);
      setActiveId(remaining[Math.min(position, remaining.length - 1)]?.id ?? null);

      setDecks(remaining);
      setSaved((current) => current.filter((deck) => deck.id !== gone));
      savedOrder.current = remaining.map((deck) => deck.id).join(",");
      setConfirmingDelete(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function update(next: Deck) {
    setDecks((current) => current.map((deck) => (deck.id === next.id ? next : deck)));
    setJustSaved(false);
  }

  /* ─────────────────────────── Screen ─────────────────────────── */

  const railItems: RailItem<string>[] = decks.map((deck, index) => ({
    id: deck.id,
    short: deck.name || "Untitled deck",
    title: `${String(index + 1).padStart(2, "0")} · ${deck.name || "Untitled deck"}`,
    hint: `${DECK_STATUS_LABELS[deck.status]} · ${deck.pages.length} ${
      deck.pages.length === 1 ? "page" : "pages"
    }`,
    // Present so the rail lets them be dragged. No `onToggleVisible` is passed,
    // so no eye appears: a deck is not switched off, it is set back to a draft.
    visible: true,
    Icon: ImagesIcon,
  }));

  /*
   * Where this deck's pictures go — from the SAVED address, never the draft one.
   *
   * `active.slug` is whatever is currently in the address box, which changes as
   * it is typed. Uploading against that would put a file in `decks/<new-slug>/`
   * while the bucket still has `decks/<old-slug>/` and the database still says
   * the old address — and if the editor then abandoned the save, that file would
   * be orphaned in a folder that never comes to exist. `activeSaved` is the last
   * thing the server acknowledged, so it always names a folder that is real.
   *
   * The rename carries the files across; see the PUT in
   * src/app/api/admin/decks/[id]/route.ts.
   */
  const uploadFolder = activeSaved
    ? folderForEntity("decks", activeSaved.slug, activeSaved.id)
    : DECK_UPLOAD_FOLDER;

  return (
    <UploadFolder folder={uploadFolder}>
    <div className="flex min-h-0 flex-col gap-2 md:h-full">
      <AdminRailSlot>
        <SectionRail
          heading="Decks"
          items={railItems}
          active={activeId ?? ""}
          onSelect={setActiveId}
          onReorder={reorder}
        />
      </AdminRailSlot>

      <EditorToolbar
        Icon={ImagesIcon}
        title={active ? active.name || "Untitled deck" : "Decks"}
        hint={
          adding
            ? "Give the new deck a name and an address."
            : active
              ? "Drag the sidebar to set the order decks are offered in."
              : "No decks yet — add the first one."
        }
        dirty={dirty}
        justSaved={justSaved}
        busy={busy}
        // Said once. While the new-deck panel is open it owns the failure,
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
            Add deck
          </Button>
        }
        fieldsOpen={fieldsOpen}
        onToggleFields={() => setFieldsOpen((open) => !open)}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row">
        {/* Hidden below lg: at that width the fields already fill the screen,
            and a preview shrunk into what is left would be unreadable. */}
        <DeckPreview
          deck={adding ? null : active}
          chrome={chrome}
          year={year}
          className="hidden lg:block lg:min-w-0 lg:flex-1"
        />

        <div
          className={cn(
            "min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-card md:overflow-y-auto",
            fieldsOpen ? "lg:w-[440px] lg:flex-none xl:w-[520px]" : "lg:hidden"
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
                kind="deck"
                title="New deck"
                namePlaceholder="2026 entry pack"
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
                    Delete <span className="font-medium">{active.name || "this deck"}</span>? Its
                    address stops working, and any card pointing at it disappears. This cannot be
                    undone.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={busy}>
                      {busy ? "Deleting…" : "Delete deck"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmingDelete(false)}
                      disabled={busy}
                    >
                      Keep it
                    </Button>
                  </div>
                </div>
              ) : (
                <DeckForm
                  deck={active}
                  siteUrl={siteUrl}
                  onChange={update}
                  onDelete={() => setConfirmingDelete(true)}
                  onReleasedSlug={forgetSlug}
                  busy={busy}
                />
              )
            ) : (
              <p className="rounded-md border border-dashed border-input px-4 py-10 text-center text-xs text-muted-fg">
                No decks yet. Use <span className="text-foreground">Add deck</span> above to make
                the first one.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
    </UploadFolder>
  );
}
