"use client";

import { cn } from "@/lib/utils";

/**
 * Which part of a page is being edited.
 *
 * Lives at the top of the admin sidebar, above the screen switcher — a plain
 * list of rows in the same shape as the links below it, so the whole left column
 * reads as one thing rather than two lists that happen to touch. Below `md:` the
 * same rows become a scrolling chip row, which is the sidebar's own behaviour at
 * that width.
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
  Icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
};

export function SectionRail<Id extends string>({
  items,
  active,
  onSelect,
}: {
  items: readonly RailItem<Id>[];
  active: Id;
  onSelect: (id: Id) => void;
}) {
  return (
    <nav
      aria-label="Page sections"
      className="flex gap-1 overflow-x-auto md:flex-col md:overflow-x-visible"
    >
      <p className="hidden px-2 py-1 text-[11px] font-medium text-muted-fg md:block">Sections</p>

      {items.map((item) => {
        const selected = item.id === active;
        const { Icon } = item;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={selected ? "true" : undefined}
            title={item.hint}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium outline-none transition",
              "focus-visible:ring-[3px] focus-visible:ring-ring/40",
              selected
                ? "bg-muted text-foreground"
                : "text-muted-fg hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="truncate whitespace-nowrap">{item.title ?? item.short}</span>
          </button>
        );
      })}
    </nav>
  );
}
