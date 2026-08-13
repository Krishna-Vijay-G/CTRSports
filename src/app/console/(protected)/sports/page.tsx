import { redirect } from "next/navigation";

/**
 * The sports cards used to have a screen of their own. They are now the Sports
 * section of the landing editor, where they sit beside the preview of the page
 * they appear on.
 *
 * This redirect stays so an old bookmark still lands somewhere useful. Delete it
 * once nobody has one.
 *
 * It goes to the root rather than straight to /landing, because not every
 * account has the landing editor now — the root is what knows which screen this
 * one starts on.
 */
export default function SportsAdminPage() {
  redirect("/");
}
