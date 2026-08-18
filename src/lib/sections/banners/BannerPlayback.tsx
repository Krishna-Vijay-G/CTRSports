"use client";

import { createContext, useContext } from "react";
import { BANNER_INTERVAL } from "@/lib/banners";

/**
 * How the picture inside a banner and the carousel around it agree on time.
 *
 * ── The problem ───────────────────────────────────────────────────────────
 *
 * A banner holding a video should hold until the video has played through, and
 * only the `<video>` element knows when that is. But the element is created
 * deep inside a template, templates are looked up by name and called with one
 * argument, and the state that decides which banner is showing lives in the
 * carousel three levels above. There is no prop to thread it down.
 *
 * So it goes through a context, exactly as `BannerViewerProvider` carries the
 * click that opens a banner full size. Same reason, same shape.
 *
 * ── What each side puts in ────────────────────────────────────────────────
 *
 * The carousel supplies `once` and `hold`; the video supplies the callbacks'
 * arguments. `once` is what makes any of it possible — a looping video never
 * fires `ended`, so a banner in a rotating carousel plays through exactly once
 * and stops on its last frame, and a single banner with nowhere to advance to
 * keeps looping the way it always did.
 *
 * ── No provider is a valid state ──────────────────────────────────────────
 *
 * The admin's preview renders these templates with no carousel around them, so
 * `useBannerPlayback` falls back to the fixed interval and to looping. That is
 * the right behaviour there: a preview does not rotate, and a clip that stopped
 * dead on its last frame while somebody edited the copy beside it would read as
 * a bug.
 */

export type BannerPlayback = {
  /** Play through once and stop, rather than looping. */
  once: boolean;
  /**
   * How long this banner is expected to be on screen, for anything that has to
   * finish in step with it — the phone-width pan across a cropped picture, at
   * present. An estimate on purpose, and never zero: see the note where the
   * carousel computes it.
   */
  pan: number;
  /*
   * Every report names the banner it came from.
   *
   * Not ceremony. The outgoing slide stays mounted for the 0.6s crossfade, and
   * it is still inside this provider, so a video whose `ended` arrives late —
   * after the backstop timer already moved things on — reports it while the
   * NEXT banner is on screen. Without the id that reads as "the new one is
   * finished" and the carousel skips straight past it, which looks like a
   * banner that flashed by for no reason and is miserable to track down.
   */
  /** Its length in seconds, as soon as the browser knows it. */
  onDuration: (id: string, seconds: number) => void;
  /** It played through. */
  onEnded: (id: string) => void;
  /** It will not play: bad codec, missing file, dead connection. */
  onFailed: (id: string) => void;
};

const noop = () => {};

const FALLBACK: BannerPlayback = {
  once: false,
  pan: BANNER_INTERVAL,
  onDuration: noop,
  onEnded: noop,
  onFailed: noop,
};

const PlaybackContext = createContext<BannerPlayback | null>(null);

/** The carousel's terms, or the standing ones where there is no carousel. */
export function useBannerPlayback(): BannerPlayback {
  return useContext(PlaybackContext) ?? FALLBACK;
}

export function BannerPlaybackProvider({
  value,
  children,
}: {
  value: BannerPlayback;
  children: React.ReactNode;
}) {
  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}
