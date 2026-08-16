"use client";

import type { FormSummary } from "@/lib/forms";
import { Field, Note, Panel, TextArea } from "@/admin/components/Fields";
import { FormPicker } from "@/admin/components/FormPicker";
import type { SectionPanelProps } from "@/lib/sections/types";
import type { CtaBand as Band } from "./model";


export function CtaPanel({ value, onChange, ctx }: SectionPanelProps<Band>) {
  const { forms } = ctx.records;

  function set<K extends keyof Band>(key: K, next: Band[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <Panel title="Call to action" hint="the yellow band before the footer">
      <Field label="Chip label" value={value.label} onChange={(v) => set("label", v)} />
      <Field
        label="Title"
        value={value.title}
        onChange={(v) => set("title", v)}
        className="mt-3"
      />
      <TextArea
        label="Body"
        value={value.body}
        onChange={(v) => set("body", v)}
        rows={3}
        className="mt-3"
      />
      <Field
        label="Button"
        value={value.ctaLabel}
        onChange={(v) => set("ctaLabel", v)}
        className="mt-3"
        hint="Blank hides the button."
      />

      <div className="mt-3">
        <FormPicker
          label="Goes to"
          value={value.ctaHref}
          onChange={(v) => set("ctaHref", v)}
          forms={forms}
          hint="Pick an entry form, or type an address like #sports."
        />
      </div>

      <Note className="mt-3">
        This band is the one yellow surface on the page, so keep the copy short — it is the last
        thing read before the footer.
      </Note>
    </Panel>
  );
}
