"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ROLE_LABELS,
  canEditPage,
  canManageAdmins,
  canSeeForms,
  type AdminRole,
  type PageKey,
} from "@/lib/roles";
import { cn } from "@/lib/utils";
import { Button } from "@/admin/ui/Button";
import {
  CaretDownIcon,
  FlagIcon,
  ImagesIcon,
  MapIcon,
  PanelIcon,
  SignOutIcon,
  StackIcon,
  TicketIcon,
  UsersIcon,
} from "@/admin/ui/icons";

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
 * It collapses to a rail of icons rather than to nothing. A pane that vanishes
 * needs a button somewhere else to bring it back; a rail carries its own, and
 * the sections stay clickable while collapsed, which is what you actually want
 * when the reason for collapsing was to give the preview more room.
 *
 * A fixed column from `md:` up and a scrolling chip row below that, which keeps
 * the whole editor above the fold on a laptop without breaking on a phone.
 */

/** Remembered across visits: a collapsed sidebar is a preference, not a mode. */
const COLLAPSED_KEY = "ctr-admin-sidebar-collapsed";

/** Same, for the screen switcher at the foot of it. */
const PAGES_OPEN_KEY = "ctr-admin-pages-open";

/** So the header button can point `aria-controls` at what it opens. */
const PAGES_DRAWER_ID = "admin-pages-drawer";

const CollapsedContext = createContext(false);

/** True while the sidebar is a rail. Read by whatever is portalled into it. */
export function useSidebarCollapsed() {
  return useContext(CollapsedContext);
}

/**
 * One entry per admin screen. Add a page, add a line.
 *
 * Plain root paths: the admin has a hostname to itself, so its screens ARE the
 * root. Nothing here knows about the mount point the router happens to use.
 *
 * Each entry says what it takes to open it, and the list is filtered by the
 * signed-in account before it is drawn — a screen an account cannot open is not
 * in its sidebar at all. That is a courtesy rather than the enforcement: the
 * screen itself answers `notFound()` and the routes behind it answer 403, so
 * typing the address gets nobody anywhere.
 */
type NavItem = {
  href: string;
  label: string;
  icon: (props: { className?: string }) => React.ReactElement;
  /** The page editor this screen is. */
  page?: PageKey;
  /** Or the other thing it needs. */
  needs?: "forms" | "owner";
};

const NAV: NavItem[] = [
  { href: "/landing", label: "Landing page", icon: ImagesIcon, page: "landing" },
  { href: "/incrc", label: "INCRC", icon: FlagIcon, page: "incrc" },
  { href: "/tracks", label: "Circuits", icon: MapIcon, page: "circuits" },
  { href: "/decks", label: "Decks", icon: StackIcon, page: "decks" },
  { href: "/forms", label: "Registrations", icon: TicketIcon, needs: "forms" },
  { href: "/admins", label: "Accounts", icon: UsersIcon, needs: "owner" },
];

function allowedNav(scope: { role: AdminRole; pages: PageKey[] }): NavItem[] {
  return NAV.filter((item) => {
    if (item.page) return canEditPage(scope, item.page);
    if (item.needs === "forms") return canSeeForms(scope);
    if (item.needs === "owner") return canManageAdmins(scope);
    return true;
  });
}

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

/**
 * The screen switcher, as a drawer that pulls up out of the sidebar's foot.
 *
 * Modelled on the collapsible panes in VS Code's sidebar: a header row you click,
 * with the list sliding out above the account block rather than sitting open all
 * day. Switching screens is something you do a handful of times a session, and
 * it was taking permanent room from the section list, which is what the hand is
 * actually on.
 *
 * Shut, the header still says where you are, so tucking the list away never
 * costs you the answer to "which page am I editing?".
 *
 * The open/shut state is remembered, like the sidebar's own width — it is a
 * preference, not a mode.
 *
 * The height animates through `grid-template-rows: 0fr → 1fr` rather than a
 * max-height guess, so it opens to exactly the list's height however many
 * screens there turn out to be.
 *
 * It behaves the same collapsed to a rail — the state that most needs the room
 * back is the one where the pages had been sitting open. What a 52px rail cannot
 * fit is the word beside the caret, so that is what goes: the handle stays, the
 * label moves into the tooltip, and the caret still points the way the list will
 * travel.
 */
function PagesDrawer({
  nav,
  pathname,
  collapsed,
}: {
  /** Already filtered to what this account may open. */
  nav: NavItem[];
  pathname: string;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(window.localStorage.getItem(PAGES_OPEN_KEY) === "1");
  }, []);

  function toggle() {
    setOpen((current) => {
      window.localStorage.setItem(PAGES_OPEN_KEY, current ? "0" : "1");
      return !current;
    });
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const current = nav.find((item) => isActive(item.href));

  const links = nav.map((item) => {
    const active = isActive(item.href);
    const Icon = item.icon;

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        title={item.label}
        className={cn(
          "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-2 py-1.5 text-[13px] font-medium transition",
          collapsed && "md:justify-center md:px-0",
          active
            ? "bg-muted text-foreground"
            : "text-muted-fg hover:bg-muted/60 hover:text-foreground"
        )}
      >
        <Icon className="size-4 shrink-0" />
        <span className={collapsed ? "md:hidden" : undefined}>{item.label}</span>
      </Link>
    );
  });

  return (
    <div className="md:contents">
      {/* Below md the sidebar is a scrolling chip row — there is no foot for a
          drawer to pull up out of, so the pages stay a plain row. */}
      <nav aria-label="Pages" className="flex gap-1 overflow-x-auto md:hidden">
        {links}
      </nav>

      <div className="hidden md:block">
        <div
          id={PAGES_DRAWER_ID}
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          {/* The row collapses to nothing, so its content must be clipped —
              without this the links stay visible at zero height. */}
          <div className="overflow-hidden">
            <nav aria-label="Pages" className="flex flex-col gap-1 pb-1">
              {links}
            </nav>
          </div>
        </div>

        {/*
          The handle. One button in both states — a rail 52px wide has no room
          for a word beside the caret, so what it drops is the label, not the
          drawer. The tooltip carries the name in its place, and the caret still
          points the way the list will move.
        */}
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={PAGES_DRAWER_ID}
          title={current ? `Pages — ${current.label}` : "Pages"}
          className={cn(
            "flex w-full items-center rounded-md py-1.5 text-[11px] font-medium text-muted-fg outline-none transition hover:bg-muted/60 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40",
            collapsed ? "justify-center px-0" : "gap-1.5 px-2 text-left"
          )}
        >
          <CaretDownIcon
            className={cn("size-3.5 shrink-0 transition-transform", !open && "rotate-180")}
          />

          {collapsed ? (
            <span className="sr-only">Pages</span>
          ) : (
            <>
              <span>Pages</span>

              {/* Where you are, for when the list is shut. */}
              {!open && current ? (
                <span className="ms-auto min-w-0 truncate text-foreground">{current.label}</span>
              ) : null}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function AdminShell({
  username,
  role,
  pages,
  children,
}: {
  username: string;
  role: AdminRole;
  /** The page editors this account is scoped to. Empty for the other two roles. */
  pages: PageKey[];
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const nav = allowedNav({ role, pages });

  // Starts expanded and corrects itself on mount. Reading localStorage during
  // render would differ from what the server drew and break hydration.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(COLLAPSED_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      window.localStorage.setItem(COLLAPSED_KEY, current ? "0" : "1");
      return !current;
    });
  }

  async function handleSignOut() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    // md:h-screen + overflow-hidden so the editor and the preview each scroll on
    // their own instead of the whole document scrolling as one.
    <CollapsedContext.Provider value={collapsed}>
      <div className="min-h-screen bg-background font-ui text-foreground md:flex md:h-screen md:gap-2 md:overflow-hidden md:p-2">
      {/* Wider at xl: the section rows carry a drag handle and an eye, and the
          labels are what gives way when they do not fit. Collapsed, it is a rail
          just wide enough for the icons. */}
      <aside
        className={cn(
          "relative flex flex-col gap-2 border-b border-border bg-card p-2 transition-[width] md:shrink-0 md:rounded-lg md:border md:border-border",
          collapsed ? "md:w-[52px]" : "md:w-52 xl:w-60"
        )}
      >
        {/*
          Lifted out of the flow rather than given a row of its own. In flow it
          cost a full row for one 28px icon, and since it is right-aligned the
          rest of that row was blank — a band of nothing above every screen's
          section list. Floated, it sits level with the list's own heading, which
          is short and left-aligned and so never reaches it.

          Collapsed there IS no heading to sit beside, so it centres over the
          icons and the rail below reserves the room for it.
        */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand the sidebar" : "Collapse the sidebar"}
          title={collapsed ? "Expand the sidebar" : "Collapse the sidebar"}
          className={cn(
            "absolute top-2 z-10 hidden md:flex",
            collapsed ? "left-1/2 -translate-x-1/2" : "right-2"
          )}
        >
          <PanelIcon />
        </Button>

        {/* Filled by the open screen. Takes the height the account block leaves. */}
        <div
          id={RAIL_SLOT_ID}
          className={cn(
            "min-h-0 md:flex-1 md:overflow-y-auto",
            collapsed ? "md:pt-10" : "md:pt-1"
          )}
        />

        {/* Everything below here sits at the foot of the column. */}
        <div className="hidden h-px bg-border md:block" />

        <PagesDrawer nav={nav} pathname={pathname} collapsed={collapsed} />

        <div className="hidden h-px bg-border md:block" />

        <div
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2 py-1.5",
            collapsed && "md:justify-center md:px-0"
          )}
          title={username}
        >
          <img
            src="/images/brand/ctr-logo.webp"
            alt=""
            aria-hidden
            className="h-7 w-auto shrink-0"
          />
          <div className={cn("min-w-0", collapsed && "md:hidden")}>
            <p className="truncate text-[13px] font-medium leading-tight text-foreground">
              {username}
            </p>
            <p className="truncate text-[11px] leading-tight text-muted-fg">
              {ROLE_LABELS[role]}
            </p>
          </div>
        </div>

        <div className="flex gap-1 md:flex-col">
          <Button
            variant="ghost"
            size={collapsed ? "icon-sm" : "sm"}
            onClick={handleSignOut}
            title="Sign out"
            className={cn(
              "hover:text-destructive",
              collapsed ? "md:mx-auto" : "justify-start"
            )}
          >
            <SignOutIcon />
            <span className={collapsed ? "md:hidden" : undefined}>Sign out</span>
          </Button>
        </div>
      </aside>

      {/* No padding: each screen sets its own, because the landing editor fills
          the space edge to edge. */}
        <main className="min-w-0 flex-1 md:overflow-hidden">{children}</main>
      </div>
    </CollapsedContext.Provider>
  );
}
