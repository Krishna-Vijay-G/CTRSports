"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { BLANK, read, refresh, subscribe, touch } from "./mediaCache";
import type { Listing } from "./types";

const EMPTY: Listing = {
  configured: true,
  folder: "",
  folders: [],
  files: [],
  truncated: false,
  canWrite: false,
};

/**
 * One folder's contents, from memory first and the network second.
 *
 * `active` is what the picker uses to hold off until it is opened — a screen
 * holding twenty image fields should make no requests of its own accord, and
 * this is still true of the hook. What changed is that `ImageField` now warms
 * its own folder deliberately, which is a different decision made somewhere it
 * can be read.
 *
 * ── Why this stopped owning the data ──────────────────────────────────────
 *
 * It used to hold the listing in `useState` and fetch it in an effect, which
 * meant every mount started from nothing: opening the picker, closing it and
 * opening it again was three seconds of spinner, twice, for a folder that had
 * not changed. The listing lives in a module now — see mediaCache.ts — so a
 * folder already seen paints immediately and the fetch behind it only confirms
 * what is on screen.
 *
 * `loading` is therefore true only when there is genuinely nothing to draw. A
 * refresh over a folder already showing is silent, which is the point: a
 * spinner over data that is already correct is a worse answer than the data.
 *
 * `reload` forces a refetch past the in-flight dedupe, because uploading and
 * deleting both change what is in the folder and a request that started before
 * the change cannot answer for it.
 */
export function useFolder(folder: string, active = true) {
  const entry = useSyncExternalStore(
    subscribe,
    () => read(folder),
    () => BLANK
  );

  useEffect(() => {
    if (!active) return;

    touch(folder);
    void refresh(folder);
  }, [folder, active]);

  const reload = useCallback(() => {
    void refresh(folder, true);
  }, [folder]);

  /*
   * The folder is stamped onto the empty listing so a screen with nothing yet
   * still knows where it is. Memoised because this is read as a prop by half
   * the media components and a fresh object every render would churn them.
   */
  const listing = useMemo(
    () => entry.listing ?? { ...EMPTY, folder },
    [entry.listing, folder]
  );

  return {
    listing,
    loading: active && !entry.listing && !entry.error,
    error: entry.error,
    reload,
  };
}
