import { NextResponse } from "next/server";
import {
  answerColumns,
  answerText,
  isFormId,
  validateSubmission,
  type EntryCursor,
  type Form,
  type FormEntry,
} from "@/lib/forms";
import { guardFormById } from "@/lib/server/access";
import {
  CREATED_KEY,
  MAX_BULK_DELETE,
  countEntries,
  createEntry,
  deleteEntries,
  listEntries,
  type EntrySort,
} from "@/lib/server/entriesRepo";
import { getForm } from "@/lib/server/formsRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** One page of the table. Enough to fill a screen twice over. */
const PAGE = 50;

/** Rows per query while building an export. */
const EXPORT_PAGE = 500;

/** Where an export stops. Past this the file says so on its last line. */
const EXPORT_MAX = 20_000;

/**
 * What stands in for a browser on an entry somebody typed in.
 *
 * There is no column for where an entry came from, and adding one for a single
 * string would be a migration for a sentence. The user agent already answers
 * "what made this request", and this is a true answer to it.
 */
const ADDED_BY_HAND = "Added in the admin";

/**
 * The entries on one form: a page of them, or the whole lot as CSV.
 *
 * The export is `?format=csv` on this same route rather than a sibling path,
 * for the reason the reorder routes give: a static sibling of `[id]` does not
 * reliably win the route match.
 *
 * `sort` names one of THIS form's columns and nothing else. It reaches a `->>`
 * on a JSONB document, so an unchecked one would let a signed-in account read
 * the ordering of any key it cared to name — harmless here, but the habit of
 * passing a caller's string into a query shape is not one to keep.
 */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;

  const guard = await guardFormById(id);
  if (guard.denied) return guard.denied;
  if (!isFormId(id)) {
    return NextResponse.json({ error: "No such form." }, { status: 404 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  const offset = Number(url.searchParams.get("offset") ?? 0);

  /*
   * The cursor is two values and both have to be real before they reach a query.
   * Handed straight to Postgres, a malformed one came back as `22007 invalid
   * input syntax`, was caught as an unknown failure and reported as a 500 — a
   * server error for a bad request, with the actual cause visible only in a log.
   */
  const at = url.searchParams.get("before");
  const beforeId = url.searchParams.get("beforeId");

  if ((at || beforeId) && !(at && beforeId && !Number.isNaN(Date.parse(at)) && isFormId(beforeId))) {
    return NextResponse.json({ error: "That page marker is not usable." }, { status: 400 });
  }

  const before = at && beforeId ? { at, id: beforeId } : undefined;

  try {
    const form = await getForm(id);
    if (!form) {
      return NextResponse.json({ error: "No such form." }, { status: 404 });
    }

    if (format === "csv") {
      const withMeta = url.searchParams.get("meta") === "1";
      return csv(form, await collect(id), withMeta);
    }

    /*
     * An unrecognised sort key is refused rather than ignored.
     *
     * Ignoring it silently changed the PAGING MODE — offset out, cursor in — and
     * answered page one of an unsorted list to a client that was asking for
     * page two of a sorted one. It appended, so all fifty rows appeared twice
     * and ticking one box ticked both. It happens whenever another admin deletes
     * a question while this screen is open, which is not exotic.
     */
    const wanted = url.searchParams.get("sort") ?? "";
    const known =
      wanted === CREATED_KEY ||
      answerColumns(form.fields).some((column) => column.key === wanted);

    if (wanted && !known) {
      return NextResponse.json(
        { error: "That column is no longer on this form.", staleSort: true },
        { status: 400 }
      );
    }

    const sort: EntrySort | undefined = known
      ? { key: wanted, dir: url.searchParams.get("dir") === "asc" ? "asc" : "desc" }
      : undefined;

    const skip = sort && Number.isFinite(offset) ? Math.max(Math.trunc(offset), 0) : 0;
    const entries = await listEntries(id, { limit: PAGE, before, sort, offset: skip });

    // Counted on the first page of a run, and again whenever the client asks —
    // an open form takes entries while this screen is being read, so a total
    // that is only ever adjusted arithmetically drifts away from the truth.
    const total = before || skip > 0 ? undefined : await countEntries(id);
    const more = entries.length === PAGE;
    const last = entries[entries.length - 1];

    return NextResponse.json({
      entries,
      // One of these is null, depending on how the list is ordered: newest-first
      // pages by cursor, a sorted list by offset. See listEntries.
      nextCursor: !sort && more && last ? { at: last.created_at, id: last.id } : null,
      nextOffset: sort && more ? skip + entries.length : null,
      ...(total === undefined ? {} : { total }),
    });
  } catch (error) {
    console.error("[admin/forms] entries GET", error);
    return NextResponse.json({ error: "Could not load the entries." }, { status: 500 });
  }
}

/**
 * Adds an entry by hand.
 *
 * Registrations arrive by telephone and on paper, and an entry list that only
 * holds the ones that came through the website is a list nobody can run an
 * event from. The answers go through exactly the same `validateSubmission` the
 * public route uses — same required questions, same branching, same clamping —
 * so an entry typed here cannot be a shape the form itself could not produce.
 *
 * What it does not get is a rate limit, a honeypot or a nonce: those defend
 * against a stranger, and this route is already behind `guardForms`.
 */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  const guard = await guardFormById(id);
  if (guard.denied) return guard.denied;
  if (!isFormId(id)) {
    return NextResponse.json({ error: "No such form." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "That was not readable." }, { status: 400 });
  }

  try {
    const form = await getForm(id);
    if (!form) {
      return NextResponse.json({ error: "No such form." }, { status: 404 });
    }

    const { values, errors } = validateSubmission(
      form.fields,
      (body as { values?: unknown })?.values,
      new Date(),
      form.sections
    );

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 422 });
    }

    // No address, and a user agent that says where it came from instead of
    // naming a browser. Both are what the meta export prints, and "an admin
    // typed this in" is the honest answer to both questions.
    const entry = await createEntry(id, values, "", ADDED_BY_HAND);

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("[admin/forms] entries POST", error);
    return NextResponse.json({ error: "Could not add the entry." }, { status: 500 });
  }
}

/**
 * Removes several entries at once.
 *
 * On the collection rather than a sibling path, for the reason the reorder
 * routes give. The ids come in a body because a list of them does not belong in
 * a URL — there is no length anybody guarantees, and a delete that silently
 * truncated would be the worst kind.
 *
 * All of them or none: one transaction, so a half-finished tidy-up cannot leave
 * a table nobody can make sense of.
 */
export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;

  const guard = await guardFormById(id);
  if (guard.denied) return guard.denied;
  if (!isFormId(id)) {
    return NextResponse.json({ error: "No such form." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "That was not readable." }, { status: 400 });
  }

  const sent = (body as { ids?: unknown })?.ids;
  const ids = Array.isArray(sent) ? sent.filter(isFormId) : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "Nothing was selected." }, { status: 400 });
  }

  if (ids.length > MAX_BULK_DELETE) {
    return NextResponse.json(
      { error: `That is more than ${MAX_BULK_DELETE} at once. Delete them in batches.` },
      { status: 400 }
    );
  }

  try {
    // The other three handlers 404 on a form that does not exist; this one
    // answered "deleted nothing, all fine", which is a different thing to say
    // and the wrong one.
    const form = await getForm(id);
    if (!form) {
      return NextResponse.json({ error: "No such form." }, { status: 404 });
    }

    const gone = await deleteEntries(id, ids);
    return NextResponse.json({ ok: true, deleted: gone });
  } catch (error) {
    console.error("[admin/forms] entries DELETE", error);
    return NextResponse.json({ error: "Could not delete those entries." }, { status: 500 });
  }
}

/**
 * Every entry, in pages.
 *
 * Built in memory rather than streamed, and that is worth saying plainly: the
 * database driver here speaks HTTP and hands back whole result sets, so a
 * streamed response would be a stream of something already fully in memory.
 * What the paging buys is that the *query* stays a sensible size.
 */
async function collect(formId: string): Promise<{ entries: FormEntry[]; truncated: boolean }> {
  const all: FormEntry[] = [];
  let before: EntryCursor | undefined;

  while (all.length < EXPORT_MAX) {
    const page = await listEntries(formId, { limit: EXPORT_PAGE, before });
    all.push(...page);

    if (page.length < EXPORT_PAGE) {
      // Ran out of rows, so the export is complete. Saying so explicitly rather
      // than letting the caller infer it from a count: a form holding exactly
      // EXPORT_MAX entries used to be labelled truncated when it was whole.
      return { entries: all, truncated: false };
    }

    const last = page[page.length - 1];
    before = { at: last.created_at, id: last.id };
  }

  // We stopped because we hit the ceiling. There may or may not be more, and
  // the honest thing is to say the file is capped either way.
  return { entries: all, truncated: true };
}

/**
 * The entries as a spreadsheet.
 *
 * Three things here are not obvious and all three are about the file being
 * opened in Excel by somebody in an office:
 *
 *   the BOM      without it Excel reads the file as the local codepage, and
 *                every Indian name with an accent in it arrives as mojibake.
 *   the quoting  every cell, always, with internal quotes doubled — a cell that
 *                contains a comma or a newline is the normal case here, not the
 *                exception, because people type paragraphs into forms.
 *   the prefix   a cell starting = + - or @ is prefixed with an apostrophe.
 *                This file contains text typed by anyone on the internet, and
 *                Excel executes a leading = as a formula.
 *
 * The columns are the form's questions as they stand NOW, plus one column per
 * answer to a question that has since been deleted. Those are never dropped:
 * this export is the only way the data leaves the database, and a column that
 * quietly disappears when somebody tidies up a form is invisible data loss.
 */
function csv(
  form: Form,
  { entries, truncated }: { entries: FormEntry[]; truncated: boolean },
  withMeta: boolean
): Response {
  // The same columns the table shows, which is more than one per question: a
  // date that works out an age contributes two.
  const columns = answerColumns(form.fields);
  const known = new Set(columns.map((column) => column.key));

  // Every retired question that any exported row still answers, in the order
  // they are met.
  const orphans: string[] = [];
  for (const entry of entries) {
    for (const key of Object.keys(entry.answers)) {
      if (!known.has(key) && !orphans.includes(key)) orphans.push(key);
    }
  }

  // Numbered across the WHOLE header, not just the questions: a question
  // labelled "Submitted" or "IP" used to produce two identical column names,
  // which is exactly the collision the numbering exists to prevent.
  const header = unique([
    "Submitted",
    ...columns.map((column) => column.label),
    ...orphans.map((id) => `No longer asked: ${id}`),
    ...(withMeta ? ["IP", "User agent"] : []),
  ]);

  const rows = entries.map((entry) => [
    entry.created_at,
    ...columns.map((column) => answerText(entry.answers[column.key])),
    ...orphans.map((id) => answerText(entry.answers[id])),
    ...(withMeta ? [entry.ip, entry.user_agent] : []),
  ]);

  const lines = [header, ...rows].map((row) => row.map(cell).join(","));

  // Quoted like every other line, because it is a line in a CSV file. Pushed in
  // raw it was parsed as a data row — a file that says it is complete when it is
  // not, in a format nobody re-reads carefully.
  if (truncated) lines.push(cell(`Truncated at ${EXPORT_MAX} rows — there are more entries.`));

  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(`\uFEFF${lines.join("\r\n")}\r\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      // Sanitised at the point of use rather than trusted from the column. Every
      // write path slugifies, but this header cannot be broken by a value that
      // arrived some other way — a migration, a hand-run UPDATE.
      "content-disposition": `attachment; filename="${filename(form.slug)}-entries-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}

/** Headings with duplicates numbered, so two columns are never the same word. */
function unique(labels: string[]): string[] {
  const seen = new Map<string, number>();

  return labels.map((label) => {
    let name = label;
    // A form can genuinely hold both "Name" and "Name (2)", so keep counting
    // until the result is one nothing else has taken.
    while (seen.has(name)) {
      const count = (seen.get(name) ?? 1) + 1;
      seen.set(name, count);
      name = `${label} (${count})`;
    }

    seen.set(name, 1);
    return name;
  });
}

function filename(slug: string): string {
  return slug.replace(/[^a-z0-9-]/gi, "").slice(0, 60) || "form";
}

/**
 * One cell.
 *
 * The leading-apostrophe guard covers more than `= + - @`: a tab or a carriage
 * return before them is stripped by the spreadsheet before it decides what the
 * cell is, so ` \t=cmd|...` is a formula too. Anything not already a string is
 * coerced rather than assumed — this used to take `created_at` on faith and
 * throw, which is what broke the whole export.
 */
function cell(value: unknown): string {
  const text = typeof value === "string" ? value : String(value ?? "");
  const safe = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;

  return `"${safe.replace(/"/g, '""')}"`;
}
