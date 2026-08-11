"use client";

import { MAX_STATS, type IncrcContent, type Stat } from "@/lib/incrcContent";
import { Field, Row } from "@/components/admin/Fields";
import { Repeater } from "@/components/admin/Repeater";

type Stats = IncrcContent["stats"];

export function StatsPanel({ value, onChange }: { value: Stats; onChange: (next: Stats) => void }) {
  return (
    <Repeater<Stat>
      title="Numbers"
      addLabel="Add number"
      items={value.items}
      max={MAX_STATS}
      onChange={(items) => onChange({ ...value, items })}
      blank={() => ({ value: "", label: "" })}
      empty="No numbers — the band is not drawn."
      note="Four is the number the row is built for: it splits two-and-two on a phone and four across on a laptop. Two, three or six also line up; five leaves a gap."
    >
      {(stat, index, patch) => (
        <Row>
          <Field
            label="Figure"
            value={stat.value}
            onChange={(next) => patch({ value: next })}
            maxLength={12}
            placeholder="7"
          />
          <Field
            label="Label"
            value={stat.label}
            onChange={(label) => patch({ label })}
            placeholder={`Label ${index + 1}`}
          />
        </Row>
      )}
    </Repeater>
  );
}
