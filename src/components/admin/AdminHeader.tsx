"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "posts", href: "/media/admin", label: "Posts" },
  { key: "content", href: "/media/admin/content", label: "Site content" },
  { key: "registrations", href: "/registration/academy/admin", label: "Registrations" },
] as const;

type AdminTab = (typeof TABS)[number]["key"];

/** Shared chrome for the admin screens: identity, tabs, view site, sign out. */
export function AdminHeader({
  username,
  active,
  title,
}: {
  username: string;
  active: AdminTab;
  title: string;
}) {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/media/admin/login");
    router.refresh();
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
      <div className="flex items-center gap-3">
        <img src="/media/ctr-logo.png" alt="" aria-hidden className="h-10 w-auto" />
        <div>
          <h1 className="font-display text-lg font-bold uppercase tracking-wide text-white">
            {title}
          </h1>
          <p className="text-xs text-white/40">
            Signed in as <span className="text-racing-yellow">{username}</span>
          </p>
        </div>
      </div>

      <nav className="flex items-center gap-2">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition",
                isActive
                  ? "border-racing-yellow/70 bg-racing-yellow/[0.08] text-racing-yellow"
                  : "border-white/15 text-white/70 hover:border-white/35 hover:text-white"
              )}
            >
              {tab.label}
            </Link>
          );
        })}

        <span aria-hidden className="mx-1 h-6 w-px bg-white/10" />

        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/70 transition hover:border-racing-yellow/60 hover:text-racing-yellow"
        >
          View site
        </a>
        <button
          type="button"
          onClick={handleSignOut}
          className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/70 transition hover:border-red-400/60 hover:text-red-300"
        >
          Sign out
        </button>
      </nav>
    </header>
  );
}
