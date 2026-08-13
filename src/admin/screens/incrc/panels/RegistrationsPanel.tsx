"use client";

import { STATUS_LABELS, type FormSummary } from "@/lib/forms";
import type { IncrcContent } from "@/lib/incrcContent";
import { Button } from "@/admin/ui/Button";
import { CheckIcon } from "@/admin/ui/icons";
import { Field, Note, Panel, TextArea } from "@/admin/components/Fields";

type Registrations = IncrcContent["registrations"];

/**
 * The heading over the entry forms — and only the heading.
 *
 * Which forms appear is not editable here, on purpose. The section shows every
 * published form assigned to this page, so somebody who owns entry forms can
 * publish one and have it appear without asking whoever owns this page to add a
 * line. A hand-picked list here would put that hand-off straight back.
 *
 * What this screen does instead is SHOW what will appear, so the copy above the
 * cards can be written knowing what is under it.
 */
export function RegistrationsPanel({
  value,
  onChange,
  forms,
}: {
  value: Registrations;
  onChange: (next: Registrations) => void;
  /** The forms assigned to this page. Read-only here. */
  forms: FormSummary[];
}) {
  const set = (patch: Partial<Registrations>) => onChange({ ...value, ...patch });
  const shown = value.showClosed ? forms : forms.filter((form) => form.status === "open");

  return (
    <>
      <Panel title="Copy">
        <div className="space-y-3">
          <Field label="Label" value={value.label} onChange={(label) => set({ label })} />
          <Field label="Title" value={value.title} onChange={(title) => set({ title })} />
          <TextArea
            label="Body"
            value={value.body}
            onChange={(body) => set({ body })}
            rows={2}
            hint="The line under the heading. Blank hides it."
          />

          <div className="flex items-center gap-2.5 rounded-md border border-border bg-background/60 p-3">
            <Button
              variant={value.showClosed ? "default" : "outline"}
              size="sm"
              onClick={() => set({ showClosed: !value.showClosed })}
              aria-pressed={value.showClosed}
            >
              {value.showClosed ? <CheckIcon /> : null}
              Show closed forms
            </Button>
            <span className="text-[11px] leading-relaxed text-muted-fg">
              Off hides them entirely. On, they stay as a grey card that says entries have closed —
              which is the answer somebody looking for that category actually wants.
            </span>
          </div>
        </div>
      </Panel>

      <Panel title="What will appear" hint={`${shown.length} on the page`}>
        {forms.length === 0 ? (
          <p className="rounded-md border border-dashed border-input px-4 py-8 text-center text-xs text-muted-fg">
            No forms for this page yet, so the whole section stays off the page.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {forms.map((form) => {
              const hidden = !value.showClosed && form.status !== "open";

              return (
                <li
                  key={form.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-background/60 px-3 py-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-foreground">
                      {form.name}
                    </span>
                    <span className="block truncate text-[11px] text-muted-fg">
                      /register/{form.slug} · {STATUS_LABELS[form.status]}
                      {hidden ? " · hidden by the switch above" : ""}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <Note className="mt-3">
          This list is every published form assigned to this page. It is edited on the
          Registrations screen — including the order these cards appear in — not here. Drafts are
          never on the page at all.
        </Note>
      </Panel>
    </>
  );
}
