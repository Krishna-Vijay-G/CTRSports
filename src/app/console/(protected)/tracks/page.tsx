import { getIncrcContentSafe, getLandingContentSafe } from "@/lib/server/contentRepo";
import { listTracks } from "@/lib/server/tracksRepo";
import { TracksEditor } from "@/admin/screens/tracks/TracksEditor";

export const dynamic = "force-dynamic";

/**
 * The circuits, edited on a screen of their own.
 *
 * Not part of either page's editor: a circuit is a thing the championship
 * visits, not a section of a document, and the calendar only points at it.
 *
 * Deliberately uses the throwing loader for the circuits themselves, not the
 * safe one: an editor that quietly showed an empty list after a failed read
 * would invite someone to add the same circuits a second time. The two documents
 * beside it are only there for the preview's chrome and its calendar block, so
 * those fall back rather than take the screen down with them.
 */
export default async function TracksAdminPage() {
  const [tracks, landing, incrc] = await Promise.all([
    listTracks(),
    getLandingContentSafe(),
    getIncrcContentSafe(),
  ]);

  return (
    <TracksEditor
      initialTracks={tracks}
      chrome={landing}
      rounds={incrc.calendar.rounds}
      year={new Date().getFullYear()}
    />
  );
}
