"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Banner } from "@/lib/banners";
import { Media } from "@/components/ui/Media";

/**
 * A banner, opened full size — the whole picture, and closer if you want it.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * A banner box is a fixed height and most banners are cropped to fill it, so
 * what is on the page is a window onto the picture rather than the picture. On
 * a phone that window is roughly a third of it. The pan shows the rest a slice
 * at a time; this shows all of it at once, which is what somebody wants when
 * the banner is a poster, a category line-up or a circuit map.
 *
 * ── How it is opened ──────────────────────────────────────────────────────
 *
 * Through a context rather than a prop, because the thing that gets clicked is
 * the photograph inside a template and the state belongs to the carousel three
 * levels up — and templates are looked up by name and called with one argument,
 * so there is no prop to thread. `useBannerViewer` returns null wherever no
 * carousel is providing one, which is how the admin's preview renders these
 * components with nothing to click.
 *
 * ── Zoom ──────────────────────────────────────────────────────────────────
 *
 * Three ways in, because the right one depends on what you are holding: pinch on
 * a touch screen, the wheel with a mouse, and two buttons for anyone using
 * neither. Dragging pans once there is something to pan to.
 *
 * There is deliberately no double-click-to-zoom: a single tap closes the
 * picture, so the first click of a double would land first and there would be
 * nothing left to zoom.
 *
 * The picture is transformed rather than scrolled. A scroll container would need
 * the image's natural size to know how far it may go, which is not known until
 * it loads and changes with every banner; a transform needs only the box it is
 * in, and the offsets are clamped against that.
 */

const MIN_SCALE = 1;
const MAX_SCALE = 5;
/** What one turn of the wheel, or one press of a button, moves the zoom by. */
const STEP = 0.5;

type Open = (banner: Banner) => void;

const ViewerContext = createContext<Open | null>(null);

/** Provided by the carousel; null anywhere else, which disables the click. */
export function useBannerViewer(): Open | null {
  return useContext(ViewerContext);
}

export function BannerViewerProvider({
  onOpen,
  children,
}: {
  onOpen: Open;
  children: React.ReactNode;
}) {
  return <ViewerContext.Provider value={onOpen}>{children}</ViewerContext.Provider>;
}

export function BannerViewer({ banner, onClose }: { banner: Banner; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const dialog = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<Element | null>(null);

  /** Live pointers, so one finger pans and two pinch. */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchFrom = useRef<{ gap: number; scale: number } | null>(null);
  const panFrom = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  /** Set the moment anything moves, so a drag does not also read as a click. */
  const moved = useRef(false);

  /**
   * Keeps the picture's middle within the frame.
   *
   * At 1× there is nowhere to go, so the offset is pinned to zero; past that the
   * bound grows with the scale. Without this a hard drag throws the picture off
   * the screen and the only way back is the reset button.
   */
  const clamp = useCallback((next: { x: number; y: number }, atScale: number) => {
    const box = frame.current?.getBoundingClientRect();
    if (!box || atScale <= 1) return { x: 0, y: 0 };

    const room = { x: (box.width * (atScale - 1)) / 2, y: (box.height * (atScale - 1)) / 2 };

    return {
      x: Math.max(-room.x, Math.min(room.x, next.x)),
      y: Math.max(-room.y, Math.min(room.y, next.y)),
    };
  }, []);

  const zoomTo = useCallback(
    (value: number) => {
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Number(value.toFixed(2))));
      setScale(next);
      setOffset((current) => clamp(current, next));
    },
    [clamp]
  );

  /*
   * ── Opening and closing, and NOTHING that changes while it is open ──
   *
   * This runs once. It used to also carry the key handler, which put `scale` in
   * its dependencies — so every zoom step tore the effect down and set it up
   * again, which meant: the second run read `overflow: hidden` as the value to
   * restore, so closing left the PAGE BEHIND unscrollable; and focus was pulled
   * back to the close button after every press of the zoom buttons.
   */
  useEffect(() => {
    returnTo.current = document.activeElement;
    closeButton.current?.focus();

    // The page behind must not scroll under the overlay — on a phone that is
    // how you end up closing this and finding yourself somewhere else.
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
      // Back to whatever opened it, which is the banner itself.
      (returnTo.current as HTMLElement | null)?.focus?.();
    };
  }, []);

  /** The keys, which do depend on where the zoom currently is. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "+" || event.key === "=") zoomTo(scale + STEP);
      if (event.key === "-") zoomTo(scale - STEP);
      if (event.key === "0") zoomTo(1);

      /*
       * Tab is kept inside the dialog.
       *
       * `aria-modal` tells a screen reader the rest of the page is inert; it
       * does not tell the browser, so without this Tab walks straight out of an
       * overlay covering the screen and into links nobody can see.
       */
      if (event.key === "Tab") {
        const focusable = dialog.current?.querySelectorAll<HTMLElement>("button:not([disabled])");
        if (!focusable || focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, scale, zoomTo]);

  /*
   * The wheel is bound here rather than with onWheel, because React attaches its
   * listeners passively and a passive listener may not preventDefault — so the
   * page behind would zoom or scroll along with the picture.
   */
  useEffect(() => {
    const element = frame.current;
    if (!element) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomTo(scale + (event.deltaY < 0 ? STEP : -STEP));
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [scale, zoomTo]);

  /* ── Pointers: one pans, two pinch ── */

  function gapBetween() {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function onPointerDown(event: React.PointerEvent) {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    moved.current = false;

    if (pointers.current.size === 2) {
      pinchFrom.current = { gap: gapBetween(), scale };
      panFrom.current = null;
      return;
    }

    if (scale > 1) {
      (event.target as Element).setPointerCapture?.(event.pointerId);
      panFrom.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
      setDragging(true);
    }
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 2 && pinchFrom.current) {
      moved.current = true;
      const ratio = gapBetween() / (pinchFrom.current.gap || 1);
      zoomTo(pinchFrom.current.scale * ratio);
      return;
    }

    const from = panFrom.current;
    if (!from) return;

    const next = { x: from.ox + (event.clientX - from.x), y: from.oy + (event.clientY - from.y) };
    if (Math.abs(next.x - from.ox) > 3 || Math.abs(next.y - from.oy) > 3) moved.current = true;
    setOffset(clamp(next, scale));
  }

  function onPointerUp(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchFrom.current = null;
    if (pointers.current.size === 0) {
      panFrom.current = null;
      setDragging(false);
    }
  }

  const zoomed = scale > 1;

  const overlay = (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={banner.title ? `${banner.title} — full picture` : "Full picture"}
      className="fixed inset-0 z-[120] flex flex-col bg-black"
    >
      {/* The bar. Sits above the picture so the controls are reachable however
          far the picture has been dragged. */}
      <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <p className="min-w-0 truncate text-[13px] font-medium text-white/70">
          {banner.title || "Banner"}
        </p>

        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition hover:border-white/40 hover:bg-white/10"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="m6 6 12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div
        ref={frame}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        /*
         * A tap closes it — on the picture as much as beside it, which is what
         * "tap it again" means when the picture is the thing you tapped to open.
         *
         * `moved` is why a pan does not also close: any pointer travel at all
         * disarms this, so dragging a zoomed picture and letting go leaves it
         * open. It is also why there is no double-click-to-zoom any more — the
         * first click of the pair would have closed it before the second landed.
         * Zoom is the wheel, a pinch, and the two buttons.
         */
        onClick={() => {
          if (!moved.current) onClose();
        }}
        // `touch-none` so the browser does not claim the gesture for its own
        // scroll and page zoom before this ever sees it.
        className={`relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden px-3 pb-3 sm:px-6 sm:pb-6 ${
          zoomed ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-out"
        }`}
      >
        <Media
          src={banner.image}
          alt={banner.title || "Banner"}
          controls
          draggable={false}
          decoding="async"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transition: dragging || pinchFrom.current ? "none" : "transform 180ms ease-out",
          }}
          className="max-h-full max-w-full object-contain"
        />
      </div>

      {/* Zoom controls. Written out rather than left to the gestures, because
          nothing on screen otherwise says this can be zoomed at all. */}
      <div className="flex shrink-0 items-center justify-center gap-2 pb-5 pt-1">
        <ZoomButton label="Zoom out" onClick={() => zoomTo(scale - STEP)} disabled={scale <= MIN_SCALE}>
          <path d="M5 12h14" />
        </ZoomButton>

        <button
          type="button"
          onClick={() => zoomTo(1)}
          disabled={!zoomed}
          className="h-9 min-w-[4.5rem] rounded-full border border-white/20 bg-white/5 px-3 text-[12px] font-semibold tabular-nums text-white/80 transition enabled:hover:border-white/40 enabled:hover:bg-white/10 disabled:opacity-40"
        >
          {Math.round(scale * 100)}%
        </button>

        <ZoomButton label="Zoom in" onClick={() => zoomTo(scale + STEP)} disabled={scale >= MAX_SCALE}>
          <path d="M12 5v14M5 12h14" />
        </ZoomButton>
      </div>
    </div>
  );

  /*
   * Portalled to the body.
   *
   * The carousel sits inside two `overflow-hidden` boxes — the rounded card the
   * whole site is drawn in is one of them — and framer-motion puts a transform
   * on the slide it is crossfading. A `fixed` element inside a transformed
   * ancestor is positioned against that ancestor rather than the viewport, so
   * this would be clipped to the banner it came from.
   */
  return createPortal(overlay, document.body);
}

function ZoomButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition enabled:hover:border-white/40 enabled:hover:bg-white/10 disabled:opacity-40"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          {children}
        </g>
      </svg>
    </button>
  );
}
