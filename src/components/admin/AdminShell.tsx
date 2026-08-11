"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button, ButtonLink } from "@/components/admin/ui/Button";
import { ExternalIcon, ImagesIcon, SignOutIcon } from "@/components/admin/ui/icons";

/**
 * Chrome around every admin screen.
 *
 * The sidebar floats: it is a card with a border, inset from the edges, with the
 * page colour showing all the way around it. That inset is what separates the
 * navigation from the work without a hard full-height rule down the screen.
 *
 * A fixed column from `md:` up and a scrolling chip row below that, which keeps
 * the whole editor above the fold on a laptop without breaking on a phone.
 */

/** One entry per admin screen. Add a page, add a line. */
const NAV = [{ href: "/admin/landing", label: "Landing page", icon: ImagesIcon }];

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
    // md:h-screen + overflow-hidden so the editor and the preview each scroll on
    // their own instead of the whole document scrolling as one.
    <div className="min-h-screen bg-background font-ui text-foreground md:flex md:h-screen md:gap-2 md:overflow-hidden md:p-2">
      <aside className="flex flex-col gap-2 border-b border-border bg-card p-2 md:w-52 md:shrink-0 md:rounded-lg md:border md:border-border">
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

        <div className="h-px bg-border" />

        <nav className="flex gap-1 overflow-x-auto md:flex-1 md:flex-col md:overflow-visible">
          <p className="hidden px-2 py-1 text-[11px] font-medium text-muted-fg md:block">Edit</p>

          {NAV.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
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
