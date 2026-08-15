"use client";

import { mailHref, telHref, type LandingContent } from "@/lib/landingContent";
import { cn } from "@/lib/utils";
import { FooterEnquiry } from "@/components/layout/FooterEnquiry";
import { SocialIcon } from "@/components/ui/SocialIcon";

/**
 * The foot of every page: who this is, where to go next, how to reach them, and
 * the box that writes to them.
 *
 * ── Why it is columns ─────────────────────────────────────────────────────
 *
 * It was one row of three things, and when the contact details arrived they
 * went under the brand as a single stack — an address, a number and an email
 * running one under another with nothing to tell them apart. Three different
 * kinds of thing in one column read as one paragraph, and the eye has to read
 * all of it to find the one line it came for.
 *
 * So: a column per kind of thing, each under its own small heading, with a
 * glyph on every contact line so the number is found by shape before it is
 * read. They stack on a phone in the order somebody scrolling wants them.
 *
 * ── Why the columns are packed left with the form pushed right ────────────
 *
 * `justify-between` spread whatever columns existed across the full width, and
 * with the navigation empty — which it is on this site today — that left a
 * hand's width of nothing in the middle of the footer. Packing them from the
 * left with a fixed gap and pushing only the form to the right edge reads as
 * deliberate at two columns and at four, and the navigation slots in without
 * anything moving when links are added.
 *
 * ── The rest ──────────────────────────────────────────────────────────────
 *
 * `year` comes down from the server render rather than being read from the
 * clock here, so the client cannot disagree with the server after hydration.
 *
 * Everything is optional. A blank line is left out entirely rather than printed
 * as a label with nothing after it, and a whole column with nothing in it is
 * not drawn at all.
 */
export function SiteFooter({ content, year }: { content: LandingContent; year: number }) {
  const { brand, nav, socials, contact, footer } = content;

  const tel = telHref(contact.phone);
  const mail = mailHref(contact.email);
  const hasContact = Boolean(contact.address || contact.phone || contact.email);
  const hasBrand = Boolean(brand.logo || brand.name || brand.subtitle);

  return (
    <footer id="footer" className="border-t border-line">
      <div className="shell flex flex-wrap gap-x-12 gap-y-8 py-9 sm:py-10">
        {/* ── Who ──
            The column is drawn only when it has something in it: with no mark,
            no name, no line and no social links it is an empty 17rem block that
            still claims its share of the row's `gap-x-12`, pushing the columns
            after it out of place for content that is not there. */}
        {hasBrand || footer.blurb || socials.length > 0 ? (
          <div className="w-full sm:w-[17rem]">
            {hasBrand ? (
              <div className="flex items-center gap-2.5">
                {/* Same as the header: an empty `src` draws the 36×36 box the
                    attributes reserved rather than nothing at all. */}
                {brand.logo ? (
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
                ) : null}
                <span className="flex flex-col leading-tight">
                  {brand.name ? (
                    <strong className="font-display text-[15px] font-extrabold tracking-tight text-fg">
                      {brand.name}
                    </strong>
                  ) : null}
                  {brand.subtitle ? (
                    <span className="text-[11px] text-fg-faint">{brand.subtitle}</span>
                  ) : null}
                </span>
              </div>
            ) : null}

            {footer.blurb ? (
              <p
                className={cn(
                  "text-[13px] leading-relaxed text-fg-muted",
                  hasBrand && "mt-3"
                )}
              >
                {footer.blurb}
              </p>
            ) : null}

            {socials.length > 0 ? (
              <div
                className={cn(
                  "flex flex-wrap items-center gap-1.5",
                  (hasBrand || footer.blurb) && "mt-4"
                )}
              >
                {socials.map((social) => (
                  <SocialPill key={`${social.label}-${social.href}`} social={social} />
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Where to ── */}
        {nav.links.length > 0 ? (
          <nav aria-labelledby="footer-nav-heading" className="w-full sm:w-auto">
            {/* "Explore" is chrome, not content — the same kind of fixed wording
                as the copyright line under it. The links themselves are the
                editable part, and they are the site's own navigation, so this
                column can never drift from the header. */}
            <FooterHeading id="footer-nav-heading">Explore</FooterHeading>

            <ul className="mt-3 space-y-2">
              {nav.links.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <a
                    href={link.href}
                    className="group inline-flex items-center gap-2 text-[13px] font-medium text-fg-muted transition hover:text-fg"
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
          <address className="w-full not-italic sm:w-auto sm:max-w-[15rem]">
            {contact.heading ? (
              <FooterHeading id="footer-contact-heading">{contact.heading}</FooterHeading>
            ) : null}

            <ul className="mt-3 space-y-2">
              {contact.address ? (
                <li className="flex gap-2.5">
                  <PinGlyph />
                  {/* whitespace-pre-line so the lines it was typed on are the
                      lines it is read on. */}
                  <span className="whitespace-pre-line text-[13px] leading-snug text-fg-muted">
                    {contact.address}
                  </span>
                </li>
              ) : null}

              {contact.phone ? (
                <li className="flex items-center gap-2.5">
                  <PhoneGlyph />
                  <ContactValue href={tel} label={contact.phone} />
                </li>
              ) : null}

              {contact.email ? (
                <li className="flex items-center gap-2.5">
                  <MailGlyph />
                  <ContactValue href={mail} label={contact.email} />
                </li>
              ) : null}
            </ul>
          </address>
        ) : null}

        {/* ── The box that writes to them ── */}
        <div className="w-full sm:ml-auto sm:w-[20rem]">
          <FooterEnquiry heading={contact.formHeading} note={contact.formNote} />
        </div>
      </div>

      {/* Assembled rather than interpolated. Written inline, an unset brand name
          printed "© 2026 . All rights reserved." — a gap and a stranded full
          stop, which reads as a bug rather than as a name nobody has typed. */}
      <div className="border-t border-line py-3.5 text-center text-[11px] text-fg-faint">
        {[`© ${year}${brand.name ? ` ${brand.name}` : ""}`, "All rights reserved"].join(". ")}.
      </div>
    </footer>
  );
}

/**
 * One social link: a circle that grows into a pill with the name in it.
 *
 * The icons alone are recognisable enough for the four everybody knows and not
 * at all for the fifth — and the label was previously only in `aria-label`,
 * which is to say only for people not looking at it. Widening on hover puts the
 * name where the pointer already is without spending a row of the footer on
 * four words that are usually redundant.
 *
 * It is a real width change, not a tooltip: the pill takes the room, so the
 * ones after it move right rather than something being painted over them. The
 * transition covers the label's own margin too, or the gap would appear before
 * the word it belongs to.
 *
 * `group-focus-visible` as well as hover, because a keyboard tabbing through
 * these deserves the same label a pointer gets.
 */
function SocialPill({ social }: { social: LandingContent["socials"][number] }) {
  return (
    <a
      href={social.href}
      target="_blank"
      rel="noreferrer"
      aria-label={social.label}
      className="group flex h-9 min-w-9 items-center justify-center rounded-full border border-line px-2.5 text-fg-muted transition-colors hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent focus-visible:outline-none"
    >
      <SocialIcon name={social.icon} />

      {/*
        aria-hidden: the accessible name is the aria-label above, and a screen
        reader announcing "Instagram Instagram" is the cost of not saying so.
      */}
      <span
        aria-hidden
        className="ml-0 max-w-0 overflow-hidden whitespace-nowrap text-[12px] font-medium opacity-0 transition-all duration-300 group-hover:ml-1.5 group-hover:max-w-[6rem] group-hover:opacity-100 group-focus-visible:ml-1.5 group-focus-visible:max-w-[6rem] group-focus-visible:opacity-100 motion-reduce:transition-none"
      >
        {social.label}
      </span>
    </a>
  );
}

/** The small line over a column. One definition, so they cannot drift. */
function FooterHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-faint">
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
  if (!href) return <span className="text-[13px] text-fg-muted">{label}</span>;

  return (
    <a
      href={href}
      className="text-[13px] font-medium text-fg-muted underline decoration-transparent underline-offset-4 transition hover:text-accent hover:decoration-accent/60"
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
  className: "mt-px h-3.5 w-3.5 shrink-0 text-accent",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
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
    <svg {...glyph} className="h-3.5 w-3.5 shrink-0 text-accent">
      <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z" />
    </svg>
  );
}

function MailGlyph() {
  return (
    <svg {...glyph} className="h-3.5 w-3.5 shrink-0 text-accent">
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="m3.8 7 7.1 5.2a2 2 0 0 0 2.2 0L20.2 7" />
    </svg>
  );
}
