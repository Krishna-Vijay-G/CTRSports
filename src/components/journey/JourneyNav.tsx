"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Chapter } from "@/data/biographyData";
import { cn } from "@/lib/utils";

const MAIN_SITE = "https://chennaiturboriders.in";

const primaryLinks = [
  { label: "Home", href: `/`, external: false },
  { label: "Our Story", href: "#hero", external: false },
  { label: "Team", href: `${MAIN_SITE}/team`, external: true },
  { label: "Contact", href: "#contact", external: false },
];

export default function JourneyNav({ chapters }: { chapters: Chapter[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const onScroll = useCallback(() => setScrolled(window.scrollY > 40), []);

  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <a
        href="#origin"
        className="sr-only focus:not-sr-only focus:fixed focus:top-11 focus:left-4 focus:z-[90] focus:bg-ctr-navy focus:text-white focus:px-4 focus:py-2 focus:rounded-md"
      >
        Skip to content
      </a>

      <nav
        className={cn(
          "fixed left-0 right-0 top-9 z-[60] transition-all duration-500",
          scrolled
            ? "bg-white/85 backdrop-blur-md border-b border-ctr-navy/10 py-2.5 shadow-[0_6px_24px_-16px_rgba(27,42,99,0.4)]"
            : "bg-transparent py-4"
        )}
      >
        <div className="section-container flex items-center justify-between">
          <a href="#hero" className="flex items-center gap-3 group">
            <span className="relative">
              <img
                src="/images/journey/CTR_yellow.png"
                alt="Chennai Turbo Riders"
                className="h-10 w-auto transition-transform duration-300 group-hover:scale-105 drop-shadow-[0_3px_8px_rgba(244,180,0,0.35)]"
              />
            </span>
            <span className="hidden sm:block leading-none">
              <span className="block font-display font-bold text-ctr-navy text-base tracking-wide">
                CTR
              </span>
              <span className="block text-[9px] uppercase tracking-[0.3em] text-ctr-gold-deep font-semibold">
                Our Story
              </span>
            </span>
          </a>

          <div className="hidden lg:flex items-center gap-1">
            {primaryLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                {...(link.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="relative px-4 py-2 font-display font-medium text-sm uppercase tracking-widest text-ctr-navy/80 hover:text-ctr-navy transition-colors group"
              >
                {link.label}
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gold-gradient transition-all duration-300 group-hover:w-2/3" />
              </a>
            ))}
            <a href="#origin" className="btn-gold ml-3 !py-2 !px-5 text-xs">
              Explore
            </a>
          </div>

          <button
            className="lg:hidden relative w-10 h-10 flex items-center justify-center text-ctr-navy"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            <div className="flex flex-col gap-1.5">
              <span className={cn("block w-6 h-[2px] bg-ctr-navy transition-all duration-300", open && "rotate-45 translate-y-[5px]")} />
              <span className={cn("block w-6 h-[2px] bg-ctr-navy transition-all duration-300", open && "opacity-0")} />
              <span className={cn("block w-6 h-[2px] bg-ctr-navy transition-all duration-300", open && "-rotate-45 -translate-y-[5px]")} />
            </div>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[80] bg-ctr-navy-deep/98 backdrop-blur-xl overflow-y-auto"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gold-gradient" />
            <div className="flex justify-end p-5">
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="w-10 h-10 flex items-center justify-center text-white"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className="px-8 pb-16">
              <p className="kicker text-ctr-gold mb-4">Primary</p>
              <nav className="flex flex-col gap-1 mb-10">
                {primaryLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    {...(link.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    onClick={() => setOpen(false)}
                    className="font-display font-bold text-2xl uppercase tracking-wide text-white hover:text-ctr-gold transition-colors py-1"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>

              <p className="kicker text-ctr-gold mb-4">Chapters</p>
              <nav className="grid gap-1.5">
                {chapters
                  .filter((c) => c.id !== "hero")
                  .map((c) => (
                    <a
                      key={c.id}
                      href={`#${c.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 py-2 text-white/85 hover:text-ctr-gold transition-colors"
                    >
                      <span className="font-display font-bold text-ctr-gold w-8">{c.number}</span>
                      <span className="font-display uppercase tracking-wide text-lg">{c.title}</span>
                    </a>
                  ))}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
