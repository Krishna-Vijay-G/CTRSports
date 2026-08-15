import { SITE } from "@/config/site";
import { getLandingContent } from "@/lib/server/contentRepo";
import { listVisibleSports } from "@/lib/server/sportsRepo";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { BannerCarousel } from "./_components/banner/BannerCarousel";
import { SplashScreen } from "./_components/SplashScreen";
import { AboutSection } from "./_components/sections/AboutSection";
import { CtaBand } from "./_components/sections/CtaBand";
import { SportsSection } from "./_components/sections/SportsSection";

/**
 * The landing page: who CTR is, and which sports it runs.
 *
 * Every word and picture comes from the database — the copy as rows of
 * `ctr.page_sections` and `ctr.banners`, the sports as rows of `ctr.sports`.
 *
 * Neither loader falls back. There is no default copy left in the repo to fall
 * back TO: a database this page cannot read is an outage, and it renders the
 * error boundary beside this file rather than an older version of the site
 * dressed up as the current one.
 *
 * Everything sits inside one rounded card with the page colour showing around
 * it. That card is the layout: a new section is a child of it and picks up the
 * horizontal rhythm from `.shell`.
 *
 * Re-rendered at most once a minute. Saving in the admin also revalidates this
 * path, so an edit is live immediately rather than up to a minute later.
 */
export const revalidate = 60;

export default async function LandingPage() {
  const [content, sports] = await Promise.all([
    getLandingContent(),
    listVisibleSports(),
  ]);

  // Built here rather than in the root layout because `sameAs` and the logo are
  // editable content, and only this route loads the document.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    name: content.brand.name,
    alternateName: `${content.brand.name} ${content.brand.subtitle}`,
    url: SITE.url,
    logo: content.brand.logo.startsWith("/")
      ? `${SITE.url}${content.brand.logo}`
      : content.brand.logo,
    sameAs: content.socials.map((social) => social.href),
    // The footer's contact block, said in a way a search engine can read. Each
    // is omitted when it is blank rather than emitted empty: a property with
    // nothing in it is worse than an absent one, because it asserts that there
    // is no phone number rather than saying nothing about it.
    ...(content.contact.address
      ? {
          address: {
            "@type": "PostalAddress",
            // The lines as typed, joined — Schema wants one string here, and
            // this is the one place the newlines are not the presentation.
            streetAddress: content.contact.address.split("\n").join(", "),
            addressCountry: "IN",
          },
        }
      : {}),
    ...(content.contact.phone ? { telephone: content.contact.phone } : {}),
    ...(content.contact.email ? { email: content.contact.email } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SplashScreen splash={content.splash} />

      <div id="top" className="min-h-screen bg-page p-2 sm:p-3">
        {/* overflow-hidden is what clips the banner photo to the card's radius.
            1920 so a full-HD window is filled rather than framed in page colour;
            past that the card centres and the margin grows. */}
        <div className="mx-auto max-w-[1920px] overflow-hidden rounded-card bg-surface">
          <main id="main-content">
            <BannerCarousel
              banners={content.banners}
              header={<SiteHeader content={content} home />}
            />
            <AboutSection about={content.about} />
            <SportsSection heading={content.sportsSection} sports={sports} />
            <CtaBand band={content.ctaBand} sports={sports} />
          </main>

          <SiteFooter content={content} year={new Date().getFullYear()} />
        </div>
      </div>
    </>
  );
}
