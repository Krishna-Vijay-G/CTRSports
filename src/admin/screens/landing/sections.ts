import {
  BoltIcon,
  GlobeIcon,
  ImagesIcon,
  ListIcon,
  MonitorIcon,
  ShieldIcon,
  TextIcon,
  TrophyIcon,
} from "@/admin/ui/icons";

/**
 * The landing editor's table of contents.
 *
 * One entry per part of the page, in the order a visitor meets them. The whole
 * page is edited on one screen, but only one of these is on screen at a time —
 * which is what keeps the editor to a column of fields with no scrolling to
 * speak of.
 *
 * Adding a part of the page means adding a line here, a `case` in
 * LandingEditor's switch, and a panel file. Nothing else knows about sections.
 */

export type SectionId =
  | "brand"
  | "splash"
  | "nav"
  | "banners"
  | "about"
  | "sports"
  | "cta"
  | "footer";

/** The parts of the preview a section can point at. */
export type PreviewAnchor = "banners" | "about" | "sports" | "cta" | "footer";

export type Section = {
  id: SectionId;
  /** One short word. Kept for the narrowest layouts. */
  short: string;
  /** The heading above the fields, and the sidebar's label. */
  title: string;
  hint: string;
  /**
   * Where to scroll the preview when this section is opened. Omitted where
   * there is nothing to look at — the splash screen is not previewed.
   */
  preview?: PreviewAnchor;
  /** Rendered by the rail and the editor's header. Takes its size from them. */
  Icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
};

export const SECTIONS: Section[] = [
  {
    id: "brand",
    short: "Brand",
    title: "Brand",
    hint: "The name and logo used in the header, the footer and the splash screen.",
    preview: "banners",
    Icon: ShieldIcon,
  },
  {
    id: "splash",
    short: "Splash",
    title: "Splash screen",
    hint: "The panel that covers the page while the first banner photo loads.",
    Icon: MonitorIcon,
  },
  {
    id: "nav",
    short: "Nav",
    title: "Navigation",
    hint: "The links across the top of the banners, and the button beside them.",
    preview: "banners",
    Icon: ListIcon,
  },
  {
    id: "banners",
    short: "Banners",
    title: "Banners",
    hint: "The rotating panels at the top of the page — photo, copy, link, layout.",
    preview: "banners",
    Icon: ImagesIcon,
  },
  {
    id: "about",
    short: "About",
    title: "About",
    hint: "Who CTR is — the copy and the two photographs beside it.",
    preview: "about",
    Icon: TextIcon,
  },
  {
    id: "sports",
    short: "Sports",
    title: "Sports",
    hint: "The heading above the cards, and the cards themselves.",
    preview: "sports",
    Icon: TrophyIcon,
  },
  {
    id: "cta",
    short: "CTA",
    title: "Call to action",
    hint: "The yellow band between the sports and the footer.",
    preview: "cta",
    Icon: BoltIcon,
  },
  {
    id: "footer",
    short: "Footer",
    title: "Footer",
    hint: "The address and number at the foot of every page, and the social links.",
    preview: "footer",
    Icon: GlobeIcon,
  },
];
