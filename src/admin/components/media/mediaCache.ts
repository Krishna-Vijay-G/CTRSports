"use client";

import type { Listing } from "./types";

/**
 * Every folder listing the admin has seen, kept for as long as the tab is open.
 *
 * ── The problem this solves ───────────────────────────────────────────────
 *
 * Opening the media library used to be a blank panel and a spinner for several
 * seconds, every single time. The listing itself is not slow — S3 answers in
 * three or four hundred milliseconds warm — but it goes through a serverless
 * function that has to cold-start, read a session and then make that call, and
 * all of it was on the critical path between a click and anything appearing.
 *
 * Nothing here makes the request faster. It takes it off the critical path:
 * a folder that has been seen once is painted from memory INSTANTLY, and the
 * fetch that confirms it runs behind the paint. A background poll keeps those
 * answers current, so what is painted from memory is a few seconds old at worst.
 *
 * ── Why a module and not React state ──────────────────────────────────────
 *
 * The cache has to outlive the components. `MediaPicker` unmounts its dialog
 * every time it closes, `MediaLibrary` unmounts on navigation, and state in
 * either would be thrown away exactly when it becomes valuable. A module-level
 * Map lives as long as the tab, which is the correct lifetime for "what is in
 * this bucket".
 *
 * `useSyncExternalStore` is how components read it, so the entries handed out
 * must be STABLE — the same object until its contents genuinely change, or
 * React re-renders forever. That is why `read` returns a shared `BLANK` for a
 * miss, and why `lastUsed` is kept in a separate map: recording that somebody
 * looked at a folder must not change the object they are looking at.
 */

export type Entry = {
  listing: Listing | null;
  error: string | null;
  /** When the listing came back. 0 while nothing has. */
  at: number;
};

/** Shared, so a cache miss is the same object every time. See above. */
export const BLANK: Entry = { listing: null, error: null, at: 0 };

const entries = new Map<string, Entry>();
const inflight = new Map<string, Promise<void>>();
const watchers = new Set<() => void>();

/**
 * Which folders anybody has actually looked at, most recent first.
 *
 * Separate from `entries` because it changes on a mere glance and `entries` may
 * only change when the data does. It is what the poller reads to decide what is
 * worth keeping warm — polling every folder ever visited would turn a long
 * session into a slow leak of requests.
 */
const lastUsed = new Map<string, number>();
let tick = 0;

function announce(): void {
  for (const watcher of watchers) watcher();
}

export function subscribe(watcher: () => void): () => void {
  watchers.add(watcher);
  return () => {
    watchers.delete(watcher);
  };
}

export function read(folder: string): Entry {
  return entries.get(folder) ?? BLANK;
}

/** Records that somebody is looking at this folder. Draws nothing, so no announce. */
export function touch(folder: string): void {
  tick += 1;
  lastUsed.set(folder, tick);
}

/** The folders worth keeping fresh, most recently looked at first. */
export function warmest(limit: number): string[] {
  return [...lastUsed.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([folder]) => folder);
}

/** Whether the bucket is wired up at all, once anything has answered. */
export function configured(): boolean {
  for (const entry of entries.values()) {
    if (entry.listing) return entry.listing.configured;
  }
  return true;
}

function set(folder: string, entry: Entry): void {
  entries.set(folder, entry);
  announce();
}

/**
 * Fetches one folder, and hands back the request already running if there is
 * one.
 *
 * The dedupe is what makes it safe to ask from everywhere. Twenty image fields
 * on one screen share a folder and all warm it on mount; the poller and a user
 * opening the picker can collide on the same tick. All of it collapses to one
 * request.
 *
 * `force` skips the dedupe, for after an upload or a delete: a poll that
 * started before the change would otherwise be handed back as if it were the
 * answer to it.
 */
export function refresh(folder: string, force = false): Promise<void> {
  if (!force) {
    const running = inflight.get(folder);
    if (running) return running;
  }

  /*
   * The cleanup is a `.finally` callback rather than a block inside the body,
   * so that it can name the promise it belongs to. Only the request still
   * registered may deregister itself — a forced refresh replaces an older one
   * that is still in the air, and letting the loser clean up on its way out
   * would clear the entry for the request that superseded it.
   */
  const request = load(folder).finally(() => {
    if (inflight.get(folder) === request) inflight.delete(folder);
  });

  inflight.set(folder, request);
  return request;
}

async function load(folder: string): Promise<void> {
  try {
    const response = await fetch(`/api/admin/media/browse?folder=${encodeURIComponent(folder)}`);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      fail(folder, typeof data.error === "string" ? data.error : "Could not load the media library.");
      return;
    }

    set(folder, { listing: data as Listing, error: null, at: Date.now() });
  } catch {
    fail(folder, "Network error. Please try again.");
  }
}

/**
 * A failure only becomes visible when there is nothing better to show.
 *
 * A background poll that fails must not blank a folder somebody is reading, or
 * replace it with a red sentence about a request they never made. The stale
 * listing is still the best answer available, and staying quiet is the whole
 * point of syncing behind the paint. A folder with nothing cached is different:
 * there the error IS the only answer, so it is shown.
 */
function fail(folder: string, message: string): void {
  const current = read(folder);
  if (current.listing) return;

  set(folder, { listing: null, error: message, at: current.at });
}
