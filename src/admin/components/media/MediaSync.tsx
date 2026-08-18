"use client";

import { useEffect } from "react";
import { configured, refresh, touch, warmest } from "./mediaCache";

/** How often the folders in play are re-read. */
const EVERY_MS = 10_000;

/**
 * How many folders are kept warm at once.
 *
 * Small on purpose. Every folder in this set costs one request per tick for as
 * long as the tab is open, so "keep everything warm" is a slow leak dressed up
 * as a feature. Three covers the shapes that actually happen — the library
 * root, the folder of the screen being edited, and the one just browsed into —
 * and anything older will be a spinner once and then warm again.
 */
const KEEP_WARM = 3;

/**
 * Keeps the media listings current in the background, and says nothing.
 *
 * Mounted once, in the protected admin layout, so it is running long before
 * anybody opens the library — which is the entire trick. The listing is not
 * made faster; it is made to have already happened.
 *
 * ── Deliberately silent ───────────────────────────────────────────────────
 *
 * No spinner, no "syncing…", no toast, and a failed tick is swallowed whole.
 * Nobody asked for this request, so nobody should have to read about it: a
 * background poll that draws attention to itself is worse than one that does
 * not run. `mediaCache` holds the same line — a refresh that fails over a
 * folder already on screen leaves the folder alone.
 *
 * ── What it does not do ───────────────────────────────────────────────────
 *
 * It does not poll a hidden tab. A browser left open on another window for an
 * afternoon would otherwise spend it making requests nobody will read, and the
 * data would be stale the moment it mattered anyway. Coming back to the tab
 * refreshes immediately, which is both cheaper and fresher than having polled
 * throughout.
 *
 * It also stops entirely once a listing reports an unconfigured bucket. There
 * is nothing to sync and there never will be until the environment changes.
 */
export function MediaSync() {
  useEffect(() => {
    let stopped = false;

    /*
     * The root, before anything asks for it.
     *
     * `MediaLibrary` opens here by default, so priming it is the difference
     * between the media screen appearing and the media screen loading. It also
     * seeds the warm set, which would otherwise be empty until the first browse
     * and leave the first tick with nothing to do.
     */
    touch("");
    void refresh("");

    const sync = () => {
      if (stopped || document.hidden || !configured()) return;
      for (const folder of warmest(KEEP_WARM)) void refresh(folder);
    };

    const timer = window.setInterval(sync, EVERY_MS);

    // Back on screen: catch up now rather than waiting out the rest of a tick
    // that was skipped while hidden.
    const onVisible = () => {
      if (!document.hidden) sync();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
