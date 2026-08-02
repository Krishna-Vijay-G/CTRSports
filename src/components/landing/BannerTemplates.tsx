"use client";

import { motion } from "framer-motion";
import type { MediaPost } from "@/lib/posts";
import { formatPostDate } from "@/lib/formatDate";
import { PostMedia, type VideoHooks } from "@/components/landing/PostMedia";
import { TEMPLATES, resolveTemplate, type TemplateId } from "@/lib/templates";
import { cn } from "@/lib/utils";

export type TemplateProps = {
  post: MediaPost;
  muted: boolean;
  reducedMotion: boolean;
  /** Wired onto the template's primary media so the banner can pace off the clip. */
  video?: VideoHooks;
};

const EASE = [0.25, 0.46, 0.45, 0.94] as const;

/* ─────────────────────────── shared pieces ─────────────────────────── */

function InstagramGlyph({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Copy({
  post,
  align = "left",
  size = "md",
  clamp = "line-clamp-4 md:line-clamp-6",
  className,
}: {
  post: MediaPost;
  align?: "left" | "center";
  size?: "md" | "lg";
  clamp?: string;
  className?: string;
}) {
  const centered = align === "center";

  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
      className={cn(centered ? "mx-auto max-w-3xl text-center" : "max-w-xl", className)}
    >
      <div className={cn("flex flex-wrap items-center gap-3", centered && "justify-center")}>
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.24em] text-racing-yellow">
          Latest from CTR
        </span>
        <span aria-hidden className="h-px w-8 bg-racing-yellow/40" />
        <span className="font-display text-[11px] uppercase tracking-[0.18em] text-white/50">
          {formatPostDate(post.published_at)}
        </span>
      </div>

      <h2
        className={cn(
          "mt-4 font-display font-bold uppercase leading-[0.98] tracking-wide text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.7)]",
          size === "lg"
            ? "text-[clamp(2.1rem,5.6vw,4.4rem)]"
            : "text-[clamp(1.9rem,4.6vw,3.6rem)]"
        )}
      >
        {post.title}
      </h2>

      {/* Clamped so a long caption can never overflow the fixed-height frame. */}
      {post.subtext ? (
        <p
          className={cn(
            "mt-4 whitespace-pre-line text-sm leading-relaxed text-white/75 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] sm:text-base",
            centered ? "mx-auto max-w-2xl" : "max-w-lg",
            clamp
          )}
        >
          {post.subtext}
        </p>
      ) : null}

      {post.instagram_url ? (
        <a
          href={post.instagram_url}
          target="_blank"
          rel="noreferrer"
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-racing-yellow px-7 py-3 font-display text-sm font-semibold uppercase tracking-wider text-carbon-950 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_38px_-10px_rgba(247,214,25,0.6)] active:translate-y-0"
        >
          <InstagramGlyph />
          View on Instagram
        </a>
      ) : null}
    </motion.div>
  );
}

/** Keeps the copy clear of the control bar pinned to the bottom of the frame. */
const SHELL = "mx-auto h-full max-w-6xl px-5 pb-24 sm:px-6";

/* ─────────────────────────── 1 · Wedge ─────────────────────────── */

function WedgeTemplate({ post, muted, reducedMotion, video }: TemplateProps) {
  return (
    <>
      <div
        className={cn(
          "absolute inset-0 md:left-auto md:right-0 md:w-[66%]",
          "md:[clip-path:polygon(16%_0,100%_0,100%_100%,0_100%)]"
        )}
      >
        <PostMedia post={post} muted={muted} reducedMotion={reducedMotion} video={video} kenBurns priority />
      </div>

      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(178deg,rgba(10,10,10,0.94)_8%,rgba(10,10,10,0.72)_38%,rgba(10,10,10,0.40)_62%,rgba(10,10,10,0.86)_100%)] md:bg-[linear-gradient(101deg,#0A0A0A_0%,#0A0A0A_26%,rgba(10,10,10,0.88)_40%,rgba(10,10,10,0.42)_56%,rgba(10,10,10,0.06)_74%,transparent_88%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 hidden md:block md:bg-[linear-gradient(101deg,transparent_28%,rgba(247,214,25,0.16)_35%,rgba(247,214,25,0.03)_41%,transparent_48%)]"
      />

      <div className="absolute inset-0">
        <div className={cn(SHELL, "flex flex-col justify-center pt-16")}>
          <Copy post={post} />
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────── 2 · Cinematic ─────────────────────────── */

function CinematicTemplate({ post, muted, reducedMotion, video }: TemplateProps) {
  return (
    <>
      <div className="absolute inset-0">
        <PostMedia post={post} muted={muted} reducedMotion={reducedMotion} video={video} kenBurns priority />
      </div>

      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,10,10,0.97)_0%,rgba(10,10,10,0.82)_28%,rgba(10,10,10,0.35)_55%,rgba(10,10,10,0.30)_100%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(10,10,10,0.75)_0%,rgba(10,10,10,0.18)_45%,transparent_75%)]"
      />

      <div className="absolute inset-0">
        <div className={cn(SHELL, "flex flex-col justify-end pt-16")}>
          <span aria-hidden className="mb-6 block h-[3px] w-20 bg-gold-gradient" />
          <Copy post={post} size="lg" clamp="line-clamp-3 md:line-clamp-4" />
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────── 3 · Split ─────────────────────────── */

function SplitTemplate({ post, muted, reducedMotion, video }: TemplateProps) {
  return (
    <>
      {/* Media occupies the right half on desktop, the top on mobile. */}
      <div className="absolute inset-x-0 top-0 h-[46%] md:inset-y-0 md:left-1/2 md:right-0 md:h-full">
        <PostMedia post={post} muted={muted} reducedMotion={reducedMotion} video={video} priority />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-carbon-950 via-carbon-950/20 to-transparent md:bg-gradient-to-r md:from-carbon-950/60 md:via-transparent md:to-transparent"
        />
      </div>

      {/* Solid panel behind the copy. */}
      <div className="absolute inset-x-0 bottom-0 top-[42%] bg-carbon-950 md:inset-y-0 md:right-1/2 md:top-0 md:bg-carbon-950" />
      <div
        aria-hidden
        className="absolute left-0 right-0 top-[42%] h-px bg-gradient-to-r from-transparent via-racing-yellow/50 to-transparent md:bottom-0 md:left-1/2 md:right-auto md:top-0 md:h-full md:w-px md:bg-gradient-to-b md:from-transparent md:via-racing-yellow/50 md:to-transparent"
      />

      <div className="absolute inset-0">
        <div className="mx-auto grid h-full max-w-6xl grid-rows-[42%_1fr] px-5 pb-24 sm:px-6 md:grid-cols-2 md:grid-rows-1 md:gap-12">
          <div aria-hidden className="md:order-2" />
          <div className="flex flex-col justify-center md:order-1 md:pr-6">
            <Copy post={post} clamp="line-clamp-3 md:line-clamp-6" />
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────── 4 · Spotlight ─────────────────────────── */

function SpotlightTemplate({ post, muted, reducedMotion, video }: TemplateProps) {
  return (
    <>
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_72%_50%,rgba(247,214,25,0.13)_0%,rgba(10,10,10,0)_58%)]"
      />
      {/* Blurred fill so the frame never sits on dead space. For a video this
          uses the poster rather than a second <video> of the same file. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden opacity-25">
        {post.media_type === "video" ? (
          post.poster_url ? (
            <img src={post.poster_url} alt="" className="h-full w-full scale-110 object-cover blur-3xl" />
          ) : null
        ) : (
          <PostMedia post={post} reducedMotion className="scale-110 blur-3xl" />
        )}
      </div>
      <div aria-hidden className="absolute inset-0 bg-carbon-950/55" />

      <div className="absolute inset-0">
        <div className="mx-auto grid h-full max-w-6xl items-center gap-8 px-5 pb-24 pt-16 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] md:gap-14">
          <div className="order-2 flex flex-col justify-center md:order-1">
            <Copy post={post} clamp="line-clamp-3 md:line-clamp-5" />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="order-1 flex items-center justify-center md:order-2"
          >
            {/* The frame hugs the media rather than forcing an aspect ratio, so a
                landscape clip does not letterbox inside a portrait box. */}
            <div className="inline-flex overflow-hidden rounded-2xl border border-racing-yellow/30 bg-black/50 p-2 shadow-[0_30px_80px_-30px_rgba(247,214,25,0.45)]">
              <PostMedia
                post={post}
                sizing="natural"
                muted={muted}
                reducedMotion={reducedMotion}
                video={video}
                className="max-h-[34vh] max-w-full rounded-xl md:max-h-[46vh]"
                priority
              />
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────── 5 · Marquee ─────────────────────────── */

function MarqueeTemplate({ post, muted, reducedMotion, video }: TemplateProps) {
  return (
    <>
      <div className="absolute inset-0">
        <PostMedia post={post} muted={muted} reducedMotion={reducedMotion} video={video} kenBurns priority />
      </div>

      <div aria-hidden className="absolute inset-0 bg-carbon-950/72" />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_18%,rgba(10,10,10,0.88)_92%)]"
      />

      <div className="absolute inset-0">
        <div className={cn(SHELL, "flex flex-col items-center justify-center pt-16")}>
          <Copy post={post} align="center" size="lg" clamp="line-clamp-3 md:line-clamp-4" />
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────── registry ─────────────────────────── */

const COMPONENTS: Record<TemplateId, (props: TemplateProps) => JSX.Element> = {
  wedge: WedgeTemplate,
  cinematic: CinematicTemplate,
  split: SplitTemplate,
  spotlight: SpotlightTemplate,
  marquee: MarqueeTemplate,
};

/** Renders a post with whichever template it was saved with. */
export function BannerTemplate(props: TemplateProps) {
  const Component = COMPONENTS[resolveTemplate(props.post.template).id];
  return <Component {...props} />;
}

export { TEMPLATES };
