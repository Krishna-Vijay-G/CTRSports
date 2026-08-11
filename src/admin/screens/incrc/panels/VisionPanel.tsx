"use client";

import {
  MAX_VISION,
  VISION_ICONS,
  type IncrcContent,
  type VisionIcon,
  type VisionItem,
} from "@/lib/incrcContent";
import { cn } from "@/lib/utils";
import { Label } from "@/admin/ui/Input";
import { Field, Panel, TextArea } from "@/admin/components/Fields";
import { Repeater } from "@/admin/components/Repeater";
import { VISION_GLYPHS } from "@/app/(site)/incrc/_components/icons";

type Vision = IncrcContent["vision"];

export function VisionPanel({
  value,
  onChange,
}: {
  value: Vision;
  onChange: (next: Vision) => void;
}) {
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

/**
 * The glyph on the card.
 *
 * Generated from the same list the page draws from, so a card can never be given
 * one that is not drawn — and adding a glyph to VISION_GLYPHS puts it here on
 * its own.
 */
function IconPicker({
  value,
  onChange,
  className,
}: {
  value: VisionIcon;
  onChange: (icon: VisionIcon) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {VISION_ICONS.map((icon) => {
        const Glyph = VISION_GLYPHS[icon];
        const selected = icon === value;

        return (
          <button
            key={icon}
            type="button"
            onClick={() => onChange(icon)}
            aria-pressed={selected}
            title={icon}
            className={cn(
              "flex size-10 items-center justify-center rounded-md border outline-none transition",
              "focus-visible:ring-[3px] focus-visible:ring-ring/40",
              selected
                ? "border-primary bg-primary/[0.09] text-primary"
                : "border-border text-muted-fg hover:border-input hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <Glyph />
          </button>
        );
      })}
    </div>
  );
}
