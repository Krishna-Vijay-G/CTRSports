import { getLandingContent } from "@/lib/server/contentRepo";
import { LandingEditor } from "./_components/LandingEditor";

export const dynamic = "force-dynamic";

/**
 * Deliberately uses the throwing loader, not the safe one: an editor that
 * quietly showed the defaults after a failed read would let someone "save" them
 * straight over the real content.
 */
export default async function LandingAdminPage() {
  const content = await getLandingContent();
  return <LandingEditor initialContent={content} />;
}
