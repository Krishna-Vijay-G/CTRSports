"use client";

import { useState } from "react";
import {
  ENQUIRY_STATUSES,
  ENQUIRY_STATUS_LABELS,
  type EnquiryCounts,
  type EnquiryCursor,
  type EnquiryStatus,
  type StoredEnquiry,
} from "@/lib/enquiry";
import { cn } from "@/lib/utils";
import { Badge } from "@/admin/ui/Badge";
import { Button } from "@/admin/ui/Button";
import { Dialog } from "@/admin/ui/Dialog";
import { CheckIcon, MailIcon, TrashIcon, UploadIcon } from "@/admin/ui/icons";
import { ErrorNote } from "@/admin/components/Fields";

/**
 * The messages people send from the footer.
 *
 * A table across the whole screen with no preview beside it, for the reason the
 * entries table gives: these are read by scanning down a column, and half a
 * screen of that is half a screen of scrolling.
 *
 * ── The one thing this screen is for ──────────────────────────────────────
 *
 * Telling apart a message nobody has opened from one somebody is already
 * dealing with. That is why the filter is chips across the top rather than a
 * dropdown — the count of unread is the number the person opening this screen
 * came to see, and it should not be behind a click. It is in the toolbar as
 * well, so it is readable whichever filter is open.
 *
 * The screen opens on Everything rather than on Unread. A monitor whose default
 * view hides the messages somebody is part-way through answering is a monitor
 * that loses them: the work-in-progress pile is exactly the one that needs
 * looking at twice, and it would be the pile behind a click.
 *
 * ── Deleting ─────────────────────────────────────────────────────────────
 *
 * The button says Delete, because that is what somebody clicking it means. What
 * happens is an archive: the row leaves this list and appears under Archived,
 * where Restore brings it back. Nothing on this screen removes a row from the
 * database, and the dialog says so rather than promising an undo it would then
 * have to honour. See `archiveEnquiries`.
 *
 * ── Paging and the counts ─────────────────────────────────────────────────
 *
 * Newest first, on a keyset cursor of `(created_at, id)`. Changing the filter
 * starts the list again from the server rather than filtering the rows already
 * loaded — a page of fifty out of two hundred filtered in the browser would
 * show "the unread ones among the newest fifty" and label it Unread.
 *
 * The counts come back from the server on every fresh run for the same reason:
 * the footer takes messages while this screen is open, and a total only ever
 * adjusted arithmetically drifts away from the table underneath it.
 */

/** The filter chips, in the order they are worked through. */
type Filter = EnquiryStatus | "all" | "archived";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "unread", label: ENQUIRY_STATUS_LABELS.unread },
  { key: "in_progress", label: ENQUIRY_STATUS_LABELS.in_progress },
  { key: "resolved", label: ENQUIRY_STATUS_LABELS.resolved },
  { key: "all", label: "Everything" },
  { key: "archived", label: "Archived" },
];

/** How a status reads as a chip. Unread is the one meant to catch the eye. */
const STATUS_VARIANT: Record<EnquiryStatus, "default" | "secondary" | "outline"> = {
  unread: "default",
  in_progress: "secondary",
  resolved: "outline",
};

export function EnquiriesTable({
  initialEnquiries,
  initialCursor,
  initialCounts,
}: {
  initialEnquiries: StoredEnquiry[];
  /** Where the next page starts — both halves — or null at the end. */
  initialCursor: EnquiryCursor | null;
  initialCounts: EnquiryCounts;
}) {
  const [enquiries, setEnquiries] = useState(initialEnquiries);
  const [counts, setCounts] = useState(initialCounts);
  const [cursor, setCursor] = useState(initialCursor);
  const [filter, setFilter] = useState<Filter>("all");
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [open, setOpen] = useState<StoredEnquiry | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const archived = filter === "archived";

  function query(next: Filter, from?: EnquiryCursor): string {
    const params = new URLSearchParams();
    if (next === "archived") params.set("archived", "1");
    else if (next !== "all") params.set("status", next);
    if (from) {
      params.set("before", from.at);
      params.set("beforeId", from.id);
    }
    return params.toString();
  }

  /**
   * A fresh run of the list.
   *
   * Used when the filter changes and after ANY write. That second case is what
   * keeps the screen honest: marking the open unread ones resolved moves them
   * out of the list you are looking at, and the counts on every other chip
   * change at the same time.
   */
  async function reload(next: Filter) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/enquiries?${query(next)}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not load the enquiries.");
        return;
      }

      if (!Array.isArray(data.enquiries)) {
        setError("The enquiries came back in a shape this screen could not read.");
        return;
      }

      setFilter(next);
      setEnquiries(data.enquiries as StoredEnquiry[]);
      setCursor(data.nextCursor ?? null);
      if (data.counts) setCounts(data.counts as EnquiryCounts);

      // Ticks are held by id and the rows under them have just been replaced.
      // Keeping a selection naming rows nobody can see would arm the bulk
      // buttons against them.
      setPicked((current) => {
        const shown = new Set((data.enquiries as StoredEnquiry[]).map((row) => row.id));
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
    if (!cursor) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/enquiries?${query(filter, cursor)}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not load more enquiries.");
        return;
      }

      if (!Array.isArray(data.enquiries)) {
        setError("The enquiries came back in a shape this screen could not read.");
        return;
      }

      // Guarded against a row arriving twice — a duplicate id means two rows
      // that tick together and a React key collision.
      setEnquiries((current) => {
        const known = new Set(current.map((row) => row.id));
        return [...current, ...(data.enquiries as StoredEnquiry[]).filter((row) => !known.has(row.id))];
      });
      setCursor(data.nextCursor ?? null);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Every write on this screen: a status change, an archive, a restore.
   *
   * One function because they share everything that is easy to get wrong — the
   * busy flag, the error message, clearing the selection, and reloading so that
   * the rows and the counts agree again afterwards.
   */
  async function act(
    ids: string[],
    action: { status: EnquiryStatus } | { archive: true } | { restore: true }
  ) {
    if (ids.length === 0) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/enquiries", {
        method: "archive" in action ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          "archive" in action
            ? { ids }
            : "restore" in action
              ? { ids, restore: true }
              : { ids, status: action.status }
        ),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not update those enquiries.");
        return;
      }

      setPicked(new Set());
      setOpen(null);
      setConfirming(false);

      // The server decides what the list and the counts are now. Patching the
      // rows in place would be a guess about which of them still belong under
      // the open filter, and it would be wrong every time the filter is a
      // status that has just been changed away from.
      await reload(filter);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const countFor = (key: Filter): number =>
    key === "all"
      ? counts.unread + counts.in_progress + counts.resolved
      : key === "archived"
        ? counts.archived
        : counts[key];

  const allShown = enquiries.length > 0 && enquiries.every((row) => picked.has(row.id));

  return (
    <div className="flex min-h-0 flex-col gap-2 p-2 md:h-full">
      <div className="flex shrink-0 flex-wrap items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2">
        <MailIcon className="size-5 shrink-0 text-muted-fg" />

        <div className="mr-auto min-w-0">
          <h1 className="truncate text-[13px] font-medium tracking-tight text-foreground">
            Enquiries
          </h1>
          <p className="truncate text-[11px] text-muted-fg">
            {counts.unread === 0 ? "Nothing unread" : `${counts.unread} unread`}
            {picked.size > 0 ? ` · ${picked.size} selected` : ""}
            {" · sent from the footer"}
          </p>
        </div>

        {/*
          The bulk actions appear only with something ticked. A row of buttons
          that are permanently disabled teaches nobody what they do, and it
          takes the room the chips need on a laptop.
        */}
        {picked.size > 0 ? (
          archived ? (
            <Button variant="outline" size="sm" onClick={() => act([...picked], { restore: true })} disabled={busy}>
              <UploadIcon />
              Restore {picked.size}
            </Button>
          ) : (
            <>
              {ENQUIRY_STATUSES.map((status) => (
                <Button
                  key={status}
                  variant="outline"
                  size="sm"
                  onClick={() => act([...picked], { status })}
                  disabled={busy}
                >
                  <CheckIcon />
                  {ENQUIRY_STATUS_LABELS[status]}
                </Button>
              ))}

              <Button
                variant="destructive"
                size="sm"
                onClick={() => setConfirming(true)}
                disabled={busy}
              >
                <TrashIcon />
                Delete {picked.size}
              </Button>
            </>
          )
        ) : null}
      </div>

      {/* The filter. Its own row, so a long list of bulk actions above can
          never push it off the end of a narrow screen. */}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {FILTERS.map((one) => {
          const on = filter === one.key;
          const total = countFor(one.key);

          return (
            <Button
              key={one.key}
              variant={on ? "default" : "outline"}
              size="sm"
              onClick={() => reload(one.key)}
              disabled={busy}
              aria-pressed={on}
            >
              {one.label}
              <span className={cn("text-[11px]", on ? "opacity-70" : "text-muted-fg")}>{total}</span>
            </Button>
          );
        })}
      </div>

      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-card">
        {enquiries.length === 0 ? (
          <p className="px-4 py-16 text-center text-xs text-muted-fg">
            {archived
              ? "Nothing has been archived."
              : filter === "all"
                ? "Nobody has written in yet."
                : `Nothing is ${ENQUIRY_STATUS_LABELS[filter as EnquiryStatus].toLowerCase()}.`}
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
                        for (const row of enquiries) {
                          if (allShown) next.delete(row.id);
                          else next.add(row.id);
                        }
                        return next;
                      })
                    }
                    aria-label={allShown ? "Clear the selection" : "Select every row shown"}
                    className="size-4 cursor-pointer rounded border-input bg-transparent text-primary"
                  />
                </th>

                <Th className="w-28">Received</Th>
                <Th className="w-28">Status</Th>
                <Th>From</Th>
                <Th>Message</Th>
                <Th className="w-10" />
              </tr>
            </thead>

            <tbody>
              {enquiries.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => setOpen(row)}
                  className={cn(
                    "cursor-pointer border-b border-border transition-colors last:border-b-0 hover:bg-muted/50",
                    picked.has(row.id) && "bg-muted/40"
                  )}
                >
                  {/* The tick is not the row: clicking it selects, clicking
                      anywhere else opens. */}
                  <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={picked.has(row.id)}
                      onChange={() =>
                        setPicked((current) => {
                          const next = new Set(current);
                          if (next.has(row.id)) next.delete(row.id);
                          else next.add(row.id);
                          return next;
                        })
                      }
                      aria-label="Select this enquiry"
                      className="size-4 cursor-pointer rounded border-input bg-transparent text-primary"
                    />
                  </td>

                  <Td className="whitespace-nowrap text-muted-fg">{when(row.created_at)}</Td>

                  <Td>
                    <Badge variant={STATUS_VARIANT[row.status]}>
                      {ENQUIRY_STATUS_LABELS[row.status]}
                    </Badge>
                  </Td>

                  <Td className="max-w-[16rem]">
                    {/* The name is what a person is scanning for; the address is
                        what they need to reply, and it is one line down rather
                        than a column of its own so the message keeps its room. */}
                    <span className="block truncate text-foreground">{row.name}</span>
                    <span className="block truncate text-[11px] text-muted-fg">{row.email}</span>
                  </Td>

                  <Td className="max-w-[28rem] truncate text-muted-fg">{row.message}</Td>

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
          title={open.name || "Enquiry"}
          description={when(open.created_at)}
          className="max-w-2xl"
        >
          <dl className="space-y-3">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-fg">
                Email
              </dt>
              <dd className="mt-0.5 text-[13px]">
                {/* A real mailto, because replying is the entire point of this
                    screen and the alternative is copying an address by hand. */}
                <a
                  href={`mailto:${open.email}?subject=${encodeURIComponent("Re: your enquiry")}`}
                  className="text-primary underline underline-offset-2"
                >
                  {open.email}
                </a>
              </dd>
            </div>

            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-fg">
                Message
              </dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-[13px] text-foreground">
                {open.message}
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            {/* The address it came from. What tells a burst of spam from a busy
                afternoon, and the only place in the admin it is visible. */}
            {open.ip ? <Badge variant="outline">{open.ip}</Badge> : null}

            {open.archived_at ? (
              <>
                <Badge variant="outline">Archived {when(open.archived_at)}</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => act([open.id], { restore: true })}
                  disabled={busy}
                  className="ml-auto"
                >
                  <UploadIcon />
                  Restore
                </Button>
              </>
            ) : (
              <div className="ml-auto flex flex-wrap items-center gap-2">
                {/* The state it is already in is not offered — a button that
                    marks an unread message unread does nothing, and it is the
                    one somebody would press by mistake. */}
                {ENQUIRY_STATUSES.filter((status) => status !== open.status).map((status) => (
                  <Button
                    key={status}
                    variant="outline"
                    size="sm"
                    onClick={() => act([open.id], { status })}
                    disabled={busy}
                  >
                    {ENQUIRY_STATUS_LABELS[status]}
                  </Button>
                ))}

                {/* A single row goes without a confirmation, the same as the
                    entries table — and here it is recoverable besides. */}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => act([open.id], { archive: true })}
                  disabled={busy}
                >
                  <TrashIcon />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </Dialog>
      ) : null}

      {confirming ? (
        <Dialog
          open
          onClose={() => setConfirming(false)}
          title={`Delete ${picked.size} ${picked.size === 1 ? "enquiry" : "enquiries"}?`}
          description="They move to Archived, where Restore brings them back. Nothing is destroyed."
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
              onClick={() => act([...picked], { archive: true })}
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
