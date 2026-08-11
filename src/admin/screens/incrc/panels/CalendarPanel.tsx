"use client";

import { MAX_ROUNDS, type IncrcContent, type Round } from "@/lib/incrcContent";
import { Field, Panel, Row } from "@/admin/components/Fields";
import { Repeater } from "@/admin/components/Repeater";

type Calendar = IncrcContent["calendar"];

export function CalendarPanel({
  value,
  onChange,
}: {
  value: Calendar;
  onChange: (next: Calendar) => void;
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
        blank={() => ({ round: "", dates: "", venue: "", city: "", status: "" })}
        summary={(round, index) => ({
          title: `Round ${round.round || index + 1} · ${round.venue || "no venue"}`,
          hint: [round.dates, round.city].filter(Boolean).join(" · "),
        })}
        empty="No rounds — the section shows its heading and nothing else."
        note="They run in the order they are listed here, and that order is also what search engines are told about the season."
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
            <Field label="Dates" value={round.dates} onChange={(dates) => patch({ dates })} />
            <Row>
              <Field label="Venue" value={round.venue} onChange={(venue) => patch({ venue })} />
              <Field label="City" value={round.city} onChange={(city) => patch({ city })} />
            </Row>
          </>
        )}
      </Repeater>
    </>
  );
}
