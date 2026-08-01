"use client";

import type { MediaPost } from "@/lib/posts";
import { formatPostDate } from "@/lib/formatDate";
import { Reveal } from "@/components/journey/Reveal";

function PostCard({ post }: { post: MediaPost }) {
  const body = (
    <>
      {/* Fixed-ratio stage with object-contain — the whole image stays visible. */}
      <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-black/45 p-3">
        <img
          src={post.image_url}
          alt={post.title}
          className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        />
      </div>

      <div className="flex flex-1 flex-col gap-2 px-1 pb-1 pt-4">
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
        {post.instagram_url ? (
          <span className="mt-auto inline-flex items-center gap-1.5 pt-2 font-display text-xs font-bold uppercase tracking-wider text-racing-yellow">
            View on Instagram
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
              <path d="M3 8h9M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ) : null}
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
          MEDIA & UPDATES
        </p>
        <h2 className="mt-2 font-display text-3xl font-bold uppercase leading-tight tracking-wide text-white sm:text-4xl lg:text-5xl">
          All Posts
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
