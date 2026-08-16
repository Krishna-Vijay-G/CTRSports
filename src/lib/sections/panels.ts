/**
 * The console's face for each kind of section: the fields, and the icon.
 *
 * Keyed by `SectionType`, so a module added to `registry.ts` does not compile
 * until it has a panel here. Every kind has one — including the two that render
 * nothing, because they are still edited.
 *
 * ── Admin only ────────────────────────────────────────────────────────────
 *
 * Imported by the page editor and by nothing else. Every panel is a client
 * component pulling in the console's inputs, its pickers and (through the
 * article editor's neighbours) a good deal more, so this file must never be
 * reachable from a public route. That is the whole reason the registry is three
 * maps rather than one — see the note at the head of types.ts.
 */

import type { ComponentType } from "react";
import type { SectionType } from "@/lib/sections/registry";
import type { SectionPanelProps } from "@/lib/sections/types";
import {
  BoltIcon,
  CalendarIcon,
  ChartIcon,
  GlobeIcon,
  HandshakeIcon,
  FlagIcon,
  ImagesIcon,
  LayersIcon,
  ListIcon,
  MapIcon,
  MegaphoneIcon,
  MonitorIcon,
  NewsIcon,
  RowsIcon,
  ShieldIcon,
  StackIcon,
  StarIcon,
  TextIcon,
  TicketIcon,
  TrophyIcon,
  UsersIcon,
} from "@/admin/ui/icons";

import { MetaPanel } from "./meta/panel";
import { BannersPanel } from "./banners/panel";
import { MarqueePanel } from "./marquee/panel";
import { AnnouncementPanel } from "./announcement/panel";
import { IntroPanel } from "./intro/panel";
import { AboutPanel } from "./about/panel";
import { StatsPanel } from "./stats/panel";
import { VisionPanel } from "./vision/panel";
import { GridPanel } from "./grid/panel";
import { PartnershipPanel } from "./partnership/panel";
import { FamilyPanel } from "./family/panel";
import { VenuesPanel } from "./venues/panel";
import { CalendarPanel } from "./calendar/panel";
import { SportsPanel } from "./sportsSection/panel";
import { RowsPanel } from "./rows/panel";
import { PostsPanel } from "./posts/panel";
import { DecksPanel } from "./decks/panel";
import { RegistrationsPanel } from "./registrations/panel";
import { RegisterPanel } from "./register/panel";
import { CtaPanel } from "./ctaBand/panel";
import { BrandPanel } from "./brand/panel";
import { NavPanel } from "./nav/panel";
import { SplashPanel } from "./splash/panel";
import { ContactPanel } from "./contact/panel";
import { SocialsPanel } from "./socials/panel";
import { FooterPanel } from "./footer/panel";

/** See the note on `SectionView` — the same erasure, for the same reason. */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
type AnyPanel = ComponentType<SectionPanelProps<any>>;

export type SectionFace = {
  Panel: AnyPanel;
  Icon: (props: React.SVGProps<SVGSVGElement>) => React.ReactElement;
};

export const SECTION_PANELS: Record<SectionType, SectionFace> = {
  meta: { Panel: MetaPanel, Icon: FlagIcon },

  banners: { Panel: BannersPanel, Icon: ImagesIcon },
  marquee: { Panel: MarqueePanel, Icon: MegaphoneIcon },
  announcement: { Panel: AnnouncementPanel, Icon: BoltIcon },
  intro: { Panel: IntroPanel, Icon: TextIcon },
  about: { Panel: AboutPanel, Icon: TextIcon },
  stats: { Panel: StatsPanel, Icon: ChartIcon },
  vision: { Panel: VisionPanel, Icon: StarIcon },
  grid: { Panel: GridPanel, Icon: LayersIcon },
  partnership: { Panel: PartnershipPanel, Icon: HandshakeIcon },
  family: { Panel: FamilyPanel, Icon: UsersIcon },
  venues: { Panel: VenuesPanel, Icon: MapIcon },
  calendar: { Panel: CalendarPanel, Icon: CalendarIcon },
  sportsSection: { Panel: SportsPanel, Icon: TrophyIcon },
  rows: { Panel: RowsPanel, Icon: RowsIcon },
  posts: { Panel: PostsPanel, Icon: NewsIcon },
  decks: { Panel: DecksPanel, Icon: StackIcon },
  registrations: { Panel: RegistrationsPanel, Icon: ListIcon },
  register: { Panel: RegisterPanel, Icon: TicketIcon },
  ctaBand: { Panel: CtaPanel, Icon: BoltIcon },

  brand: { Panel: BrandPanel, Icon: ShieldIcon },
  nav: { Panel: NavPanel, Icon: ListIcon },
  splash: { Panel: SplashPanel, Icon: MonitorIcon },
  contact: { Panel: ContactPanel, Icon: MapIcon },
  socials: { Panel: SocialsPanel, Icon: GlobeIcon },
  footer: { Panel: FooterPanel, Icon: GlobeIcon },
};
