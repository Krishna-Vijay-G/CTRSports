import { requireSite } from "@/lib/server/access";
import { getChrome } from "@/lib/server/contentRepo";
import { listPublishedEvents } from "@/lib/server/eventsRepo";
import { listTracks } from "@/lib/server/tracksRepo";
import { TracksEditor } from "@/admin/screens/tracks/TracksEditor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ sport: string }> };

/**
 * One sport's circuits.
 *
 * Not part of the page editor: a circuit is a thing the championship visits,
 * not a section of a document, and the calendar only points at it.
 *
 * Deliberately uses the throwing loader for the circuits themselves, not the
 * safe one: an editor that quietly showed an empty list after a failed read
 * would invite someone to add the same circuits a second time. The two
 * The chrome and the page beside it are only there for the preview's header
 * and its calendar block, so those fall back rather than take the screen down
 * with them.
 */
export default async function TracksAdminPage({ params }: Props) {
  const { sport } = await params;
  const { site } = await requireSite(sport, "circuits");

  const [tracks, chrome, season] = await Promise.all([
    listTracks(site.id),
    getChrome(site),
    // The published season — what the preview's "On the calendar" block draws,
    // so a circuit renamed here shows up in it immediately.
    listPublishedEvents(site.id),
  ]);

  return (
    <TracksEditor
      initialTracks={tracks}
      chrome={chrome}
      season={season}
      year={new Date().getFullYear()}
    />
  );
}
