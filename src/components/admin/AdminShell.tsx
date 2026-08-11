"use client";

import { useRouter } from "next/navigation";
import { BRAND } from "@/config/site";

/**
 * Chrome around every admin screen: who you are, a link back to the site, and a
 * way out. No sidebar — there is exactly one screen. Add one when there is a
 * second thing to manage, not before.
 */
export function AdminShell({
  username,
  children,
}: {
  username: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    // Its own near-black, a step darker than the site, so the admin never
    // reads as part of the public pages.
    <div className="min-h-screen bg-carbon-950 font-body text-white/90">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img src={BRAND.logo} alt="" aria-hidden className="h-9 w-auto shrink-0" />
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-bold uppercase tracking-wide text-white">
                {username}
              </p>
              <p className="truncate text-[11px] uppercase tracking-wider text-racing-yellow">
                Site admin
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/70 transition hover:border-racing-yellow/60 hover:text-racing-yellow"
            >
              View site
            </a>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-full border border-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/70 transition hover:border-red-400/60 hover:text-red-300"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-6">{children}</main>
    </div>
  );
}
