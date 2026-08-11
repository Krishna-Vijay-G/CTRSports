"use client";

import { MAX_PARTNERS, type IncrcContent, type Partner } from "@/lib/incrcContent";
import { ButtonFields, Field, Panel, TextArea } from "@/components/admin/Fields";
import { ImageField } from "@/components/admin/ImageField";
import { Repeater } from "@/components/admin/Repeater";

type Intro = IncrcContent["intro"];

export function IntroPanel({
  value,
  onChange,
}: {
  value: Intro;
  onChange: (next: Intro) => void;
}) {
  const set = (patch: Partial<Intro>) => onChange({ ...value, ...patch });

  return (
    <>
      <Panel title="Copy">
        <div className="space-y-3">
          <Field
            label="Kicker"
            value={value.kicker}
            onChange={(kicker) => set({ kicker })}
            hint="The small line above the headline, next to the flag."
          />
          <TextArea
            label="Headline"
            value={value.headline}
            onChange={(headline) => set({ headline })}
            rows={2}
          />
          <TextArea
            label="Body"
            value={value.body}
            onChange={(body) => set({ body })}
            rows={5}
            hint="A blank line starts a new paragraph."
          />
          <ButtonFields
            hint="beside the follow button"
            label={value.ctaLabel}
            href={value.ctaHref}
            onLabel={(ctaLabel) => set({ ctaLabel })}
            onHref={(ctaHref) => set({ ctaHref })}
          />
        </div>
      </Panel>

      <Repeater<Partner>
        title="Partner marks"
        addLabel="Add partner"
        items={value.partners}
        max={MAX_PARTNERS}
        onChange={(partners) => set({ partners })}
        blank={() => ({ name: "", logo: "" })}
        empty="No partners — the panel beside the copy is not drawn."
        note="Each mark sits on a white tile, because most of them are dark-ink wordmarks that would go muddy on the page colour."
      >
        {(partner, index, patch) => (
          <>
            <Field
              label="Name"
              value={partner.name}
              onChange={(name) => patch({ name })}
              placeholder={`Partner ${index + 1}`}
            />
            <ImageField
              label="Logo"
              variant="logo"
              value={partner.logo}
              onChange={(logo) => patch({ logo })}
            />
          </>
        )}
      </Repeater>

      <Panel title="Label">
        <Field
          label="Above the marks"
          value={value.partnersLabel}
          onChange={(partnersLabel) => set({ partnersLabel })}
          placeholder="Presented by"
        />
      </Panel>
    </>
  );
}
