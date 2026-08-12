"use client";

import { MAX_ROUNDS, type IncrcContent, type Round } from "@/lib/incrcContent";
import { roundDateLabel } from "@/lib/raceDates";
import type { Track } from "@/lib/tracks";
import { Input, Label, Select } from "@/admin/ui/Input";
import { Field, Hint, Note, Panel, Row } from "@/admin/components/Fields";
import { Repeater } from "@/admin/components/Repeater";

type Calendar = IncrcContent["calendar"];

/**
 * The season.
 *
 * A round says when it runs with two real dates, not a sentence. That is what
 * lets the page count down to it and decide which weekend is next — neither of
 * which can be done with "11–13 September". The sentence is still available as
 * an override for a weekend the dates cannot express.
 *
 * The circuit is picked from ctr_tracks rather than typed, so the map, the
 * length and the corner count come with it. Circuits themselves are edited on a
 * screen of their own.
 */
export function CalendarPanel({
  value,
  onChange,
  tracks,
}: {
  value: Calendar;
  onChange: (next: Calendar) => void;
  tracks: Track[];
}) {
  const set = (patch: Partial<Calendar>) => onChange({ ...value, ...patch });

  return (
    <>
      <Panel title="Heading">
        <div className="space-y-3">
          <Field label="Label" value={value.label} onChange={(label) => set({ label })} />
          <Field label="Title" value={value.title} onChange={(title) => set({ title })} />
        </div>
      </Panel>

      <Repeater<Round>
        title="Rounds"
        addLabel="Add round"
        items={value.rounds}
        max={MAX_ROUNDS}
        onChange={(rounds) => set({ rounds })}
        blank={() => ({
          round: "",
          start: "",
          end: "",
          dates: "",
          trackId: "",
          venue: "",
          city: "",
          status: "",
        })}
        summary={(round, index) => {
          const track = tracks.find((entry) => entry.id === round.trackId);
          return {
            title: `Round ${round.round || index + 1} · ${track?.name || round.venue || "no circuit"}`,
            hint: [roundDateLabel(round), track?.location || round.city]
              .filter(Boolean)
              .join(" · "),
          };
        }}
        empty="No rounds — the section shows its heading and nothing else."
        note="The next round is whichever weekend has not finished yet, and the page gives it the big card. Everything else follows in the order listed here."
      >
        {(round, index, patch) => (
          <>
            <Row>
              <Field
                label="Round"
                value={round.round}
                onChange={(next) => patch({ round: next })}
                maxLength={8}
                placeholder={String(index + 1).padStart(2, "0")}
              />
              <Field
                label="Status"
                value={round.status}
                onChange={(status) => patch({ status })}
                maxLength={40}
                hint="Blank hides the chip."
              />
            </Row>

            <Row>
              <label className="block">
                <Label>First day</Label>
                <Input
                  type="date"
                  value={round.start}
                  onChange={(event) => patch({ start: event.target.value })}
                  className="mt-1.5"
                />
              </label>
              <label className="block">
                <Label>Last day</Label>
                <Input
                  type="date"
                  value={round.end}
                  onChange={(event) => patch({ end: event.target.value })}
                  className="mt-1.5"
                />
              </label>
            </Row>

            <Note>
              The countdown counts to the first day. Leave the last day blank for a
              single-day round. A round with no first day has no countdown, which is the
              honest way to show a date nobody has fixed.
            </Note>

            <div className="block">
              <Label>Circuit</Label>
              <Select
                value={round.trackId}
                onChange={(event) => patch({ trackId: event.target.value })}
                className="mt-1.5 w-full"
              >
                <option value="">— none, use the text below —</option>
                {tracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.name}
                    {track.location ? ` · ${track.location}` : ""}
                  </option>
                ))}
              </Select>
              <Hint className="mt-1">
                {tracks.length === 0
                  ? "No circuits in the database yet — run npm run migrate to seed them."
                  : "Brings the map, the length and the corner count with it. Circuits are edited on their own screen."}
              </Hint>
            </div>

            {round.trackId ? null : (
              <Row>
                <Field label="Venue" value={round.venue} onChange={(venue) => patch({ venue })} />
                <Field label="City" value={round.city} onChange={(city) => patch({ city })} />
              </Row>
            )}

            <Field
              label="Date line"
              value={round.dates}
              onChange={(dates) => patch({ dates })}
              placeholder={roundDateLabel({ ...round, dates: "" }) || "11–13 September 2026"}
              hint="Overrides the printed dates. Blank writes them from the two dates above."
            />
          </>
        )}
      </Repeater>
    </>
  );
}
