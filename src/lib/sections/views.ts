/**
 * What a visitor sees, one component per kind of section.
 *
 * Keyed by `SectionType`, which is derived from the model registry — so a module
 * added to `registry.ts` does not compile until it has a view here. That is the
 * check nothing performed when a section was a `case` in a `switch`.
 *
 * `null` is a real answer, not a gap: `meta` is the page's identity and the six
 * chrome sections are drawn by the header and the footer. Both are sections
 * because both are stored and edited like one, and neither is a band on the
 * page.
 *
 * Imported by the public page and by the console's preview — the same map, which
 * is what stops the preview drifting from the site.
 */

import type { ComponentType } from "react";
import type { SectionType } from "@/lib/sections/registry";
import type { SectionViewProps } from "@/lib/sections/types";

import { BannersView } from "./banners/view";
import { MarqueeView } from "./marquee/view";
import { AnnouncementView } from "./announcement/view";
import { IntroView } from "./intro/view";
import { AboutView } from "./about/view";
import { StatsView } from "./stats/view";
import { VisionView } from "./vision/view";
import { GridView } from "./grid/view";
import { PartnershipView } from "./partnership/view";
import { FamilyView } from "./family/view";
import { VenuesView } from "./venues/view";
import { CalendarView } from "./calendar/view";
import { SportsView } from "./sportsSection/view";
import { RowsView } from "./rows/view";
import { PostsView } from "./posts/view";
import { DecksView } from "./decks/view";
import { RegistrationsView } from "./registrations/view";
import { RegisterView } from "./register/view";
import { CtaBandView } from "./ctaBand/view";

/**
 * A view with its value type erased.
 *
 * `any` in exactly one place, and it is the price of a heterogeneous map: props
 * are contravariant, so a component taking `SectionViewProps<Marquee>` is not
 * assignable to one taking `SectionViewProps<unknown>`. Each view is fully typed
 * where it is written and where the module normalises its data; only the lookup
 * is loose, and the lookup is one line in one renderer.
 */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type SectionView = ComponentType<SectionViewProps<any>>;

export const SECTION_VIEWS: Record<SectionType, SectionView | null> = {
  meta: null,

  banners: BannersView,
  marquee: MarqueeView,
  announcement: AnnouncementView,
  intro: IntroView,
  about: AboutView,
  stats: StatsView,
  vision: VisionView,
  grid: GridView,
  partnership: PartnershipView,
  family: FamilyView,
  venues: VenuesView,
  calendar: CalendarView,
  sportsSection: SportsView,
  rows: RowsView,
  posts: PostsView,
  decks: DecksView,
  registrations: RegistrationsView,
  register: RegisterView,
  ctaBand: CtaBandView,

  /* Drawn by SiteHeader, SiteFooter and the splash screen. */
  brand: null,
  nav: null,
  splash: null,
  contact: null,
  socials: null,
  footer: null,
};
