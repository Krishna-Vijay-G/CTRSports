"use client";

import { cn } from "@/lib/utils";
import { SECTIONS, type SectionId } from "./sections";

/**
 * Which part of the page is being edited.
 *
 * A rail of icons from `lg:` up, and a scrolling row of the same buttons above
 * the fields below that — the same markup either way, so there is only one list
 * for a screen reader to read and only one set of labels to keep in step.
 */
export function SectionNav({
  active,
  onSelect,
}: {
  active: SectionId;
  onSelect: (id: SectionId) => void;
}) {
  return (
    <nav
      aria-label="Page sections"
      className="flex shrink-0 gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1.5 lg:w-[68px] lg:flex-col lg:overflow-x-visible lg:overflow-y-auto"
    >
      {SECTIONS.map((section) => {
        const selected = section.id === active;
        const { Icon } = section;

        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(section.id)}
            aria-current={selected ? "true" : undefined}
            title={section.hint}
            className={cn(
              "flex shrink-0 flex-col items-center gap-1 rounded-md px-1.5 py-2 text-[10px] font-medium outline-none transition",
              "focus-visible:ring-[3px] focus-visible:ring-ring/40",
              selected
                ? "bg-muted text-foreground"
                : "text-muted-fg hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <Icon className="size-[18px]" />
            <span className="whitespace-nowrap">{section.short}</span>
          </button>
        );
      })}
    </nav>
  );
}
