"use client";

import { cn } from "@/lib/utils";

/**
 * The form's buttons: a hazard board, not a pill.
 *
 * A yellow plate with a black outline and a run of diagonal stripes along the
 * bottom edge — the sign at the end of a pit lane. It is the only decorated
 * thing on a form that is otherwise flat outlines, which is the point: on a
 * page of grey boxes there should be exactly one place the eye lands, and it
 * should be the thing that finishes the job.
 *
 * ── Two tones, one shape ──────────────────────────────────────────────────
 *
 *   solid   yellow, black type, the stripes. The action that sends or advances.
 *   quiet   the card's own surface with a hairline. Back, and anything else
 *           that undoes rather than does.
 *
 * ── The stripes ───────────────────────────────────────────────────────────
 *
 * A repeating gradient rather than a row of elements: the band has to run the
 * whole width whatever the label says, and a gradient does that without
 * counting anything. It is a BAND at the bottom rather than a fill, so the
 * label sits on plain yellow and stays readable — stripes behind type is how a
 * warning sign gets illegible.
 *
 * `overflow-hidden` on the button is what cuts the band to the rounded corners;
 * the band itself is a plain rectangle and knows nothing about them.
 */
export function HazardButton({
  tone = "solid",
  stripes,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  tone?: "solid" | "quiet";
  /** The striped band. Defaults to on for `solid`, off for `quiet`. */
  stripes?: boolean;
}) {
  const striped = stripes ?? tone === "solid";

  return (
    <button
      className={cn(
        "group relative inline-flex items-center justify-center overflow-hidden rounded-lg",
        /*
         * A 1.5px edge, not 2.
         *
         * Two pixels of pure black around a 44px plate is the weight a sticker
         * has; a painted sign has a line just heavy enough to hold the colour
         * in. It is the single thing that made this read as a graphic pasted
         * onto the page rather than a control that belongs on it.
         */
        "border-[1.5px]",
        // 44px tall: this is a public form, and most of the people filling it
        // in are using a thumb. The admin's own controls are 36px, which is
        // right for a mouse and wrong here.
        "h-11 px-7 text-[13px] font-extrabold uppercase tracking-[0.09em]",
        /*
         * It lifts, and it goes down when pressed.
         *
         * The same movement every other button on this site has — the one this
         * replaced included. Colour alone changing under the cursor is what
         * makes a control feel painted on; a plate that answers a press is the
         * cheapest thing that makes it feel like a button.
         */
        "transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0",
        // The band takes the bottom of the plate, so the label sits above it
        // rather than across it.
        striped && "pb-2.5",
        tone === "solid"
          ? "border-accent-ink/85 bg-accent text-accent-ink hover:bg-accent-dark"
          : "border-line bg-panel text-fg-muted hover:border-fg-faint/60 hover:text-fg",
        className
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>

      {striped ? (
        <span
          aria-hidden
          className={cn(
            // Black bars on the plate's own yellow. Shared with the panel that
            // replaces the form on success — see `.hazard-bars`.
            "hazard-bars pointer-events-none absolute inset-x-0 bottom-0 h-2.5",
            /*
             * A hairline where the paint starts.
             *
             * Without it the bars simply begin, and because they meet the plate
             * at 45° the join is a row of little triangles — the one detail that
             * looked unfinished at any size. A real board has an edge there, and
             * so does this.
             */
            "border-t border-accent-ink/85",
            "group-disabled:opacity-50"
          )}
        />
      ) : null}
    </button>
  );
}
