"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ADMIN_ROLES, adminNavItems, type AdminRoleId } from "@/lib/adminRoles";
import { cn } from "@/lib/utils";

/**
 * Shell for every `/admin/*` screen: identity, a role-scoped sidebar — a
 * horizontal chip row on mobile, a fixed column from `md:` up — and the
 * page itself in the remaining space. The nav only ever lists what this
 * role can actually reach; there is nothing behind it to accidentally find.
 */
export function AdminShell({
  username,
  role,
  children,
}: {
  username: string;
  role: AdminRoleId;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = adminNavItems(role);

  async function handleSignOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-carbon-950 font-body text-white/90 md:flex">
      <aside className="border-b border-white/10 md:flex md:min-h-screen md:w-64 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center gap-3 px-5 py-5">
          <img src="/media/ctr-logo.png" alt="" aria-hidden className="h-9 w-auto shrink-0" />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold uppercase tracking-wide text-white">
              {username}
            </p>
            <p className="truncate text-[11px] uppercase tracking-wider text-racing-yellow">
              {ADMIN_ROLES[role]?.name ?? role}
            </p>
          </div>
        </div>

        <nav className="flex gap-2 overflow-x-auto px-5 pb-5 md:flex-1 md:flex-col md:overflow-visible md:pb-0">
          {items.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider transition md:rounded-xl md:whitespace-normal",
                  active
                    ? "bg-racing-yellow/[0.1] text-racing-yellow"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex gap-2 border-t border-white/10 px-5 py-4 md:flex-col">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-full border border-white/15 px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-white/70 transition hover:border-racing-yellow/60 hover:text-racing-yellow md:rounded-xl"
          >
            View site
          </a>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex-1 rounded-full border border-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/70 transition hover:border-red-400/60 hover:text-red-300 md:rounded-xl"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-5 py-8 sm:px-6 md:px-8">{children}</main>
    </div>
  );
}
