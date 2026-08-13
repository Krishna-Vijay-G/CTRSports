import type { IncrcSectionId } from "@/lib/incrcContent";
import type { RailItem } from "@/admin/components/SectionRail";
import {
  CalendarIcon,
  ChartIcon,
  HandshakeIcon,
  ImagesIcon,
  LayersIcon,
  MapIcon,
  MegaphoneIcon,
  NewsIcon,
  RowsIcon,
  StarIcon,
  TextIcon,
  TicketIcon,
  UsersIcon,
} from "@/admin/ui/icons";

/**
 * The INCRC editor's table of contents.
 *
 * One of these is not a section of the page: the banners carry the header, so
 * they are always first and are never part of the running order. The
 * championship's own name and handle have no tab either — they are edited under
 * the introduction, the section that uses them.
 *
 * The rest line up one-to-one with INCRC_SECTION_IDS, and their `preview` is
 * that id — which is also the `data-preview` the page renders, so opening a tab
 * scrolls the preview to the thing it edits.
 *
 * The order below is only the order a stored document is normalised into. What
 * the page actually runs is `content.sections`, which the sidebar drags around —
 * there is no layout screen, because that list and this one are the same list.
 *
 * Adding a section to the page means a line here, a `case` in IncrcEditor's
 * switch, a panel file, and an id in INCRC_SECTION_IDS.
 */

export type TabId = IncrcSectionId | "banners";

export type Tab = RailItem<TabId> & {
  /** The heading above the fields. */
  title: string;
  /** Where to scroll the preview. Omitted where there is nothing to look at. */
  preview?: IncrcSectionId;
};

export const TABS: Tab[] = [
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
    hint: "The heading over the first three circuits. The circuits themselves live on the Circuits screen.",
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
    hint: "The full-bleed photograph, the quote over it, and the chips under it.",
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
