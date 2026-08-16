"use client";

import type { SectionPanelProps } from "@/lib/sections/types";
import { MAX_PARTNERS, type Intro, type Partner } from "./model";
import { ButtonFields, Field, Note, Panel, Row, TextArea } from "@/admin/components/Fields";
import { ImageField } from "@/admin/components/ImageField";
import { Repeater } from "@/admin/components/Repeater";

/**
 * The introduction: what this is, and the marks beside it.
 *
 * The championship's own name and the follow button used to be edited here —
 * they had no tab of their own, and this was the section that used them. They
 * are the `meta` section now, which has its own panel and its own row.
 */
export function IntroPanel({ value, onChange }: SectionPanelProps<Intro>) {
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

      {/*
        One line per mark, opening in place.
        Six marks, each with a name, an image field and an address, is a very
        tall panel to scroll past to reach the label below it — and the always-
        open shape is also the one that puts move-up/move-down buttons on every
        row, which is three buttons per row for something the drag handle beside
        them already does. The mark itself is in the strip, so the list is still
        readable at a glance without opening anything.
      */}
      <Repeater<Partner>
        title="Partner marks"
        addLabel="Add partner"
        items={value.partners}
        max={MAX_PARTNERS}
        onChange={(partners) => set({ partners })}
        blank={() => ({ name: "", logo: "", href: "" })}
        expand="accordion"
        summary={(partner, index) => ({
          title: partner.name || `Partner ${index + 1}`,
          hint: partner.href || "Not linked",
          image: partner.logo || undefined,
        })}
        // A wordmark cropped to fill the thumbnail is a letter and a half.
        imageFit="contain"
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
              hint="Read out in place of the mark by anyone who cannot see it."
            />
            <ImageField
              label="Logo"
              variant="logo"
              value={partner.logo}
              onChange={(logo) => patch({ logo })}
            />
            <Field
              label="Links to"
              value={partner.href}
              onChange={(href) => patch({ href })}
              placeholder="https://www.jktyre.com"
              hint="Blank leaves the mark as a picture. A full address, a path on this site, or a #section — addresses open in a new tab."
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
