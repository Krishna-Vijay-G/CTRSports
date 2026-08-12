"use client";

import { DEFAULT_VIEW_BOX } from "@/lib/tracks";
import { cn } from "@/lib/utils";

/**
 * A circuit drawn from its path data.
 *
 * One <path>, stroked in the current colour with round caps, so the outline
 * takes the colour of whatever it is placed in rather than being a picture of a
 * drawing. That is the whole reason for keeping the path rather than an image:
 * the same circuit reads on the dark page and on the admin's white tile without
 * two files.
 *
 * `fill="none"` matters — a track is a line, and a closed path with a fill would
 * come out as a blob.
 */
export function TrackOutline({
  path,
  viewBox,
  className,
}: {
  path: string;
  viewBox?: string;
  className?: string;
}) {
  if (!path) return null;

  return (
    <svg
      viewBox={viewBox || DEFAULT_VIEW_BOX}
      fill="none"
      stroke="currentColor"
      strokeWidth={6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("h-full w-full", className)}
    >
      <path d={path} />
    </svg>
  );
}
