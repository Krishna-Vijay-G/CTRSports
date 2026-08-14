"use client";

import type { IncrcContent } from "@/lib/incrcContent";
import { Field, Note, Panel } from "@/admin/components/Fields";

type Venues = IncrcContent["venues"];

/**
 * The venues heading, and nothing else.
 *
 * The circuits are not typed here any more: they are rows of ctr.tracks, edited
 * on the Circuits screen, so a circuit is described once and the venues section,
 * the calendar and /circuits all read the same row. This section shows the first
 * three in that screen's order with a button to the rest — which means the three
 * on the page are chosen by dragging the circuits list, not by editing copy.
 */
export function VenuesPanel({
  value,
  onChange,
}: {
  value: Venues;
  onChange: (next: Venues) => void;
}) {
  const set = (patch: Partial<Venues>) => onChange({ ...value, ...patch });

  return (
    <Panel title="Heading">
      <div className="space-y-3">
        <Field label="Label" value={value.label} onChange={(label) => set({ label })} />
        <Field label="Title" value={value.title} onChange={(title) => set({ title })} />

        <Note>
          The cards under this heading are the first three circuits on the Circuits screen —
          their names, locations, layouts and notes come from there. Reorder that list to
          change which three appear; the button under them goes to the page with all of them.
        </Note>
      </div>
    </Panel>
  );
}
