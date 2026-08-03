import Link from "next/link";
import type { MediaPost } from "@/lib/posts";
import type { SportMeta } from "@/lib/sports";
import { SportHero } from "@/components/sport/SportHero";
import { PostBanners } from "@/components/landing/PostBanners";
import { PostGrid } from "@/components/landing/PostGrid";

/**
 * One sport's post page: crest, the three most recent posts as banners, and
 * everything older in the grid below. Shared by every `/{slug}/post` route.
 */
export function SportPostsPage({
  sport,
  posts,
  year,
}: {
  sport: SportMeta;
  posts: MediaPost[];
  year: number;
}) {
  const bannerPosts = posts.slice(0, 3);
  const gridPosts = posts.slice(3);

  return (
    <div className="min-h-screen bg-carbon-950 font-body text-white/90">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-carbon-950/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3" aria-label="CTR Unified home">
            <img src="/media/ctr-logo.png" alt="CTR Unified logo" className="h-10 w-auto sm:h-12" />
            <span className="flex flex-col leading-none">
              <strong className="font-display text-sm font-semibold tracking-[0.14em] text-racing-yellow sm:text-base">
                CTR UNIFIED
              </strong>
              <span className="mt-1 text-[10px] tracking-[0.22em] text-white/45 sm:text-xs">
                {sport.name.toUpperCase()}
              </span>
            </span>
            {/* The sport's own crest, right of the name — the header should say
                which vertical you are on without reading it. */}
            <span aria-hidden className="ml-1 h-8 w-px bg-white/10 sm:ml-2 sm:h-10" />
            <img
              src={sport.logo}
              alt={`${sport.name} crest`}
              className="h-9 w-auto max-w-[3rem] object-contain sm:h-11 sm:max-w-[3.5rem]"
            />
          </Link>

          <nav className="flex items-center gap-5">
            {posts.length > 0 ? (
              <a
                href="#latest"
                className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-white/55 transition hover:text-racing-yellow"
              >
                Latest
              </a>
            ) : null}
            {gridPosts.length > 0 ? (
              <a
                href="#media"
                className="hidden font-display text-xs font-semibold uppercase tracking-[0.18em] text-white/55 transition hover:text-racing-yellow sm:inline"
              >
                Archive
              </a>
            ) : null}
            <Link
              href="/"
              className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-white/55 transition hover:text-racing-yellow"
            >
              Main site
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <SportHero sport={sport} />

        {/* The three most recent posts, as banners. */}
        <PostBanners posts={bannerPosts} kicker={sport.name} />

        {/* Everything older, in boxes. */}
        <div className="border-t border-white/5">
          <PostGrid
            posts={gridPosts}
            kicker={`${sport.name} — Media & Updates`}
            title="More Posts"
          />
        </div>

        {posts.length === 0 ? (
          <section className="mx-auto max-w-2xl px-5 py-24 text-center sm:px-6">
            <p className="font-display text-xs font-bold uppercase tracking-[0.24em] text-racing-yellow">
              Coming soon
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold uppercase tracking-wide text-white sm:text-3xl">
              No posts yet
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/50">
              Posts tagged <span className="text-racing-yellow">{sport.short}</span> in the media
              admin land here — the three most recent as banners, the rest in the grid below.
            </p>
          </section>
        ) : null}
      </main>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-10 text-center sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <div className="flex items-center gap-3">
            <img src={sport.logo} alt="" aria-hidden className="h-8 w-auto" />
            <span className="font-display text-xs uppercase tracking-[0.2em] text-white/45">
              {sport.name} — {sport.team}
            </span>
          </div>
          <Link
            href="/"
            className="font-display text-xs uppercase tracking-[0.2em] text-white/45 transition hover:text-racing-yellow"
          >
            ← Back to CTR Unified
          </Link>
        </div>
        <div className="border-t border-white/5 py-4 text-center text-[11px] text-white/30">
          © {year} <a href="https://krishna-vijay-g.vercel.app" target="_blank" className="hover:text-racing-yellow">CTR Unified.</a> All rights reserved.
        </div>
      </footer>
    </div>
  );
}
