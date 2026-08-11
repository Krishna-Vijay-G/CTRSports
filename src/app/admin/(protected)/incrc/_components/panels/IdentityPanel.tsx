"use client";

import type { IncrcContent } from "@/lib/incrcContent";
import { Field, Note, Panel, Row } from "@/components/admin/Fields";

type Meta = IncrcContent["meta"];

/**
 * The championship's own details.
 *
 * Not a section of the page — these are used by several of them at once, and by
 * the browser tab, the search result and the structured data. Editing the name
 * here changes it everywhere it appears.
 */
export function IdentityPanel({
  value,
  onChange,
}: {
  value: Meta;
  onChange: (next: Meta) => void;
}) {
  const set = (patch: Partial<Meta>) => onChange({ ...value, ...patch });

  return (
    <>
      <Panel title="Name" hint="used by the page title and the search result">
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
        </div>
      </Panel>

      <Panel title="Instagram" hint="the follow button, in two places">
        <Row>
          <Field label="Handle" value={value.handle} onChange={(handle) => set({ handle })} />
          <Field
            label="Address"
            value={value.instagram}
            onChange={(instagram) => set({ instagram })}
          />
        </Row>
      </Panel>

      <Panel title="Entries">
        <Field
          label="Where entries go"
          value={value.registerHref}
          onChange={(registerHref) => set({ registerHref })}
          hint="Opens in a new tab when it leaves this site."
        />
        <Note className="mt-3">
          This site has no entry form of its own — the form, its validation and its API live on the
          older CTR site, so this points there. The banner and the yellow band each carry their own
          link, which is what lets one of them point somewhere else during a season.
        </Note>
      </Panel>
    </>
  );
}
