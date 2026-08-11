"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { DragIcon, EyeIcon, EyeSlashIcon } from "@/components/admin/ui/icons";

/**
 * Which part of a page is being edited — and, where the page has a running
 * order, what that order is.
 *
 * Lives at the top of the admin sidebar, above the screen switcher — a plain
 * list of rows in the same shape as the links below it, so the whole left column
 * reads as one thing rather than two lists that happen to touch. Below `md:` the
 * same rows become a scrolling chip row, which is the sidebar's own behaviour at
 * that width.
 *
 * An entry that carries `visible` is a section of the page itself: it can be
 * dragged up and down to move the section on the page, and switched off to take
 * it off. Entries without it (a screen's settings, say) are fixed, and sit above
 * the ones that move. That is the whole of the running order — there is no
 * separate layout screen, because the list you pick from and the list the page
 * is built from are the same list.
 *
 * Reordering is a drag handle plus arrow keys on it, and the keys are not a
 * nicety: HTML5 drag does not work on touch at all, which is also why the handle
 * is hidden below `md:` where the rail is a chip row nobody can drag anyway.
 *
 * Shared by every editor. It knows nothing about what the entries mean; each
 * screen supplies its own list.
 */

export type RailItem<Id extends string> = {
  id: Id;
  /** Fallback label, used where an entry has no `title`. */
  short: string;
  /** The label the rail shows. Long ones truncate. */
  title?: string;
  hint: string;
  /** Set on entries that are sections of the page. Those are the movable ones. */
  visible?: boolean;
  Icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
};

export function SectionRail<Id extends string>({
  items,
  active,
  onSelect,
  onReorder,
  onToggleVisible,
}: {
  items: readonly RailItem<Id>[];
  active: Id;
  onSelect: (id: Id) => void;
  /** Moves `fromId` to the place `toId` currently holds. */
  onReorder?: (fromId: Id, toId: Id) => void;
  onToggleVisible?: (id: Id) => void;
}) {
  /** Tracked by id, not index: the list reorders under the pointer mid-drag. */
  const [dragging, setDragging] = useState<Id | null>(null);

  const movable = items.filter((item) => item.visible !== undefined);
  const sortable = movable.length > 0 && Boolean(onReorder);

  /** Arrow keys on the handle, which is the only reordering touch and keyboards get. */
  function nudge(id: Id, step: number) {
    const index = movable.findIndex((item) => item.id === id);
    const target = movable[index + step];
    if (target) onReorder?.(id, target.id);
  }

  return (
    <nav
      aria-label="Page sections"
      className="flex gap-1 overflow-x-auto md:flex-col md:overflow-x-visible"
    >
      <p className="hidden px-2 py-1 text-[11px] font-medium text-muted-fg md:block">Sections</p>

      {items.map((item) => {
        const selected = item.id === active;
        const moves = item.visible !== undefined;
        const off = item.visible === false;
        const { Icon } = item;

        return (
          <div
            key={item.id}
            draggable={dragging === item.id}
            onDragEnter={() => {
              if (dragging && moves && dragging !== item.id) onReorder?.(dragging, item.id);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragEnd={() => setDragging(null)}
            className={cn(
              "flex shrink-0 items-center gap-0.5 rounded-md pr-0.5 transition-colors",
              selected ? "bg-muted" : "hover:bg-muted/60",
              dragging === item.id && "opacity-40 ring-1 ring-primary/60"
            )}
          >
            {/* Reserved on every row when anything moves, so the labels line up
                whether or not the row has a handle of its own. */}
            {sortable ? (
              moves ? (
                <button
                  type="button"
                  aria-label={`Reorder ${item.title ?? item.short}. Use the arrow keys.`}
                  onPointerDown={() => setDragging(item.id)}
                  onPointerUp={() => setDragging(null)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      nudge(item.id, -1);
                    } else if (event.key === "ArrowDown") {
                      event.preventDefault();
                      nudge(item.id, 1);
                    }
                  }}
                  className="hidden size-6 shrink-0 cursor-grab items-center justify-center rounded text-muted-fg/40 outline-none transition hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 active:cursor-grabbing md:flex"
                >
                  <DragIcon className="size-3.5" />
                </button>
              ) : (
                <span aria-hidden className="hidden size-6 shrink-0 md:block" />
              )
            ) : null}

            <button
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={selected ? "true" : undefined}
              title={item.hint}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 pl-1.5 pr-1 text-left text-[13px] font-medium outline-none transition",
                "focus-visible:ring-[3px] focus-visible:ring-ring/40",
                selected
                  ? "text-foreground"
                  : off
                    ? "text-muted-fg/50 hover:text-foreground"
                    : "text-muted-fg hover:text-foreground"
              )}
            >
              <Icon className={cn("size-4 shrink-0", off && "opacity-60")} />
              <span className="truncate whitespace-nowrap">{item.title ?? item.short}</span>
            </button>

            {moves && onToggleVisible ? (
              <button
                type="button"
                onClick={() => onToggleVisible(item.id)}
                aria-pressed={item.visible}
                aria-label={item.visible ? "Take off the page" : "Put on the page"}
                title={item.visible ? "Take off the page" : "Put on the page"}
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded outline-none transition",
                  "focus-visible:ring-[3px] focus-visible:ring-ring/40",
                  item.visible
                    ? "text-muted-fg/40 hover:text-foreground"
                    : "text-muted-fg hover:text-foreground"
                )}
              >
                {item.visible ? (
                  <EyeIcon className="size-3.5" />
                ) : (
                  <EyeSlashIcon className="size-3.5" />
                )}
              </button>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
