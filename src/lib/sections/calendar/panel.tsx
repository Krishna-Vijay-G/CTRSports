"use client";

import Link from "next/link";
import type { Calendar } from "./model";
import { eventDateLabel } from "@/lib/raceDates";
import { eventName } from "@/lib/events";
import { Field, Note, Panel, Row } from "@/admin/components/Fields";
import type { SectionPanelProps } from "@/lib/sections/types";

/**
 * The calendar band's heading and its wording. Not its season.
 *
 * The rounds were edited here until migration 0018 made each one a row with an
 * address of its own; they are on the Events screen now, and this band draws
 * every published one. So what is left is the two lines at the top and the five
 * words the cards are read with — which is the same division the entry-forms
 * band already has, and it is the right one: a weekend of racing is not a
 * property of a strip on a page.
 *
 * The season is still LISTED here, read-only, because a panel that says nothing
 * about what it will draw is a panel you have to leave to find out.
 */
export function CalendarPanel({ value, onChange, ctx }: SectionPanelProps<Calendar>) {
  const { events, tracks, site } = ctx.records;

  const set = (patch: Partial<Calendar>) => onChange({ ...value, ...patch });

  return (
    <>
      <Panel title="Heading">
        <div className="space-y-3">
          <Field label="Label" value={value.label} onChange={(label) => set({ label })} />
          <Field label="Title" value={value.title} onChange={(title) => set({ title })} />
        </div>
      </Panel>

      {/*
        The words the cards are read with, rather than the season itself.
        These were fixed in the component, which meant a championship that runs
        "events" or "meetings" still had a page calling them rounds. Each blank
        leaves that piece off the cards; nothing here falls back to a word.
      */}
      <Panel title="Wording" hint="what the cards print around each event">
        <div className="space-y-3">
          <Row>
            <Field
              label="An event is called"
              value={value.roundLabel}
              onChange={(roundLabel) => set({ roundLabel })}
              maxLength={40}
              placeholder="Round"
              hint="The number follows it."
            />
            <Field
              label="The next one is called"
              value={value.nextLabel}
              onChange={(nextLabel) => set({ nextLabel })}
              maxLength={40}
              placeholder="Next round"
              hint="The chip on the big card."
            />
          </Row>

          <Row>
            <Field
              label="Over the countdown"
              value={value.countdownLabel}
              onChange={(countdownLabel) => set({ countdownLabel })}
              maxLength={40}
              placeholder="Lights out in"
            />
            <Field
              label="No date yet"
              value={value.tbcLabel}
              onChange={(tbcLabel) => set({ tbcLabel })}
              maxLength={40}
              placeholder="Date TBC"
            />
          </Row>

          <Field
            label="Link to the circuit"
            value={value.trackCtaLabel}
            onChange={(trackCtaLabel) => set({ trackCtaLabel })}
            maxLength={40}
            placeholder="Circuit guide"
            hint="On the big card, and only when the event names a circuit. Blank leaves the link off."
          />

          <Note>
            &ldquo;Next&rdquo;, &ldquo;Done&rdquo; and &ldquo;Completed&rdquo; are not here. The
            page reads those off the clock — a weekend is past or it is not — so there is nothing
            to decide about them.
          </Note>
        </div>
      </Panel>

      <Panel title="The season" hint="every published event, in its own order">
        {events.length === 0 ? (
          <Note>
            Nothing published yet, so this band shows its heading and nothing else. Events are
            added on the Events screen, each with its own page and address.
          </Note>
        ) : (
          <>
            <ol className="space-y-1.5">
              {events.map((event) => {
                const track = tracks.find((entry) => entry.id === event.track_id);
                return (
                  <li
                    key={event.id}
                    className="flex items-baseline justify-between gap-3 rounded-md border border-border bg-background/60 px-2.5 py-1.5"
                  >
                    <span className="min-w-0 truncate text-[12px] font-medium text-foreground">
                      {event.round ? (
                        <span className="text-muted-fg">{event.round} · </span>
                      ) : null}
                      {eventName(event, track?.name) || "Untitled"}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-fg">
                      {eventDateLabel(event) || "no date"}
                    </span>
                  </li>
                );
              })}
            </ol>
            <Note className="mt-2">
              Read-only here. The order, the dates and the circuits are on the{" "}
              <Link
                href={`/site/${site.slug}/events`}
                className="text-foreground underline underline-offset-2"
              >
                Events screen
              </Link>
              . The next one is whichever weekend has not finished yet, and the page gives it the
              big card.
            </Note>
          </>
        )}
      </Panel>
    </>
  );
}
