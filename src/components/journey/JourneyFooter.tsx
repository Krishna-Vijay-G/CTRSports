import { contact, socials } from "@/data/biographyData";
import { TripleChevron } from "./Motifs";

const F4_SITE = "https://chennaiturboriders.in";

const quickLinks = [
  { label: "Home", href: `/` },
  { label: "Our Story", href: "#hero" },
  { label: "Team", href: `${F4_SITE}/team` },
  { label: "Schedule", href: `${F4_SITE}/schedule` },
  { label: "News", href: `${F4_SITE}/news` },
  { label: "Sponsors", href: `${F4_SITE}/sponsors` },
];

export default function JourneyFooter() {
  const year = new Date().getFullYear();

  return (
    <footer
      id="contact"
      className="relative bg-ctr-navy-deep text-white overflow-hidden scroll-mt-24"
    >
      <div className="absolute top-0 left-0 right-0 h-1 bg-gold-gradient" />

      {/* Contact CTA band */}
      <div className="section-container pt-16 pb-10 border-b border-white/10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div>
            <p className="kicker text-ctr-gold mb-3">Get in touch</p>
            <h2 className="display-title text-white text-[clamp(1.8rem,4vw,3rem)]">
              Join the Movement
            </h2>
            <p className="body-copy text-white/70 mt-3 max-w-md">
              From passion to purpose, from track to legacy — be part of India&apos;s
              complete motorsport ecosystem.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a href={`mailto:${contact.email}`} className="btn-gold">
              Email CTR
            </a>
            <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="btn-ghost-light">
              {contact.phone}
            </a>
          </div>
        </div>
      </div>

      <div className="section-container pt-12 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <img
                src="/images/journey/CTR_yellow.png"
                alt="Chennai Turbo Riders"
                className="h-12 w-auto"
              />
              <div className="leading-none">
                <span className="block font-display font-bold text-lg tracking-wide">CTR</span>
                <span className="block text-[9px] uppercase tracking-[0.3em] text-ctr-gold font-semibold">
                  Chennai Turbo Riders
                </span>
              </div>
            </div>
            <p className="text-sm text-white/60 leading-relaxed max-w-xs mb-5">
              India&apos;s Formula 4 champions building a complete national motorsport
              ecosystem — from grassroots karting to international racing.
            </p>
            <div className="flex gap-2.5">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${s.label} — ${s.handle}`}
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-white/20 text-white/70 hover:border-ctr-gold hover:text-ctr-gold transition-all text-xs font-semibold uppercase"
                >
                  {s.label.charAt(0)}
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-display font-bold text-sm uppercase tracking-[0.2em] mb-4">
              Quick Links
            </h3>
            <div className="w-8 h-[2px] bg-ctr-gold mb-4" />
            <nav className="space-y-2.5">
              {quickLinks.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  className="block text-sm text-white/60 hover:text-ctr-gold transition-colors font-display tracking-wide"
                >
                  {l.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Social handles */}
          <div>
            <h3 className="font-display font-bold text-sm uppercase tracking-[0.2em] mb-4">
              Follow CTR
            </h3>
            <div className="w-8 h-[2px] bg-ctr-gold mb-4" />
            <nav className="space-y-2.5">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-white/60 hover:text-ctr-gold transition-colors"
                >
                  <span className="text-ctr-gold mr-2 font-display">{s.label}</span>
                  {s.handle}
                </a>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-display font-bold text-sm uppercase tracking-[0.2em] mb-4">
              Contact
            </h3>
            <div className="w-8 h-[2px] bg-ctr-gold mb-4" />
            <div className="space-y-3 text-sm text-white/60">
              <p>{contact.address}</p>
              <p>
                <a href={`mailto:${contact.email}`} className="hover:text-ctr-gold transition-colors">
                  {contact.email}
                </a>
              </p>
              <p>
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="hover:text-ctr-gold transition-colors">
                  {contact.phone}
                </a>
              </p>
              <p className="text-white/40 pt-1">
                Founded {contact.founded} · {contact.city}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/40 tracking-wider">
            © {year} Chennai Turbo Riders Pvt Ltd. All Rights Reserved.
          </p>
          <p className="flex items-center gap-2 text-xs text-ctr-gold/80 font-display uppercase tracking-[0.2em]">
            <TripleChevron className="text-ctr-gold/70" />
            Born to Race. Built to Win.
          </p>
        </div>
      </div>
    </footer>
  );
}
