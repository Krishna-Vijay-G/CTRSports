import { NextResponse } from "next/server";
import {
  answerColumns,
  answerText,
  isFormId,
  validateSubmission,
  type AnswerColumn,
  type Form,
  type FormEntry,
} from "@/lib/forms";
import { guardForms } from "@/lib/server/access";
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
export const ADDED_BY_HAND = "Added in the admin";

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
  const denied = await guardForms();
  if (denied) return denied;

  const { id } = await params;
  if (!isFormId(id)) {
    return NextResponse.json({ error: "No such form." }, { status: 404 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format");
  const before = url.searchParams.get("before") ?? undefined;
  const offset = Number(url.searchParams.get("offset") ?? 0);

  try {
    const form = await getForm(id);
    if (!form) {
      return NextResponse.json({ error: "No such form." }, { status: 404 });
    }

    if (format === "csv") {
      const withMeta = url.searchParams.get("meta") === "1";
      return csv(form, await collect(id), withMeta);
    }

    const wanted = url.searchParams.get("sort") ?? "";
    const known =
      wanted === CREATED_KEY ||
      answerColumns(form.fields).some((column) => column.key === wanted);
    const sort: EntrySort | undefined = known
      ? { key: wanted, dir: url.searchParams.get("dir") === "asc" ? "asc" : "desc" }
      : undefined;

    const skip = sort && Number.isFinite(offset) ? Math.max(Math.trunc(offset), 0) : 0;
    const entries = await listEntries(id, { limit: PAGE, before, sort, offset: skip });

    // Only worth counting on the first page of a run — it does not change as
    // somebody pages, and it is a second query every time it is asked for.
    const total = before || skip > 0 ? undefined : await countEntries(id);
    const more = entries.length === PAGE;

    return NextResponse.json({
      entries,
      // One of these is null, depending on how the list is ordered: newest-first
      // pages by cursor, a sorted list by offset. See listEntries.
      nextCursor:
        !sort && more ? entries[entries.length - 1].created_at : null,
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
  const denied = await guardForms();
  if (denied) return denied;

  const { id } = await params;
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
      (body as { values?: unknown })?.values
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
  const denied = await guardForms();
  if (denied) return denied;

  const { id } = await params;
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
async function collect(formId: string): Promise<FormEntry[]> {
  const all: FormEntry[] = [];
  let before: string | undefined;

  while (all.length < EXPORT_MAX) {
    const page = await listEntries(formId, { limit: EXPORT_PAGE, before });
    all.push(...page);

    if (page.length < EXPORT_PAGE) break;
    before = page[page.length - 1].created_at;
  }

  return all;
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
function csv(form: Form, entries: FormEntry[], withMeta: boolean): Response {
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

  const header = [
    "Submitted",
    ...labelled(columns),
    ...orphans.map((id) => `No longer asked: ${id}`),
    ...(withMeta ? ["IP", "User agent"] : []),
  ];

  const rows = entries.map((entry) => [
    entry.created_at,
    ...columns.map((column) => answerText(entry.answers[column.key])),
    ...orphans.map((id) => answerText(entry.answers[id])),
    ...(withMeta ? [entry.ip, entry.user_agent] : []),
  ]);

  const lines = [header, ...rows].map((row) => row.map(cell).join(","));
  if (entries.length >= EXPORT_MAX) lines.push(`# truncated at ${EXPORT_MAX} rows`);

  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(`﻿${lines.join("\r\n")}\r\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${form.slug || "form"}-entries-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}

/** Column headings, with duplicates numbered so two are never the same. */
function labelled(columns: AnswerColumn[]): string[] {
  const seen = new Map<string, number>();

  return columns.map((column) => {
    const count = (seen.get(column.label) ?? 0) + 1;
    seen.set(column.label, count);
    return count === 1 ? column.label : `${column.label} (${count})`;
  });
}

function cell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
