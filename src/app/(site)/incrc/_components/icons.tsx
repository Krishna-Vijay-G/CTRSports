import type { VisionIcon } from "@/lib/incrcContent";

/**
 * The glyphs /incrc draws.
 *
 * Six of them are pickable per vision card in the admin, which is why they are
 * a lookup rather than six imports: the picker is generated from the same list
 * the page renders, so a card can never ask for one that is not drawn.
 *
 * All on a 24px grid, 1.8 stroke, no fills — the same hand as the site's other
 * inline glyphs.
 */

type Props = { className?: string };

function Glyph({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

export const VISION_GLYPHS: Record<VisionIcon, (props: Props) => React.ReactElement> = {
  star: (p) => (
    <Glyph {...p}>
      <path d="M12 2.6 15 8.7l6.7 1-4.9 4.7 1.2 6.7L12 18l-6 3.1 1.2-6.7-4.9-4.7 6.7-1z" />
    </Glyph>
  ),
  rocket: (p) => (
    <Glyph {...p}>
      <path d="M13.5 3.5c3.6-1.3 7 2.1 5.7 5.7-1 2.7-3.4 5.4-6.2 7l-3-3-3-3c1.6-2.8 4.3-5.2 7-6.2z" />
      <circle cx="14.6" cy="9.4" r="1.6" />
      <path d="M7.6 16.4c-1.2 1.2-1.4 4-1.4 4s2.8-.2 4-1.4M5 13.5 3.2 15M10.5 19l-1.5 1.8" />
    </Glyph>
  ),
  shield: (p) => (
    <Glyph {...p}>
      <path d="M12 2.6 4.4 5.8v5.4c0 4.1 3.1 7.7 7.6 9.1 4.5-1.4 7.6-5 7.6-9.1V5.8z" />
      <path d="m9.2 12 2 2 3.9-4" />
    </Glyph>
  ),
  globe: (p) => (
    <Glyph {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.3 2.4 3.5 5.3 3.5 9s-1.2 6.6-3.5 9c-2.3-2.4-3.5-5.3-3.5-9S9.7 5.4 12 3z" />
    </Glyph>
  ),
  flag: (p) => (
    <Glyph {...p}>
      <path d="M5 21V3.8M5 4.4h11.6l-2 3.6 2 3.6H5" />
    </Glyph>
  ),
  spark: (p) => (
    <Glyph {...p}>
      <path d="M13.2 2.4 6 12.6h4.9L9.9 21.6 17.6 11h-4.9z" />
    </Glyph>
  ),
};

export function PinIcon({ className }: Props) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
      aria-hidden
      className={className ?? "shrink-0"}
    >
      <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

/** The three bands of the flag, used wherever the page says "national". */
export function Tricolour({ className }: Props) {
  return (
    <span aria-hidden className={className ?? "flex gap-1"}>
      <span className="block h-3.5 w-2 rounded-sm bg-[#FF9933]" />
      <span className="block h-3.5 w-2 rounded-sm bg-white" />
      <span className="block h-3.5 w-2 rounded-sm bg-[#138808]" />
    </span>
  );
}
