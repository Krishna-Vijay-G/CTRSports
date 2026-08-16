import type { LinkIcon } from "./links";
import { cn } from "@/lib/utils";
import { LINK_GLYPHS, LINK_KNOBS } from "./icons";

/**
 * A chip: a glyph in a coloured knob, what it says, and where it goes.
 *
 * The design's other button is the ActionButton — a pill with the arrow knob on
 * the RIGHT. This is its mirror, and the difference is what each is for: an
 * ActionButton is an instruction ("Register now →"), and a chip is a
 * destination, which is recognised by its mark before it is read. So the mark
 * leads, and the label follows it.
 *
 * `note` is the tail in the accent — a handle, a number. Blank prints nothing.
 *
 * Only http(s) opens in a new tab. An anchor or a path on this site is a move
 * within the page, and a new tab for one of those is a bug, not a courtesy.
 */
export function LinkPill({
  icon,
  label,
  note,
  href,
  tone = "accent",
}: {
  icon: LinkIcon;
  label: string;
  note?: string;
  href: string;
  /** `light` for a chip over a photograph, where there is no panel behind it. */
  tone?: "accent" | "light";
}) {
  const Glyph = LINK_GLYPHS[icon];
  const external = href.startsWith("http");

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-sm font-semibold",
        "transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0",
        tone === "accent"
          ? "border border-line bg-panel text-fg hover:border-fg-faint"
          : "border border-white/30 text-white hover:border-white/70"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          LINK_KNOBS[icon]
        )}
      >
        <Glyph className="size-4" />
      </span>

      {label}

      {note ? (
        <span className="text-accent transition-transform group-hover:translate-x-0.5">{note}</span>
      ) : null}
    </a>
  );
}
