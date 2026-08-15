import { visibleRoots } from "@/lib/mediaPaths";
import { requireAnyPage } from "@/lib/server/access";
import { isS3Configured } from "@/lib/server/s3";
import { MediaLibrary } from "@/admin/screens/media/MediaLibrary";

export const dynamic = "force-dynamic";

/**
 * The media library, on a screen of its own.
 *
 * Not part of any page's editor, because media is not part of any one page —
 * which is also why it is not a `PAGE_KEYS` entry. What scopes it is the folder
 * map: the roots handed down here are the ones this account may browse, and
 * every route it calls re-checks that for itself.
 *
 * The listing is NOT fetched here. Every other screen server-renders its data,
 * and this one deliberately does not: the folder is a piece of client state that
 * changes as somebody navigates, so a server-rendered first folder would be one
 * more code path returning the same shape the client already has to fetch for
 * every subsequent folder. The empty first paint is one request long.
 */
export default async function MediaAdminPage() {
  const session = await requireAnyPage();

  return <MediaLibrary configured={isS3Configured()} roots={visibleRoots(session)} />;
}
