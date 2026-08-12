"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/admin/ui/Badge";
import { Button } from "@/admin/ui/Button";
import { Dialog } from "@/admin/ui/Dialog";
import { CaretDownIcon, DragIcon, PencilIcon, PlusIcon, TrashIcon } from "@/admin/ui/icons";
import { Note, Panel } from "@/admin/components/Fields";

/**
 * A list of the same thing, edited: add, reorder, remove.
 *
 * Nearly every panel in this admin is one of these — stats, vision cards,
 * venues, rounds, photographs, bulletin rows, posts. Writing the add/move/remove
 * plumbing per panel is where those screens drift apart, so it is written once
 * here and each panel supplies only its fields.
 *
 * Two shapes, chosen by whether `summary` is given:
 *
 *   without it — every entry is open, one after another. Right for short lists
 *                of small fields (four figures, six cards) where seeing them all
 *                at once is the whole point.
 *   with it    — every entry is one line, and editing one opens a DIALOG. Right
 *                for long lists of big entries (a dozen posts) that would
 *                otherwise be a mile of form.
 *
 * The dialog is what the second shape used to do inline, and the change is not
 * cosmetic: the fields now live in a column about a third of the screen wide, so
 * an entry with a photograph, a date and two paragraphs has nowhere to unfold.
 * A dialog gives it the whole window and leaves the list readable underneath.
 *
 * Reordering is a drag handle plus arrow buttons. The buttons are not a
 * fallback: HTML5 drag does not work on touch at all, so they are the only way
 * on a phone.
 */

export type RepeaterProps<T> = {
  title: string;
  /** The label on the add button — "Add venue", not "Add". */
  addLabel: string;
  items: T[];
  max: number;
  onChange: (next: T[]) => void;
  /** Builds a new, empty entry. */
  blank: () => T;
  /** Stable React key. Falls back to the index for lists that carry no id. */
  keyOf?: (item: T, index: number) => string;
  /**
   * Reduces each entry to one line, edited in a dialog. Omit to keep every entry
   * open inline.
   */
  summary?: (item: T, index: number) => { title: string; hint?: string; image?: string };
  /** What the list says when it is empty. */
  empty?: string;
  /** A line of explanation under the list. */
  note?: React.ReactNode;
  /** The fields for one entry. `patch` merges into it. */
  children: (item: T, index: number, patch: (patch: Partial<T>) => void) => React.ReactNode;
};

export function Repeater<T>({
  title,
  addLabel,
  items,
  max,
  onChange,
  blank,
  keyOf,
  summary,
  empty,
  note,
  children,
}: RepeaterProps<T>) {
  const collapsible = Boolean(summary);
  /** With `summary`, the index whose dialog is open; without it, unused. */
  const [open, setOpen] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  function patchAt(index: number, patch: Partial<T>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  /** Moves an entry, and carries the open row and the drag with it. */
  function moveTo(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;

    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);

    if (open === from) setOpen(to);
    if (dragging === from) setDragging(to);
  }

  function add() {
    onChange([...items, blank()]);
    if (collapsible) setOpen(items.length);
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
    // The row below slides up into this slot, so the open row is the same index
    // unless it was the last one.
    if (open !== null && open >= index) setOpen(open > index ? open - 1 : null);
  }

  /** The entry whose dialog is open, if the list is in one-line mode. */
  const editing = collapsible && open !== null && open < items.length ? open : null;
  const editingHead = editing !== null ? summary?.(items[editing], editing) : undefined;

  return (
    <Panel title={title} hint={`${items.length} of ${max}`}>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-input px-4 py-8 text-center text-xs text-muted-fg">
          {empty ?? "Nothing here yet."}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item, index) => {
            const head = summary?.(item, index);

            return (
              <li
                key={keyOf?.(item, index) ?? index}
                draggable={dragging === index}
                onDragEnter={() => (dragging === null ? undefined : moveTo(dragging, index))}
                onDragOver={(event) => event.preventDefault()}
                onDragEnd={() => setDragging(null)}
                className={cn(
                  "rounded-md border bg-background/60 transition-colors",
                  dragging === index ? "border-primary/60 opacity-40" : "border-border",
                  collapsible && "hover:border-input hover:bg-background"
                )}
              >
                <div className="flex items-center gap-2 p-1.5">
                  <button
                    type="button"
                    aria-label={`Reorder ${index + 1}. Use the arrow keys.`}
                    onPointerDown={() => setDragging(index)}
                    onPointerUp={() => setDragging(null)}
                    onKeyDown={(event) => {
                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        moveTo(index, index - 1);
                      } else if (event.key === "ArrowDown") {
                        event.preventDefault();
                        moveTo(index, index + 1);
                      }
                    }}
                    className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded text-muted-fg/60 transition hover:bg-muted hover:text-foreground active:cursor-grabbing"
                  >
                    <DragIcon className="size-4" />
                  </button>

                  {head?.image ? (
                    <span className="h-9 w-14 shrink-0 overflow-hidden rounded border border-border bg-background">
                      <img src={head.image} alt="" className="h-full w-full object-cover" />
                    </span>
                  ) : null}

                  {head ? (
                    <button
                      type="button"
                      onClick={() => setOpen(index)}
                      title="Edit"
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-[13px] font-medium text-foreground">
                        {head.title || `Item ${index + 1}`}
                      </span>
                      {head.hint ? (
                        <span className="block truncate text-[11px] text-muted-fg">{head.hint}</span>
                      ) : null}
                    </button>
                  ) : (
                    <Badge variant="outline" className="mr-auto">
                      {index + 1} of {items.length}
                    </Badge>
                  )}

                  {collapsible ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setOpen(index)}
                        aria-label="Edit"
                        title="Edit"
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(index)}
                        aria-label="Remove"
                        className="hover:text-destructive"
                      >
                        <TrashIcon />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => moveTo(index, index - 1)}
                        disabled={index === 0}
                        aria-label="Move up"
                      >
                        <CaretDownIcon className="rotate-180" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => moveTo(index, index + 1)}
                        disabled={index === items.length - 1}
                        aria-label="Move down"
                      >
                        <CaretDownIcon />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(index)}
                        aria-label="Remove"
                        className="hover:text-destructive"
                      >
                        <TrashIcon />
                      </Button>
                    </>
                  )}
                </div>

                {collapsible ? null : (
                  <div className="space-y-3 border-t border-dashed border-border p-3">
                    {children(item, index, (patch) => patchAt(index, patch))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={add}
        disabled={items.length >= max}
        className="mt-3"
      >
        <PlusIcon />
        {addLabel}
      </Button>

      {note ? <Note className="mt-3">{note}</Note> : null}

      {/*
        One dialog for the whole list, not one per row: only the open entry is
        mounted, so a list of twenty posts costs one form, not twenty. Edits go
        straight through `patchAt` as they are typed — there is no draft and no
        Cancel, because the page behind is already showing the change and the
        editor's own Save is what decides whether any of it is kept.
      */}
      {editing !== null ? (
        <Dialog
          open
          onClose={() => setOpen(null)}
          title={editingHead?.title || `${title} ${editing + 1}`}
          description={editingHead?.hint}
          className="max-w-2xl"
        >
          <div className="space-y-3">
            {children(items[editing], editing, (patch) => patchAt(editing, patch))}
          </div>

          <div className="mt-4 flex items-center gap-1.5 border-t border-border pt-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => moveTo(editing, editing - 1)}
              disabled={editing === 0}
              aria-label="Move up"
            >
              <CaretDownIcon className="rotate-180" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => moveTo(editing, editing + 1)}
              disabled={editing === items.length - 1}
              aria-label="Move down"
            >
              <CaretDownIcon />
            </Button>
            <Badge variant="outline">
              {editing + 1} of {items.length}
            </Badge>

            <Button
              variant="destructive"
              size="sm"
              onClick={() => remove(editing)}
              className="ml-auto"
            >
              <TrashIcon />
              Remove
            </Button>
            <Button size="sm" onClick={() => setOpen(null)}>
              Done
            </Button>
          </div>
        </Dialog>
      ) : null}
    </Panel>
  );
}
