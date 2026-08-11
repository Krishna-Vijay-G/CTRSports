"use client";

import type { LandingContent } from "@/lib/landingContent";
import type { Sport } from "@/lib/sports";
import { Field, Note, Panel } from "@/components/admin/Fields";
import { SportsList } from "../sports/SportsList";

type Heading = LandingContent["sportsSection"];

/**
 * The sports section, heading and cards on one screen.
 *
 * The two are stored differently — the heading is part of the page document and
 * goes with the Save at the top, each card is its own database row with its own
 * Save — so the panel says which is which rather than hiding the seam.
 */
export function SportsPanel({
  heading,
  onHeadingChange,
  sports,
  savedSports,
  onSportsChange,
  onSavedSportsChange,
}: {
  heading: Heading;
  onHeadingChange: (next: Heading) => void;
  sports: Sport[];
  savedSports: Sport[];
  onSportsChange: (next: Sport[]) => void;
  onSavedSportsChange: (next: Sport[]) => void;
}) {
  const visible = sports.filter((sport) => sport.is_visible).length;

  return (
    <>
      <Panel title="Heading" hint="above the cards">
        <Field
          label="Chip label"
          value={heading.label}
          onChange={(v) => onHeadingChange({ ...heading, label: v })}
        />
        <Field
          label="Title"
          value={heading.title}
          onChange={(v) => onHeadingChange({ ...heading, title: v })}
          className="mt-3"
        />
      </Panel>

      <Panel
        title="Cards"
        hint={`${sports.length} total · ${visible} on the site`}
      >
        <SportsList
          sports={sports}
          saved={savedSports}
          onSportsChange={onSportsChange}
          onSavedChange={onSavedSportsChange}
        />

        <Note className="mt-3">
          Each card has its own <strong className="font-medium text-foreground">Save card</strong>{" "}
          button — the Save at the top of the screen writes the heading above, not the cards.
          Reordering is the exception: it saves the moment you drop.
        </Note>
      </Panel>
    </>
  );
}
