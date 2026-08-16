import type { Chrome } from "@/lib/chrome";
import { siteHref, type SiteRef } from "@/lib/sites";

/**
 * The header and the footer are written for the home page.
 *
 * Their links are mostly bare anchors — `#about`, `#calendar` — because that is
 * what they are on the page they were written for. On any other route those
 * scroll nowhere at all: the browser looks for the id, does not find it, and
 * silently does nothing, which reads to a visitor as a broken navigation bar.
 *
 * So every route that draws the chrome says which anchors it actually has, and
 * the rest are sent to the same section on the home page instead. Anything that
 * is already a path is left alone.
 *
 * One helper rather than a copy per route, because the failure it prevents is
 * invisible: a route that forgets to do this looks completely fine until someone
 * clicks the nav.
 *
 * ── Home means THIS site's home ───────────────────────────────────────────
 *
 * `/incrc#calendar` from a page of INCRC's, `/#about` from a page of the root's.
 *
 * This is the half of phase 4 that could not be done in phase 3, and trying was
 * a mistake worth recording: until 0017 the chrome every route drew was the
 * ROOT's, written against the landing page, so resolving `#about` against the
 * sport would have pointed at a band the sport does not have — and `#top`, which
 * IS the "Home" link, would have pointed at the page the reader was already on.
 *
 * A site owns its chrome now. Its links are written against its own page, so
 * they resolve against its own page.
 */

/** The three every page inside the card has, whatever else it carries. */
export const SHELL_ANCHORS = ["#top", "#main-content", "#footer"] as const;

export function sendAnchorsHome(
  site: SiteRef,
  content: Chrome,
  localAnchors: Iterable<string>
): Chrome {
  const local = new Set<string>([...SHELL_ANCHORS, ...localAnchors]);

  // "" for the root, "/incrc" for a sport — and `revalidatePath` is not the only
  // thing that cannot take an empty path, so the home link is the one place the
  // root's empty prefix has to become a slash.
  const home = siteHref(site) || "/";

  const fix = (href: string) => {
    if (!href.startsWith("#")) return href;

    // Every page inside the card has an id="top", so this one IS local — but in
    // the navigation it is the "Home" link, and Home has to mean the home page.
    // Scrolling a visitor to the top of the page they are already on is the one
    // reading of it nobody wants.
    if (href === "#top") return home;

    if (local.has(href)) return href;

    // The root's home is "/" and already ends in the slash; a sport's is
    // "/incrc" and must not gain one, or the link becomes "/incrc/#about".
    return home === "/" ? `/${href}` : `${home}${href}`;
  };

  return {
    ...content,
    nav: {
      links: content.nav.links.map((link) => ({ ...link, href: fix(link.href) })),
      cta: { ...content.nav.cta, href: fix(content.nav.cta.href) },
    },
  };
}
