import type { ReactNode } from "react";
import { getChrome } from "@/lib/server/contentRepo";
import { sendAnchorsHome } from "@/lib/siteChrome";
import type { Site } from "@/lib/sites";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * The card every public page lives inside.
 *
 * The page colour showing around one rounded card, the header at the top of it
 * and the footer at the foot. This was copied into seven route files, character
 * for character, and a change to it meant finding all seven.
 *
 * ── Why a component and not a layout ──────────────────────────────────────
 *
 * A Next layout cannot take props, and the two things that differ between pages
 * are both props: which anchors this page actually has, and whether the header
 * is laid over a banner or drawn as a bar. A layout would have to guess both.
 * `[sport]/layout.tsx` still exists and does the one job a layout is right for
 * — refusing an unknown or draft sport once for the whole subtree.
 *
 * ── Why it reads the chrome rather than being handed it ──────────────────
 *
 * Because every page would otherwise fetch the same thing to pass it straight
 * back down, and the read underneath is memoised per request so the fetch is
 * free wherever it happens. Six route files stopped mentioning the chrome at
 * all when this moved here, which is six places that can no longer draw the
 * wrong site's header.
 *
 * ── The anchors ───────────────────────────────────────────────────────────
 *
 * The header's links are written for the home page and are mostly bare anchors.
 * On any other route those scroll nowhere, so `sendAnchorsHome` sends the ones
 * this page does not have to this site's own home page instead. A sub-page has
 * none of its own; the home page passes the list its sections produce.
 */
export async function SiteShell({
  site,
  anchors = [],
  year,
  /**
   * The page's own header, for a page that draws it itself.
   *
   * The home page's banners lay the navigation over the photograph, so the
   * header goes INTO the section renderer rather than above it. Passing
   * `header={false}` says "this page has placed it"; anything else gets the
   * solid bar in the flow.
   */
  header = true,
  children,
}: {
  /** Whose page this is, and therefore whose chrome it wears. */
  site: Site;
  anchors?: readonly string[];
  year: number;
  header?: boolean;
  children: ReactNode;
}) {
  const resolved = sendAnchorsHome(site, await getChrome(site), anchors);

  return (
    <div id="top" className="min-h-screen bg-page p-2 sm:p-3">
      {/* overflow-hidden is what clips a banner photo to the card's radius.
          1920 so a full-HD window is filled rather than framed in page colour;
          past that the card centres and the margin grows. */}
      <div className="mx-auto max-w-[1920px] overflow-hidden rounded-card bg-surface">
        <main id="main-content">
          {header ? (
            // `home={false}` is what puts Back in the header — the one control
            // somebody who arrived from a link actually wants.
            <SiteHeader
              content={resolved}
              home={false}
              className="relative z-20 border-b border-line bg-surface"
            />
          ) : null}

          {children}
        </main>

        <SiteFooter content={resolved} year={year} />
      </div>
    </div>
  );
}

