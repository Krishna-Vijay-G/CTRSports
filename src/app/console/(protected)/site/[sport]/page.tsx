import { requireSite } from "@/lib/server/access";
import { readSitePage } from "@/lib/server/contentRepo";
import { getEditorRecords } from "@/lib/server/recordsRepo";
import { PageEditor } from "@/admin/screens/page/PageEditor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ sport: string }> };

/**
 * One site's page, edited on one screen.
 *
 * There used to be two editors behind this address — `LandingEditor` for the
 * root and `IncrcEditor` for a sport — because the two pages were two content
 * types with a normaliser and a `switch` each. They are the same thing now: an
 * ordered list of section instances. One editor, whatever site this is.
 *
 * Deliberately uses the throwing loaders, not the safe ones: an editor that
 * quietly showed a blank page after a failed read would let someone "save" it
 * straight over the real content.
 */
export default async function SitePageEditor({ params }: Props) {
  const { sport } = await params;
  const { site } = await requireSite(sport, "page");

  const sections = await readSitePage(site, "home");

  /*
   * The chrome page comes along read-only. It supplies the header and footer the
   * preview draws around this page, so what is on screen is the real thing
   * rather than a body with nothing around it — and since 0017 it is this
   * site's own, edited next door on /site/<sport>/chrome rather than borrowed
   * from the landing page.
   */
  const [chrome, records] = await Promise.all([
    readSitePage(site, "chrome"),
    getEditorRecords(site, sections),
  ]);

  return (
    <PageEditor
      site={site}
      kind="home"
      initialSections={sections}
      counterpart={chrome}
      records={records}
      year={new Date().getFullYear()}
    />
  );
}
