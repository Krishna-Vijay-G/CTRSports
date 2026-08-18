"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * The player chrome for a video: play, scrub, time left, sound.
 *
 * This replaces `SoundToggle`, which was the same idea with one button in it.
 * Everything about how it attaches is inherited from that component, and the
 * reasoning is unchanged — see "Why it finds the video by walking the DOM" and
 * "Why the element's property and not React state" below.
 *
 * ── It hides itself ───────────────────────────────────────────────────────
 *
 * A video on this site is a moving photograph first: it autoplays muted and
 * carries no chrome until somebody looks like they want some. So the bar is
 * invisible until a pointer moves over the media, and goes away again once the
 * pointer stops moving — the ordinary behaviour of a video player, and the
 * reason a banner does not permanently wear a control bar across its bottom.
 *
 * Touch has no hover to work with, so a tap reveals it and it hides five
 * seconds later. The two idle times differ deliberately: a mouse that has
 * stopped moving is a good signal that attention has moved on, and a finger
 * that has lifted is not a signal of anything at all.
 *
 * ── Why it finds the video by walking the DOM ─────────────────────────────
 *
 * `Media` renders `<video>` and then this, as adjacent siblings, and this reads
 * `previousElementSibling`. That is tighter coupling than passing a ref, and it
 * is what keeps `Media` free of `"use client"`: a ref cannot cross from a server
 * component into a client one, so the alternative is making every picture on the
 * site a client component to support chrome that most of them do not have.
 *
 * The coupling is contained — one component renders both, three lines apart —
 * and it fails safe: no sibling, no video, nothing is drawn.
 *
 * The POINTER listeners go on the parent instead, because in several slots the
 * video is not the thing under the cursor: a banner has a full-size button over
 * its photograph for opening it, and cards lay gradients and copy on top. The
 * parent is the positioned box that holds all of it, so a move anywhere over
 * the media counts, whatever it lands on.
 *
 * ── Why the element's properties and not React state ──────────────────────
 *
 * `element.muted = false` and `element.currentTime = 12` are what the browser
 * reads. Driving either through a prop would make React re-render the `<video>`,
 * and a `<video>` whose props change is a `<video>` that starts again from the
 * beginning — the sound would come on and the clip would jump back to zero.
 *
 * The state here only decides what is drawn.
 */

/** A mouse that has stopped moving has probably stopped watching. */
const IDLE_POINTER_MS = 2500;

/** A finger that has lifted has not said anything, so it gets longer. */
const IDLE_TOUCH_MS = 5000;

export function VideoControls({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<number | null>(null);
  /** A ref, not state: the listeners below read it and must not be re-bound. */
  const scrubbing = useRef(false);

  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [shown, setShown] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [duration, setDuration] = useState(0);
  const [at, setAt] = useState(0);

  const hideLater = useCallback((ms: number) => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);

    hideTimer.current = window.setTimeout(() => {
      // Never mid-drag: the bar vanishing under the finger holding it is the
      // one moment an idle timer must not fire.
      if (!scrubbing.current) setShown(false);
    }, ms);
  }, []);

  const reveal = useCallback(
    (ms: number) => {
      setShown(true);
      hideLater(ms);
    },
    [hideLater]
  );

  useEffect(() => () => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
  }, []);

  /* The video next door. */
  useEffect(() => {
    const previous = root.current?.previousElementSibling;
    if (previous instanceof HTMLVideoElement) setVideo(previous);
  }, []);

  /* What it is doing, mirrored into state so the bar can draw it. */
  useEffect(() => {
    if (!video) return;

    const sync = () => {
      setPlaying(!video.paused);
      setMuted(video.muted);
    };

    // A live stream reports Infinity and a video the browser is unsure about
    // reports NaN. Either would make the slider's max meaningless, so both
    // become zero and the slider is disabled.
    const onMeta = () => setDuration(Number.isFinite(video.duration) ? video.duration : 0);

    // Ignored while dragging, or the playhead would fight the finger.
    const onTime = () => {
      if (!scrubbing.current) setAt(video.currentTime);
    };

    sync();
    onMeta();
    onTime();

    video.addEventListener("play", sync);
    video.addEventListener("pause", sync);
    video.addEventListener("volumechange", sync);
    video.addEventListener("loadedmetadata", onMeta);
    video.addEventListener("durationchange", onMeta);
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("seeking", onTime);

    return () => {
      video.removeEventListener("play", sync);
      video.removeEventListener("pause", sync);
      video.removeEventListener("volumechange", sync);
      video.removeEventListener("loadedmetadata", onMeta);
      video.removeEventListener("durationchange", onMeta);
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("seeking", onTime);
    };
  }, [video]);

  /* Whether anybody is looking. */
  useEffect(() => {
    const host = root.current?.parentElement;
    if (!host) return;

    const onMove = (event: PointerEvent) => {
      // A touch drag also emits pointermove, and letting it through would give
      // a finger the mouse's shorter timeout.
      if (event.pointerType === "touch") return;
      reveal(IDLE_POINTER_MS);
    };

    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      reveal(IDLE_TOUCH_MS);
    };

    const onLeave = (event: PointerEvent) => {
      if (event.pointerType === "touch" || scrubbing.current) return;
      setShown(false);
    };

    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointerleave", onLeave);

    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, [reveal]);

  const seekable = duration > 0;
  const played = seekable ? Math.min(100, Math.max(0, (at / duration) * 100)) : 0;
  const left = seekable ? Math.max(0, duration - at) : 0;

  return (
    <div
      ref={root}
      /*
       * Nothing this bar does belongs to whatever is behind it. Two slots make
       * that matter: a banner's photograph is a button that opens it full size,
       * and the full-size viewer closes on a click and pans on a drag. Without
       * this, pressing play would open the picture and dragging the scrubber
       * would drag the photograph.
       */
      onPointerDown={(event) => {
        event.stopPropagation();
        // The host's own listener is what normally restarts the timer, and the
        // line above just stopped it from hearing this. On touch that matters:
        // without it, tapping mute would start a five-second countdown nothing
        // could reset, and the bar would vanish mid-use.
        reveal(event.pointerType === "touch" ? IDLE_TOUCH_MS : IDLE_POINTER_MS);
      }}
      onClick={(event) => event.stopPropagation()}
      /*
       * A pointer resting ON the bar must not time it out. Hiding under a
       * stationary cursor is bad on its own, and worse here: the bar goes
       * `pointer-events-none` when hidden, so the cursor would land back on the
       * video and the whole thing would flicker back in.
       */
      onPointerEnter={(event) => {
        if (event.pointerType === "touch") return;
        if (hideTimer.current) window.clearTimeout(hideTimer.current);
        setShown(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "touch") return;
        hideLater(IDLE_POINTER_MS);
      }}
      className={cn(
        "absolute inset-x-0 bottom-0 z-30 flex items-center gap-2.5 px-3 pb-3 pt-10",
        // The wash is part of the control, not decoration: white glyphs over an
        // unknown frame of somebody's video are otherwise unreadable by luck.
        "bg-gradient-to-t from-black/75 via-black/40 to-transparent",
        "transition-opacity duration-200",
        shown ? "opacity-100" : "pointer-events-none opacity-0",
        className
      )}
    >
      <IconButton
        label={playing ? "Pause" : "Play"}
        onClick={() => {
          if (!video) return;

          if (!video.paused) {
            video.pause();
            return;
          }

          // A banner clip in a rotating carousel plays once and stops on its
          // last frame, so the playhead is already at the end — pressing play
          // there would end it again immediately and look like a dead button.
          if (video.ended) video.currentTime = 0;
          void video.play().catch(() => {});
        }}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </IconButton>

      <input
        type="range"
        min={0}
        max={seekable ? duration : 1}
        step="any"
        value={seekable ? Math.min(at, duration) : 0}
        disabled={!seekable}
        aria-label="Seek"
        onPointerDown={() => {
          scrubbing.current = true;
        }}
        // A range input captures the pointer, so these fire even when the
        // finger is released somewhere else entirely.
        onPointerUp={() => {
          scrubbing.current = false;
          reveal(IDLE_POINTER_MS);
        }}
        onPointerCancel={() => {
          scrubbing.current = false;
        }}
        onChange={(event) => {
          const to = Number(event.target.value);
          setAt(to);
          if (video) video.currentTime = to;
        }}
        // The filled part of the track is a gradient rather than a second
        // element, because a range input has nowhere to put one.
        style={{
          background: `linear-gradient(to right, rgb(255 255 255) ${played}%, rgb(255 255 255 / 0.3) ${played}%)`,
        }}
        className={cn(
          "h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full disabled:cursor-default",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40",
          "[&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow",
          "[&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white"
        )}
      />

      {/* Counting down, not up: what is left is the thing anybody actually
          wants off a banner clip. `tabular-nums` so it does not jitter as the
          digits change. */}
      <span className="shrink-0 text-[11px] font-medium tabular-nums text-white/90">
        {seekable ? `-${clock(left)}` : "--:--"}
      </span>

      <IconButton
        label={muted ? "Turn the sound on" : "Turn the sound off"}
        onClick={() => {
          if (!video) return;

          video.muted = !video.muted;
          setMuted(video.muted);

          // A muted autoplaying video can be paused by the browser's own
          // policies. Unmuting is a user gesture, so this is the moment it will
          // accept a play() it would have refused before.
          void video.play().catch(() => {});
        }}
      >
        {muted ? <MutedIcon /> : <SoundIcon />}
      </IconButton>
    </div>
  );
}

/** `2:07`, `0:09`. Hours are not a thing a banner clip does. */
function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full text-white transition",
        "hover:bg-white/20",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      )}
    >
      {children}
    </button>
  );
}

/* Drawn here rather than imported: these are the only public components with
   icons of their own, and the admin's set is not in this bundle. */

function icon(children: React.ReactNode) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const PlayIcon = () => icon(<path d="M6 4.5v11l9-5.5z" fill="currentColor" strokeWidth="1" />);

const PauseIcon = () => icon(<path d="M7 4.5v11M13 4.5v11" />);

const SoundIcon = () =>
  icon(
    <>
      <path d="M4 7.5h2.5L10 4.5v11L6.5 12.5H4z" />
      <path d="M13 7.5a3.5 3.5 0 0 1 0 5" />
      <path d="M15.2 5.2a6.5 6.5 0 0 1 0 9.6" />
    </>
  );

const MutedIcon = () =>
  icon(
    <>
      <path d="M4 7.5h2.5L10 4.5v11L6.5 12.5H4z" />
      <path d="m13.5 8 4 4M17.5 8l-4 4" />
    </>
  );
