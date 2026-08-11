import { BRAND, NAV_LINKS } from "@/config/site";

/**
 * The sticky brand bar. Shared by every public page, so a page added under
 * src/app/(site)/ gets the same header by rendering this — the links come from
 * NAV_LINKS in src/config/site.ts.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-carbon-950/70 backdrop-blur-md">
      <div className="section-shell flex items-center justify-between py-3">
        <a href="#top" className="flex items-center gap-3" aria-label={BRAND.homeAriaLabel}>
          <img
            src={BRAND.logo}
            alt="CTR Unified logo"
            width={48}
            height={48}
            fetchPriority="high"
            decoding="async"
            className="h-10 w-auto sm:h-12"
          />
          <span className="flex flex-col leading-none">
            <strong className="font-display text-sm font-semibold tracking-[0.14em] text-racing-yellow sm:text-base">
              {BRAND.name}
            </strong>
            <span className="mt-1 text-[10px] tracking-[0.22em] text-white/45 sm:text-xs">
              {BRAND.subtitle}
            </span>
          </span>
        </a>

        <nav className="flex items-center gap-5">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-white/55 transition hover:text-racing-yellow"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
