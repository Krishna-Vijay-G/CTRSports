"use client";

import { cn } from "@/lib/utils";

/**
 * Picks a glyph from a set.
 *
 * Generic over the set on purpose: it is handed the same list the page draws
 * from and the same lookup of glyphs, so what is offered here and what the page
 * can draw are the same thing by construction — adding a glyph to either
 * catalogue puts it in the picker with nothing to change here.
 */
export function IconPicker<T extends string>({
  value,
  options,
  glyphs,
  onChange,
  className,
}: {
  value: T;
  options: readonly T[];
  glyphs: Record<T, (props: { className?: string }) => React.ReactElement>;
  onChange: (icon: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {options.map((icon) => {
        // Annotated, because an indexed lookup on a generic record widens to
        // `{}` in a JSX position and stops being callable as a component.
        const Glyph: (props: { className?: string }) => React.ReactElement = glyphs[icon];
        const selected = icon === value;

        return (
          <button
            key={icon}
            type="button"
            onClick={() => onChange(icon)}
            aria-pressed={selected}
            title={icon}
            className={cn(
              "flex size-10 items-center justify-center rounded-md border outline-none transition",
              "focus-visible:ring-[3px] focus-visible:ring-ring/40",
              selected
                ? "border-primary bg-primary/[0.09] text-primary"
                : "border-border text-muted-fg hover:border-input hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <Glyph />
          </button>
        );
      })}
    </div>
  );
}
