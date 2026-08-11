import { TRACKS, type TrackId } from "@/lib/tracks";
import { cn } from "@/lib/utils";

/**
 * A circuit outline.
 *
 * Two strokes on the same path: a thick faint one underneath for the tarmac and
 * a thin bright one on top for the racing line. That pair is what makes it read
 * as a track rather than a squiggle, and it costs one extra element.
 *
 * The path data is in src/lib/tracks.ts so the admin can offer the list without
 * importing anything that renders.
 */
export function TrackMap({ track, className }: { track: TrackId; className?: string }) {
  const { path, start } = TRACKS[track] ?? TRACKS.circuit;
  if (!path) return null;

  return (
    <svg
      viewBox="0 0 400 260"
      fill="none"
      aria-hidden
      className={cn("h-auto w-full overflow-visible", className)}
    >
      <path
        d={path}
        stroke="currentColor"
        strokeWidth={16}
        strokeLinejoin="round"
        className="text-line"
      />
      <path
        d={path}
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeDasharray="10 9"
        className="text-accent"
      />
      {start ? (
        <line
          x1={start.x1}
          y1={start.y1}
          x2={start.x2}
          y2={start.y2}
          stroke="currentColor"
          strokeWidth={5}
          strokeLinecap="round"
          className="text-white"
        />
      ) : null}
    </svg>
  );
}
