import type { Track } from "@/lib/tracks";
import type { IncrcContent, IncrcSectionId } from "@/lib/incrcContent";
import { CalendarSection } from "./CalendarSection";
import { FamilyBanner } from "./FamilyBanner";
import { GridSection } from "./GridSection";
import { IntroSection } from "./IntroSection";
import { Marquee } from "./Marquee";
import { PartnershipSection } from "./PartnershipSection";
import { PostsSection } from "./PostsSection";
import { RegisterBand } from "./RegisterBand";
import { RowsSection } from "./RowsSection";
import { StatsBand } from "./StatsBand";
import { VenuesSection } from "./VenuesSection";
import { VisionSection } from "./VisionSection";

/**
 * The body of /incrc, assembled from the document's running order.
 *
 * A section that is switched off is not rendered at all — not hidden with CSS —
 * so it costs nothing and its ids are genuinely absent from the page.
 *
 * The public route and the admin's preview both render THIS, which is what stops
 * the preview drifting from the site. Adding a section is a `case` here, an id
 * in INCRC_SECTION_IDS, and a panel in the admin.
 *
 * `data-preview` is what the admin's preview pane scrolls to; it does nothing on
 * the live page.
 */
export function IncrcSections({
  content,
  tracks,
}: {
  content: IncrcContent;
  /** The circuits the calendar's rounds point at. Empty simply drops the maps. */
  tracks: Track[];
}) {
  return (
    <>
      {content.sections
        .filter((entry) => entry.visible)
        .map((entry) => (
          <div key={entry.id} data-preview={entry.id}>
            {section(entry.id, content, tracks)}
          </div>
        ))}
    </>
  );
}

function section(id: IncrcSectionId, content: IncrcContent, tracks: Track[]): React.ReactNode {
  switch (id) {
    case "marquee":
      return <Marquee marquee={content.marquee} />;
    case "intro":
      return <IntroSection intro={content.intro} meta={content.meta} />;
    case "stats":
      return <StatsBand stats={content.stats} />;
    case "vision":
      return <VisionSection vision={content.vision} />;
    case "grid":
      return <GridSection grid={content.grid} />;
    case "venues":
      return <VenuesSection venues={content.venues} />;
    case "calendar":
      return <CalendarSection calendar={content.calendar} tracks={tracks} />;
    case "partnership":
      return <PartnershipSection partnership={content.partnership} />;
    case "family":
      return <FamilyBanner family={content.family} meta={content.meta} />;
    case "rows":
      return <RowsSection rows={content.rows} />;
    case "posts":
      return <PostsSection posts={content.posts} />;
    case "register":
      return <RegisterBand register={content.register} />;
  }
}
