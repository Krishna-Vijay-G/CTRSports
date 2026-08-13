"use client";

import { useEffect, useRef, useState } from "react";
import { BLANK_FORM, STATUS_LABELS, type Form } from "@/lib/forms";
import { PAGE_LABELS } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { Button, ButtonLink } from "@/admin/ui/Button";
import { ListIcon, PlusIcon, TicketIcon } from "@/admin/ui/icons";
import { AdminRailSlot } from "@/admin/components/AdminShell";
import { EditorToolbar } from "@/admin/components/EditorToolbar";
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
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const active = forms.find((form) => form.id === activeId) ?? null;
  const activeSaved = saved.find((form) => form.id === activeId) ?? null;

  // Compared as documents: the questions are a list, so a field-by-field
  // comparison would have to walk it anyway. Position is left out — the list
  // owns it and saves it on its own.
  const dirty =
    active && activeSaved
      ? JSON.stringify({ ...active, sort_order: 0 }) !==
        JSON.stringify({ ...activeSaved, sort_order: 0 })
      : false;

  /* ─────────────────────────── Order ─────────────────────────── */

  const savedOrder = useRef(initialForms.map((form) => form.id).join(","));
  const orderTimer = useRef<number | null>(null);
  const pendingOrder = useRef<string[] | null>(null);

  useEffect(() => {
    return () => {
      if (orderTimer.current !== null) window.clearTimeout(orderTimer.current);
    };
  }, []);

  async function writeOrder(ids: string[]) {
    const key = ids.join(",");
    if (key === savedOrder.current) return;

    savedOrder.current = key;
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
      }
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
      setJustSaved(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...BLANK_FORM,
          name: "New form",
          sort_order: (forms.length + 1) * 10,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not add a form.");
        return;
      }

      const form = data.form as Form;
      setForms((current) => [...current, form]);
      setSaved((current) => [...current, form]);
      savedOrder.current = [...forms.map((f) => f.id), form.id].join(",");
      setActiveId(form.id);
      setJustSaved(false);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
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
          onSelect={setActiveId}
          onReorder={canManage ? reorder : undefined}
        />
      </AdminRailSlot>

      <EditorToolbar
        Icon={TicketIcon}
        title={active ? active.name || "Untitled form" : "Registrations"}
        hint={
          active
            ? canManage
              ? `Entries land in this admin. ${active.slug ? `/register/${active.slug}` : "Give it an address to publish it."}`
              : "Registrations owns these. You can point a button at one."
            : "No forms yet — add the first one."
        }
        dirty={canManage && dirty}
        justSaved={justSaved}
        busy={busy}
        error={error}
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
              <Button variant="outline" size="sm" onClick={handleAdd} disabled={busy}>
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
        {active ? (
          <FormPreview form={active} className="hidden lg:block lg:min-w-0 lg:flex-1" />
        ) : null}

        <div
          className={cn(
            "min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-card md:overflow-y-auto",
            fieldsOpen ? "lg:w-[440px] lg:flex-none xl:w-[520px]" : "lg:hidden"
          )}
        >
          <div className="space-y-2.5 bg-background/40 p-3">
            {active ? (
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
