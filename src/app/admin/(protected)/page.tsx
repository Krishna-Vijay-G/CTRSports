import { redirect } from "next/navigation";

/** /admin has no screen of its own — the first sidebar entry is the home. */
export default function AdminIndexPage() {
  redirect("/admin/landing");
}
