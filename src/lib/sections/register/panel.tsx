"use client";

import type { FormSummary } from "@/lib/forms";
import { Field, Note, Panel, TextArea } from "@/admin/components/Fields";
import { FormPicker } from "@/admin/components/FormPicker";
import type { SectionPanelProps } from "@/lib/sections/types";
import type { Register } from "./model";


export function RegisterPanel({ value, onChange, ctx }: SectionPanelProps<Register>) {
  const { forms } = ctx.records;

  const set = (patch: Partial<Register>) => onChange({ ...value, ...patch });

  return (
    <>
      <Panel title="Copy">
        <div className="space-y-3">
          <Field
            label="Kicker"
            value={value.kicker}
            onChange={(kicker) => set({ kicker })}
            hint="The outlined chip at the top. Blank hides it."
          />
          <Field label="Title" value={value.title} onChange={(title) => set({ title })} />
          <TextArea label="Body" value={value.body} onChange={(body) => set({ body })} rows={3} />
          <Field
            label="Button"
            value={value.ctaLabel}
            onChange={(ctaLabel) => set({ ctaLabel })}
            hint="Blank hides the button."
          />

          <FormPicker
            label="Goes to"
            value={value.ctaHref}
            onChange={(ctaHref) => set({ ctaHref })}
            forms={forms}
            hint="Pick the entry form this band is for, or type an address — #registrations sends them to the list of every form on this page."
          />
        </div>
      </Panel>

      <Panel title="About this band">
        <Note>
          The one yellow block on the page, and deliberately the last thing on it. Entry forms are
          on this site now, so this normally points at one of them — or at the section listing all
          of them. A link starting <code>http</code> still opens in a new tab, so somebody sent
          somewhere else does not lose the page they were reading.
        </Note>
      </Panel>
    </>
  );
}
