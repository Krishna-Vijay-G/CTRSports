"use client";

import { cn } from "@/lib/utils";

/**
 * Which part of a page is being edited.
 *
 * A rail of icons from `lg:` up, and a scrolling row of the same buttons above
 * the fields below that — the same markup either way, so there is only one list
 * for a screen reader to read and only one set of labels to keep in step.
 *
 * Shared by every editor. It knows nothing about what the entries mean; each
 * screen supplies its own list.
 */

export type RailItem<Id extends string> = {
  id: Id;
  /** Must fit a 68px-wide column — one short word. */
  short: string;
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
      className="flex shrink-0 gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1.5 lg:w-[68px] lg:flex-col lg:overflow-x-visible lg:overflow-y-auto"
    >
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
              "flex shrink-0 flex-col items-center gap-1 rounded-md px-1.5 py-2 text-[10px] font-medium outline-none transition",
              "focus-visible:ring-[3px] focus-visible:ring-ring/40",
              selected
                ? "bg-muted text-foreground"
                : "text-muted-fg hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon className="size-[18px]" />
            <span className="whitespace-nowrap">{item.short}</span>
          </button>
        );
      })}
    </nav>
  );
}
