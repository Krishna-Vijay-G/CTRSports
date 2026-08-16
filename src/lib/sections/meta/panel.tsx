"use client";

import { Field, Note, Panel, Row } from "@/admin/components/Fields";
import type { SectionPanelProps } from "@/lib/sections/types";
import type { Meta } from "./model";

/**
 * What the page is called, and the account it points at.
 *
 * These used to be edited under the introduction, because the introduction was
 * the section that used them and there was nowhere else to put them. There is
 * now: they are a section of their own that renders nothing, which is the
 * honest shape — the browser tab, the search result and the follow button all
 * read the same six fields, and the introduction is only one of them.
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

      <Panel title="Follow button" hint="the chip in the introduction">
        <div className="space-y-3">
          <Field
            label="Label"
            value={value.followLabel}
            onChange={(followLabel) => set({ followLabel })}
            maxLength={60}
            placeholder="Follow the championship"
            hint="Blank leaves the chip off the introduction."
          />
          <Row>
            <Field label="Handle" value={value.handle} onChange={(handle) => set({ handle })} />
            <Field
              label="Address"
              value={value.instagram}
              onChange={(instagram) => set({ instagram })}
            />
          </Row>
        </div>
        <Note className="mt-3">
          The handle prints in the accent after the label. No address is no chip — a button that
          goes nowhere is worse than none. The chips over a quote band are their own list, on that
          section.
        </Note>
      </Panel>
    </>
  );
}
