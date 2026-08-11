"use client";

import { MAX_VENUES, type IncrcContent, type Venue } from "@/lib/incrcContent";
import { TRACKS, TRACK_IDS, type TrackId } from "@/lib/tracks";
import { cn } from "@/lib/utils";
import { Label } from "@/components/admin/ui/Input";
import { CheckIcon } from "@/components/admin/ui/icons";
import { Field, Panel, Row, TextArea } from "@/components/admin/Fields";
import { Repeater } from "@/components/admin/Repeater";
import { TrackMap } from "@/app/(site)/incrc/_components/TrackMap";

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
        blank={() => ({ number: "", name: "", city: "", note: "", track: "circuit" })}
        empty="No circuits — the section shows its heading and nothing else."
        note="Three across on a laptop. The outline is drawn from a fixed set of layouts; a circuit that is not drawn yet gets the generic one."
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
            <div>
              <Label>Layout</Label>
              <TrackPicker
                value={venue.track}
                onChange={(track) => patch({ track })}
                className="mt-1.5"
              />
            </div>
          </>
        )}
      </Repeater>
    </>
  );
}

/**
 * Picks a circuit outline.
 *
 * Draws the actual outline rather than naming it — the drawing is the whole
 * point of the card, and a list of circuit names would not tell you which is
 * which. Generated from src/lib/tracks.ts, so adding a layout puts it here.
 */
function TrackPicker({
  value,
  onChange,
  className,
}: {
  value: TrackId;
  onChange: (track: TrackId) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-3 gap-1.5", className)}>
      {TRACK_IDS.map((id) => {
        const selected = id === value;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={selected}
            title={TRACKS[id].hint}
            className={cn(
              "rounded-md border p-2 text-left outline-none transition",
              "focus-visible:ring-[3px] focus-visible:ring-ring/40",
              selected
                ? "border-primary bg-primary/[0.07]"
                : "border-border hover:border-input hover:bg-muted/50"
            )}
          >
            <span className="flex h-10 items-center justify-center">
              {TRACKS[id].path ? (
                <TrackMap track={id} className="max-h-10" />
              ) : (
                <span className="text-[10px] text-muted-fg">none</span>
              )}
            </span>

            <span className="mt-1.5 flex items-center gap-1">
              <span className="truncate text-[11px] font-medium text-foreground">
                {TRACKS[id].name}
              </span>
              {selected ? <CheckIcon className="size-3 shrink-0 text-primary" /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
