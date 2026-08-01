"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useScroll, useSpring, useTransform, type Variants } from "framer-motion";
import { landingContent as content, type Sport } from "@/data/landingContent";
import { Reveal } from "@/components/journey/Reveal";
import { PostBanners } from "@/components/landing/PostBanners";
import { PostGrid } from "@/components/landing/PostGrid";
import type { MediaPost } from "@/lib/posts";
import { cn } from "@/lib/utils";

const SOCIALS = [
  { label: "Instagram", href: "https://www.instagram.com/chennaiturboriders", icon: "instagram" },
  { label: "Facebook", href: "https://www.facebook.com/chennaiturboriders", icon: "facebook" },
  { label: "Twitter", href: "https://twitter.com/chennaiturbo", icon: "twitter" },
  { label: "YouTube", href: "https://www.youtube.com/@chennaiturboriders", icon: "youtube" },
] as const;

function SocialIcon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "instagram":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
        </svg>
      );
    case "facebook":
      return (
        <svg {...common}>
          <path d="M14 21v-7h2.5l.5-3H14V9c0-.9.3-1.5 1.7-1.5H17V4.8c-.3 0-1.2-.1-2.3-.1-2.3 0-3.7 1.4-3.7 4V11H8.5v3H11v7z" />
        </svg>
      );
    case "twitter":
      return (
        <svg {...common}>
          <path d="M20.5 5.5c-.7.4-1.4.6-2.2.7a3.6 3.6 0 0 0 1.6-2 7.3 7.3 0 0 1-2.3.9 3.6 3.6 0 0 0-6.2 3.3A10.2 10.2 0 0 1 4 4.6a3.6 3.6 0 0 0 1.1 4.8c-.6 0-1.2-.2-1.7-.5v.1c0 1.8 1.3 3.2 3 3.6-.5.1-1.1.2-1.6.1a3.6 3.6 0 0 0 3.4 2.5A7.2 7.2 0 0 1 3 16.6a10.2 10.2 0 0 0 5.5 1.6c6.6 0 10.2-5.5 10.2-10.2v-.5c.7-.5 1.3-1.2 1.8-1.9z" />
        </svg>
      );
    case "youtube":
      return (
        <svg {...common}>
          <rect x="2.5" y="6" width="19" height="12" rx="4" />
          <path d="M10.5 9.5v5l4.5-2.5z" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}

function isInternal(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//");
}

function SportRow({ sport, index }: { sport: Sport; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const logoY = useTransform(scrollYProgress, [0, 1], [48, -48]);

  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springRotateX = useSpring(rotateX, { stiffness: 220, damping: 20, mass: 0.5 });
  const springRotateY = useSpring(rotateY, { stiffness: 220, damping: 20, mass: 0.5 });

  function handleLogoMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    rotateY.set(px * 28);
    rotateX.set(py * -28);
  }

  function handleLogoMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
  }

  const internal = isInternal(sport.website_url);
  const disabled = sport.website_url === "#";
  const reversed = index % 2 === 1;

  const inner = (
    <>
      <div className="flex flex-1 items-center justify-center py-6 md:py-0" style={{ perspective: 700 }}>
        <motion.div
          style={{ y: logoY, rotateX: springRotateX, rotateY: springRotateY, transformPerspective: 700 }}
          onMouseMove={handleLogoMouseMove}
          onMouseLeave={handleLogoMouseLeave}
          className="will-change-transform"
        >
          <img
            src={sport.logo_image}
            alt={`${sport.name} logo`}
            className="h-44 w-44 object-contain drop-shadow-[0_20px_36px_rgba(0,0,0,0.5)] sm:h-56 sm:w-56 md:h-64 md:w-64"
            loading="lazy"
          />
        </motion.div>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-2 text-center md:text-left">
        <span className="font-display text-xs font-bold tracking-[0.3em] text-racing-yellow/60">
          {String(index + 1).padStart(2, "0")}
        </span>
        <h3 className="font-display text-2xl font-semibold uppercase leading-tight tracking-wide text-white sm:text-3xl">
          {sport.name}
        </h3>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-racing-yellow">{sport.team_name}</p>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-white/55 md:mx-0">{sport.description}</p>
        <span className="mx-auto mt-2 inline-flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-racing-yellow md:mx-0">
          {sport.visit_label}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
            className="transition-transform duration-300 group-hover:translate-x-1"
          >
            <path d="M3 8h9M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </>
  );

  const sharedClass = cn(
    "group relative flex flex-col items-center gap-8 rounded-3xl border border-transparent p-6 no-underline transition-colors duration-300 hover:border-white/10 hover:bg-white/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-racing-yellow focus-visible:outline-offset-2 sm:p-10 md:gap-14",
    reversed ? "md:flex-row-reverse" : "md:flex-row"
  );

  return (
    <div ref={ref}>
      {internal ? (
        <Link role="listitem" href={sport.website_url} className={sharedClass} aria-label={`Open ${sport.name}`}>
          {inner}
        </Link>
      ) : (
        <a
          role="listitem"
          href={disabled ? undefined : sport.website_url}
          target={disabled ? undefined : "_blank"}
          rel={disabled ? undefined : "noreferrer"}
          className={sharedClass}
          aria-label={`Open ${sport.name} website`}
          aria-disabled={disabled || undefined}
        >
          {inner}
        </a>
      )}
    </div>
  );
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 0.14 * i, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

export function LandingPage({ posts, year }: { posts: MediaPost[]; year: number }) {
  const [showSplash, setShowSplash] = useState(true);
  const [fadeSplash, setFadeSplash] = useState(false);

  const bannerPosts = posts.slice(0, 3);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => setFadeSplash(true), content.splash.fade_in_ms);
    const hideTimer = window.setTimeout(() => setShowSplash(false), content.splash.hide_ms);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  return (
    <>
      {showSplash ? (
        <div
          className={`fixed inset-0 z-[999] grid place-content-center justify-items-center gap-3 bg-carbon-950 transition-opacity duration-500 ${
            fadeSplash ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
          style={{ background: "radial-gradient(circle at center, #191919 0%, #060606 62%)" }}
          aria-label={content.splash.aria_label}
        >
          <img
            src={content.splash.logo_image}
            alt="CTR Unified logo"
            className="w-[min(240px,46vw)] animate-float"
          />
          <p className="font-display text-sm uppercase tracking-[0.3em] text-racing-yellow">{content.splash.title}</p>
        </div>
      ) : null}

      <div id="top" className="min-h-screen bg-carbon-950 font-body text-white/90">
        <header className="sticky top-0 z-40 border-b border-white/5 bg-carbon-950/70 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 sm:px-6">
            <a href="#top" className="flex items-center gap-3" aria-label={content.brand.home_aria_label}>
              <img src={content.brand.logo_image} alt="CTR Unified logo" className="h-10 w-auto sm:h-12" />
              <span className="flex flex-col leading-none">
                <strong className="font-display text-sm font-semibold tracking-[0.14em] text-racing-yellow sm:text-base">
                  {content.brand.name}
                </strong>
                <span className="mt-1 text-[10px] tracking-[0.22em] text-white/45 sm:text-xs">
                  {content.brand.subtitle}
                </span>
              </span>
            </a>

            {posts.length > 0 ? (
              <nav className="flex items-center gap-5">
                <a
                  href="#latest"
                  className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-white/55 transition hover:text-racing-yellow"
                >
                  Latest
                </a>
                <a
                  href="#sports"
                  className="hidden font-display text-xs font-semibold uppercase tracking-[0.18em] text-white/55 transition hover:text-racing-yellow sm:inline"
                >
                  Sports
                </a>
                <a
                  href="#media"
                  className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-white/55 transition hover:text-racing-yellow"
                >
                  Media
                </a>
              </nav>
            ) : null}
          </div>
        </header>

        <main id="main-content">
          <section className="relative flex min-h-[92svh] items-end overflow-hidden" id="about">
            <div className="absolute inset-0">
              <img
                src={content.hero.background_image}
                alt=""
                aria-hidden
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-carbon-950 via-carbon-950/75 to-carbon-950/35" />
              <div className="absolute inset-0 bg-gradient-to-r from-carbon-950/85 via-carbon-950/25 to-transparent" />
            </div>

            <img
              src="/images/logos/CTR_yellow.png"
              alt=""
              aria-hidden
              className="pointer-events-none absolute right-4 top-24 w-24 select-none animate-float sm:right-10 sm:w-36 lg:w-44"
            />

            <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-14 pt-40 sm:px-6 sm:pb-20">
              <motion.p
                custom={0}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="font-display text-xs font-bold uppercase tracking-[0.24em] text-racing-yellow"
              >
                {content.hero.kicker}
              </motion.p>

              <motion.h1
                custom={1}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="mt-2 font-display text-[clamp(2.4rem,7vw,5.2rem)] font-bold uppercase leading-[0.95] tracking-wide text-white"
              >
                {content.hero.title}
              </motion.h1>

              <motion.p
                custom={2}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="mt-4 max-w-xl whitespace-pre-line text-base leading-relaxed text-white/75 sm:text-lg"
              >
                {content.hero.subtitle}
              </motion.p>

              <motion.div
                custom={3}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="mt-6 max-w-xl rounded-2xl border border-white/10 bg-black/35 p-5 backdrop-blur-sm"
              >
                <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-racing-yellow sm:text-xl">
                  {content.hero.about_title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/65 sm:text-base">{content.hero.about_body}</p>
              </motion.div>

              <motion.div
                custom={4}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="mt-8 flex flex-wrap gap-4"
              >
                <a
                  href="#sports"
                  className="inline-flex items-center gap-2 rounded-full bg-racing-yellow px-7 py-3 font-display text-sm font-semibold uppercase tracking-wider text-carbon-950 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_rgba(247,214,25,0.55)] active:translate-y-0"
                >
                  Explore Sports
                </a>
              </motion.div>
            </div>
          </section>

          {/* Three most recent posts, as banners. */}
          <PostBanners posts={bannerPosts} />

          <section className="mx-auto max-w-6xl px-5 py-20 sm:px-6 sm:py-24" id="sports">
            <Reveal className="max-w-2xl">
              <p className="font-display text-xs font-bold uppercase tracking-[0.24em] text-racing-yellow">
                {content.sports_section.kicker}
              </p>
              <h2 className="mt-2 font-display text-3xl font-bold uppercase leading-tight tracking-wide text-white sm:text-4xl lg:text-5xl">
                {content.sports_section.title}
              </h2>
            </Reveal>

            <div role="list" className="relative mt-6">
              <div
                aria-hidden
                className="absolute bottom-0 left-1/2 top-0 hidden w-px bg-gradient-to-b from-transparent via-white/10 to-transparent md:block"
              />
              {content.sports.map((sport, index) => (
                <Reveal key={sport.id} y={36} className="border-b border-white/5 last:border-b-0">
                  <SportRow sport={sport} index={index} />
                </Reveal>
              ))}
            </div>
          </section>

          {/* Every post, as a grid, at the bottom of the page. */}
          <div className="border-t border-white/5">
            <PostGrid posts={posts} />
          </div>
        </main>

        <footer className="border-t border-white/10">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-5 py-10 sm:flex-row sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <img src={content.brand.logo_image} alt="" aria-hidden className="h-8 w-auto" />
              <span className="font-display text-xs uppercase tracking-[0.2em] text-white/45">
                {content.brand.name} — {content.brand.subtitle}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/55 transition hover:border-racing-yellow/50 hover:text-racing-yellow"
                >
                  <SocialIcon name={social.icon} />
                </a>
              ))}
            </div>
          </div>
          <div className="border-t border-white/5 py-4 text-center text-[11px] text-white/30">
            © {year} <a href="https://krishna-vijay-g.vercel.app" target="_blank" className="hover:text-racing-yellow">CTR Unified.</a> All rights reserved.
          </div>
        </footer>
      </div>
    </>
  );
}
