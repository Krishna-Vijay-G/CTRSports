"use client";

import type { LandingContent } from "@/lib/landingContent";
import { ButtonFields, Field, Note, Panel, TextArea } from "@/components/admin/Fields";

type Band = LandingContent["ctaBand"];

export function CtaPanel({ value, onChange }: { value: Band; onChange: (next: Band) => void }) {
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
      <ButtonFields
        className="mt-3"
        label={value.ctaLabel}
        href={value.ctaHref}
        onLabel={(v) => set("ctaLabel", v)}
        onHref={(v) => set("ctaHref", v)}
      />

      <Note className="mt-3">
        This band is the one yellow surface on the page, so keep the copy short — it is the last
        thing read before the footer.
      </Note>
    </Panel>
  );
}
