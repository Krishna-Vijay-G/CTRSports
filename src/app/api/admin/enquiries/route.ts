import { NextResponse } from "next/server";
import {
  ENQUIRY_STATUSES,
  isEnquiryId,
  type EnquiryStatus,
} from "@/lib/enquiry";
import { isRecord } from "@/lib/normalise";
import { guardEnquiries } from "@/lib/server/access";
import {
  MAX_BULK,
  archiveEnquiries,
  countEnquiries,
  listEnquiries,
  restoreEnquiries,
  setEnquiryStatus,
  type EnquiryCursor,
} from "@/lib/server/enquiriesRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One page of the table. Enough to fill a screen twice over. */
const PAGE = 50;

/**
 * The footer's messages, for the console screen that monitors them.
 *
 * One guard on every handler — `guardEnquiries` — and it takes no site, because
 * an enquiry has none. See the note on `Capability` in roles.ts.
 *
 * ── Three verbs, and what each of them means ──────────────────────────────
 *
 *   GET     a page of the working list, or of the archive
 *   PATCH   move rows between states, or bring them back from the archive
 *   DELETE  archive. It does NOT remove a row, and the name is a compromise:
 *           the button in the console says Delete because that is what the
 *           person clicking it means, and this is the method that button
 *           should use. What it does is documented on `archiveEnquiries`.
 *
 * The ids always travel in a body, never in the URL, for the reason the entries
 * route gives: a list of them has no length anybody guarantees, and a bulk
 * action that silently truncated would be the worst kind.
 */
export async function GET(request: Request) {
  const denied = await guardEnquiries();
  if (denied) return denied;

  const url = new URL(request.url);
  const archived = url.searchParams.get("archived") === "1";

  /*
   * An unrecognised status is refused rather than ignored.
   *
   * Ignoring it would answer the whole list to a screen that asked for one
   * slice of it, and the count in the toolbar would then disagree with the rows
   * underneath — which reads as a bug in the counts rather than in the request.
   */
  const wanted = url.searchParams.get("status") ?? "";
  if (wanted && !(ENQUIRY_STATUSES as readonly string[]).includes(wanted)) {
    return NextResponse.json({ error: "No such status." }, { status: 400 });
  }
  const status = wanted ? (wanted as EnquiryStatus) : undefined;

  /*
   * Both halves of the cursor have to be real before they reach a query.
   * Handed straight to Postgres a malformed one comes back as `22007 invalid
   * input syntax`, which would be caught below and reported as a 500 — a server
   * error for a bad request, with the cause visible only in a log.
   */
  const at = url.searchParams.get("before");
  const beforeId = url.searchParams.get("beforeId");

  if ((at || beforeId) && !(at && beforeId && !Number.isNaN(Date.parse(at)) && isEnquiryId(beforeId))) {
    return NextResponse.json({ error: "That page marker is not usable." }, { status: 400 });
  }

  const before: EnquiryCursor | undefined = at && beforeId ? { at, id: beforeId } : undefined;

  try {
    const enquiries = await listEnquiries({ limit: PAGE, status, archived, before });

    // Counted on the first page of a run, and again whenever the client starts
    // over. The footer takes messages while this screen is being read, so a
    // total only ever adjusted arithmetically drifts away from the truth.
    const counts = before ? undefined : await countEnquiries();

    const more = enquiries.length === PAGE;
    const last = enquiries[enquiries.length - 1];

    return NextResponse.json({
      enquiries,
      nextCursor: more && last ? { at: last.created_at, id: last.id } : null,
      ...(counts === undefined ? {} : { counts }),
    });
  } catch (error) {
    console.error("[admin/enquiries] GET", error);
    return NextResponse.json({ error: "Could not load the enquiries." }, { status: 500 });
  }
}

/**
 * Reads the `ids` every writing handler takes.
 *
 * Malformed ids are dropped rather than refused one by one — but an EMPTY
 * result is refused, so a body of nothing but rubbish cannot read as a
 * successful no-op.
 */
function idsFrom(body: unknown): { ids: string[] } | { error: NextResponse } {
  const sent = isRecord(body) ? body.ids : undefined;
  const ids = Array.isArray(sent) ? sent.filter(isEnquiryId) : [];

  if (ids.length === 0) {
    return { error: NextResponse.json({ error: "Nothing was selected." }, { status: 400 }) };
  }

  if (ids.length > MAX_BULK) {
    return {
      error: NextResponse.json(
        { error: `That is more than ${MAX_BULK} at once. Do it in batches.` },
        { status: 400 }
      ),
    };
  }

  return { ids };
}

/**
 * Moves rows between states, or brings them back from the archive.
 *
 * Two actions on one method because they are the same shape — a list of ids and
 * one thing to do to them — and because `{ ids, status }` and `{ ids, restore }`
 * cannot be confused for one another by a client that means the other.
 */
export async function PATCH(request: Request) {
  const denied = await guardEnquiries();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "That was not readable." }, { status: 400 });
  }

  const parsed = idsFrom(body);
  if ("error" in parsed) return parsed.error;

  const record = isRecord(body) ? body : {};

  try {
    if (record.restore === true) {
      const restored = await restoreEnquiries(parsed.ids);
      return NextResponse.json({ ok: true, restored });
    }

    // Not `normaliseEnquiryStatus`: that falls back to 'unread', and a fallback
    // is the wrong answer to "mark these resolved" mistyped. A write that did
    // something OTHER than what was asked is worse than one that refused.
    const status = record.status;
    if (!(ENQUIRY_STATUSES as readonly string[]).includes(status as string)) {
      return NextResponse.json({ error: "No such status." }, { status: 400 });
    }

    const changed = await setEnquiryStatus(parsed.ids, status as EnquiryStatus);
    return NextResponse.json({ ok: true, changed });
  } catch (error) {
    console.error("[admin/enquiries] PATCH", error);
    return NextResponse.json({ error: "Could not update those enquiries." }, { status: 500 });
  }
}

/** Archives. Nothing here removes a row — see `archiveEnquiries`. */
export async function DELETE(request: Request) {
  const denied = await guardEnquiries();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "That was not readable." }, { status: 400 });
  }

  const parsed = idsFrom(body);
  if ("error" in parsed) return parsed.error;

  try {
    const archived = await archiveEnquiries(parsed.ids);
    return NextResponse.json({ ok: true, archived });
  } catch (error) {
    console.error("[admin/enquiries] DELETE", error);
    return NextResponse.json({ error: "Could not archive those enquiries." }, { status: 500 });
  }
}
