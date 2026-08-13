"use client";

import { useState } from "react";
import { answerText, entryCells, orphanAnswers, type Form, type FormEntry } from "@/lib/forms";
import { cn } from "@/lib/utils";
import { Badge } from "@/admin/ui/Badge";
import { Button, ButtonLink } from "@/admin/ui/Button";
import { Dialog } from "@/admin/ui/Dialog";
import { CaretDownIcon, ListIcon, TrashIcon } from "@/admin/ui/icons";
import { ErrorNote } from "@/admin/components/Fields";

/**
 * Who has entered.
 *
 * A table across the whole screen, with no preview beside it: entries are read
 * by scanning down a column, and half a screen of that is half a screen of
 * scrolling. It is the one editor here with no preview for that reason.
 *
 * The columns are the form's questions as they stand now. An entry answering a
 * question that has since been deleted still holds that answer — it is in the
 * row when it is opened, under "no longer asked", and it is in the export. It
 * is only missing from the table itself, because a column for a question nobody
 * is asked any more would be mostly blank.
 *
 * Paging is a button rather than an infinite scroll: a table you cannot reach
 * the bottom of is not a table, and the export is what "all of them" means.
 */
export function EntriesTable({
  form,
  initialEntries,
  initialCursor,
  total,
}: {
  form: Form;
  initialEntries: FormEntry[];
  /** The created_at to ask for the next page from, or null at the end. */
  initialCursor: string | null;
  total: number;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [cursor, setCursor] = useState(initialCursor);
  const [open, setOpen] = useState<FormEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (!cursor) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/forms/${form.id}/entries?before=${encodeURIComponent(cursor)}`
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not load more entries.");
        return;
      }

      setEntries((current) => [...current, ...(data.entries as FormEntry[])]);
      setCursor(data.nextCursor ?? null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(entry: FormEntry) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/forms/${form.id}/entries/${entry.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Could not delete this entry.");
        return;
      }

      setEntries((current) => current.filter((e) => e.id !== entry.id));
      setOpen(null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-col gap-2 p-2 md:h-full">
      <div className="flex shrink-0 flex-wrap items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2">
        <ListIcon className="size-5 shrink-0 text-muted-fg" />

        <div className="mr-auto min-w-0">
          <h1 className="truncate text-[13px] font-medium tracking-tight text-foreground">
            {form.name || "Untitled form"} · entries
          </h1>
          <p className="truncate text-[11px] text-muted-fg">
            {total === 0 ? "Nothing yet" : `${total} in all`}
            {form.slug ? ` · /register/${form.slug}` : ""}
          </p>
        </div>

        <ButtonLink href="/forms" variant="ghost" size="sm">
          <CaretDownIcon className="rotate-90" />
          Back to the form
        </ButtonLink>

        {/* A real anchor, not a router link: the response is a file, and a
            client-side navigation has nowhere to put one. */}
        <ButtonLink
          href={`/api/admin/forms/${form.id}/entries?format=csv`}
          download
          variant="outline"
          size="sm"
        >
          Download CSV
        </ButtonLink>
      </div>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card">
        {entries.length === 0 ? (
          <p className="px-4 py-16 text-center text-xs text-muted-fg">
            Nobody has filled this in yet.
            {form.status === "draft" ? " It is still a draft, so nobody can." : ""}
          </p>
        ) : (
          <table className="w-full border-collapse text-left text-[13px]">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b border-border">
                <Th>Submitted</Th>
                {form.fields.map((field) => (
                  <Th key={field.id}>{field.label || "Question"}</Th>
                ))}
                <Th className="w-10" />
              </tr>
            </thead>

            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => setOpen(entry)}
                  className="cursor-pointer border-b border-border/60 transition-colors last:border-b-0 hover:bg-muted/50"
                >
                  <Td className="whitespace-nowrap text-muted-fg">{when(entry.created_at)}</Td>

                  {entryCells(form.fields, entry).map(({ field, text }) => (
                    <Td key={field.id} className="max-w-[22rem] truncate">
                      {text || <span className="text-muted-fg/50">—</span>}
                    </Td>
                  ))}

                  <Td className="text-right text-muted-fg">›</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {cursor ? (
        <Button variant="outline" size="sm" onClick={loadMore} disabled={busy} className="shrink-0">
          {busy ? "Loading…" : "Load more"}
        </Button>
      ) : null}

      {open ? (
        <Dialog
          open
          onClose={() => setOpen(null)}
          title="Entry"
          description={when(open.created_at)}
          className="max-w-2xl"
        >
          <dl className="space-y-3">
            {form.fields.map((field) => (
              <div key={field.id}>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-fg">
                  {field.label || "Question"}
                </dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-[13px] text-foreground">
                  {answerText(open.answers[field.id]) || "—"}
                </dd>
              </div>
            ))}

            {orphanAnswers(form.fields, open).length > 0 ? (
              <div className="rounded-md border border-dashed border-border p-3">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-fg">
                  No longer asked
                </p>
                {orphanAnswers(form.fields, open).map(([id, text]) => (
                  <div key={id} className="mt-1.5">
                    <dt className="text-[11px] text-muted-fg">{id}</dt>
                    <dd className="whitespace-pre-wrap text-[13px] text-foreground">{text}</dd>
                  </div>
                ))}
              </div>
            ) : null}
          </dl>

          <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
            {open.ip ? <Badge variant="outline">{open.ip}</Badge> : null}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => remove(open)}
              disabled={busy}
              className="ml-auto"
            >
              <TrashIcon />
              Remove
            </Button>
            <Button size="sm" onClick={() => setOpen(null)}>
              Close
            </Button>
          </div>
        </Dialog>
      ) : null}
    </div>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-fg",
        className
      )}
    >
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2 text-foreground", className)}>{children}</td>;
}

/** Local time, because whoever is reading this is in the paddock, not in UTC. */
function when(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}
