"use client";

import { mailHref, telHref, type LandingContent } from "@/lib/landingContent";
import { FooterEnquiry } from "@/components/layout/FooterEnquiry";
import { SocialIcon } from "@/components/ui/SocialIcon";

/**
 * The foot of every page: who this is, where to go next, and how to reach them.
 *
 * ── Why it is columns ─────────────────────────────────────────────────────
 *
 * It used to be one row of three things, and when the contact details arrived
 * they went under the brand as a single stack — an address, a number and an
 * email running one under another with nothing to tell them apart. Three
 * different kinds of thing in one column read as one paragraph, and the eye has
 * to read all of it to find the one line it came for.
 *
 * So: a column per kind of thing — who, where to, how to reach, and the box
 * that writes to them — each under its own small heading, with a glyph on every
 * contact line so the number is found by shape before it is read. They stack on
 * a phone in the order somebody scrolling wants them: the name, the links, the
 * address, then the form.
 *
 * The navigation column is empty on this site today and is drawn the moment
 * there are links to draw, so adding them later is an edit in the admin rather
 * than a change here.
 *
 * ── The rest ──────────────────────────────────────────────────────────────
 *
 * `year` comes down from the server render rather than being read from the
 * clock here, so the client cannot disagree with the server after hydration.
 *
 * Everything below is optional. A blank line is left out entirely rather than
 * printed as a label with nothing after it, and a whole column with nothing in
 * it is not drawn — so the grid closes up rather than leaving a hole.
 */
export function SiteFooter({ content, year }: { content: LandingContent; year: number }) {
  const { brand, nav, socials, contact } = content;

  const tel = telHref(contact.phone);
  const mail = mailHref(contact.email);
  const hasContact = Boolean(contact.address || contact.phone || contact.email);

  return (
    <footer id="footer" className="border-t border-line">
      {/*
        Flex rather than a grid with named tracks, because how many columns
        there are is not fixed: this site currently has no footer navigation at
        all, and a three-track grid would put the contact block in the narrow
        middle column with an empty third beside it. Spreading whatever columns
        exist is the layout that is right at two and at three.
      */}
      <div className="shell flex flex-col gap-10 py-12 sm:flex-row sm:flex-wrap sm:justify-between sm:gap-x-16 sm:gap-y-10">
        {/* ── Who ── */}
        <div className="sm:max-w-[15rem]">
          <div className="flex items-center gap-2.5">
            <img
              src={brand.logo}
              alt=""
              aria-hidden
              width={40}
              height={40}
              loading="lazy"
              decoding="async"
              className="h-10 w-auto"
            />
            <span className="flex flex-col leading-tight">
              <strong className="font-display text-base font-extrabold tracking-tight text-fg">
                {brand.name}
              </strong>
              <span className="text-xs text-fg-faint">{brand.subtitle}</span>
            </span>
          </div>

          {socials.length > 0 ? (
            <div className="mt-6 flex flex-wrap items-center gap-2">
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
          ) : null}
        </div>

        {/* ── Where to ── */}
        {nav.links.length > 0 ? (
          <nav aria-labelledby="footer-nav-heading">
            {/* "Explore" is chrome, not content — the same kind of fixed wording
                as the copyright line under it. The links themselves are the
                editable part, and they are the site's own navigation, so this
                column can never drift from the header. */}
            <FooterHeading id="footer-nav-heading">Explore</FooterHeading>

            <ul className="mt-4 space-y-2.5">
              {nav.links.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <a
                    href={link.href}
                    className="group inline-flex items-center gap-2 text-sm font-medium text-fg-muted transition hover:text-fg"
                  >
                    <span
                      aria-hidden
                      className="h-px w-0 bg-accent transition-all duration-300 group-hover:w-3"
                    />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}

        {/* ── How to reach ── */}
        {hasContact ? (
          /* A real <address> element: this is the contact information for the
             organisation that owns the page, which is exactly what the tag
             means. Browsers italicise it by default, hence not-italic. */
          <address className="not-italic">
            {contact.heading ? (
              <FooterHeading id="footer-contact-heading">{contact.heading}</FooterHeading>
            ) : null}

            <ul className="mt-4 space-y-3.5">
              {contact.address ? (
                <li className="flex gap-3">
                  <PinGlyph />
                  {/* whitespace-pre-line so the lines it was typed on are the
                      lines it is read on. */}
                  <span className="whitespace-pre-line text-sm leading-relaxed text-fg-muted">
                    {contact.address}
                  </span>
                </li>
              ) : null}

              {contact.phone ? (
                <li className="flex items-center gap-3">
                  <PhoneGlyph />
                  <ContactValue href={tel} label={contact.phone} />
                </li>
              ) : null}

              {contact.email ? (
                <li className="flex items-center gap-3">
                  <MailGlyph />
                  <ContactValue href={mail} label={contact.email} />
                </li>
              ) : null}
            </ul>
          </address>
        ) : null}

        {/* ── The box that writes to them ── */}
        <div className="w-full sm:w-[21rem] lg:w-[23rem]">
          <FooterEnquiry heading={contact.formHeading} note={contact.formNote} />
        </div>
      </div>

      <div className="border-t border-line py-4 text-center text-xs text-fg-faint">
        © {year} {brand.name}. All rights reserved.
      </div>
    </footer>
  );
}

/** The small line over a column. One definition, so the three cannot drift. */
function FooterHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-faint"
    >
      {children}
    </h2>
  );
}

/**
 * A number or an email — a link where it can be one, plain text where it
 * cannot.
 *
 * `href` is "" when there was nothing dialable or nothing that looked like an
 * address in what was typed. Printing it plainly is the honest answer there; a
 * link that opens an empty message window is worse than no link.
 */
function ContactValue({ href, label }: { href: string; label: string }) {
  if (!href) return <span className="text-sm text-fg-muted">{label}</span>;

  return (
    <a
      href={href}
      className="text-sm font-medium text-fg-muted underline decoration-transparent underline-offset-4 transition hover:text-accent hover:decoration-accent/60"
    >
      {label}
    </a>
  );
}

/*
 * Three glyphs, drawn here for the reason SocialIcon gives about its own: the
 * footer costs no icon library. They are `shrink-0` and sized to the first line
 * of text beside them, so a three-line address keeps its pin at the top rather
 * than floating in the middle of the block.
 */

const glyph = {
  className: "mt-0.5 h-4 w-4 shrink-0 text-accent",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function PinGlyph() {
  return (
    <svg {...glyph}>
      <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function PhoneGlyph() {
  return (
    <svg {...glyph} className="h-4 w-4 shrink-0 text-accent">
      <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z" />
    </svg>
  );
}

function MailGlyph() {
  return (
    <svg {...glyph} className="h-4 w-4 shrink-0 text-accent">
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="m3.8 7 7.1 5.2a2 2 0 0 0 2.2 0L20.2 7" />
    </svg>
  );
}
