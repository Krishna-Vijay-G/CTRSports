"use client";

import { MAX_VISION, VISION_ICONS, type VisionItem, type Vision } from "./model";
import { Label } from "@/admin/ui/Input";
import { Field, Panel, TextArea } from "@/admin/components/Fields";
import { IconPicker } from "@/admin/components/IconPicker";
import { Repeater } from "@/admin/components/Repeater";
import { VISION_GLYPHS } from "@/lib/sections/shared/icons";
import type { SectionPanelProps } from "@/lib/sections/types";


export function VisionPanel({ value, onChange }: SectionPanelProps<Vision>) {
  const set = (patch: Partial<Vision>) => onChange({ ...value, ...patch });

  return (
    <>
      <Panel title="Heading">
        <div className="space-y-3">
          <Field label="Label" value={value.label} onChange={(label) => set({ label })} />
          <Field label="Title" value={value.title} onChange={(title) => set({ title })} />
        </div>
      </Panel>

      <Repeater<VisionItem>
        title="Cards"
        addLabel="Add card"
        items={value.items}
        max={MAX_VISION}
        onChange={(items) => set({ items })}
        blank={() => ({ icon: "star", label: "", description: "" })}
        empty="No cards — the column beside the heading is empty."
        note="They run two abreast beside the heading, so an even number fills the block."
      >
        {(item, index, patch) => (
          <>
            <div>
              <Label>Glyph</Label>
              <IconPicker
                value={item.icon}
                options={VISION_ICONS}
                glyphs={VISION_GLYPHS}
                onChange={(icon) => patch({ icon })}
                className="mt-1.5"
              />
            </div>
            <Field
              label="Title"
              value={item.label}
              onChange={(label) => patch({ label })}
              placeholder={`Card ${index + 1}`}
            />
            <TextArea
              label="Description"
              value={item.description}
              onChange={(description) => patch({ description })}
              rows={3}
            />
          </>
        )}
      </Repeater>
    </>
  );
}
