"use client";

import { MAX_PARTNERS, type IncrcContent, type Partner } from "@/lib/incrcContent";
import { ButtonFields, Field, Note, Panel, Row, TextArea } from "@/components/admin/Fields";
import { ImageField } from "@/components/admin/ImageField";
import { Repeater } from "@/components/admin/Repeater";

type Intro = IncrcContent["intro"];
type Meta = IncrcContent["meta"];

/**
 * The introduction — and, with it, the championship's own details.
 *
 * The name and the Instagram handle are not a section of the page, so they have
 * no tab of their own. They live here because this is the section that says who
 * the championship is: the name it is introduced by, and the follow button
 * sitting in this very block. The quote banner further down uses the same
 * handle, and the browser tab and search result use the same name.
 */
export function IntroPanel({
  value,
  onChange,
  meta,
  onMetaChange,
}: {
  value: Intro;
  onChange: (next: Intro) => void;
  meta: Meta;
  onMetaChange: (next: Meta) => void;
}) {
  const set = (patch: Partial<Intro>) => onChange({ ...value, ...patch });
  const setMeta = (patch: Partial<Meta>) => onMetaChange({ ...meta, ...patch });

  return (
    <>
      <Panel title="Championship" hint="the name the page is known by">
        <div className="space-y-3">
          <Field label="Full name" value={meta.name} onChange={(name) => setMeta({ name })} />
          <Row>
            <Field
              label="Short name"
              value={meta.short}
              onChange={(short) => setMeta({ short })}
              hint="INCRC"
            />
            <Field
              label="Tagline"
              value={meta.tagline}
              onChange={(tagline) => setMeta({ tagline })}
            />
          </Row>
          <Note>
            These do not appear in the introduction itself — they are the browser tab, the search
            result and the structured data, and the short name labels each round.
          </Note>
        </div>
      </Panel>

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

      <Panel title="Instagram" hint="the follow button, in two places">
        <Row>
          <Field label="Handle" value={meta.handle} onChange={(handle) => setMeta({ handle })} />
          <Field
            label="Address"
            value={meta.instagram}
            onChange={(instagram) => setMeta({ instagram })}
          />
        </Row>
        <Note className="mt-3">
          The button beside the copy above, and the one over the quote banner further down the
          page. Both read from here, so they can never disagree.
        </Note>
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
