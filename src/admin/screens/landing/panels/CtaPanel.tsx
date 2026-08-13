"use client";

import type { FormSummary } from "@/lib/forms";
import type { LandingContent } from "@/lib/landingContent";
import { Field, Note, Panel, TextArea } from "@/admin/components/Fields";
import { FormPicker } from "@/admin/components/FormPicker";

type Band = LandingContent["ctaBand"];

export function CtaPanel({
  value,
  onChange,
  forms,
}: {
  value: Band;
  onChange: (next: Band) => void;
  /** The entry forms this page may point at. Built on the Registrations screen. */
  forms: FormSummary[];
}) {
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
          page="landing"
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
