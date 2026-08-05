"use client";

import { useRef } from "react";
import type { MediaPost } from "@/lib/posts";
import { formatPostDate } from "@/lib/formatDate";
import { resolvePostLink } from "@/lib/links";
import { LinkGlyph } from "@/components/post/BannerTemplates";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Every card in this grid uses the same format regardless of the post's
 * template — templates only shape the banners at the top of the page.
 */
function CardMedia({ post }: { post: MediaPost }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!post.media_url) return null;

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
          className="h-full w-full object-contain"
        />
        <span className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-carbon-950/70 text-racing-yellow backdrop-blur-sm">
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
            <path d="M4.5 3.2v9.6L13 8z" fill="currentColor" />
          </svg>
          <span className="sr-only">Video</span>
        </span>
      </>
    );
  }

  return (
    <img
      src={post.media_url}
      alt={post.title ?? ""}
      className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
      loading="lazy"
    />
  );
}

function PostCard({ post }: { post: MediaPost }) {
  const link = resolvePostLink(post);

  const body = (
    <>
      {/* Fixed-ratio stage with object-contain — the whole frame stays visible.
          Skipped entirely for copy-only posts rather than left as an empty box. */}
      {post.media_url ? (
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-black/45 p-3">
          <CardMedia post={post} />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col gap-2 px-1 pb-1 pt-4">
        <span className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-racing-yellow/80">
          {formatPostDate(post.published_at)}
        </span>
        {post.title ? (
          <h3 className="font-display text-lg font-semibold uppercase leading-tight tracking-wide text-white">
            {post.title}
          </h3>
        ) : null}
        {post.subtext ? (
          <p
            className={
              post.title
                ? "line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-white/55"
                : "line-clamp-6 whitespace-pre-line text-base leading-relaxed text-white/70"
            }
          >
            {post.subtext}
          </p>
        ) : null}
        {link ? (
          <span className="mt-auto inline-flex items-center gap-1.5 pt-2 font-display text-xs font-bold uppercase tracking-wider text-racing-yellow">
            <LinkGlyph type={link.type} className="h-3.5 w-3.5" />
            {link.label}
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
        ) : null}
      </div>
    </>
  );

  const cardClass =
    "group flex h-full flex-col rounded-3xl border border-white/10 bg-white/[0.02] p-3 no-underline transition-colors duration-300 hover:border-racing-yellow/40 hover:bg-white/[0.05]";

  return link ? (
    <a href={link.url} target="_blank" rel="noreferrer" className={cardClass}>
      {body}
    </a>
  ) : (
    <article className={cardClass}>{body}</article>
  );
}

export function PostGrid({
  posts,
  kicker = "MEDIA & UPDATES",
  title = "All Posts",
  id = "media",
}: {
  posts: MediaPost[];
  kicker?: string;
  title?: string;
  id?: string;
}) {
  if (posts.length === 0) return null;

  return (
    <section id={id} className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24">
      <Reveal className="max-w-2xl">
        <p className="font-display text-xs font-bold uppercase tracking-[0.24em] text-racing-yellow">
          {kicker}
        </p>
        <h2 className="mt-2 font-display text-3xl font-bold uppercase leading-tight tracking-wide text-white sm:text-4xl lg:text-5xl">
          {title}
        </h2>
      </Reveal>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, index) => (
          <Reveal key={post.id} y={30} delay={Math.min(index, 5) * 0.05}>
            <PostCard post={post} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
