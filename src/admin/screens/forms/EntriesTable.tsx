"use client";

import { useState } from "react";
import {
  answerColumns,
  answerText,
  entryCells,
  fileOf,
  orphanAnswers,
  type EntryCursor,
  type Form,
  type FormEntry,
} from "@/lib/forms";
import { cn } from "@/lib/utils";
import { Badge } from "@/admin/ui/Badge";
import { Button, ButtonLink } from "@/admin/ui/Button";
import { Dialog } from "@/admin/ui/Dialog";
import { CaretDownIcon, ListIcon, PencilIcon, PlusIcon, TrashIcon } from "@/admin/ui/icons";
import { ErrorNote } from "@/admin/components/Fields";
import { EntryEditor } from "./EntryEditor";

/**
 * Who has entered.
 *
 * A table across the whole screen, with no preview beside it: entries are read
 * by scanning down a column, and half a screen of that is half a screen of
 * scrolling. It is the one editor here with no preview for that reason.
 *
 * The columns are the form's questions as they stand now, plus a column for any
 * age it works out. An entry answering a question that has since been deleted
 * still holds that answer — it is in the row when it is opened, under "no longer
 * asked", and it is in the export. It is only missing from the table itself,
 * because a column for a question nobody is asked any more would be mostly
 * blank.
 *
 * ── Sorting, and what it costs ────────────────────────────────────────────
 *
 * Sorting is done by the DATABASE, over every entry, not by reordering the rows
 * already loaded. Sorting a page of fifty out of two hundred would put the
 * fifty newest in alphabetical order and call it "sorted by name", which is a
 * wrong answer that looks like a right one.
 *
 * The cost is that changing the sort starts the list again, and that a sorted
 * list pages by offset rather than by cursor — see `listEntries`. Both are
 * worth it; neither is worth hiding.
 *
 * ── Selection ─────────────────────────────────────────────────────────────
 *
 * Ticks are kept by id, so they survive paging. The header tick covers what is
 * ON SCREEN, which is the only thing it can honestly promise: "all" of a list
 * that has not been fully loaded is a claim this screen cannot make.
 */
export function EntriesTable({
  form,
  initialEntries,
  initialCursor,
  total: initialTotal,
}: {
  form: Form;
  initialEntries: FormEntry[];
  /** Where the next page starts — both halves — or null at the end. */
  initialCursor: EntryCursor | null;
  total: number;
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [total, setTotal] = useState(initialTotal);
  const [cursor, setCursor] = useState(initialCursor);
  const [offset, setOffset] = useState<number | null>(null);
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [open, setOpen] = useState<FormEntry | null>(null);
  const [editing, setEditing] = useState<{ entry: FormEntry | null } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const columns = answerColumns(form.fields);
  const more = cursor !== null || offset !== null;

  function query(next: typeof sort, from: { before?: EntryCursor; offset?: number }): string {
    const params = new URLSearchParams();
    if (next) {
      params.set("sort", next.key);
      params.set("dir", next.dir);
      if (from.offset) params.set("offset", String(from.offset));
    } else if (from.before) {
      params.set("before", from.before.at);
      params.set("beforeId", from.before.id);
    }
    return params.toString();
  }

  /**
   * A fresh run of the list.
   *
   * Used when the sort changes and after ANY change to the rows. That second
   * case matters more than it looks: under a sort the list pages by offset, and
   * deleting ten rows leaves the offset pointing ten rows further down than it
   * should — the next page then skips exactly the ten that moved up, silently.
   * Rebuilding from the top is the only honest answer to a set that shifted.
   */
  async function reload(next: typeof sort) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/forms/${form.id}/entries?${query(next, {})}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // The column was deleted from the form while this screen was open.
        // Fall back to the default order rather than leaving the table showing
        // an order the server has just refused to produce.
        if (data.staleSort && next) {
          setError("That column is no longer on this form — showing newest first.");
          await reload(null);
          return;
        }

        setError(data.error ?? "Could not load the entries.");
        return;
      }

      if (!Array.isArray(data.entries)) {
        setError("The entries came back in a shape this screen could not read.");
        return;
      }

      setSort(next);
      setEntries(data.entries as FormEntry[]);
      setCursor(data.nextCursor ?? null);
      setOffset(data.nextOffset ?? null);
      if (typeof data.total === "number") setTotal(data.total);

      // Ticks are held by id and the rows underneath them have just been
      // replaced. Keeping a selection that now names rows nobody can see would
      // arm "Delete N" against them.
      setPicked((current) => {
        const shown = new Set((data.entries as FormEntry[]).map((entry) => entry.id));
        const kept = new Set([...current].filter((id) => shown.has(id)));
        return kept.size === current.size ? current : kept;
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function loadMore() {
    if (!more) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/forms/${form.id}/entries?${query(sort, {
          before: cursor ?? undefined,
          offset: offset ?? undefined,
        })}`
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not load more entries.");
        return;
      }

      if (!Array.isArray(data.entries)) {
        setError("The entries came back in a shape this screen could not read.");
        return;
      }

      // Guarded against a row arriving twice — which offset paging can do if
      // the set shifted between pages — because a duplicate id means two rows
      // that tick together and a React key collision.
      setEntries((current) => {
        const known = new Set(current.map((entry) => entry.id));
        return [...current, ...(data.entries as FormEntry[]).filter((entry) => !known.has(entry.id))];
      });
      setCursor(data.nextCursor ?? null);
      setOffset(data.nextOffset ?? null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Ascending, then descending, then back to newest first.
   *
   * Three states rather than two because "the order it arrived in" is a real
   * choice and the only one that pages by cursor — a sort with no way back to it
   * makes the cheap path unreachable for the rest of the session.
   */
  function toggleSort(key: string) {
    if (!sort || sort.key !== key) return reload({ key, dir: "asc" });
    if (sort.dir === "asc") return reload({ key, dir: "desc" });
    return reload(null);
  }

  async function remove(ids: string[]) {
    if (ids.length === 0) return;

    setBusy(true);
    setError(null);

    try {
      const response =
        ids.length === 1
          ? await fetch(`/api/admin/forms/${form.id}/entries/${ids[0]}`, { method: "DELETE" })
          : await fetch(`/api/admin/forms/${form.id}/entries`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids }),
            });

      const data = await response.json().catch(() => ({}));

      // A row somebody else has already deleted is gone, which is what was
      // wanted. The single-entry route says 404 and the bulk one says
      // "deleted: 0" — treating the 404 as failure left a phantom row on
      // screen that no amount of clicking could remove.
      if (!response.ok && response.status !== 404) {
        setError(data.error ?? "Could not delete those entries.");
        return;
      }

      const gone = new Set(ids);
      setEntries((current) => current.filter((entry) => !gone.has(entry.id)));
      // The server's count, not the length of the list sent: somebody else may
      // have deleted one of these already, and a total that drifts down further
      // than the rows that actually went is a total nobody can trust.
      setTotal((current) =>
        Math.max(current - (typeof data.deleted === "number" ? data.deleted : ids.length), 0)
      );
      setPicked((current) => {
        const next = new Set(current);
        for (const id of ids) next.delete(id);
        return next;
      });
      setOpen(null);
      setConfirming(false);

      // Offset paging counts from the top of a set that has just lost rows, so
      // the position it holds is wrong by exactly the number deleted. Rebuild.
      if (sort) await reload(sort);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  /** An entry added or corrected, folded back into the list in place. */
  async function saved(entry: FormEntry) {
    const known = entries.some((row) => row.id === entry.id);

    setEditing(null);
    setOpen(null);

    if (known) {
      setEntries((current) => current.map((row) => (row.id === entry.id ? entry : row)));
      return;
    }

    setTotal((current) => current + 1);

    // Under a sort, a new row has a place in the order and prepending it is a
    // guess — one that also pushes every later row down by one, which offset
    // paging then re-reads as a duplicate. Ask the server where it goes.
    if (sort) {
      await reload(sort);
      return;
    }

    // Newest-first: the top is exactly where it belongs, and where whoever
    // just typed it will look.
    setEntries((current) => [entry, ...current]);
  }

  const allShown = entries.length > 0 && entries.every((entry) => picked.has(entry.id));

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
            {picked.size > 0 ? ` · ${picked.size} selected` : ""}
            {form.slug ? ` · /register/${form.slug}` : ""}
          </p>
        </div>

        {picked.size > 0 ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirming(true)}
            disabled={busy}
          >
            <TrashIcon />
            Delete {picked.size}
          </Button>
        ) : null}

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

        {/* The export with the sender's address and browser on it. It has always
            existed on the route and nothing in the admin ever asked for it, so
            the one thing it is for — telling a burst of spam from a busy
            afternoon — could not actually be done. Separate from the ordinary
            export because those columns are not what an entry list is for. */}
        <ButtonLink
          href={`/api/admin/forms/${form.id}/entries?format=csv&meta=1`}
          download
          variant="ghost"
          size="sm"
          title="The same file, plus the address and browser each entry came from"
        >
          + sender details
        </ButtonLink>

        <Button size="sm" onClick={() => setEditing({ entry: null })} disabled={busy}>
          <PlusIcon />
          Add entry
        </Button>
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
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allShown}
                    onChange={() =>
                      setPicked((current) => {
                        const next = new Set(current);
                        for (const entry of entries) {
                          if (allShown) next.delete(entry.id);
                          else next.add(entry.id);
                        }
                        return next;
                      })
                    }
                    aria-label={allShown ? "Clear the selection" : "Select every row shown"}
                    className="size-4 cursor-pointer rounded border-input bg-transparent text-primary"
                  />
                </th>

                <SortableTh sort={sort} column="created" onSort={toggleSort}>
                  Submitted
                </SortableTh>

                {columns.map((column) => (
                  <SortableTh key={column.key} sort={sort} column={column.key} onSort={toggleSort}>
                    {column.label}
                  </SortableTh>
                ))}

                <Th className="w-10" />
              </tr>
            </thead>

            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={() => setOpen(entry)}
                  className={cn(
                    "cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-muted/50",
                    picked.has(entry.id) && "bg-muted/40"
                  )}
                >
                  {/* The tick is not the row: clicking it selects, clicking
                      anywhere else opens. Without this the box could never be
                      ticked without a dialog appearing over it. */}
                  <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={picked.has(entry.id)}
                      onChange={() =>
                        setPicked((current) => {
                          const next = new Set(current);
                          if (next.has(entry.id)) next.delete(entry.id);
                          else next.add(entry.id);
                          return next;
                        })
                      }
                      aria-label="Select this entry"
                      className="size-4 cursor-pointer rounded border-input bg-transparent text-primary"
                    />
                  </td>

                  <Td className="whitespace-nowrap text-muted-fg">{when(entry.created_at)}</Td>

                  {entryCells(form.fields, entry).map(({ key, text }) => (
                    <Td key={key} className="max-w-[22rem] truncate">
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

      {more ? (
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
            {columns.map((column) => (
              <div key={column.key}>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-fg">
                  {column.label}
                </dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-[13px] text-foreground">
                  {/* An attachment is a link, not a name: it is the only way to
                      see it, since these are never given a public address. */}
                  {fileOf(open.answers[column.key]) ? (
                    <a
                      href={`/api/admin/forms/${form.id}/entries/${open.id}/file/${column.key}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      {fileOf(open.answers[column.key])?.name}
                    </a>
                  ) : (
                    // A question that was never put reads as a dash, the same as
                    // one left blank — the difference is real but it is not what
                    // somebody scanning entries is looking for.
                    answerText(open.answers[column.key]) || "—"
                  )}
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
                <p className="mt-2 text-[11px] text-muted-fg">
                  Kept, and exported. Editing this entry does not disturb them.
                </p>
              </div>
            ) : null}
          </dl>

          <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
            {open.ip ? <Badge variant="outline">{open.ip}</Badge> : null}
            <Button
              variant="destructive"
              size="sm"
              onClick={() => remove([open.id])}
              disabled={busy}
              className="ml-auto"
            >
              <TrashIcon />
              Remove
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing({ entry: open })}>
              <PencilIcon />
              Edit
            </Button>
            <Button size="sm" onClick={() => setOpen(null)}>
              Close
            </Button>
          </div>
        </Dialog>
      ) : null}

      {editing ? (
        <EntryEditor
          form={form}
          entry={editing.entry}
          onClose={() => setEditing(null)}
          onSaved={saved}
        />
      ) : null}

      {/*
        Bulk delete asks first, and a single one does not.
        One row is recoverable by retyping it; forty are not, and the tick that
        selected them may have been the header one.
      */}
      {confirming ? (
        <Dialog
          open
          onClose={() => setConfirming(false)}
          title={`Delete ${picked.size} ${picked.size === 1 ? "entry" : "entries"}?`}
          description="There is no undo, and the export does not bring them back."
          className="max-w-md"
        >
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="ml-auto"
            >
              Keep them
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => remove([...picked])}
              disabled={busy}
            >
              <TrashIcon />
              {busy ? "Deleting…" : "Delete them"}
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

/** A heading that is also the control for ordering by it. */
function SortableTh({
  children,
  column,
  sort,
  onSort,
}: {
  children: React.ReactNode;
  column: string;
  sort: { key: string; dir: "asc" | "desc" } | null;
  onSort: (key: string) => void;
}) {
  const on = sort?.key === column;

  return (
    <Th>
      <button
        type="button"
        onClick={() => onSort(column)}
        aria-label={`Sort by ${typeof children === "string" ? children : column}`}
        className={cn(
          "inline-flex items-center gap-1 uppercase tracking-wide transition hover:text-foreground",
          on && "text-foreground"
        )}
      >
        {children}
        <span aria-hidden className={cn("text-[9px]", !on && "opacity-0")}>
          {sort?.dir === "asc" ? "▲" : "▼"}
        </span>
      </button>
    </Th>
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
