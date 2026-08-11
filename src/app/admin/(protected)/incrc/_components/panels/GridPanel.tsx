"use client";

import type { IncrcContent } from "@/lib/incrcContent";
import { Field, Panel, TextArea } from "@/components/admin/Fields";
import { ImageField } from "@/components/admin/ImageField";

type Grid = IncrcContent["grid"];

export function GridPanel({ value, onChange }: { value: Grid; onChange: (next: Grid) => void }) {
  const set = (patch: Partial<Grid>) => onChange({ ...value, ...patch });

  return (
    <>
      <Panel title="Copy">
        <div className="space-y-3">
          <Field label="Label" value={value.label} onChange={(label) => set({ label })} />
          <TextArea
            label="Heading"
            value={value.heading}
            onChange={(heading) => set({ heading })}
            rows={2}
          />
          <TextArea label="Body" value={value.body} onChange={(body) => set({ body })} rows={4} />
        </div>
      </Panel>

      <Panel title="Main image" hint="the big one, on the left">
        <div className="space-y-3">
          <ImageField label="Photo" value={value.image} onChange={(image) => set({ image })} />
          <Field
            label="Alt text"
            value={value.imageAlt}
            onChange={(imageAlt) => set({ imageAlt })}
            hint="What it shows, for someone who cannot see it."
          />
        </div>
      </Panel>

      <Panel title="Inset" hint="the framed one under the copy">
        <div className="space-y-3">
          <ImageField label="Photo" value={value.inset} onChange={(inset) => set({ inset })} />
          <Field
            label="Alt text"
            value={value.insetAlt}
            onChange={(insetAlt) => set({ insetAlt })}
          />
          <Field
            label="Caption"
            value={value.caption}
            onChange={(caption) => set({ caption })}
            hint="The small yellow line under it. Blank hides it."
          />
        </div>
      </Panel>
    </>
  );
}
