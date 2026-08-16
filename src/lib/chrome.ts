/**
 * The header and the footer, assembled from their sections.
 *
 * `SiteHeader`, `SiteFooter` and the splash screen want six named things, not a
 * list to search — a header that had to look up whether this page happens to
 * carry a `brand` section would be a header with an opinion about page layout.
 * So the chrome sections are read like any others and folded into one object
 * here, once, at the boundary.
 *
 * This is what `LandingContent` became. The type is narrower — the landing
 * page's own bands (`about`, `sportsSection`, `ctaBand`, the banners) are
 * sections now, like every other page's — and the six that are left are the
 * genuinely site-wide ones.
 *
 * ── One chrome per SITE ───────────────────────────────────────────────────
 *
 * Every route used to draw the root's, because there was one site. Since 0017
 * the six sections live on each site's own `chrome` page, so the header on
 * /incrc is INCRC's — its brand, its navigation, its footer — and correcting an
 * address on one sport does not silently correct it on another.
 *
 * The three consequences worth knowing: a sport's chrome started as a copy of
 * the root's, so nothing changed on the day it moved; the chrome is drawn around
 * every route a site serves, so saving it clears all of them (see
 * revalidateSite.ts); and a site with no chrome rows renders BLANK_CHROME rather
 * than the root's, because falling back to somebody else's header is worse than
 * an empty one.
 *
 * Shared by the server and the browser, so nothing here may import `server-only`.
 */

import { BLANK_BRAND, type Brand } from "@/lib/sections/brand/model";
import { BLANK_CONTACT, type Contact } from "@/lib/sections/contact/model";
import { BLANK_FOOTER, type Footer } from "@/lib/sections/footer/model";
import { BLANK_NAV, type Nav } from "@/lib/sections/nav/model";
import { BLANK_SPLASH, type Splash } from "@/lib/sections/splash/model";
import type { Socials } from "@/lib/sections/socials/model";
import type { Section } from "@/lib/sections/document";

export type Chrome = {
  brand: Brand;
  nav: Nav;
  splash: Splash;
  contact: Contact;
  socials: Socials;
  footer: Footer;
};

/**
 * What a site with no chrome rows renders as.
 *
 * Not "no header" — an empty one. The navigation would be a bare bar and the
 * footer a rule with nothing above it, which is a site nobody has written yet
 * rather than a broken page.
 */
export const BLANK_CHROME: Chrome = {
  brand: { ...BLANK_BRAND },
  nav: { links: [], cta: { ...BLANK_NAV.cta } },
  splash: { ...BLANK_SPLASH },
  contact: { ...BLANK_CONTACT },
  socials: [],
  footer: { ...BLANK_FOOTER },
};

/**
 * The chrome sections of a page, as one object.
 *
 * A section that is not there falls back to its blank, field by field — the same
 * contract as everywhere else, and the reason a half-written site still renders
 * a complete page rather than crashing on `chrome.contact.phone`.
 */
export function assembleChrome(sections: readonly Section[]): Chrome {
  const find = <T,>(type: keyof Chrome, fallback: T): T => {
    const section = sections.find((entry) => entry.type === type);
    return section ? (section.data as T) : fallback;
  };

  return {
    brand: find("brand", BLANK_CHROME.brand),
    nav: find("nav", BLANK_CHROME.nav),
    splash: find("splash", BLANK_CHROME.splash),
    contact: find("contact", BLANK_CHROME.contact),
    socials: find("socials", BLANK_CHROME.socials),
    footer: find("footer", BLANK_CHROME.footer),
  };
}
