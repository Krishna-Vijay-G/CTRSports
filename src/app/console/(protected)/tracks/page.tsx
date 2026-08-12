import { listTracks } from "@/lib/server/tracksRepo";
import { TracksEditor } from "@/admin/screens/tracks/TracksEditor";

export const dynamic = "force-dynamic";

/**
 * The circuits, edited on a screen of their own.
 *
 * Not part of either page's editor: a circuit is a thing the championship
 * visits, not a section of a document, and the calendar only points at it.
 *
 * Deliberately uses the throwing loader, not the safe one: an editor that
 * quietly showed an empty list after a failed read would invite someone to add
 * the same circuits a second time.
 */
export default async function TracksAdminPage() {
  const tracks = await listTracks();

  return <TracksEditor initialTracks={tracks} />;
}
