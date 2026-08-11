import { BRAND, SITE, SOCIALS } from "@/config/site";
import { SocialIcon } from "@/components/ui/SocialIcon";

/**
 * `year` comes down from the server render rather than being read from the
 * clock here, so the client cannot disagree with the server after hydration.
 */
export function SiteFooter({ year }: { year: number }) {
  return (
    <footer className="border-t border-white/10">
      <div className="section-shell flex flex-col items-center gap-5 py-10 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-3">
          <img
            src={BRAND.logo}
            alt=""
            aria-hidden
            width={32}
            height={32}
            loading="lazy"
            decoding="async"
            className="h-8 w-auto"
          />
          <span className="font-display text-xs uppercase tracking-[0.2em] text-white/45">
            {BRAND.name} — {BRAND.subtitle}
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
        © {year} {SITE.name}. All rights reserved.
      </div>
    </footer>
  );
}
