"use client";

import { useEffect, useRef, useState } from "react";
import { BLANK_FORM, STATUS_LABELS, type Form } from "@/lib/forms";
import { PAGE_LABELS } from "@/lib/roles";
import type { SlugHolder } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { Button, ButtonLink } from "@/admin/ui/Button";
import { ListIcon, PlusIcon, TicketIcon } from "@/admin/ui/icons";
import { AdminRailSlot } from "@/admin/components/AdminShell";
import { EditorToolbar } from "@/admin/components/EditorToolbar";
import { NewRecord } from "@/admin/components/NewRecord";
import { SectionRail, type RailItem } from "@/admin/components/SectionRail";
import { FormPreview } from "@/admin/components/previews/FormPreview";
import { FormBuilder } from "./FormBuilder";

/**
 * The registration forms, on the same three-column screen as the circuits.
 *
 * Sidebar, preview, fields — the arrangement every editor here uses, with the
 * forms themselves in the rail because a form is the unit of work on this
 * screen. Picking one opens its record on the right and its page in the middle.
 *
 * The rail drags, and the order is the order the cards appear in on the page
 * the forms belong to. Same rule as everywhere else: the list you pick from and
 * the list the site is built from are one list.
 *
 * A page editor gets this screen too, read-only — they have to be able to see
 * which form to point a button at. Everything that writes is hidden for them,
 * and the API refuses it regardless, which is the half that counts.
 */

/** A drag crosses several rows; wait for it to settle before writing. */
const ORDER_SAVE_DELAY = 500;

export function FormsEditor({
  initialForms,
  canManage,
}: {
  initialForms: Form[];
  /** False for a page editor: the screen is a reference, not an editor. */
  canManage: boolean;
}) {
  const [forms, setForms] = useState<Form[]>(initialForms);
  const [saved, setSaved] = useState<Form[]>(initialForms);

  const [activeId, setActiveId] = useState<string | null>(initialForms[0]?.id ?? null);
  const [fieldsOpen, setFieldsOpen] = useState(true);

  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  /**
   * Whether the "new form" panel is open.
   *
   * Adding is a step now rather than a click, because the address has to be
   * asked for before the row exists — see the note on `NewRecord`.
   */
  const [adding, setAdding] = useState(false);

  /**
   * The page open in the builder's outline, so the preview shows the page being
   * worked on rather than always the first one.
   *
   * Held here because it is the one thing the two panes have to agree about,
   * and neither of them is inside the other. The same shape the landing editor
   * uses to point its preview at the banner being edited.
   */
  const [focusPage, setFocusPage] = useState("");

  const active = forms.find((form) => form.id === activeId) ?? null;
  const activeSaved = saved.find((form) => form.id === activeId) ?? null;

  /**
   * Everything about the last thing that happened belongs to the form it
   * happened to.
   *
   * The delete confirmation was the dangerous one: it was raised for form A,
   * survived a click on form B in the rail, and then aimed itself at whatever
   * `active` had become — so "Delete form and entries" deleted B and cascaded
   * every entry on it, while the panel's own text had quietly changed to name B
   * so it did not even look wrong until it was done. It is the only
   * unrecoverable action on this screen.
   */
  function choose(id: string | null) {
    if (id === activeId) return;

    setActiveId(id);
    setConfirmingDelete(false);
    // Picking a form out of the rail is a way of saying "not that, this" —
    // leaving a half-filled new-form panel over the top of it would hide the
    // form that was just asked for.
    setAdding(false);
    setError(null);
    setNotes([]);
    setJustSaved(false);
  }

  // Compared as documents: the questions are a list, so a field-by-field
  // comparison would have to walk it anyway. Position is left out — the list
  // owns it and saves it on its own.
  const changed = (form: Form | null, against: Form | null) =>
    form && against
      ? JSON.stringify({ ...form, sort_order: 0 }) !== JSON.stringify({ ...against, sort_order: 0 })
      : false;

  const dirty = changed(active, activeSaved);

  /*
   * Unsaved work anywhere, not just on the form being looked at.
   *
   * Edits to one form survive in state while another is open, so it was
   * possible to have three forms half-edited and a toolbar quietly reporting
   * nothing to save — it only ever compared the active one. Closing the tab
   * then took the lot with no warning.
   */
  const unsaved = forms.filter((form) => changed(form, saved.find((s) => s.id === form.id) ?? null));
  const elsewhere = canManage ? unsaved.filter((form) => form.id !== activeId) : [];

  useEffect(() => {
    if (unsaved.length === 0) return;

    const warn = (event: BeforeUnloadEvent) => {
      // The only thing a browser still honours here: cancel it, and the browser
      // shows its own wording. Anything we write is ignored.
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved.length]);

  /* ─────────────────────────── Order ─────────────────────────── */

  const savedOrder = useRef(initialForms.map((form) => form.id).join(","));
  const orderTimer = useRef<number | null>(null);
  const pendingOrder = useRef<string[] | null>(null);

  useEffect(() => {
    return () => {
      // Flushed, not just cancelled. Dragging a row and then clicking another
      // screen inside the delay used to throw the reorder away silently, and
      // the rail showed the old order on the way back.
      if (orderTimer.current !== null) {
        window.clearTimeout(orderTimer.current);
        const ids = pendingOrder.current;
        if (ids) void writeOrder(ids);
      }
    };
    // Deliberately once: this is an unmount flush, and re-running it on every
    // render would fire the pending write on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function writeOrder(ids: string[]) {
    const key = ids.join(",");
    if (key === savedOrder.current) return;

    setError(null);

    try {
      const response = await fetch("/api/admin/forms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Could not save the new order.");
        return;
      }

      // Only once it has actually landed. Marking it saved before the await
      // meant a failed reorder could never be corrected: dragging the row back
      // produced the order this ref already claimed to have written, so the
      // retry was discarded by the guard above and the database kept the old one.
      savedOrder.current = key;
    } catch {
      setError("Network error while saving the order.");
    }
  }

  function queueOrder(list: Form[]) {
    pendingOrder.current = list.map((form) => form.id);

    if (orderTimer.current !== null) window.clearTimeout(orderTimer.current);
    orderTimer.current = window.setTimeout(() => {
      orderTimer.current = null;
      const ids = pendingOrder.current;
      if (ids) void writeOrder(ids);
    }, ORDER_SAVE_DELAY);
  }

  function reorder(fromId: string, toId: string) {
    if (fromId === toId || !canManage) return;

    setForms((current) => {
      const from = current.findIndex((form) => form.id === fromId);
      const to = current.findIndex((form) => form.id === toId);
      if (from < 0 || to < 0) return current;

      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);

      queueOrder(next);
      return next;
    });
  }

  /* ─────────────────────────── Writes ─────────────────────────── */

  async function handleSave() {
    if (!active) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/forms/${active.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(active),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not save this form.");
        return;
      }

      // The server has tidied the address and the questions, so the draft is
      // replaced with what actually landed rather than with what was typed.
      const form = data.form as Form;
      setForms((current) => current.map((f) => (f.id === form.id ? form : f)));
      setSaved((current) => current.map((f) => (f.id === form.id ? form : f)));
      setNotes(Array.isArray(data.notes) ? (data.notes as string[]) : []);
      setJustSaved(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Creates the form at the name and address the panel collected.
   *
   * The address is sent, so the server honours it or refuses it — the suffix
   * loop that used to turn a collision into `new-form-2` behind the admin's back
   * only runs for a request that names no address at all.
   */
  async function handleCreate(name: string, slug: string) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...BLANK_FORM,
          name,
          slug,
          // From the largest position in use, not the count: deleting a form
          // never renumbers the rest, so after one deletion the count collides
          // with a row that already exists and `name ASC` breaks the tie —
          // dropping the new form into the middle of the list.
          sort_order: forms.reduce((top, form) => Math.max(top, form.sort_order), 0) + 10,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Left open, holding what was typed. The address is the likely reason,
        // and closing the panel would throw away the name along with it.
        setError(data.error ?? "Could not add a form.");
        return;
      }

      const form = data.form as Form;
      setForms((current) => [...current, form]);
      setSaved((current) => [...current, form]);
      savedOrder.current = [...forms.map((f) => f.id), form.id].join(",");
      setActiveId(form.id);
      setAdding(false);
      setConfirmingDelete(false);
      setNotes(Array.isArray(data.notes) ? (data.notes as string[]) : []);
      setJustSaved(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * An address handed over from another form's history, dropped from the copy
   * of that form held on this screen.
   *
   * The row itself has already changed in the database. Without this the rail's
   * copy still lists the address it no longer answers to, and a later save of
   * that form would post it back — harmless, because the server only ever
   * narrows the stored history, but it reads as the take-over having failed.
   */
  function forgetSlug(holder: SlugHolder, slug: string) {
    const drop = (form: Form) =>
      form.id === holder.id
        ? { ...form, former_slugs: form.former_slugs.filter((entry) => entry !== slug) }
        : form;

    setForms((current) => current.map(drop));
    setSaved((current) => current.map(drop));
  }

  async function handleDelete() {
    if (!active) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/forms/${active.id}`, { method: "DELETE" });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Could not delete this form.");
        return;
      }

      const gone = active.id;
      const remaining = forms.filter((form) => form.id !== gone);
      const position = forms.findIndex((form) => form.id === gone);

      setActiveId(remaining[Math.min(position, remaining.length - 1)]?.id ?? null);
      setForms(remaining);
      setSaved((current) => current.filter((form) => form.id !== gone));
      savedOrder.current = remaining.map((form) => form.id).join(",");
      setConfirmingDelete(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function update(next: Form) {
    setForms((current) => current.map((form) => (form.id === next.id ? next : form)));
    setJustSaved(false);
  }

  /* ─────────────────────────── Screen ─────────────────────────── */

  const railItems: RailItem<string>[] = forms.map((form) => ({
    id: form.id,
    short: form.name || "Untitled form",
    title: form.name || "Untitled form",
    hint: `${STATUS_LABELS[form.status]} · ${form.page_key ? PAGE_LABELS[form.page_key] : "no page"}`,
    // Present so the rail allows dragging. No `onToggleVisible` is passed, so
    // no eye: what takes a form off the site is its status, not a switch here.
    visible: true,
    Icon: TicketIcon,
  }));

  return (
    <div className="flex min-h-0 flex-col gap-2 md:h-full">
      <AdminRailSlot>
        <SectionRail
          heading="Forms"
          items={railItems}
          active={activeId ?? ""}
          onSelect={choose}
          onReorder={canManage ? reorder : undefined}
        />
      </AdminRailSlot>

      <EditorToolbar
        Icon={TicketIcon}
        title={active ? active.name || "Untitled form" : "Registrations"}
        hint={
          // Other forms with unsaved edits are NAMED. "Unsaved" on a screen
          // holding five forms does not say which, and the other four are not
          // on screen to check — so the badge alone was a warning nobody could
          // act on.
          adding
            ? "Give the new form a name and an address."
            : elsewhere.length > 0
              ? `Unsaved elsewhere: ${elsewhere.map((form) => form.name || "Untitled form").join(", ")}`
              : active
                ? canManage
                  ? `Entries land in this admin. ${active.slug ? `/register/${active.slug}` : "Give it an address to publish it."}`
                  : "Registrations owns these. You can point a button at one."
                : "No forms yet — add the first one."
        }

        dirty={canManage && (dirty || unsaved.length > 0)}
        justSaved={justSaved}
        busy={busy}
        // Said once. While the new-form panel is open it owns the failure,
        // because the field that caused it is in that panel.
        error={adding ? null : error}
        onSave={canManage ? handleSave : () => undefined}
        actions={
          canManage ? (
            <>
              {active ? (
                <ButtonLink href={`/forms/${active.id}/entries`} variant="ghost" size="sm">
                  <ListIcon />
                  Entries
                </ButtonLink>
              ) : null}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAdding(true);
                  setConfirmingDelete(false);
                  setError(null);
                  setNotes([]);
                }}
                disabled={busy || adding}
              >
                <PlusIcon />
                Add form
              </Button>
            </>
          ) : null
        }
        fieldsOpen={fieldsOpen}
        onToggleFields={() => setFieldsOpen((open) => !open)}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row">
        {active && !adding ? (
          <FormPreview
            form={active}
            showPage={focusPage}
            className="hidden lg:block lg:min-w-0 lg:flex-1"
          />
        ) : null}

        <div
          className={cn(
            "min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-card md:overflow-y-auto",
            fieldsOpen ? "lg:w-[440px] lg:flex-none xl:w-[520px]" : "lg:hidden"
          )}
        >
          <div className="space-y-2.5 bg-background/40 p-3">
            {/*
              What the save had to change.
              A rule that points at a question no longer above it, an option
              group whose answer has been renamed, an address that had to be
              tidied — all of these used to be corrected in silence behind a
              "Saved" badge, and the first sign of it was a question that had
              stopped appearing on the live site. Said here instead, once, until
              the next save or a different form.
            */}
            {notes.length > 0 ? (
              <div className="space-y-1.5 rounded-md border border-primary/40 bg-primary/10 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-foreground">
                  Changed on save
                </p>
                <ul className="space-y-1">
                  {notes.map((note, index) => (
                    <li key={index} className="text-xs leading-relaxed text-foreground">
                      {note}
                    </li>
                  ))}
                </ul>
                <Button variant="ghost" size="sm" onClick={() => setNotes([])}>
                  Got it
                </Button>
              </div>
            ) : null}

            {adding ? (
              <NewRecord
                kind="form"
                title="New form"
                namePlaceholder="2026 season entry"
                busy={busy}
                error={error}
                onCreate={handleCreate}
                onCancel={() => {
                  setAdding(false);
                  setError(null);
                }}
                onReleased={forgetSlug}
              />
            ) : active ? (
              confirmingDelete ? (
                <div className="space-y-2.5 rounded-md border border-destructive/40 bg-destructive/10 p-3">
                  <p className="text-xs leading-relaxed text-foreground">
                    Delete <span className="font-medium">{active.name || "this form"}</span>?{" "}
                    <span className="font-medium">
                      Every entry anyone has sent to it goes with it.
                    </span>{" "}
                    Export them first if you might want them. This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={busy}>
                      {busy ? "Deleting…" : "Delete form and entries"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmingDelete(false)}
                      disabled={busy}
                    >
                      Keep it
                    </Button>
                  </div>
                </div>
              ) : (
                <FormBuilder
                  form={active}
                  onChange={update}
                  onDelete={() => setConfirmingDelete(true)}
                  onFocusPage={setFocusPage}
                  onReleasedSlug={forgetSlug}
                  readOnly={!canManage}
                  busy={busy}
                />
              )
            ) : (
              <p className="rounded-md border border-dashed border-input px-4 py-10 text-center text-xs text-muted-fg">
                {canManage ? (
                  <>
                    No forms yet. Use <span className="text-foreground">Add form</span> above to
                    make the first one.
                  </>
                ) : (
                  "No forms have been made for your pages yet."
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
