"use client";

import { ButtonFields, Field, Note, Panel, Row } from "@/admin/components/Fields";
import type { SectionPanelProps } from "@/lib/sections/types";
import type { Venues } from "./model";


/**
 * The venues heading and the section's own wording — not the circuits.
 *
 * The circuits are not typed here: they are rows of ctr.tracks, edited on the
 * Circuits screen, so a circuit is described once and the venues section, the
 * calendar and /circuits all read the same row. This section shows the first
 * three in that screen's order with a button to the rest — which means the three
 * on the page are chosen by dragging the circuits list, not by editing copy.
 *
 * What IS typed here is the two lines the cards print around each circuit's own
 * details, and the button under them. They were fixed in the component, so the
 * page said "View all circuits" and "Track overview" whatever the document said.
 */
export function VenuesPanel({ value, onChange }: SectionPanelProps<Venues>) {
  const set = (patch: Partial<Venues>) => onChange({ ...value, ...patch });

  return (
    <>
      <Panel title="Heading">
        <div className="space-y-3">
          <Field label="Label" value={value.label} onChange={(label) => set({ label })} />
          <Field label="Title" value={value.title} onChange={(title) => set({ title })} />

          <ButtonFields
            hint="under the cards"
            label={value.ctaLabel}
            href={value.ctaHref}
            onLabel={(ctaLabel) => set({ ctaLabel })}
            onHref={(ctaHref) => set({ ctaHref })}
          />

          <Note>
            The cards under this heading are the first three circuits on the Circuits screen —
            their names, locations, layouts and notes come from there. Reorder that list to
            change which three appear; the button normally goes to /circuits, the page with all
            of them.
          </Note>
        </div>
      </Panel>

      <Panel title="Card wording" hint="printed around each circuit's own details">
        <div className="space-y-3">
          <Row>
            <Field
              label="Above the name"
              value={value.cardLabel}
              onChange={(cardLabel) => set({ cardLabel })}
              maxLength={40}
              placeholder="Circuit"
            />
            <Field
              label="At the foot"
              value={value.cardCta}
              onChange={(cardCta) => set({ cardCta })}
              maxLength={40}
              placeholder="Track overview"
            />
          </Row>

          <Note>
            The card numbers itself — &ldquo;Circuit 01&rdquo;, &ldquo;Circuit 02&rdquo; — so type
            the word only. Either blank leaves that line off the card entirely.
          </Note>
        </div>
      </Panel>
    </>
  );
}
