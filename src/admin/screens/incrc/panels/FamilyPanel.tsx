"use client";

import {
  LINK_ICONS,
  MAX_FAMILY_LINKS,
  type IncrcContent,
  type LinkChip,
} from "@/lib/incrcContent";
import { Button } from "@/admin/ui/Button";
import { CheckIcon } from "@/admin/ui/icons";
import { Label } from "@/admin/ui/Input";
import { Field, Note, Panel, Row, TextArea } from "@/admin/components/Fields";
import { IconPicker } from "@/admin/components/IconPicker";
import { ImageField } from "@/admin/components/ImageField";
import { Repeater } from "@/admin/components/Repeater";
import { LINK_GLYPHS } from "@/app/(site)/incrc/_components/icons";

type Family = IncrcContent["family"];

export function FamilyPanel({
  value,
  onChange,
}: {
  value: Family;
  onChange: (next: Family) => void;
}) {
  const set = (patch: Partial<Family>) => onChange({ ...value, ...patch });

  return (
    <>
      <Panel title="Photograph" hint="full width, behind the quote">
        <ImageField label="Photo" value={value.image} onChange={(image) => set({ image })} />
        <Note className="mt-3">
          It is darkened heavily and heaviest at the foot, because the quote crosses the middle of
          it. A busy photograph works here; a bright one does not.
        </Note>
      </Panel>

      <Panel title="Quote">
        <div className="space-y-3">
          <Field
            label="Lead-in"
            value={value.lead}
            onChange={(lead) => set({ lead })}
            hint="The smaller line above. Blank hides it."
          />
          <TextArea label="Quote" value={value.quote} onChange={(quote) => set({ quote })} rows={2} />

          <div className="flex items-center gap-2.5 rounded-md border border-border bg-background/60 p-3">
            <Button
              variant={value.showFlag ? "default" : "outline"}
              size="sm"
              onClick={() => set({ showFlag: !value.showFlag })}
              aria-pressed={value.showFlag}
            >
              {value.showFlag ? <CheckIcon /> : null}
              Tricolour divider
            </Button>
            <span className="text-[11px] leading-relaxed text-muted-fg">
              The flag between the two rules. Off leaves a plain rule.
            </span>
          </div>

        </div>
      </Panel>

      <Repeater<LinkChip>
        title="Chips"
        addLabel="Add chip"
        items={value.links}
        max={MAX_FAMILY_LINKS}
        onChange={(links) => set({ links })}
        keyOf={(chip) => chip.id}
        blank={() => ({
          id: crypto.randomUUID(),
          icon: "globe",
          label: "",
          note: "",
          href: "",
        })}
        expand="accordion"
        summary={(chip, index) => ({
          title: chip.label || `Chip ${index + 1}`,
          hint: [chip.note, chip.href].filter(Boolean).join(" · "),
        })}
        empty="No chips — the quote ends the band on its own."
        note="They sit in a row under the quote, in this order, and wrap on a phone. The six network glyphs keep their own colour; the rest take the accent."
      >
        {(chip, index, patch) => (
          <>
            <div>
              <Label>Glyph</Label>
              <IconPicker
                value={chip.icon}
                options={LINK_ICONS}
                glyphs={LINK_GLYPHS}
                onChange={(icon) => patch({ icon })}
                className="mt-1.5"
              />
            </div>

            <Row>
              <Field
                label="Text"
                value={chip.label}
                onChange={(label) => patch({ label })}
                maxLength={60}
                placeholder={`Chip ${index + 1}`}
              />
              <Field
                label="Tail"
                value={chip.note}
                onChange={(note) => patch({ note })}
                maxLength={40}
                placeholder="@incrc_"
                hint="Printed after the text in the accent. Blank hides it."
              />
            </Row>

            <Field
              label="Links to"
              value={chip.href}
              onChange={(href) => patch({ href })}
              placeholder="https://www.instagram.com/incrc_"
              hint="A full address, a path on this site, or a #section. Addresses open in a new tab."
            />
          </>
        )}
      </Repeater>
    </>
  );
}
