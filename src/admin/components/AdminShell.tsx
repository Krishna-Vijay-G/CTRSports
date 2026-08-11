"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Button, ButtonLink } from "@/admin/ui/Button";
import { ExternalIcon, FlagIcon, ImagesIcon, SignOutIcon } from "@/admin/ui/icons";

/**
 * Chrome around every admin screen.
 *
 * The sidebar floats: it is a card with a border, inset from the edges, with the
 * page colour showing all the way around it. That inset is what separates the
 * navigation from the work without a hard full-height rule down the screen.
 *
 * One left column holds both lists, and they are stacked by how often they are
 * used: the open screen's sections at the top, where the hand goes all day, and
 * the screen switcher and account buttons at the foot, out of the way. The
 * sections come from the page itself — see AdminRailSlot below.
 *
 * A fixed column from `md:` up and a scrolling chip row below that, which keeps
 * the whole editor above the fold on a laptop without breaking on a phone.
 */

/**
 * One entry per admin screen. Add a page, add a line.
 *
 * Plain root paths: the admin has a hostname to itself, so its screens ARE the
 * root. Nothing here knows about the mount point the router happens to use.
 */
const NAV = [
  { href: "/landing", label: "Landing page", icon: ImagesIcon },
  { href: "/incrc", label: "INCRC", icon: FlagIcon },
];

const RAIL_SLOT_ID = "admin-rail-slot";

/**
 * Puts a screen's own list of sections at the top of the sidebar.
 *
 * The list belongs to the editor — it is the editor that knows which section is
 * open and what happens when one is picked — but it belongs *visually* to the
 * sidebar, so it is rendered here through a portal rather than passed down
 * through the layout, which cannot hand props to a page.
 *
 * Nothing is drawn until the slot exists, so the first paint is the sidebar
 * without its sections; it fills in on hydration.
 */
export function AdminRailSlot({ children }: { children: React.ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => setHost(document.getElementById(RAIL_SLOT_ID)), []);

  return host ? createPortal(children, host) : null;
}

export function AdminShell({
  username,
  children,
}: {
  username: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    // md:h-screen + overflow-hidden so the editor and the preview each scroll on
    // their own instead of the whole document scrolling as one.
    <div className="min-h-screen bg-background font-ui text-foreground md:flex md:h-screen md:gap-2 md:overflow-hidden md:p-2">
      {/* Wider at xl: the section rows carry a drag handle and an eye, and the
          labels are what gives way when they do not fit. */}
      <aside className="flex flex-col gap-2 border-b border-border bg-card p-2 md:w-52 md:shrink-0 md:rounded-lg md:border md:border-border xl:w-60">
        {/* Filled by the open screen. Takes the height the account block leaves. */}
        <div id={RAIL_SLOT_ID} className="min-h-0 md:flex-1 md:overflow-y-auto" />

        {/* Everything below here sits at the foot of the column. */}
        <div className="hidden h-px bg-border md:block" />

        <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
          <p className="hidden px-2 py-1 text-[11px] font-medium text-muted-fg md:block">Pages</p>

          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-2 py-1.5 text-[13px] font-medium transition",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-fg hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden h-px bg-border md:block" />

        <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
          <img
            src="/images/brand/ctr-logo.webp"
            alt=""
            aria-hidden
            className="h-7 w-auto shrink-0"
          />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium leading-tight text-foreground">
              {username}
            </p>
            <p className="truncate text-[11px] leading-tight text-muted-fg">Site admin</p>
          </div>
        </div>

        <div className="flex gap-1 md:flex-col">
          <ButtonLink
            href="/"
            target="_blank"
            rel="noreferrer"
            variant="ghost"
            size="sm"
            className="justify-start"
          >
            <ExternalIcon />
            View site
          </ButtonLink>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="justify-start hover:text-destructive"
          >
            <SignOutIcon />
            Sign out
          </Button>
        </div>
      </aside>

      {/* No padding: each screen sets its own, because the landing editor fills
          the space edge to edge. */}
      <main className="min-w-0 flex-1 md:overflow-hidden">{children}</main>
    </div>
  );
}
