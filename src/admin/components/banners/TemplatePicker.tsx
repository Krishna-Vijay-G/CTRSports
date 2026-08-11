"use client";

import {
  BANNER_TEMPLATES,
  BANNER_TEMPLATE_META,
  type BannerTemplate,
} from "@/lib/banners";
import { cn } from "@/lib/utils";
import { CheckIcon } from "@/admin/ui/icons";

/**
 * Picks a banner layout.
 *
 * Each option shows a diagram of the arrangement rather than a name alone —
 * "Split" means nothing until you have seen it, and a wireframe says it faster
 * than a sentence does. The names and descriptions come from
 * BANNER_TEMPLATE_META, so adding a template to src/lib/banners.ts puts it here
 * without touching this file; only the diagram below has to be drawn.
 */

/** A miniature of each layout: the grey blocks are photo, the light ones type. */
const DIAGRAMS: Record<BannerTemplate, React.ReactNode> = {
  spotlight: (
    <>
      <rect x="0" y="0" width="56" height="34" rx="2" className="fill-muted-fg/25" />
      <rect x="5" y="19" width="26" height="4" rx="1" className="fill-foreground/80" />
      <rect x="5" y="25" width="17" height="2.5" rx="1" className="fill-foreground/40" />
    </>
  ),
  centre: (
    <>
      <rect x="0" y="0" width="56" height="34" rx="2" className="fill-muted-fg/25" />
      <rect x="15" y="13" width="26" height="4" rx="1" className="fill-foreground/80" />
      <rect x="20" y="19" width="16" height="2.5" rx="1" className="fill-foreground/40" />
    </>
  ),
  split: (
    <>
      <rect x="0" y="0" width="56" height="34" rx="2" className="fill-background" />
      <rect x="28" y="0" width="28" height="34" rx="2" className="fill-muted-fg/25" />
      <rect x="5" y="12" width="18" height="4" rx="1" className="fill-foreground/80" />
      <rect x="5" y="18" width="13" height="2.5" rx="1" className="fill-foreground/40" />
    </>
  ),
};

export function TemplatePicker({
  value,
  onChange,
  className,
}: {
  value: BannerTemplate;
  onChange: (template: BannerTemplate) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-3 gap-1.5", className)}>
      {BANNER_TEMPLATES.map((template) => {
        const meta = BANNER_TEMPLATE_META[template];
        const selected = template === value;

        return (
          <button
            key={template}
            type="button"
            onClick={() => onChange(template)}
            aria-pressed={selected}
            title={meta.description}
            className={cn(
              "group relative rounded-md border p-2 text-left outline-none transition",
              "focus-visible:ring-[3px] focus-visible:ring-ring/40",
              selected
                ? "border-primary bg-primary/[0.07]"
                : "border-border hover:border-input hover:bg-muted/50"
            )}
          >
            <svg viewBox="0 0 56 34" className="w-full rounded-sm">
              {DIAGRAMS[template]}
            </svg>

            <span className="mt-1.5 flex items-center gap-1">
              <span className="truncate text-[11px] font-medium text-foreground">{meta.name}</span>
              {selected ? <CheckIcon className="size-3 shrink-0 text-primary" /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
