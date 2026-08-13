import { NextResponse } from "next/server";
import { MAX_SUBMISSION_BYTES, validateSubmission } from "@/lib/forms";
import { countRecentEntries, createEntry } from "@/lib/server/entriesRepo";
import { getFormBySlug } from "@/lib/server/formsRepo";
import { notifyNewEntry } from "@/lib/server/notify";
import { callerIp, take } from "@/lib/server/rateLimit";
import { checkToken } from "@/lib/server/registerToken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * An entry, from anybody.
 *
 * The first public write in this project. Everything else under /api is behind
 * a session, which is why the shape of this file is unlike the others: there is
 * no guard at the top, so the checks ARE the file.
 *
 * They run cheapest-first, and the order is deliberate — a flood should be
 * turned away by a header test long before it reaches the database:
 *
 *    1  the content type          a wrong one is not a form post
 *    2  the declared size         refused before the body is read
 *    3  the rate limit            in-process, no query
 *    4  the parse                 first point of real work
 *    5  the honeypot              answered with a cheerful lie
 *    6  the nonce and the clock   see registerToken.ts
 *    7  the form itself           the first database read
 *    8  the answers               against the questions as stored NOW
 *    9  the durable rate limit    a count of what actually landed
 *   10  the insert
 *
 * Step 7 is the one that matters most. The page a visitor is looking at may
 * have been open for an hour and may have been closed since — so what decides
 * whether an entry is accepted is the row read HERE, on this request, never
 * what the page believed when it was drawn.
 *
 * The middleware needs no change for this: `publicHost` only turns away
 * /api/admin, so this answers on the public site as intended.
 */

/** Per address, per window, before the database is troubled at all. */
const BURST_LIMIT = 5;
const BURST_WINDOW_MS = 10 * 60 * 1000;

/** And, durably, per form: this many in an hour from one address is not a person. */
const HOURLY_LIMIT = 10;

type Params = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: Params) {
  const { slug } = await params;

  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("application/json")) {
    return NextResponse.json({ error: "Expected JSON." }, { status: 415 });
  }

  // A missing header is allowed through — the values are clamped by
  // `validateSubmission` regardless. What this catches is the body that
  // announces itself as far too large to be a form.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > MAX_SUBMISSION_BYTES) {
    return NextResponse.json({ error: "That is too much to send at once." }, { status: 413 });
  }

  const ip = callerIp(request);
  const burst = take(`register:${ip}`, BURST_LIMIT, BURST_WINDOW_MS);
  if (!burst.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in a few minutes." },
      { status: 429, headers: { "retry-after": String(burst.retryAfter) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Filled in means a machine. Answered as a success, and stored nowhere:
  // telling a bot that it failed is telling it what to fix.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const verdict = checkToken(slug, body.nonce, body.issuedAt);
  if (verdict === "too-fast") {
    return NextResponse.json({ error: "That was a little too quick — try again." }, { status: 400 });
  }
  if (verdict === "stale" || verdict === "bad") {
    return NextResponse.json(
      { error: "This page has been open a while. Please reload it and try again." },
      { status: 400 }
    );
  }

  try {
    const form = await getFormBySlug(slug);

    // A draft is not on the internet, and saying "this exists but is a draft"
    // would put it there.
    if (!form || form.status === "draft") {
      return NextResponse.json({ error: "No such form." }, { status: 404 });
    }

    if (form.status === "closed") {
      return NextResponse.json(
        { error: form.closed_note || "Entries for this one have closed." },
        { status: 409 }
      );
    }

    const { values, errors } = validateSubmission(form.fields, body.values);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 422 });
    }

    // The durable half of the rate limit — see rateLimit.ts on why the counter
    // above is not enough on its own.
    if (await countRecentEntries(form.id, ip, 1) >= HOURLY_LIMIT) {
      return NextResponse.json(
        { error: "You have sent several of these already. Please get in touch instead." },
        { status: 429 }
      );
    }

    const entry = await createEntry(
      form.id,
      values,
      ip,
      request.headers.get("user-agent") ?? ""
    );

    // Never allowed to fail the submission: the entry is already saved, and a
    // notification that did not go out is not the visitor's problem.
    await notifyNewEntry(form, entry).catch((error) => {
      console.error("[register] could not notify", error);
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[register] POST", error);
    return NextResponse.json(
      { error: "Your entry could not be saved. Please try again." },
      { status: 500 }
    );
  }
}
