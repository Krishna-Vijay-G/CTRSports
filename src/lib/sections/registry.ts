/**
 * Every kind of section there is.
 *
 * The one list. Adding a section to the whole project is: a folder under
 * `src/lib/sections/`, a line here, and the two lines the compiler then demands
 * in `views.ts` and `panels.ts`. Nothing else knows the name of a section — not
 * the page renderer, not the editor, not the database.
 *
 * ── The order is the order the `+` picker offers them ─────────────────────
 *
 * Not the order any page runs in: a page's order is its own rows. This is the
 * menu, grouped roughly as somebody building a page would work down it — what
 * goes at the top, then the body, then what asks for something.
 *
 * ── Models only ───────────────────────────────────────────────────────────
 *
 * No components. See the note at the head of types.ts: the public page imports
 * this file to normalise what it read, and a registry that mentioned the panels
 * would put the entire admin UI in the bundle a visitor downloads.
 *
 * Shared by the server and the browser, so nothing here may import `server-only`.
 */

import type { SectionModule, Surface } from "@/lib/sections/types";
import type { Site } from "@/lib/sites";

import { meta } from "./meta/model";
import { banners } from "./banners/model";
import { marquee } from "./marquee/model";
import { announcement } from "./announcement/model";
import { intro } from "./intro/model";
import { about } from "./about/model";
import { stats } from "./stats/model";
import { vision } from "./vision/model";
import { grid } from "./grid/model";
import { partnership } from "./partnership/model";
import { family } from "./family/model";
import { venues } from "./venues/model";
import { calendar } from "./calendar/model";
import { sportsSection } from "./sportsSection/model";
import { rows } from "./rows/model";
import { posts } from "./posts/model";
import { decks } from "./decks/model";
import { registrations } from "./registrations/model";
import { register } from "./register/model";
import { ctaBand } from "./ctaBand/model";

import { brand } from "./brand/model";
import { nav } from "./nav/model";
import { splash } from "./splash/model";
import { contact } from "./contact/model";
import { socials } from "./socials/model";
import { footer } from "./footer/model";

const MODULES = {
  /* Fixed, and not a band on the page at all. */
  meta,

  /* The body, in picker order. */
  banners,
  marquee,
  announcement,
  intro,
  about,
  stats,
  vision,
  grid,
  partnership,
  family,
  venues,
  calendar,
  sportsSection,
  rows,
  posts,
  decks,
  registrations,
  register,
  ctaBand,

  /* The header and the footer. One of each, always. */
  brand,
  nav,
  splash,
  contact,
  socials,
  footer,
};

/**
 * The name of a kind of section, and the value stored in `page_sections.type`.
 *
 * Derived from the object above rather than written out beside it, so the two
 * cannot drift. This is also the key of the views and panels maps, which is what
 * makes a module with no view fail to compile.
 */
export type SectionType = keyof typeof MODULES;

export const SECTION_MODULES: Record<SectionType, SectionModule<unknown>> = MODULES;

/** In picker order. */
export const SECTION_TYPES = Object.keys(MODULES) as SectionType[];

export function isSectionType(value: unknown): value is SectionType {
  return typeof value === "string" && value in MODULES;
}

/**
 * The module for a type, or undefined for one this build has never heard of.
 *
 * A stored row can name a retired section — that is what makes retiring one a
 * code change and nothing else — so every caller has to be able to skip it.
 */
export function moduleFor(type: string): SectionModule<unknown> | undefined {
  return isSectionType(type) ? SECTION_MODULES[type] : undefined;
}

/** Every kind that may sit on this surface. */
export function typesFor(surface: Surface): SectionType[] {
  return SECTION_TYPES.filter((type) => SECTION_MODULES[type].surface.includes(surface));
}

/**
 * May this site place another section of this kind?
 *
 * Three rules, and the `+` picker is exactly these three:
 *
 *   the surface   a footer is not a band halfway down a page
 *   the modules   a calendar needs `events` switched on for this sport
 *   how many      most sections may repeat; some are one to a page
 *
 * `placed` is the types already on the page. Fixed sections are never offered:
 * they are there whether or not anybody adds them.
 */
export function canPlace(
  type: SectionType,
  surface: Surface,
  site: Pick<Site, "modules">,
  placed: readonly string[]
): boolean {
  const module = SECTION_MODULES[type];

  if (module.fixed) return false;
  if (!module.surface.includes(surface)) return false;
  if (!module.multiple && placed.includes(type)) return false;

  return (module.needs ?? []).every((needed) => site.modules.includes(needed));
}

/** What the `+` picker offers, in registry order. */
export function placeableTypes(
  surface: Surface,
  site: Pick<Site, "modules">,
  placed: readonly string[]
): SectionType[] {
  return SECTION_TYPES.filter((type) => canPlace(type, surface, site, placed));
}
