import { NextResponse } from "next/server";
import { checkEnquiry } from "@/lib/enquiry";
import { isRecord } from "@/lib/normalise";
import { countRecentEnquiries, createEnquiry } from "@/lib/server/enquiriesRepo";
import { notifyNewEnquiry } from "@/lib/server/notify";
import { callerIp, take } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The footer's message box.
 *
 * The second endpoint in this project a stranger may post to, and it carries
 * the same guards as the first one — see the long note at the top of
 * /api/register/[slug], which is where each of these was learned:
 *
 *   a bounded read      `content-length` is a claim; a chunked or lying request
 *                       skips it entirely, so the read itself has a ceiling.
 *   `isRecord`          `JSON.parse("null")` succeeds, and reading a property
 *                       off the result is a 500 where a 400 is the truth.
 *   a honeypot          a field no person can see. Filled in means a bot, and
 *                       the answer is "thank you" with nothing stored — but it
 *                       is LOGGED, because a password manager filling it in
 *                       would otherwise swallow real messages in silence.
 *   two rate limits     an in-process burst, and a durable hourly count of what
 *                       actually landed. The first is a Map a deploy empties;
 *                       the second holds across instances.
 *   one validator       `checkEnquiry`, the same function the browser runs, so
 *                       the two cannot disagree about what is acceptable.
 *
 * What is deliberately absent is the nonce the registration route carries. That
 * exists to make a submission single-use, which matters when a form has places
 * in it; a duplicate message costs nothing but a duplicate row, and the price
 * of the nonce is a form that expires while somebody is typing.
 */

/** Three fields with a 2000-character message. Anything larger is not one. */
const MAX_BYTES = 16 * 1024;

/** Per address: a handful in ten minutes, and ten in an hour. */
const BURST_LIMIT = 5;
const BURST_WINDOW_MS = 10 * 60 * 1000;
const HOURLY_LIMIT = 10;

async function readBounded(request: Request, max: number): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let size = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      throw new Error("too large");
    }

    chunks.push(value);
  }

  return new TextDecoder().decode(
    chunks.reduce((all, chunk) => {
      const joined = new Uint8Array(all.byteLength + chunk.byteLength);
      joined.set(all);
      joined.set(chunk, all.byteLength);
      return joined;
    }, new Uint8Array())
  );
}

export async function POST(request: Request) {
  let raw: string;
  try {
    raw = await readBounded(request, MAX_BYTES);
  } catch {
    return NextResponse.json({ error: "That is too much to send at once." }, { status: 413 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isRecord(parsed)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const ip = callerIp(request);

  /*
   * The honeypot, answered before anything else.
   *
   * "Thank you" and no row: telling a bot it was caught is telling it what to
   * change. The log line is what makes the false positive visible — if a
   * password manager starts filling this in, real messages are disappearing and
   * the only trace is here.
   */
  if (typeof parsed.website === "string" && parsed.website.trim() !== "") {
    console.info("[enquiry] honeypot tripped from %s", ip);
    return NextResponse.json({ ok: true });
  }

  const { values, errors } = checkEnquiry(parsed);

  // Refused before either budget is charged: five corrections to a mistyped
  // address must not be what locks somebody out for ten minutes.
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  const burst = take(`enquiry:${ip}`, BURST_LIMIT, BURST_WINDOW_MS);
  if (!burst.ok) {
    return NextResponse.json(
      { error: "That is a lot of messages at once. Please try again shortly." },
      { status: 429, headers: { "retry-after": String(burst.retryAfter) } }
    );
  }

  try {
    if ((await countRecentEnquiries(ip)) >= HOURLY_LIMIT) {
      return NextResponse.json(
        { error: "That is a lot of messages at once. Please try again later." },
        { status: 429 }
      );
    }

    const enquiry = await createEnquiry(
      values,
      ip,
      request.headers.get("user-agent") ?? ""
    );

    // Never allowed to lose a message the database has already taken, so the
    // notification is fired and its failure swallowed — the same rule the
    // registration route follows.
    notifyNewEnquiry(enquiry).catch((error) => {
      console.error("[enquiry] notify", error);
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[enquiry] POST", error);
    return NextResponse.json(
      { error: "Could not send that just now. Please try again." },
      { status: 500 }
    );
  }
}
