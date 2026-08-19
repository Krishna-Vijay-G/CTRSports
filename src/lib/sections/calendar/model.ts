import { isRecord, link, text } from "@/lib/normalise";
import type { SectionModule } from "@/lib/sections/types";

/**
 * The heading, and the words the season is read with.
 *
 * ── What this band no longer holds ────────────────────────────────────────
 *
 * The rounds. They were a promoted list — rows of `ctr.calendar_rounds` keyed to
 * this section and rewritten wholesale on every save — and migration 0018 made
 * each of them a row with an address of its own. WHICH events appear is
 * therefore not stored anywhere: the band draws every published event of this
 * site, in the order the Events screen puts them in, exactly as `registrations`
 * draws every published form. Every event of a sport belongs on that sport's
 * calendar, so there was never an editorial choice to record.
 *
 * That is also why it stopped being `multiple`. Two bands reading one list would
 * be the same band printed twice.
 *
 * ── What it does hold ─────────────────────────────────────────────────────
 *
 * Its heading, and the five words the cards are read with: what a round is
 * called, what the featured one is called, what sits over the clock, what an
 * unfixed weekend says, and what the link to a circuit's page says. A
 * championship that runs "meetings" rather than "rounds" says so here rather
 * than in a component. Each blank leaves that piece off; nothing falls back to
 * a word.
 *
 * And the way out of the band: a button under the grid to the season's own page,
 * whose address is a field so a championship that keeps its fixtures somewhere
 * else can point at that instead.
 */
export type Calendar = {
  label: string;
  title: string;
  /** The word before an event's number, on both the big card and the grid. */
  roundLabel: string;
  /** The chip on the event the season is heading towards. */
  nextLabel: string;
  /** The line over the countdown. */
  countdownLabel: string;
  /** What an event with no fixed date prints in place of one. */
  tbcLabel: string;
  /** The link to an event's circuit page. Blank leaves the link off. */
  trackCtaLabel: string;
  /** The button under the grid. Blank leaves the button off. */
  seasonCtaLabel: string;
  /**
   * Where that button goes. Blank means the season's own page — `/<sport>/
   * calendar/<slug>` — which is what it should say almost always, and which is
   * a fallback rather than a stored default so it follows a renamed season
   * instead of rotting into a 404. Typed, it wins, and may be any address.
   */
  seasonCtaHref: string;
};

export const BLANK_CALENDAR: Calendar = {
  label: "",
  title: "",
  roundLabel: "",
  nextLabel: "",
  countdownLabel: "",
  tbcLabel: "",
  trackCtaLabel: "",
  seasonCtaLabel: "",
  seasonCtaHref: "",
};

export const calendar: SectionModule<Calendar> = {
  type: "calendar",
  label: "Calendar",
  hint: "This sport's season, in order, with a countdown to the next event.",
  surface: ["home"],
  multiple: false,
  anchor: "calendar",
  needs: ["events"],
  blank: () => ({ ...BLANK_CALENDAR }),
  normalise: (raw) => {
    const d = BLANK_CALENDAR;
    const value = isRecord(raw) ? raw : {};

    return {
      label: text(value.label, d.label),
      title: text(value.title, d.title),
      roundLabel: text(value.roundLabel, d.roundLabel, 40),
      nextLabel: text(value.nextLabel, d.nextLabel, 40),
      countdownLabel: text(value.countdownLabel, d.countdownLabel, 40),
      tbcLabel: text(value.tbcLabel, d.tbcLabel, 40),
      trackCtaLabel: text(value.trackCtaLabel, d.trackCtaLabel, 40),
      seasonCtaLabel: text(value.seasonCtaLabel, d.seasonCtaLabel, 40),
      seasonCtaHref: link(value.seasonCtaHref, d.seasonCtaHref),
    };
  },
};
