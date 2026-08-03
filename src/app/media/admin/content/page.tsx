import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getLandingContentSafe } from "@/lib/siteContent";
import { ContentEditor } from "@/components/admin/ContentEditor";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const session = await getSession();
  if (!session) {
    redirect("/media/admin/login");
  }

  // Falls back to the defaults if the row is missing or the database is down,
  // so the editor always has something to edit — and saving seeds the row.
  const content = await getLandingContentSafe();

  return <ContentEditor initialContent={content} username={session.username} />;
}
