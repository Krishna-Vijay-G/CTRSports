import "server-only";

import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import {
  canEditAnyPage,
  canEditPage,
  canManageAdmins,
  canManageForms,
  canSeeForms,
  type PageKey,
} from "@/lib/roles";
import { getSession, type AdminSession } from "@/lib/server/auth";

/**
 * The question every admin route asks before it does anything.
 *
 * Each of these used to be two lines of "is anyone signed in", copied into
 * thirteen handlers. Now that being signed in is not the whole question, adding
 * the second half by hand thirteen times is how one route ends up asking
 * something subtly different from its neighbour — and a route that asks the
 * wrong question is a hole, not a bug.
 *
 * So they are here, one per kind of thing this admin owns, and a handler spends
 * two lines on the answer:
 *
 *     const denied = await guardPage("incrc");
 *     if (denied) return denied;
 *
 * `null` means allowed. A response means stop, and it is already the right one:
 * 401 when nobody is signed in — the browser has an expired cookie and should
 * be sent to sign in again — and 403 when someone is, because that is not a
 * login problem and telling them to sign in again would be a lie.
 *
 * The bodies match the shape every other route in this project returns for a
 * failure: `{ error: string }`, in plain English.
 */

const NOT_SIGNED_IN = { error: "Not signed in." };
const NOT_ALLOWED = { error: "Your account cannot edit that." };

async function guard(allowed: (session: Awaited<ReturnType<typeof getSession>>) => boolean) {
  const session = await getSession();
  if (!session) return NextResponse.json(NOT_SIGNED_IN, { status: 401 });
  return allowed(session) ? null : NextResponse.json(NOT_ALLOWED, { status: 403 });
}

/** One page editor's content. The landing document, the incrc document, the circuits. */
export function guardPage(page: PageKey): Promise<NextResponse | null> {
  return guard((session) => canEditPage(session, page));
}

/**
 * Any page editor at all.
 *
 * What the media library and the uploader use: a picture is not owned by one
 * page, and asking which page an upload is "for" would mean threading a page
 * key through a file input for no gain. A registrations admin has no picture to
 * place, so they are still out.
 */
export function guardAnyPage(): Promise<NextResponse | null> {
  return guard(canEditAnyPage);
}

/** Building forms and reading entries. Owners and the registrations admin. */
export function guardForms(): Promise<NextResponse | null> {
  return guard(canManageForms);
}

/**
 * Reading the LIST of forms.
 *
 * Wider than `guardForms` by exactly one role: a page admin has to be able to
 * see the forms for their pages, because pointing a button at one is the whole
 * of what they do with them. The route itself narrows the rows to
 * `visibleFormPages(session)` — this only decides who gets through the door.
 */
export function guardFormsRead(): Promise<NextResponse | null> {
  return guard(canSeeForms);
}

/** The accounts themselves. */
export function guardOwner(): Promise<NextResponse | null> {
  return guard(canManageAdmins);
}

/* ─────────────────────────── Screens ──────────────────────────── */

/**
 * The same questions, for a console SCREEN rather than a route handler.
 *
 * A screen cannot return a 403 — it has to render something — and what it
 * renders is `notFound()`. Not a redirect: the obvious redirect is to the
 * admin's root, and the root's job is to send an account to its first screen,
 * which for an account that has just been refused one is a bounce. A screen
 * that is not theirs simply is not there.
 *
 * The layout above these has already refused anyone with no session at all, so
 * reaching one of these signed out is not a case that exists — but they are
 * written to refuse it anyway, because a guard that trusts its caller is not a
 * guard.
 */
export async function requirePage(page: PageKey): Promise<AdminSession> {
  const session = await getSession();
  if (!session || !canEditPage(session, page)) notFound();
  return session;
}

export async function requireForms(): Promise<AdminSession> {
  const session = await getSession();
  if (!session || !canSeeForms(session)) notFound();
  return session;
}

export async function requireOwner(): Promise<AdminSession> {
  const session = await getSession();
  if (!session || !canManageAdmins(session)) notFound();
  return session;
}
