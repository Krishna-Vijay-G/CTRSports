import { requireSite } from "@/lib/server/access";
import { readSitePage } from "@/lib/server/contentRepo";
import { getEditorRecords } from "@/lib/server/recordsRepo";
import { PageEditor } from "@/admin/screens/page/PageEditor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ sport: string }> };

/**
 * One site's header and footer.
 *
 * The same editor as the page next door, pointed at the site's `chrome` page —
 * because it IS the same thing. Six sections, each with a panel of its own, in
 * a list on the left with the fields on the right and the live site in the
 * middle. Nothing here is a special case; `kind="chrome"` is the whole of the
 * difference, and `PageEditor` reads the rest off the registry.
 *
 * A separate GRANT from the page, which is the reason it is a separate screen
 * and not a seventh tab on that one: somebody can be trusted with a sport's
 * words without being trusted with the navigation that every one of its pages
 * wears.
 *
 * ── What the preview is showing ───────────────────────────────────────────
 *
 * The site's real home page, inside the header and footer being edited. A
 * chrome preview with an empty body would be a bar and a rule with a gap
 * between them — impossible to judge, and the one thing you actually want to
 * see is how the header sits over the first banner.
 *
 * The records and the page's identity are read from the HOME page for that
 * reason: they belong to what is being previewed, not to what is being edited.
 */
export default async function SiteChromeEditor({ params }: Props) {
  const { sport } = await params;
  const { site } = await requireSite(sport, "chrome");

  const [chrome, body] = await Promise.all([
    readSitePage(site, "chrome"),
    readSitePage(site, "home"),
  ]);

  return (
    <PageEditor
      site={site}
      kind="chrome"
      initialSections={chrome}
      counterpart={body}
      records={await getEditorRecords(site, body)}
      year={new Date().getFullYear()}
    />
  );
}
