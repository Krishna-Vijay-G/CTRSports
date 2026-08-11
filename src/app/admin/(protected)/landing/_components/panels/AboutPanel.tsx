"use client";

import type { LandingContent } from "@/lib/landingContent";
import { ButtonFields, Field, Note, Panel, TextArea } from "@/components/admin/Fields";
import { ImageField } from "@/components/admin/ImageField";

type About = LandingContent["about"];

export function AboutPanel({ value, onChange }: { value: About; onChange: (next: About) => void }) {
  function set<K extends keyof About>(key: K, next: About[K]) {
    onChange({ ...value, [key]: next });
  }

  /** Both photos live in one array, so a change rebuilds it by index. */
  function setPhoto(index: number, patch: Partial<About["photos"][number]>) {
    set(
      "photos",
      value.photos.map((photo, i) => (i === index ? { ...photo, ...patch } : photo))
    );
  }

  return (
    <>
      <Panel title="Heading">
        <Field
          label="Chip label"
          value={value.label}
          onChange={(v) => set("label", v)}
          hint="The small outlined pill above the title."
        />
        <Field
          label="Section title"
          value={value.title}
          onChange={(v) => set("title", v)}
          className="mt-3"
        />
        <Field
          label="Heading"
          value={value.heading}
          onChange={(v) => set("heading", v)}
          className="mt-3"
          hint="Sits directly above the copy."
        />
      </Panel>

      <Panel title="Copy">
        <TextArea
          label="Body"
          value={value.body}
          onChange={(v) => set("body", v)}
          rows={8}
          hint="Leave a blank line between paragraphs — each becomes its own."
        />
        <ButtonFields
          className="mt-3"
          label={value.ctaLabel}
          href={value.ctaHref}
          onLabel={(v) => set("ctaLabel", v)}
          onHref={(v) => set("ctaHref", v)}
        />
      </Panel>

      <Panel title="Photos" hint="two, either side of the copy">
        <div className="space-y-3">
          {value.photos.map((photo, index) => (
            <div key={index} className="rounded-md border border-border bg-background/60 p-3">
              <ImageField
                label={`Photo ${index + 1}`}
                value={photo.src}
                onChange={(src) => setPhoto(index, { src })}
              />
              <Field
                label="Caption chip"
                value={photo.label}
                onChange={(label) => setPhoto(index, { label })}
                className="mt-3"
                hint="Blank hides the chip."
              />
            </div>
          ))}
        </div>

        <Note className="mt-3">
          Exactly two, because the layout has exactly two slots. Portrait crops read best here.
        </Note>
      </Panel>
    </>
  );
}
