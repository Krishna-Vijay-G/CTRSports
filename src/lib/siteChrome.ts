import type { LandingContent } from "@/lib/landingContent";

/**
 * The header and footer are written for the home page.
 *
 * Their links are mostly bare anchors — `#about`, `#sports` — because that is
 * what they are on the page they were written for. On any other route those
 * scroll nowhere at all: the browser looks for the id, does not find it, and
 * silently does nothing, which reads to a visitor as a broken navigation bar.
 *
 * So every route that borrows the chrome says which anchors it actually has, and
 * the rest are sent to the same section on the home page instead. Anything that
 * is already a path is left alone.
 *
 * One helper rather than a copy per route, because the failure it prevents is
 * invisible: a route that forgets to do this looks completely fine until someone
 * clicks the nav.
 */

/** The three every page inside the card has, whatever else it carries. */
export const SHELL_ANCHORS = ["#top", "#main-content", "#footer"] as const;

export function sendAnchorsHome(
  content: LandingContent,
  localAnchors: Iterable<string>
): LandingContent {
  const local = new Set<string>([...SHELL_ANCHORS, ...localAnchors]);

  const fix = (href: string) => {
    if (!href.startsWith("#")) return href;

    // Every page inside the card has an id="top", so this one IS local — but in
    // the navigation it is the "Home" link, and Home has to mean the home page.
    // Scrolling a visitor to the top of the page they are already on is the one
    // reading of it nobody wants.
    if (href === "#top") return "/";

    return local.has(href) ? href : `/${href}`;
  };

  return {
    ...content,
    nav: {
      links: content.nav.links.map((link) => ({ ...link, href: fix(link.href) })),
      cta: { ...content.nav.cta, href: fix(content.nav.cta.href) },
    },
  };
}
