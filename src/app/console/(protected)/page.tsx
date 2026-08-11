import { redirect } from "next/navigation";

/** The admin host's root has no screen of its own — the first entry is the home. */
export default function AdminIndexPage() {
  redirect("/landing");
}
