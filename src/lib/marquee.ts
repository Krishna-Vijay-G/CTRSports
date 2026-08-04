import type { SportId } from "@/lib/sports";

/**
 * One scrolling announcement on a page's marquee strip. `url` is optional —
 * an item with none renders as plain text rather than a dead link.
 */
export type MarqueeItem = {
  id: string;
  text: string;
  url: string | null;
};

/** One marquee per page — `sport` is which page it belongs to ('main' is the landing page). */
export type PageMarquee = {
  sport: SportId;
  items: MarqueeItem[];
  updated_at: string;
};

export const MAX_MARQUEE_ITEMS = 8;
export const MARQUEE_TEXT_MAX = 140;
