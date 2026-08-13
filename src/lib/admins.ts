/**
 * An admin account, as everything except the password sees it.
 *
 * The password is deliberately not in this type and never leaves the server:
 * `adminsRepo` does not select the column, so there is no path by which a hash
 * reaches a browser even by accident. What comes back from a save is the
 * account WITHOUT it, which is also why creating one takes a different shape
 * from reading one.
 *
 * Accounts have no order. They are listed by name, and there is no `sort_order`
 * here or on the table — a list of five people is read by looking, not by being
 * arranged.
 *
 * Shared by the server and the browser, so nothing here may import
 * `server-only`.
 */

import {
  PAGE_LABELS,
  normalisePageKeys,
  normaliseRole,
  type AdminRole,
  type PageKey,
} from "@/lib/roles";
import { optionalText } from "@/lib/normalise";

export type AdminAccount = {
  id: string;
  username: string;
  role: AdminRole;
  pages: PageKey[];
  created_at: string;
};

export const ADMIN_LIMITS = {
  username: 60,
  password: 200,
} as const;

/**
 * The same floor `scripts/create-admin.mjs` holds to.
 *
 * Ten characters and nothing else — no character-class rules. This admin has no
 * password reset by email and no lockout, so what protects it is length and the
 * fact that the host is not published; a rule demanding a symbol only makes the
 * password one somebody writes on a card.
 */
export const MIN_PASSWORD = 10;

/** What a new account starts from. */
export const BLANK_ADMIN: Omit<AdminAccount, "id" | "created_at"> = {
  username: "",
  role: "pages",
  pages: [],
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Same reasoning as the circuits: a malformed id should 404, not blow up Postgres. */
export function isAdminId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/**
 * A username, cleaned.
 *
 * Lower-cased, because a person who signs in as "Ravi" and is stored as "ravi"
 * has a login that works on some days. Spaces are out for the same reason a
 * trailing one is: it cannot be seen in a text field.
 */
export function normaliseUsername(value: unknown): string {
  return optionalText(value, ADMIN_LIMITS.username).toLowerCase().replace(/\s+/g, "");
}

/**
 * Whatever came off the wire, as a storable account.
 *
 * `pages` is kept whatever the role is, rather than emptied for an owner. It
 * costs nothing, and it means moving an account from `pages` to `owner` and
 * back does not lose which pages it had — the predicates in roles.ts ignore the
 * list for the other two roles, so nothing reads it wrongly in the meantime.
 */
export function normaliseAdminInput(input: unknown): Omit<AdminAccount, "id" | "created_at"> {
  const record = (typeof input === "object" && input !== null ? input : {}) as Record<
    string,
    unknown
  >;

  return {
    username: normaliseUsername(record.username),
    role: normaliseRole(record.role),
    pages: normalisePageKeys(record.pages),
  };
}

/** What the screen says an account can reach, in one line. */
export function describeAccess(account: Pick<AdminAccount, "role" | "pages">): string {
  if (account.role === "owner") return "Every screen, and the accounts";
  if (account.role === "registrations") return "Registration forms and entries";
  return account.pages.length > 0
    ? account.pages.map((page) => PAGE_LABELS[page]).join(", ")
    : "No pages yet";
}
