"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Chrome around every admin screen: a sidebar of sections, identity, a link
 * back to the site and a way out.
 *
 * The nav is a fixed column from `md:` up and a scrolling chip row below that,
 * which keeps the whole editor above the fold on a laptop without breaking on a
 * phone.
 */

/** One entry per admin section. Add a page, add a line. */
const NAV = [
  { href: "/admin/landing", label: "Landing page" },
  { href: "/admin/sports", label: "Sports" },
];

export function AdminShell({
  username,
  children,
}: {
  username: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    // Its own near-black, a step darker than the site, so the admin never reads
    // as part of the public pages.
    <div className="min-h-screen bg-carbon-950 font-body text-white/90 md:flex">
      <aside className="border-b border-white/10 md:flex md:min-h-screen md:w-56 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <img src="/images/brand/ctr-logo.webp" alt="" aria-hidden className="h-8 w-auto shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{username}</p>
            <p className="truncate text-[10px] uppercase tracking-wider text-racing-yellow">
              Site admin
            </p>
          </div>
        </div>

        <nav className="flex gap-1.5 overflow-x-auto px-4 pb-3 md:flex-1 md:flex-col md:overflow-visible md:pb-0">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition",
                  active
                    ? "bg-racing-yellow/10 text-racing-yellow"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex gap-1.5 border-t border-white/10 px-4 py-3 md:flex-col">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-lg border border-white/15 px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-white/70 transition hover:border-racing-yellow/60 hover:text-racing-yellow"
          >
            View site
          </a>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex-1 rounded-lg border border-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/70 transition hover:border-red-400/60 hover:text-red-300"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6">{children}</main>
    </div>
  );
}
