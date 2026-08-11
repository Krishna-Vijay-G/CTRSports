import type { IncrcSectionId } from "@/lib/incrcContent";
import type { RailItem } from "@/components/admin/SectionRail";
import {
  CalendarIcon,
  ChartIcon,
  FlagIcon,
  HandshakeIcon,
  ImagesIcon,
  LayersIcon,
  MapIcon,
  MegaphoneIcon,
  NewsIcon,
  RowsIcon,
  StackIcon,
  StarIcon,
  TextIcon,
  TicketIcon,
  UsersIcon,
} from "@/components/admin/ui/icons";

/**
 * The INCRC editor's table of contents.
 *
 * Two of these are not sections of the page:
 *
 *   layout   — the running order. Which sections are on the page, and in what
 *              order. This is the one that adds and removes them.
 *   identity — the championship's name, handle and entry link, which are used by
 *              several sections and by the page's metadata rather than by any
 *              one of them.
 *
 * The rest line up one-to-one with INCRC_SECTION_IDS, and their `preview` is
 * that id — which is also the `data-preview` the page renders, so opening a tab
 * scrolls the preview to the thing it edits.
 *
 * Adding a section to the page means a line here, a `case` in IncrcEditor's
 * switch, a panel file, and an id in INCRC_SECTION_IDS.
 */

export type TabId = IncrcSectionId | "layout" | "identity" | "banners";

export type Tab = RailItem<TabId> & {
  /** The heading above the fields. */
  title: string;
  /** Where to scroll the preview. Omitted where there is nothing to look at. */
  preview?: IncrcSectionId;
};

export const TABS: Tab[] = [
  {
    id: "layout",
    short: "Layout",
    title: "Page layout",
    hint: "Which sections are on the page, and the order they run in.",
    Icon: StackIcon,
  },
  {
    id: "identity",
    short: "Name",
    title: "Championship identity",
    hint: "The name, the handle and where entries go. Used across the page.",
    Icon: FlagIcon,
  },
  {
    id: "banners",
    short: "Banners",
    title: "Banners",
    hint: "The rotating panels at the top — photo, copy, link, layout.",
    Icon: ImagesIcon,
  },
  {
    id: "marquee",
    short: "Ticker",
    title: "Ticker",
    hint: "The line of announcements sliding under the banners.",
    preview: "marquee",
    Icon: MegaphoneIcon,
  },
  {
    id: "intro",
    short: "Intro",
    title: "Introduction",
    hint: "What the championship is, and the three names on it.",
    preview: "intro",
    Icon: TextIcon,
  },
  {
    id: "stats",
    short: "Stats",
    title: "Numbers",
    hint: "The championship in a handful of figures.",
    preview: "stats",
    Icon: ChartIcon,
  },
  {
    id: "vision",
    short: "Vision",
    title: "Vision",
    hint: "What the championship is for, in cards.",
    preview: "vision",
    Icon: StarIcon,
  },
  {
    id: "grid",
    short: "Grid",
    title: "The grid",
    hint: "The circuit render and the categories that line up on it.",
    preview: "grid",
    Icon: LayersIcon,
  },
  {
    id: "venues",
    short: "Venues",
    title: "Venues",
    hint: "The circuits, each with its layout drawn.",
    preview: "venues",
    Icon: MapIcon,
  },
  {
    id: "calendar",
    short: "Rounds",
    title: "Calendar",
    hint: "The rounds of the season, in order.",
    preview: "calendar",
    Icon: CalendarIcon,
  },
  {
    id: "partnership",
    short: "Signing",
    title: "Partnership",
    hint: "How the championship came about, in photographs.",
    preview: "partnership",
    Icon: HandshakeIcon,
  },
  {
    id: "family",
    short: "Quote",
    title: "Motorsport family",
    hint: "The full-bleed photograph and the quote over it.",
    preview: "family",
    Icon: UsersIcon,
  },
  {
    id: "rows",
    short: "Bulletin",
    title: "Bulletin",
    hint: "The list of rows near the foot of the page.",
    preview: "rows",
    Icon: RowsIcon,
  },
  {
    id: "posts",
    short: "Posts",
    title: "Posts",
    hint: "The newsroom cards — photo, date, headline, excerpt.",
    preview: "posts",
    Icon: NewsIcon,
  },
  {
    id: "register",
    short: "Enter",
    title: "Registration",
    hint: "The yellow band at the foot, and the only thing the page asks for.",
    preview: "register",
    Icon: TicketIcon,
  },
];
