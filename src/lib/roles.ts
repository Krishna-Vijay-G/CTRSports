/**
 * Who may edit what.
 *
 * The admin used to be one thing: signed in meant every screen. That works
 * while one person edits the whole site, and stops working the moment the
 * person who owns entry forms is not the person who owns the page a form is
 * linked from — because there is no way to hand someone the forms without also
 * handing them the copy, the photographs and the calendar.
 *
 * So: three roles, divided by the THING being edited rather than by a list of
 * verbs. A permission bitfield ("can create", "can delete") answers questions
 * nobody asks; "which screens is this account for" is the question actually
 * being asked when an account is made.
 *
 *   owner          everything, including who the other accounts are
 *   pages          only the page editors listed on the account
 *   registrations  only the forms screen and the entries under it
 *
 * A `pages` admin can SEE the forms for their own pages, read-only, and that is
 * deliberate: they have to be able to point a button at one. What they cannot
 * do is build one, change one, or read who has entered.
 *
 * The predicates below are the only place a role is interpreted. Everything
 * else — the navigation, the console pages, every route guard — asks one of
 * them, so there is one answer to "may they?" rather than one per call site.
 *
 * Shared by the server and the browser, so nothing here may import
 * `server-only`: the navigation is a client component and asks these too.
 */

import { oneOf } from "@/lib/normalise";

export const ADMIN_ROLES = ["owner", "pages", "registrations"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ROLE_LABELS: Record<AdminRole, string> = {
  owner: "Owner",
  pages: "Page editor",
  registrations: "Registrations",
};

export const ROLE_HINTS: Record<AdminRole, string> = {
  owner: "Every screen, and the accounts.",
  pages: "Only the pages ticked below. Can point a button at a form, but not edit one.",
  registrations: "Only the entry forms and the entries. No page copy.",
};

/**
 * Every screen a `pages` admin can be given.
 *
 * One entry per page editor in the admin. Adding a screen means adding a key
 * here, a line in the navigation, and a guard on its route — and until it is
 * here, nobody can be scoped to it.
 */
export const PAGE_KEYS = ["landing", "incrc", "circuits"] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

export const PAGE_LABELS: Record<PageKey, string> = {
  landing: "Landing page",
  incrc: "INCRC",
  circuits: "Circuits",
};

/**
 * The pages a FORM can belong to.
 *
 * Circuits is not one. A circuit page is a record of a place — there is nothing
 * on it anyone registers for, and a form assigned there would have nowhere to
 * be shown.
 */
export const FORM_PAGE_KEYS = ["landing", "incrc"] as const;
export type FormPageKey = (typeof FORM_PAGE_KEYS)[number];

/** Everything the predicates need. `AdminSession` satisfies it. */
export type Scoped = { role: AdminRole; pages: PageKey[] };

export function canEditPage(session: Scoped | null | undefined, page: PageKey): boolean {
  if (!session) return false;
  return session.role === "owner" || (session.role === "pages" && session.pages.includes(page));
}

/** Whether any page editor at all is open to them — what the uploads need. */
export function canEditAnyPage(session: Scoped | null | undefined): boolean {
  if (!session) return false;
  return session.role === "owner" || (session.role === "pages" && session.pages.length > 0);
}

/** Build, edit, publish, and read the entries. */
export function canManageForms(session: Scoped | null | undefined): boolean {
  return session?.role === "owner" || session?.role === "registrations";
}

/** The same, plus a page admin — who needs the LIST to point a button at one. */
export function canSeeForms(session: Scoped | null | undefined): boolean {
  return canManageForms(session) || canEditAnyPage(session);
}

/**
 * Which pages' forms this account may see.
 *
 * An owner or a registrations admin sees every form, including the ones on no
 * page at all. A page admin sees only the forms for the pages they edit, which
 * is what keeps one page's picker from listing another page's entry form.
 */
export function visibleFormPages(session: Scoped | null | undefined): FormPageKey[] {
  if (!session) return [];
  if (canManageForms(session)) return [...FORM_PAGE_KEYS];
  return FORM_PAGE_KEYS.filter((page) => session.pages.includes(page));
}

export function canManageAdmins(session: Scoped | null | undefined): boolean {
  return session?.role === "owner";
}

/** An unknown or missing role reads as the least privileged one, never the most. */
export function normaliseRole(value: unknown): AdminRole {
  return oneOf(value, ADMIN_ROLES, "pages");
}

/** Unknown keys dropped, duplicates collapsed, always in PAGE_KEYS order. */
export function normalisePageKeys(value: unknown): PageKey[] {
  if (!Array.isArray(value)) return [];
  const wanted = new Set(value.filter((entry): entry is string => typeof entry === "string"));
  return PAGE_KEYS.filter((page) => wanted.has(page));
}
