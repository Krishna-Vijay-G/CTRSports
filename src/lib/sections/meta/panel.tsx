"use client";

import { Field, Note, Panel, Row } from "@/admin/components/Fields";
import type { SectionPanelProps } from "@/lib/sections/types";
import type { Meta } from "./model";

/**
 * What the page is called.
 *
 * These used to be edited under the introduction, because that was the section
 * that used them and there was nowhere else to put them. They are a section of
 * their own now, which is the honest shape for three strings the browser tab,
 * the search result and the structured data all read and no band prints.
 *
 * The follow chip was here too, and went back to the introduction in 0019 — it
 * was the one thing on this section that was DRAWN, drawn by a band a page might
 * not have. On a page with an `about` instead of an `intro` it did nothing
 * whatever was typed into it, which is not a state a field should be able to be
 * in.
 */
export function MetaPanel({ value, onChange }: SectionPanelProps<Meta>) {
  const set = (patch: Partial<Meta>) => onChange({ ...value, ...patch });

  return (
    <>
      <Panel title="Name" hint="what this page is known by">
        <div className="space-y-3">
          <Field label="Full name" value={value.name} onChange={(name) => set({ name })} />
          <Row>
            <Field
              label="Short name"
              value={value.short}
              onChange={(short) => set({ short })}
              hint="INCRC"
            />
            <Field
              label="Tagline"
              value={value.tagline}
              onChange={(tagline) => set({ tagline })}
            />
          </Row>
          <Note>
            None of these appear as a heading on the page — they are the browser tab, the search
            result and the structured data, and the short name labels each round of the calendar.
          </Note>
        </div>
      </Panel>

    </>
  );
}
