import { INCRC } from "../_data/incrc";

/**
 * Follow the championship on Instagram.
 *
 * The championship's own account, not CTR's — this page is about INCRC, and the
 * handle is the one piece of it that updates between rounds.
 *
 * Its own component rather than an ActionButton because the glyph carries
 * Instagram's gradient, which is the one place on this site a colour other than
 * the accent is allowed: it is a logo, and a monochrome one would read as a
 * generic camera icon.
 */
export function FollowButton({ tone = "accent" }: { tone?: "accent" | "light" }) {
  const shell =
    tone === "accent"
      ? "border border-line bg-panel text-fg hover:border-fg-faint"
      : "border border-white/30 text-white hover:border-white/70";

  return (
    <a
      href={INCRC.instagram}
      target="_blank"
      rel="noreferrer"
      className={`group inline-flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-5 text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 ${shell}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#F58529,#DD2A7B_55%,#8134AF)] text-white">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="5.2" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      </span>
      Follow the championship
      <span className="text-accent transition-transform group-hover:translate-x-0.5">
        {INCRC.handle}
      </span>
    </a>
  );
}
