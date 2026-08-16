"use client";

import { MAX_STATS, type Stat, type Stats } from "./model";
import { Field, Row } from "@/admin/components/Fields";
import { Repeater } from "@/admin/components/Repeater";
import type { SectionPanelProps } from "@/lib/sections/types";


export function StatsPanel({ value, onChange }: SectionPanelProps<Stats>) {
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
