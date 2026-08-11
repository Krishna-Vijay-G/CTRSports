"use client";

import { MAX_ROWS, type IncrcContent, type RowItem } from "@/lib/incrcContent";
import { Field, Panel, Row, TextArea } from "@/admin/components/Fields";
import { Repeater } from "@/admin/components/Repeater";

type Rows = IncrcContent["rows"];

/**
 * The bulletin: a stack of one-line announcements, each a link.
 *
 * Collapsed rather than all open — a dozen of these open at once would be a very
 * long form, and the collapsed line already shows the tag and the headline.
 */
export function RowsPanel({ value, onChange }: { value: Rows; onChange: (next: Rows) => void }) {
  const set = (patch: Partial<Rows>) => onChange({ ...value, ...patch });

  return (
    <>
      <Panel title="Heading">
        <div className="space-y-3">
          <Field label="Label" value={value.label} onChange={(label) => set({ label })} />
          <Field label="Title" value={value.title} onChange={(title) => set({ title })} />
        </div>
      </Panel>

      <Repeater<RowItem>
        title="Rows"
        addLabel="Add row"
        items={value.items}
        max={MAX_ROWS}
        onChange={(items) => set({ items })}
        blank={() => ({ id: crypto.randomUUID(), label: "", title: "", meta: "", href: "#" })}
        keyOf={(item) => item.id}
        summary={(item, index) => ({
          title: item.title || `Row ${index + 1}`,
          hint: [item.label, item.meta].filter(Boolean).join(" · "),
        })}
        empty="No rows — the whole section is left off the page."
        note="The whole row is the link, so there is no button to write. A row with no title still renders, but there is nothing to read on it."
      >
        {(item, index, patch) => (
          <>
            <Row>
              <Field
                label="Tag"
                value={item.label}
                onChange={(label) => patch({ label })}
                maxLength={40}
                hint="The yellow word on the left."
              />
              <Field
                label="Meta"
                value={item.meta}
                onChange={(meta) => patch({ meta })}
                maxLength={60}
                hint="The faint note on the right."
              />
            </Row>
            <TextArea
              label="Headline"
              value={item.title}
              onChange={(title) => patch({ title })}
              rows={2}
              placeholder={`Row ${index + 1}`}
            />
            <Field
              label="Links to"
              value={item.href}
              onChange={(href) => patch({ href })}
              placeholder="#calendar"
            />
          </>
        )}
      </Repeater>
    </>
  );
}
