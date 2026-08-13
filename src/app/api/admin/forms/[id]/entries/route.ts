import { NextResponse } from "next/server";
import { answerText, isFormId, type Form, type FormEntry } from "@/lib/forms";
import { guardForms } from "@/lib/server/access";
import { countEntries, listEntries } from "@/lib/server/entriesRepo";
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
 * The entries on one form: a page of them, or the whole lot as CSV.
 *
 * The export is `?format=csv` on this same route rather than a sibling path,
 * for the reason the reorder routes give: a static sibling of `[id]` does not
 * reliably win the route match.
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

  try {
    const form = await getForm(id);
    if (!form) {
      return NextResponse.json({ error: "No such form." }, { status: 404 });
    }

    if (format === "csv") {
      const withMeta = url.searchParams.get("meta") === "1";
      return csv(form, await collect(id), withMeta);
    }

    const entries = await listEntries(id, { limit: PAGE, before });
    const total = before ? undefined : await countEntries(id);

    return NextResponse.json({
      entries,
      // The cursor for the next page, or null at the end of the list.
      nextCursor: entries.length === PAGE ? entries[entries.length - 1].created_at : null,
      ...(total === undefined ? {} : { total }),
    });
  } catch (error) {
    console.error("[admin/forms] entries GET", error);
    return NextResponse.json({ error: "Could not load the entries." }, { status: 500 });
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
  const known = new Set(form.fields.map((field) => field.id));

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
    ...labelled(form),
    ...orphans.map((id) => `No longer asked: ${id}`),
    ...(withMeta ? ["IP", "User agent"] : []),
  ];

  const rows = entries.map((entry) => [
    entry.created_at,
    ...form.fields.map((field) => answerText(entry.answers[field.id])),
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

/** Question labels, with duplicates numbered so two columns are never the same. */
function labelled(form: Form): string[] {
  const seen = new Map<string, number>();

  return form.fields.map((field, index) => {
    const base = field.label || `Question ${index + 1}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });
}

function cell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
