"use client";

import type { IncrcContent } from "@/lib/incrcContent";
import { ButtonFields, Field, Note, Panel, TextArea } from "@/admin/components/Fields";

type Register = IncrcContent["register"];

export function RegisterPanel({
  value,
  onChange,
}: {
  value: Register;
  onChange: (next: Register) => void;
}) {
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
          <ButtonFields
            hint="the one thing this page asks for"
            label={value.ctaLabel}
            href={value.ctaHref}
            onLabel={(ctaLabel) => set({ ctaLabel })}
            onHref={(ctaHref) => set({ ctaHref })}
          />
        </div>
      </Panel>

      <Panel title="About this band">
        <Note>
          The one yellow block on the page, and deliberately the last thing on it. A link starting
          <code> http</code> opens in a new tab, so someone filling in an entry form does not lose
          the page they were reading.
        </Note>
      </Panel>
    </>
  );
}
