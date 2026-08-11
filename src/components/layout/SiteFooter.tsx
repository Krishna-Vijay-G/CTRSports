"use client";

import type { LandingContent } from "@/lib/landingContent";
import { SocialIcon } from "@/components/ui/SocialIcon";

/**
 * `year` comes down from the server render rather than being read from the
 * clock here, so the client cannot disagree with the server after hydration.
 */
export function SiteFooter({ content, year }: { content: LandingContent; year: number }) {
  const { brand, nav, socials } = content;

  return (
    <footer id="footer" className="border-t border-line">
      <div className="shell flex flex-col gap-8 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src={brand.logo}
            alt=""
            aria-hidden
            width={36}
            height={36}
            loading="lazy"
            decoding="async"
            className="h-9 w-auto"
          />
          <span className="flex flex-col leading-tight">
            <strong className="font-display text-base font-extrabold tracking-tight text-fg">
              {brand.name}
            </strong>
            <span className="text-xs text-fg-faint">{brand.subtitle}</span>
          </span>
        </div>

        {nav.links.length > 0 ? (
          <nav className="flex flex-wrap items-center gap-x-7 gap-y-2">
            {nav.links.map((link) => (
              <a
                key={`${link.label}-${link.href}`}
                href={link.href}
                className="text-sm font-medium text-fg-muted transition hover:text-fg"
              >
                {link.label}
              </a>
            ))}
          </nav>
        ) : null}

        <div className="flex items-center gap-2">
          {socials.map((social) => (
            <a
              key={`${social.label}-${social.href}`}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              aria-label={social.label}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-fg-muted transition hover:border-accent hover:bg-accent hover:text-accent-ink"
            >
              <SocialIcon name={social.icon} />
            </a>
          ))}
        </div>
      </div>

      <div className="border-t border-line py-4 text-center text-xs text-fg-faint">
        © {year} {brand.name}. All rights reserved.
      </div>
    </footer>
  );
}
