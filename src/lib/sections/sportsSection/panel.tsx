"use client";

import { Field, Note, Panel } from "@/admin/components/Fields";
import { SportsList } from "@/admin/screens/landing/sports/SportsList";
import type { SectionPanelProps } from "@/lib/sections/types";
import type { SportsHeading } from "./model";

/**
 * The sports section, heading and cards on one screen.
 *
 * The two are stored differently — the heading is part of the page and goes
 * with the Save at the top, each card is its own database row with its own Save
 * — so the panel says which is which rather than hiding the seam. The cards
 * arrive through the panel context because they are the one thing a section
 * edits that is not its own value.
 */
export function SportsPanel({ value, onChange, ctx }: SectionPanelProps<SportsHeading>) {
  const { items, saved, onItems, onSaved } = ctx.sports;
  const visible = items.filter((sport) => sport.is_visible).length;

  return (
    <>
      <Panel title="Heading" hint="above the cards">
        <Field
          label="Chip label"
          value={value.label}
          onChange={(label) => onChange({ ...value, label })}
        />
        <Field
          label="Title"
          value={value.title}
          onChange={(title) => onChange({ ...value, title })}
          className="mt-3"
        />
      </Panel>

      <Panel title="Cards" hint={`${items.length} total · ${visible} on the site`}>
        <SportsList sports={items} saved={saved} onSportsChange={onItems} onSavedChange={onSaved} />

        <Note className="mt-3">
          Each card has its own <strong className="font-medium text-foreground">Save card</strong>{" "}
          button — the Save at the top of the screen writes the heading above, not the cards.
          Reordering is the exception: it saves the moment you drop.
        </Note>
      </Panel>
    </>
  );
}
