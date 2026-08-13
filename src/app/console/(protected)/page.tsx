import { redirect } from "next/navigation";
import {
  PAGE_KEYS,
  PAGE_LABELS,
  canEditPage,
  canManageAdmins,
  canSeeForms,
} from "@/lib/roles";
import { getSession } from "@/lib/server/auth";

/**
 * The admin host's root has no screen of its own — it sends you to your first.
 *
 * "The first entry in the navigation" is not good enough now that accounts are
 * scoped: sending a registrations admin to the landing editor would land them
 * on a screen that answers `notFound()`, so the root has to ask the same
 * question the navigation asks and pick the first screen this account actually
 * has.
 *
 * An account with none is a real state — an owner who has made an account and
 * not yet ticked anything on it — and it gets a plain card saying so rather
 * than a redirect loop or a 404 that reads as "the admin is broken".
 */
export default async function AdminIndexPage() {
  const session = await getSession();

  const page = PAGE_KEYS.find((key) => canEditPage(session, key));
  if (page) redirect(`/${page === "circuits" ? "tracks" : page}`);

  if (canSeeForms(session)) redirect("/forms");
  if (canManageAdmins(session)) redirect("/admins");

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="max-w-md rounded-lg border border-border bg-card p-6 text-center">
        <h1 className="text-sm font-semibold text-foreground">Nothing assigned yet</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-fg">
          This account has no screens on it. An owner can give it{" "}
          {PAGE_KEYS.map((key) => PAGE_LABELS[key]).join(", ")} or the registrations screen from
          Accounts.
        </p>
      </div>
    </div>
  );
}
