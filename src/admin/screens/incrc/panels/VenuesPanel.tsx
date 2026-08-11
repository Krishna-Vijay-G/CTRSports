"use client";

import { MAX_VENUES, type IncrcContent, type Venue } from "@/lib/incrcContent";
import { Field, Panel, Row, TextArea } from "@/admin/components/Fields";
import { ImageField } from "@/admin/components/ImageField";
import { Repeater } from "@/admin/components/Repeater";

type Venues = IncrcContent["venues"];

export function VenuesPanel({
  value,
  onChange,
}: {
  value: Venues;
  onChange: (next: Venues) => void;
}) {
  const set = (patch: Partial<Venues>) => onChange({ ...value, ...patch });

  return (
    <>
      <Panel title="Heading">
        <div className="space-y-3">
          <Field label="Label" value={value.label} onChange={(label) => set({ label })} />
          <Field label="Title" value={value.title} onChange={(title) => set({ title })} />
        </div>
      </Panel>

      <Repeater<Venue>
        title="Circuits"
        addLabel="Add circuit"
        items={value.items}
        max={MAX_VENUES}
        onChange={(items) => set({ items })}
        blank={() => ({ number: "", name: "", city: "", note: "", map: "" })}
        empty="No circuits — the section shows its heading and nothing else."
        note="Three across on a laptop. The layout is a picture you upload — the circuit's own map, a screenshot of it, anything that reads small. It fills the head of the card, on white, cropped to fit."
      >
        {(venue, index, patch) => (
          <>
            <Row>
              <Field
                label="Number"
                value={venue.number}
                onChange={(number) => patch({ number })}
                maxLength={8}
                placeholder={String(index + 1).padStart(2, "0")}
              />
              <Field label="City" value={venue.city} onChange={(city) => patch({ city })} />
            </Row>
            <Field label="Name" value={venue.name} onChange={(name) => patch({ name })} />
            <TextArea
              label="Note"
              value={venue.note}
              onChange={(note) => patch({ note })}
              rows={2}
              hint="One line on what the circuit is like. Blank hides it."
            />
            <ImageField
              label="Layout"
              variant="logo"
              value={venue.map}
              onChange={(map) => patch({ map })}
              hint="Fills the head of the card and is cropped to do it, so a very wide map loses its ends. Blank leaves the card with no drawing at all."
            />
          </>
        )}
      </Repeater>
    </>
  );
}
