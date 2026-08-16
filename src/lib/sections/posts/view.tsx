import { cn } from "@/lib/utils";
import type { SectionViewProps } from "@/lib/sections/types";
import type { Posts } from "./model";
import { ActionButton } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";

/**
 * The newsroom: posts as cards, photo first.
 *
 * Cards here and rows above, deliberately. A post has a picture and a paragraph
 * and is worth stopping on; a bulletin line is not. Two different shapes is what
 * keeps the foot of the page from reading as one undifferentiated list.
 */
export function PostsView({ value: posts }: SectionViewProps<Posts>) {
  if (posts.items.length === 0) return null;

  return (
    <section id="posts" className="shell py-16 sm:py-20">
      <Reveal className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        {/* `.pill-label` is a bordered, filled pill — an empty one is an outline
            holding nothing. The <div> stays either way: it is what pushes the
            button to the far end of the row. */}
        <div>
          {posts.label ? <span className="pill-label">{posts.label}</span> : null}
          {posts.title ? (
            <h2
              className={cn(
                "headline max-w-2xl text-[clamp(1.7rem,3.6vw,2.7rem)]",
                posts.label && "mt-4"
              )}
            >
              {posts.title}
            </h2>
          ) : null}
        </div>

        {posts.ctaLabel ? (
          <ActionButton
            href={posts.ctaHref}
            variant="outline"
            target={posts.ctaHref.startsWith("http") ? "_blank" : undefined}
            rel={posts.ctaHref.startsWith("http") ? "noreferrer" : undefined}
            className="shrink-0"
          >
            {posts.ctaLabel}
          </ActionButton>
        ) : null}
      </Reveal>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {posts.items.map((post, index) => (
          // The Reveal is INSIDE the li: a <div> between a <ul> and its <li> is
          // invalid and browsers reparent it.
          <li key={post.id} className="flex">
            <Reveal delay={Math.min(index, 5) * 0.06} className="flex w-full">
              <a
                href={post.href}
                className="panel-card group flex h-full w-full flex-col overflow-hidden transition-colors duration-300 hover:border-accent/40"
              >
                <span className="relative block overflow-hidden">
                  <img
                    src={post.image}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                    className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {post.category ? (
                    <span className="photo-chip absolute left-3 top-3">{post.category}</span>
                  ) : null}
                </span>

                <span className="flex flex-1 flex-col p-6">
                  {post.date ? (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                      {post.date}
                    </span>
                  ) : null}

                  <span className="mt-3 font-display text-lg font-bold leading-snug text-fg">
                    {post.title}
                  </span>

                  {post.excerpt ? (
                    <span className="mt-2 text-sm leading-relaxed text-fg-muted">
                      {post.excerpt}
                    </span>
                  ) : null}

                  <span className="mt-5 inline-flex items-center gap-2 text-[13px] font-semibold text-fg-faint transition-colors group-hover:text-accent">
                    Read more
                    <span
                      aria-hidden
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </span>
                </span>
              </a>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
