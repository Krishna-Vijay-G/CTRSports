import type { VisionIcon } from "@/lib/sections/vision/model";
import type { LinkIcon } from "./links";

/**
 * The glyphs the sections draw.
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

/**
 * The glyphs a link chip can wear, and the colour each one's knob takes.
 *
 * The six network marks keep their own colour, which is the one place on this
 * site a colour other than the accent is allowed: they are logos, and a
 * monochrome Instagram mark reads as a generic camera. Everything that is not a
 * network takes the accent, because a globe in a made-up brand colour would be
 * claiming to be a logo it is not.
 *
 * Same list the admin's picker is generated from, so a chip can never ask for
 * one that is not drawn here.
 */
export const LINK_GLYPHS: Record<LinkIcon, (props: Props) => React.ReactElement> = {
  instagram: (p) => (
    <Glyph {...p}>
      <rect x="3" y="3" width="18" height="18" rx="5.2" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
    </Glyph>
  ),
  facebook: (p) => (
    <Glyph {...p}>
      <path d="M15.5 3.2h-2.2a3.8 3.8 0 0 0-3.8 3.8v3H7.4v3.4h2.1v7.4h3.5v-7.4h2.4l.5-3.4h-2.9V7.4c0-.6.4-1 1-1h2z" />
    </Glyph>
  ),
  youtube: (p) => (
    <Glyph {...p}>
      <rect x="2.4" y="5.4" width="19.2" height="13.2" rx="4.2" />
      <path d="m10.4 9.4 5 2.6-5 2.6z" />
    </Glyph>
  ),
  x: (p) => (
    <Glyph {...p}>
      <path d="m4 3.6 16 16.8M20 3.6 4 20.4" />
    </Glyph>
  ),
  linkedin: (p) => (
    <Glyph {...p}>
      <rect x="3" y="3" width="18" height="18" rx="3.4" />
      <path d="M7.6 10.6v6.2M11.6 16.8v-3.6a2.4 2.4 0 0 1 4.8 0v3.6" />
      <circle cx="7.6" cy="7.4" r="1" fill="currentColor" stroke="none" />
    </Glyph>
  ),
  whatsapp: (p) => (
    <Glyph {...p}>
      <path d="M3.4 20.6 4.7 17A8.2 8.2 0 1 1 8 20.2z" />
      <path d="M9 9.2c0 3 2 5 4.8 5.6.5-.4.8-1 1-1.6l-1.9-.9-.9 1c-1-.5-1.7-1.2-2.2-2.2l1-.9-.9-1.9c-.6.2-1.2.5-1.6 1z" />
    </Glyph>
  ),
  globe: (p) => (
    <Glyph {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.3 2.4 3.5 5.3 3.5 9s-1.2 6.6-3.5 9c-2.3-2.4-3.5-5.3-3.5-9S9.7 5.4 12 3z" />
    </Glyph>
  ),
  mail: (p) => (
    <Glyph {...p}>
      <rect x="2.8" y="5" width="18.4" height="14" rx="2.6" />
      <path d="m3.6 7.4 7.2 5.2c.7.5 1.7.5 2.4 0l7.2-5.2" />
    </Glyph>
  ),
  phone: (p) => (
    <Glyph {...p}>
      <path d="M7.6 3.6H4.8c-1 0-1.9.9-1.8 1.9.4 8 6.7 14.3 14.7 14.7 1 .1 1.9-.8 1.9-1.8v-2.8l-4-1.4-1.7 2a13.6 13.6 0 0 1-6-6l2-1.7z" />
    </Glyph>
  ),
  arrow: (p) => (
    <Glyph {...p}>
      <path d="M4.5 12h14M13 6.5 18.5 12 13 17.5" />
    </Glyph>
  ),
};

/** The knob each glyph sits in. Networks keep their own colour; the rest take the accent. */
export const LINK_KNOBS: Record<LinkIcon, string> = {
  instagram: "bg-[linear-gradient(135deg,#F58529,#DD2A7B_55%,#8134AF)] text-white",
  facebook: "bg-[#1877F2] text-white",
  youtube: "bg-[#FF0000] text-white",
  x: "bg-black text-white",
  linkedin: "bg-[#0A66C2] text-white",
  whatsapp: "bg-[#25D366] text-white",
  globe: "bg-accent text-accent-ink",
  mail: "bg-accent text-accent-ink",
  phone: "bg-accent text-accent-ink",
  arrow: "bg-accent text-accent-ink",
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
