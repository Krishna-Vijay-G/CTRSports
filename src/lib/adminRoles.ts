import { BUILT_SPORT_PAGES, SPORTS, type SportId } from "@/lib/sports";

/**
 * Who can do what in the admin. Every account has exactly one role, stored on
 * `admin_users.role`. `id` is what lands in the database, so these strings
 * must stay stable.
 *
 * `super_admin` is the only role not tied to a single sport — it can reach
 * every admin screen, including user management. Every other role is scoped
 * to one sport's media, and optionally that sport's registrations.
 */
export const ADMIN_ROLE_IDS = [
  "super_admin",
  "main_admin",
  "academy_admin",
  "volleyball_admin",
  "cricket_admin",
  "karting_admin",
] as const;

export type AdminRoleId = (typeof ADMIN_ROLE_IDS)[number];

export const DEFAULT_ADMIN_ROLE: AdminRoleId = "main_admin";

export type AdminRoleMeta = {
  id: AdminRoleId;
  name: string;
  /** The sport this role's media page manages. `null` only for super_admin. */
  sport: SportId | null;
  /** Whether this role also sees that sport's registrations admin. */
  registrations: boolean;
  /** Whether this role also sees the landing page's site-content editor. */
  content: boolean;
};

export const ADMIN_ROLES: Record<AdminRoleId, AdminRoleMeta> = {
  super_admin: { id: "super_admin", name: "Super Admin", sport: null, registrations: true, content: true },
  main_admin: { id: "main_admin", name: "Main Site Admin", sport: "main", registrations: false, content: true },
  academy_admin: { id: "academy_admin", name: "Academy Admin", sport: "academy", registrations: true, content: false },
  volleyball_admin: { id: "volleyball_admin", name: "Volleyball Admin", sport: "volleyball", registrations: false, content: false },
  cricket_admin: { id: "cricket_admin", name: "Cricket Admin", sport: "cricket", registrations: false, content: false },
  karting_admin: { id: "karting_admin", name: "Karting Admin", sport: "karting", registrations: false, content: false },
};

export const ADMIN_ROLE_LIST: AdminRoleMeta[] = ADMIN_ROLE_IDS.map((id) => ADMIN_ROLES[id]);

export function isAdminRoleId(value: unknown): value is AdminRoleId {
  return typeof value === "string" && (ADMIN_ROLE_IDS as readonly string[]).includes(value);
}

/** Every sport with an admin media page — the landing page plus the built sport pages. */
export const MEDIA_ADMIN_SPORTS: SportId[] = ["main", ...BUILT_SPORT_PAGES];

/* ─────────────────────────── permission checks ─────────────────────────── */

export function isSuperAdmin(role: AdminRoleId): boolean {
  return role === "super_admin";
}

export function canManageMedia(role: AdminRoleId, sport: SportId): boolean {
  return isSuperAdmin(role) || ADMIN_ROLES[role].sport === sport;
}

export function canManageContent(role: AdminRoleId): boolean {
  return isSuperAdmin(role) || ADMIN_ROLES[role].content;
}

export function canManageRegistrations(role: AdminRoleId, sport: SportId): boolean {
  return isSuperAdmin(role) || (ADMIN_ROLES[role].sport === sport && ADMIN_ROLES[role].registrations);
}

/* ─────────────────────────── sidebar nav ─────────────────────────── */

export type AdminNavItem = { href: string; label: string };

/** Which sports (besides academy) currently have a registrations admin — extend here as more get one. */
const REGISTRATION_SPORTS: SportId[] = ["academy"];

/** The sidebar links a role can see, in display order. */
export function adminNavItems(role: AdminRoleId): AdminNavItem[] {
  if (isSuperAdmin(role)) {
    return [
      { href: "/admin/content", label: "Site Content" },
      ...MEDIA_ADMIN_SPORTS.map((sport) => ({
        href: `/admin/media/${sport}`,
        label: `${SPORTS[sport].short} Media`,
      })),
      ...REGISTRATION_SPORTS.map((sport) => ({
        href: `/admin/registration/${sport}`,
        label: `${SPORTS[sport].short} Registrations`,
      })),
      { href: "/admin/users", label: "Users" },
    ];
  }

  const meta = ADMIN_ROLES[role];
  const items: AdminNavItem[] = [];
  if (meta.content) items.push({ href: "/admin/content", label: "Site Content" });
  if (meta.sport) items.push({ href: `/admin/media/${meta.sport}`, label: `${SPORTS[meta.sport].short} Media` });
  if (meta.sport && meta.registrations) {
    items.push({ href: `/admin/registration/${meta.sport}`, label: `${SPORTS[meta.sport].short} Registrations` });
  }
  return items;
}

/** Where to send someone right after login, or when they land on a page their role can't reach. */
export function adminHomePath(role: AdminRoleId): string {
  return adminNavItems(role)[0]?.href ?? "/admin/login";
}
