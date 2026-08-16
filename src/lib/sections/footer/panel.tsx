"use client";

import { Note, Panel, TextArea } from "@/admin/components/Fields";
import type { SectionPanelProps } from "@/lib/sections/types";
import type { Footer } from "./model";

/** The line under the brand at the foot of every page. */
export function FooterPanel({ value, onChange }: SectionPanelProps<Footer>) {
  return (
    <Panel title="About line">
      <TextArea
        label="Under the logo"
        value={value.blurb}
        onChange={(blurb) => onChange({ blurb })}
        rows={3}
        hint="One or two sentences saying what this organisation is. Blank hides it."
      />

      <Note className="mt-3">
        For the reader who arrived on a deck or an entry form and has never seen the home page —
        the footer is often the only thing on that page that says who you are.
      </Note>
    </Panel>
  );
}
