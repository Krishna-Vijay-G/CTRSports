import { isVideoUrl, posterFor } from "@/lib/media";
import { SoundToggle } from "./SoundToggle";

/**
 * A picture, or a video wearing the same clothes.
 *
 * Every slot in this project that holds an uploaded image also accepts a video,
 * and this is the one place that decides which one to draw. It is a DROP-IN for
 * `<img>`: the same `src`, the same `alt`, the same `className`, so a call site
 * changes by its tag name and nothing else, and the box the thing occupies is
 * identical either way.
 *
 * ── How a video behaves ───────────────────────────────────────────────────
 *
 * Like a moving photograph: muted, autoplaying, looping, inline. That is the
 * only behaviour a browser will start on its own — autoplay with sound is
 * blocked everywhere and has been for years — and it is what a banner or a card
 * wants, because the alternative is a still with a play button most visitors
 * never press.
 *
 * ── Why this file has no "use client" ─────────────────────────────────────
 *
 * Because nothing in it needs a browser. `<video autoplay muted loop>` is
 * markup, and most of the pages drawing it are server components; making this a
 * client component would put a component boundary and a hydration cost on every
 * photograph on the site to support a button that most slots do not have.
 *
 * The button is `SoundToggle`, which IS a client component, and it is only
 * rendered for the slots that ask. So a page of twelve pictures ships no
 * JavaScript for them, and a banner with sound ships one small button.
 *
 * ── Two things that look like details and are not ─────────────────────────
 *
 * `playsInline` — without it, iOS Safari takes any playing video FULL SCREEN, so
 * a banner behind a headline becomes the whole phone.
 *
 * No wrapper element. The `<video>` receives the caller's className directly,
 * because that is what carries `absolute inset-0 object-cover` and decides the
 * shape of the thing; an element between the video and the container those
 * classes are written against would change the layout at every call site.
 * `SoundToggle` is an absolutely positioned SIBLING for the same reason, which
 * is why `sound` is opt-in: it needs the caller's container to be positioned,
 * and every slot that passes it has been checked.
 */
export function Media({
  src,
  alt = "",
  className,
  sound = false,
  once = false,
  onPlayedThrough,
  onUnplayable,
  onDuration,
  loading,
  fetchPriority,
  decoding,
  ...rest
}: {
  src: string;
  alt?: string;
  className?: string;
  /**
   * Offer a speaker button over the video.
   *
   * Only for slots whose container is positioned and whose video is big enough
   * that somebody might want to hear it. A speaker button on a partner's mark or
   * a forty-pixel thumbnail is clutter, not a feature.
   */
  sound?: boolean;
  /**
   * Play through once and stop on the last frame, instead of looping.
   *
   * For the banner carousel, which holds its slide until the clip is over: a
   * looping video never fires `ended`, so there would be nothing to wait for.
   * Off everywhere else, because a video that is not being waited on should
   * behave like the moving photograph it is meant to be.
   *
   */
  once?: boolean;
  /**
   * The three things a caller waiting on a video needs, named for what they
   * mean rather than for the DOM events behind them.
   *
   * They are declared here rather than passed through `...rest` so the caller
   * never has to reach into an event typed against `HTMLImageElement` to find a
   * `duration` that only a `<video>` has — and so none of them is attached to
   * the `<img>` in the picture branch, where they could not fire anyway.
   */
  onPlayedThrough?: () => void;
  onUnplayable?: () => void;
  onDuration?: (seconds: number) => void;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  decoding?: "sync" | "async" | "auto";
} & Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "className" | "loading">) {
  if (!isVideoUrl(src)) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding={decoding}
        {...rest}
      />
    );
  }

  const poster = posterFor(src);

  return (
    <>
      <video
        src={src}
        poster={poster || undefined}
        className={className}
        autoPlay
        muted
        loop={!once}
        playsInline
        // `metadata` for a slot the caller marked lazy: a page of eight cards
        // should not pull eight videos before anybody scrolls to them. Autoplay
        // is what starts the ones that come into view.
        preload={loading === "lazy" ? "metadata" : "auto"}
        aria-label={alt || undefined}
        aria-hidden={alt ? undefined : true}
        {...(rest as React.VideoHTMLAttributes<HTMLVideoElement>)}
        // After the spread, so these are the ones that answer.
        onEnded={onPlayedThrough}
        onError={onUnplayable}
        onLoadedMetadata={(event) => onDuration?.(event.currentTarget.duration)}
      />

      {sound ? <SoundToggle /> : null}
    </>
  );
}
