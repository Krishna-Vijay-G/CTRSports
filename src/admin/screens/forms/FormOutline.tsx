"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FIELD_TYPE_LABELS,
  FORM_LIMITS,
  MAX_FORM_FIELDS,
  MAX_SECTIONS,
  addField,
  addSection,
  fieldsOn,
  homeOf,
  keysBefore,
  keysBeforeSection,
  moveSection,
  nudgeField,
  orderedFields,
  patchField,
  patchSection,
  placeField,
  removeField,
  removeSection,
  type FormField,
  type FormSection,
  type Outline,
} from "@/lib/forms";
import { cn } from "@/lib/utils";
import { Badge } from "@/admin/ui/Badge";
import { Button } from "@/admin/ui/Button";
import { Dialog } from "@/admin/ui/Dialog";
import { CaretDownIcon, DragIcon, PencilIcon, PlusIcon, TrashIcon } from "@/admin/ui/icons";
import { Field, Hint, Note, Panel } from "@/admin/components/Fields";
import { ConditionEditor } from "./FieldRules";
import { FieldRow } from "./FieldRow";

/**
 * The shape of a form: its pages, with its questions nested under them.
 *
 * ── What this replaced ────────────────────────────────────────────────────
 *
 * Two flat lists — "Pages" and "Questions" — with an "on which page" dropdown
 * on every question as the only thing joining them. Building a multi-page form
 * means thinking page by page, and that screen made you think in two lists and
 * a dropdown, then work out in your head which questions were on which page.
 *
 * Worse, the questions list showed the RAW array order while the server sorted
 * them into page order on save — so moving a question to page 1 made it jump up
 * the list some time later, after a round trip, in a different screen. The old
 * dropdown had a hint apologising for exactly that.
 *
 * Here the list IS the order, at every moment, because every mutation runs the
 * server's own `orderedFields` (see `settle` in src/lib/forms.ts). Saving
 * rearranges nothing.
 *
 * ── One dialog, not two ───────────────────────────────────────────────────
 *
 * The standing objection to nesting was "a repeater inside a repeater is a
 * window inside a window", and it is a good one — so the nesting here is in the
 * LIST, not in the windows. A page opens in place: its title, blurb and rule are
 * three small fields. A question opens in the one dialog, because `FieldRow` is
 * a screenful. Nothing is ever stacked on anything.
 *
 * ── Why not `Repeater` ────────────────────────────────────────────────────
 *
 * Three mechanical reasons, none of them taste. Its `onChange` hands back one
 * array and has no way to say "this item left this list". It tracks the drag and
 * the open row by INDEX, where an outline must track by id — a question's index
 * changes when its page moves. And its `onDragEnter` sits on every `<li>`, so a
 * question dragged inside a page would bubble to the page row and reorder the
 * pages instead. `Repeater` is left exactly as it is for its eleven other
 * callers.
 */

/** How long a press has to be held before it picks something up. */
const LONG_PRESS_MS = 350;

/** A press that travels this far before then was a scroll, not a grab. */
const SLOP = 8;

/** How close to the edge of the scrolling column starts an auto-scroll. */
const EDGE = 72;
const EDGE_STEP = 14;

/**
 * A short, unique id.
 *
 * `crypto.randomUUID` is only defined in a secure context: over plain HTTP on a
 * LAN — which is this project's own development setup — it is `undefined`, and
 * "Add question" threw. The fallback is not as good and does not need to be;
 * ids only have to be unique within one form, and the normaliser renames a
 * collision anyway.
 */
function fieldId(): string {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Math.random()}${Date.now()}`;
  return random.replace(/[^a-z0-9]/gi, "").slice(0, 8) || `f${Date.now() % 100000}`;
}

/** What a question's one-line summary says. Unchanged from the old list. */
function summarise(field: FormField): string {
  return [
    FIELD_TYPE_LABELS[field.type],
    field.required ? "required" : null,
    // "Only sometimes" earns its place in a collapsed row: a question that is
    // not always asked is the one thing you cannot work out by reading the list.
    field.when.key ? "only sometimes" : null,
    field.optionsWhen.key ? "options depend" : null,
    field.age ? "+ age" : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

type Drag = { kind: "field" | "page"; id: string; pointerId: number } | null;

export function FormOutline({
  sections,
  fields,
  onChange,
  onFocusPage,
}: {
  sections: FormSection[];
  fields: FormField[];
  /**
   * Both lists at once, always. `FormBuilder`'s `set` merges a patch into a
   * captured form, so writing the sections and then the fields in two calls
   * would silently drop the first.
   */
  onChange: (next: Outline) => void;
  /**
   * Which page is being worked on, reported upward so the preview can show it.
   *
   * The same shape the banners panel uses to point the landing preview at the
   * banner open in the editor. Optional: the outline works perfectly well with
   * nobody listening.
   */
  onFocusPage?: (sectionId: string) => void;
}) {
  const outline: Outline = { sections, fields };

  const [openPage, setOpenPage] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [drag, setDrag] = useState<Drag>(null);
  const [over, setOver] = useState<string | null>(null);

  const root = useRef<HTMLDivElement>(null);
  /** The handle to put focus back on after a move re-mounts its row. */
  const refocus = useRef<string | null>(null);

  /* The list as it will actually be put, which is what every index here means. */
  const flat = orderedFields(sections, fields);
  const at = (id: string) => flat.findIndex((field) => field.id === id);

  const groups =
    sections.length > 0
      ? sections.map((section, index) => ({
          section,
          index,
          questions: fieldsOn(outline, section.id),
        }))
      : [{ section: null as FormSection | null, index: 0, questions: flat }];

  const full = fields.length >= MAX_FORM_FIELDS;
  const empties = groups.filter((group) => group.section && group.questions.length === 0);

  /* ──────────────────────────── Moving ──────────────────────────── */

  /**
   * Focus follows the question.
   *
   * A question crossing a page boundary re-keys into a different `<ul>`, so
   * React unmounts its handle and focus falls to the body — after which the
   * next arrow press does nothing at all. Putting it back by id is what makes
   * holding the arrow key work.
   */
  useEffect(() => {
    const id = refocus.current;
    if (!id) return;
    refocus.current = null;

    root.current
      ?.querySelector<HTMLButtonElement>(`[data-handle="${id}"]`)
      ?.focus({ preventScroll: true });
  }, [flat]);

  /*
   * Tell whoever is listening which page the work is on.
   *
   * A question counts as its page — opening one is a statement about where you
   * are as much as expanding the page's own settings is.
   */
  const editingField = editing !== null ? fields.find((field) => field.id === editing) : undefined;
  const focused = editingField ? homeOf(sections, editingField) : (openPage ?? "");

  // Guarded by what was last said rather than by the effect's dependencies: a
  // parent passing an inline function changes its identity on every render, and
  // this must not turn into a call per render.
  const reported = useRef<string | null>(null);

  useEffect(() => {
    if (reported.current === focused) return;
    reported.current = focused;
    onFocusPage?.(focused);
  }, [focused, onFocusPage]);

  function nudge(fieldId: string, delta: 1 | -1) {
    refocus.current = fieldId;
    onChange(nudgeField(outline, fieldId, delta));
  }

  /* ──────────────────────── Long-press drag ──────────────────────── */

  const press = useRef<number | null>(null);
  const from = useRef({ x: 0, y: 0 });
  const pointerY = useRef(0);
  const frame = useRef<number | null>(null);
  const scroller = useRef<HTMLElement | null>(null);
  /** The outline as it was when the drag began, for Escape to put back. */
  const before = useRef<Outline | null>(null);

  /** The nearest ancestor that actually scrolls — the editor column. */
  function findScroller(): HTMLElement | null {
    let node: HTMLElement | null = root.current;

    while (node) {
      const style = window.getComputedStyle(node);
      const scrolls = /(auto|scroll)/.test(style.overflowY);
      if (scrolls && node.scrollHeight > node.clientHeight) return node;
      node = node.parentElement;
    }

    return null;
  }

  /**
   * Scrolls the column when the pointer nears its edge.
   *
   * Without this a question on page 1 cannot reach page 4 without letting go,
   * which would make dragging useless on exactly the long forms that have pages
   * in the first place. It is a frame loop rather than a reaction to movement
   * because a finger held still at the edge produces no more events.
   */
  function autoScroll() {
    if (frame.current !== null) return;

    const tick = () => {
      const column = scroller.current;
      if (column) {
        const box = column.getBoundingClientRect();
        if (pointerY.current < box.top + EDGE) column.scrollTop -= EDGE_STEP;
        else if (pointerY.current > box.bottom - EDGE) column.scrollTop += EDGE_STEP;
      }

      frame.current = window.requestAnimationFrame(tick);
    };

    frame.current = window.requestAnimationFrame(tick);
  }

  function stopScrolling() {
    if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    frame.current = null;
  }

  useEffect(() => stopScrolling, []);

  /** Which page the pointer is over, or null when it is over none. */
  function pageUnder(x: number, y: number): string | null {
    const element = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-page]");
    return element ? (element.dataset.page ?? "") : null;
  }

  /**
   * Where on that page the pointer is, counted in questions.
   *
   * By midpoints rather than by index arithmetic: the number of that page's
   * questions whose middle is above the pointer IS the slot, which stays right
   * whether the question came from this page or another one, and needs no
   * special case for an empty page or for a header.
   */
  function slotUnder(sectionId: string, y: number, moving: string): number {
    const rows = root.current?.querySelectorAll<HTMLElement>(
      `[data-question][data-in="${CSS.escape(sectionId)}"]`
    );
    if (!rows) return 0;

    let slot = 0;
    for (const row of rows) {
      if (row.dataset.question === moving) continue;
      const box = row.getBoundingClientRect();
      if (y > box.top + box.height / 2) slot += 1;
    }

    return slot;
  }

  /*
   * The pointer is followed on the DOCUMENT, not on the handle.
   *
   * The obvious way is `setPointerCapture` on the handle plus React's own
   * `onPointerMove`, and it breaks on exactly the gesture this was built for: a
   * question dragged onto another page is re-keyed into a different `<ul>`, so
   * React unmounts its handle, the capture goes with it, and the drag freezes
   * halfway. Listening on the document survives the row being rebuilt under the
   * pointer, because the document is not what moved.
   *
   * The handlers are created once and read everything they need from refs, so
   * adding and removing them always matches.
   */
  const dragRef = useRef<Drag>(null);
  const waiting = useRef<{ kind: "field" | "page"; id: string } | null>(null);
  const outlineRef = useRef(outline);
  const changeRef = useRef(onChange);

  outlineRef.current = outline;
  changeRef.current = onChange;

  const release = useRef<() => void>(() => {});

  const finish = useCallback((restore: boolean) => {
    if (press.current !== null) window.clearTimeout(press.current);
    press.current = null;

    if (restore && before.current) changeRef.current(before.current);

    before.current = null;
    waiting.current = null;
    dragRef.current = null;

    stopScrolling();
    release.current();
    setDrag(null);
    setOver(null);
  }, []);

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      pointerY.current = event.clientY;

      // Still waiting on the press. Movement means they meant to scroll.
      if (!dragRef.current) {
        const travelled =
          Math.abs(event.clientX - from.current.x) + Math.abs(event.clientY - from.current.y);
        if (travelled > SLOP) finish(false);
        return;
      }

      // Stops the page panning under a finger that is dragging a question.
      event.preventDefault();

      const held = dragRef.current;
      const page = pageUnder(event.clientX, event.clientY);
      if (page === null) return;

      setOver(page);

      if (held.kind === "page") {
        const to = outlineRef.current.sections.findIndex((section) => section.id === page);
        if (to >= 0) changeRef.current(moveSection(outlineRef.current, held.id, to));
        return;
      }

      changeRef.current(
        placeField(outlineRef.current, held.id, page, slotUnder(page, event.clientY, held.id))
      );
    },
    [finish]
  );

  const onKey = useCallback(
    (event: KeyboardEvent) => {
      // Escape puts it back where it was picked up from.
      if (event.key === "Escape") finish(true);
    },
    [finish]
  );

  const onUp = useCallback(() => finish(false), [finish]);

  function listen() {
    document.addEventListener("pointermove", onPointerMove, { passive: false });
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
    document.addEventListener("keydown", onKey);

    release.current = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.removeEventListener("keydown", onKey);
      release.current = () => {};
    };
  }

  // Nothing may outlive the screen: a listener on the document would go on
  // reordering a form nobody is looking at any more.
  useEffect(() => () => finish(false), [finish]);

  function onHandleDown(kind: "field" | "page", id: string) {
    return (event: React.PointerEvent<HTMLButtonElement>) => {
      // A right-hand or middle press is not a drag.
      if (event.button !== 0) return;

      from.current = { x: event.clientX, y: event.clientY };
      pointerY.current = event.clientY;
      waiting.current = { kind, id };

      listen();

      press.current = window.setTimeout(() => {
        press.current = null;
        if (!waiting.current) return;

        scroller.current = findScroller();
        before.current = outlineRef.current;
        dragRef.current = { ...waiting.current, pointerId: event.pointerId };

        setDrag(dragRef.current);
        autoScroll();
      }, LONG_PRESS_MS);
    };
  }

  /* ──────────────────────────── Screen ──────────────────────────── */

  const open = editing !== null && at(editing) >= 0 ? flat[at(editing)] : null;

  return (
    <Panel
      title="Pages and questions"
      hint={`${fields.length} of ${MAX_FORM_FIELDS} questions${
        sections.length > 0 ? ` · ${sections.length} of ${MAX_SECTIONS} pages` : ""
      }`}
    >
      <div ref={root} className="space-y-2">
        {groups.map(({ section, index, questions }) => {
          const id = section?.id ?? "";
          const expanded = openPage === id && section !== null;
          const dragging = drag?.kind === "page" && drag.id === id;

          return (
            <div
              key={id || "one-page"}
              data-page={id}
              className={cn(
                "rounded-md border bg-background/60 transition-colors",
                dragging ? "border-primary/60 opacity-40" : "border-border",
                over === id && drag?.kind === "field" && "border-primary/60 bg-primary/5"
              )}
            >
              {/* ── The page's own row ── */}
              <div className="flex items-center gap-2 p-1.5">
                {section ? (
                  <button
                    type="button"
                    aria-label={`Reorder page ${index + 1}. Hold to drag, or use the arrow keys.`}
                    onPointerDown={onHandleDown("page", id)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        onChange(moveSection(outline, id, index - 1));
                      } else if (event.key === "ArrowDown") {
                        event.preventDefault();
                        onChange(moveSection(outline, id, index + 1));
                      }
                    }}
                    className="flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-fg/60 transition hover:bg-muted hover:text-foreground active:cursor-grabbing"
                  >
                    <DragIcon className="size-4" />
                  </button>
                ) : (
                  <span className="size-7 shrink-0" />
                )}

                <button
                  type="button"
                  onClick={() => (section ? setOpenPage(expanded ? null : id) : undefined)}
                  aria-expanded={section ? expanded : undefined}
                  disabled={!section}
                  className="min-w-0 flex-1 text-left disabled:cursor-default"
                >
                  <span className="block truncate text-[13px] font-medium text-foreground">
                    {section ? `${index + 1}. ${section.title || `Page ${index + 1}`}` : "All questions"}
                  </span>
                  <span className="block truncate text-[11px] text-muted-fg">
                    {section === null
                      ? "One screen — add a page to break the form up"
                      : [
                          questions.length === 0
                            ? "no questions — this page will not appear"
                            : `${questions.length} question${questions.length === 1 ? "" : "s"}`,
                          section.when.key ? "only sometimes" : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                  </span>
                </button>

                {section ? (
                  <>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setOpenPage(expanded ? null : id)}
                      aria-label={expanded ? "Close page settings" : "Page settings"}
                    >
                      <CaretDownIcon className={cn("transition-transform", expanded && "rotate-180")} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onChange(removeSection(outline, id))}
                      aria-label={`Delete page ${index + 1}`}
                      title="The questions on it move to the page above. Nothing is deleted."
                      className="hover:text-destructive"
                    >
                      <TrashIcon />
                    </Button>
                  </>
                ) : null}
              </div>

              {/* ── Its settings, in place ── */}
              {expanded && section ? (
                <div className="space-y-3 border-t border-border px-3 py-3">
                  <Field
                    label="Title"
                    value={section.title}
                    onChange={(title) => onChange(patchSection(outline, id, { title }))}
                    maxLength={FORM_LIMITS.field_label}
                    placeholder={`Page ${index + 1}`}
                    hint="Shown above the questions, with the progress bar."
                  />
                  <Field
                    label="Blurb"
                    value={section.blurb}
                    onChange={(blurb) => onChange(patchSection(outline, id, { blurb }))}
                    maxLength={FORM_LIMITS.field_help}
                    hint="A line under the title. Blank prints nothing."
                  />

                  <ConditionEditor
                    value={section.when}
                    onChange={(when) => onChange(patchSection(outline, id, { when }))}
                    keys={keysBeforeSection(sections, fields, index)}
                    fields={fields}
                  />

                  {/* A page rule may only name an answer from an earlier page.
                      Said here rather than corrected quietly: the server drops
                      it on save and reports it, and the two must agree. */}
                  {section.when.key &&
                  !keysBeforeSection(sections, fields, index).some(
                    (column) => column.key === section.when.key
                  ) ? (
                    <Note className="text-destructive">
                      This page depends on an answer that is no longer asked before it, so the rule
                      will be dropped when you save.
                    </Note>
                  ) : null}
                </div>
              ) : null}

              {/* ── Its questions ── */}
              <ul className="space-y-1 px-1.5 pb-1.5">
                {questions.map((field) => {
                  const index = at(field.id);
                  const moving = drag?.kind === "field" && drag.id === field.id;
                  const stale =
                    field.when.key &&
                    !keysBefore(flat, index).some((column) => column.key === field.when.key);

                  return (
                    <li
                      key={field.id}
                      data-question={field.id}
                      data-in={id}
                      className={cn(
                        "flex items-center gap-2 rounded-md border bg-card px-1.5 py-1 transition-colors",
                        moving ? "border-primary/60 opacity-40" : "border-border",
                        stale && "border-destructive/50"
                      )}
                    >
                      <button
                        type="button"
                        data-handle={field.id}
                        aria-label={`Reorder ${field.label || "question"}. Hold to drag, or use the arrow keys.`}
                        onPointerDown={onHandleDown("field", field.id)}
                        onKeyDown={(event) => {
                          if (event.key === "ArrowUp") {
                            event.preventDefault();
                            nudge(field.id, -1);
                          } else if (event.key === "ArrowDown") {
                            event.preventDefault();
                            nudge(field.id, 1);
                          }
                        }}
                        className="flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-fg/60 transition hover:bg-muted hover:text-foreground active:cursor-grabbing"
                      >
                        <DragIcon className="size-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditing(field.id)}
                        className="min-w-0 flex-1 text-left"
                        title="Edit"
                      >
                        <span className="block truncate text-[13px] font-medium text-foreground">
                          {field.label || `Question ${index + 1}`}
                        </span>
                        <span className="block truncate text-[11px] text-muted-fg">
                          {stale ? "its rule points at an answer below it" : summarise(field)}
                        </span>
                      </button>

                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setEditing(field.id)}
                        aria-label="Edit"
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onChange(removeField(outline, field.id))}
                        aria-label="Remove"
                        className="hover:text-destructive"
                      >
                        <TrashIcon />
                      </Button>
                    </li>
                  );
                })}

                {/* An empty page still has to be a place a question can be
                    dropped, or a page you have just made cannot be filled. */}
                {questions.length === 0 ? (
                  <li className="rounded-md border border-dashed border-input px-3 py-4 text-center text-[11px] text-muted-fg">
                    Nothing on this page yet — add a question, or drag one here.
                  </li>
                ) : null}

                <li>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange(addField(outline, id, fieldId()))}
                    disabled={full}
                    title={
                      full
                        ? `${MAX_FORM_FIELDS} of ${MAX_FORM_FIELDS} questions — remove one before adding another`
                        : undefined
                    }
                    className="w-full justify-start"
                  >
                    <PlusIcon />
                    Add question
                  </Button>
                </li>
              </ul>
            </div>
          );
        })}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange(addSection(outline, fieldId()))}
        disabled={sections.length >= MAX_SECTIONS}
        title={
          sections.length >= MAX_SECTIONS
            ? `${MAX_SECTIONS} of ${MAX_SECTIONS} pages — remove one before adding another`
            : undefined
        }
        className="mt-2"
      >
        <PlusIcon />
        {sections.length === 0 ? "Break this into pages" : "Add page"}
      </Button>

      {empties.length > 0 ? (
        <Note className="mt-3 text-destructive">
          {empties
            .map((group) => `Page ${group.index + 1}`)
            .join(", ")}{" "}
          {empties.length === 1 ? "has" : "have"} no questions, so nobody will ever see{" "}
          {empties.length === 1 ? "it" : "them"}.
        </Note>
      ) : null}

      <Note className="mt-3">
        Hold a handle to pick a question up, then drag it anywhere — including onto another page.
        The arrow keys on a handle do the same thing one step at a time and walk from the bottom of
        one page to the top of the next. A question can only depend on one ABOVE it, so moving one
        above what it depends on clears its rule rather than leaving it broken. Deleting a question
        does not delete the answers already given to it: they stay on the entries and come out in
        the export under “No longer asked”.
      </Note>

      {sections.length === 0 ? (
        <Hint className="mt-2">
          Breaking a long form up gets it finished; a three-question form does not need it. The
          first page holds everything you already have, and nothing changes for anyone filling it in
          until there is a second one.
        </Hint>
      ) : null}

      {/*
        One dialog for the whole outline, and only the open question mounted.
        Tracked by ID, not position, so the question stays open while the footer
        moves it — including across a page boundary.
      */}
      {open ? (
        <Dialog
          open
          onClose={() => setEditing(null)}
          title={open.label || `Question ${at(open.id) + 1}`}
          description={summarise(open)}
          className="max-w-2xl"
        >
          <div className="space-y-3">
            <FieldRow
              field={open}
              index={at(open.id)}
              fields={flat}
              patch={(patch) => onChange(patchField(outline, open.id, patch))}
            />
          </div>

          <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onChange(nudgeField(outline, open.id, -1))}
              disabled={at(open.id) === 0}
              aria-label="Move up"
            >
              <CaretDownIcon className="rotate-180" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onChange(nudgeField(outline, open.id, 1))}
              disabled={at(open.id) === flat.length - 1}
              aria-label="Move down"
            >
              <CaretDownIcon />
            </Button>
            <Badge variant="outline">
              {at(open.id) + 1} of {flat.length}
            </Badge>

            {sections.length > 0 ? (
              <span className="text-[11px] text-muted-fg">
                on page {sections.findIndex((s) => s.id === homeOf(sections, open)) + 1}
              </span>
            ) : null}

            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                onChange(removeField(outline, open.id));
                setEditing(null);
              }}
              className="ml-auto"
            >
              <TrashIcon />
              Remove
            </Button>
            <Button size="sm" onClick={() => setEditing(null)}>
              Done
            </Button>
          </div>
        </Dialog>
      ) : null}
    </Panel>
  );
}
