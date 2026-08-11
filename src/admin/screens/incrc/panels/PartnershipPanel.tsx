"use client";

import { MAX_SHOTS, type IncrcContent, type Shot } from "@/lib/incrcContent";
import { Field, Panel, TextArea } from "@/admin/components/Fields";
import { ImageField } from "@/admin/components/ImageField";
import { Repeater } from "@/admin/components/Repeater";

type Partnership = IncrcContent["partnership"];

export function PartnershipPanel({
  value,
  onChange,
}: {
  value: Partnership;
  onChange: (next: Partnership) => void;
}) {
  const set = (patch: Partial<Partnership>) => onChange({ ...value, ...patch });

  return (
    <>
      <Panel title="Copy">
        <div className="space-y-3">
          <Field label="Label" value={value.label} onChange={(label) => set({ label })} />
          <Field label="Title" value={value.title} onChange={(title) => set({ title })} />
          <TextArea label="Body" value={value.body} onChange={(body) => set({ body })} rows={3} />
        </div>
      </Panel>

      <Repeater<Shot>
        title="Photographs"
        addLabel="Add photograph"
        items={value.shots}
        max={MAX_SHOTS}
        onChange={(shots) => set({ shots })}
        blank={() => ({ image: "", alt: "" })}
        summary={(shot, index) => ({
          title: shot.alt || `Photograph ${index + 1}`,
          hint: index === 0 ? "The large one" : "Stacked beside it",
          image: shot.image,
        })}
        empty="No photographs — the section shows its copy only."
        note="The first one is drawn large beside the rest, so put the establishing shot first."
      >
        {(shot, index, patch) => (
          <>
            <ImageField
              label="Photo"
              value={shot.image}
              onChange={(image) => patch({ image })}
            />
            <Field
              label="Alt text"
              value={shot.alt}
              onChange={(alt) => patch({ alt })}
              placeholder={`Photograph ${index + 1}`}
              hint="What it shows, for someone who cannot see it."
            />
          </>
        )}
      </Repeater>
    </>
  );
}
