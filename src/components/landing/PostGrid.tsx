"use client";

import { useRef } from "react";
import type { MediaPost } from "@/lib/posts";
import { formatPostDate } from "@/lib/formatDate";
import { resolveTemplate } from "@/lib/templates";
import { Reveal } from "@/components/journey/Reveal";
import { cn } from "@/lib/utils";

function PlayBadge() {
  return (
    <span className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-carbon-950/70 text-racing-yellow backdrop-blur-sm">
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
        <path d="M4.5 3.2v9.6L13 8z" fill="currentColor" />
      </svg>
      <span className="sr-only">Video</span>
    </span>
  );
}

function CardMedia({ post, fit }: { post: MediaPost; fit: "cover" | "contain" }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fitClass = fit === "contain" ? "object-contain" : "object-cover";

  if (post.media_type === "video") {
    return (
      <>
        <video
          ref={videoRef}
          src={post.media_url}
          poster={post.poster_url ?? undefined}
          muted
          loop
          playsInline
          preload="metadata"
          // Previews only play on hover, so a grid of clips is not a stampede.
          onMouseEnter={() => void videoRef.current?.play().catch(() => undefined)}
          onMouseLeave={() => videoRef.current?.pause()}
          className={cn("h-full w-full", fitClass)}
        />
        <PlayBadge />
      </>
    );
  }

  return (
    <img
      src={post.media_url}
      alt={post.title}
      className={cn(
        "h-full w-full transition-transform duration-500 group-hover:scale-[1.03]",
        fitClass
      )}
      loading="lazy"
    />
  );
}

function PostCard({ post }: { post: MediaPost }) {
  // The template chosen at upload time also shapes the card, so the choice is
  // visible for every post, not only the three currently on the banner.
  const { card } = resolveTemplate(post.template);

  const meta = (
    <>
      <span className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-racing-yellow/80">
        {formatPostDate(post.published_at)}
      </span>
      <h3 className="font-display text-lg font-semibold uppercase leading-tight tracking-wide text-white">
        {post.title}
      </h3>
      {post.subtext ? (
        <p className="line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-white/55">
          {post.subtext}
        </p>
      ) : null}
    </>
  );

  const instagramCue = post.instagram_url ? (
    <span className="mt-auto inline-flex items-center gap-1.5 pt-2 font-display text-xs font-bold uppercase tracking-wider text-racing-yellow">
      View on Instagram
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
        className="transition-transform duration-300 group-hover:translate-x-1"
      >
        <path d="M3 8h9M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  ) : null;

  const body = card.overlay ? (
    /* Copy sits over the media behind a scrim. */
    <div className={cn("relative overflow-hidden rounded-2xl bg-black/45", card.aspect)}>
      <CardMedia post={post} fit={card.fit} />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-carbon-950 via-carbon-950/55 to-transparent"
      />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4">{meta}</div>
    </div>
  ) : (
    <>
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-2xl bg-black/45",
          card.aspect,
          card.fit === "contain" && "p-3"
        )}
      >
        <CardMedia post={post} fit={card.fit} />
      </div>
      <div className="flex flex-1 flex-col gap-2 px-1 pb-1 pt-4">
        {meta}
        {instagramCue}
      </div>
    </>
  );

  const cardClass =
    "group flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.02] p-3 no-underline transition-colors duration-300 hover:border-racing-yellow/40 hover:bg-white/[0.05]";

  return post.instagram_url ? (
    <a href={post.instagram_url} target="_blank" rel="noreferrer" className={cardClass}>
      {body}
    </a>
  ) : (
    <article className={cardClass}>{body}</article>
  );
}

export function PostGrid({ posts }: { posts: MediaPost[] }) {
  if (posts.length === 0) return null;

  return (
    <section id="media" className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
      <Reveal className="max-w-2xl">
        <p className="font-display text-xs font-bold uppercase tracking-[0.24em] text-racing-yellow">
          MEDIA &amp; UPDATES
        </p>
        <h2 className="mt-2 font-display text-3xl font-bold uppercase leading-tight tracking-wide text-white sm:text-4xl lg:text-5xl">
          All Posts
        </h2>
      </Reveal>

      <div className="mt-10 grid auto-rows-auto gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, index) => (
          <Reveal key={post.id} y={30} delay={Math.min(index, 5) * 0.05}>
            <PostCard post={post} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
