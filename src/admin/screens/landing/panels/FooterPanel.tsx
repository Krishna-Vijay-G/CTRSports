"use client";

import {
  CONTACT_MAX,
  MAX_SOCIALS,
  SOCIAL_ICONS,
  mailHref,
  telHref,
  type LandingContent,
  type SocialIconName,
} from "@/lib/landingContent";
import { Button } from "@/admin/ui/Button";
import { Input, Select } from "@/admin/ui/Input";
import { PlusIcon, XIcon } from "@/admin/ui/icons";
import { Field, Note, Panel, Row, TextArea } from "@/admin/components/Fields";

type Socials = LandingContent["socials"];
type Contact = LandingContent["contact"];
type Footer = LandingContent["footer"];

/**
 * The foot of every page: how to reach the organisation, and the social links.
 *
 * The contact block is in the LANDING document rather than on a page of its
 * own because this footer is drawn on every route from that one document — an
 * address corrected here is corrected on /incrc, on a circuit page, on a deck
 * and under an entry form at the same time. It is also what the header’s
 * “Get in Touch” has always pointed at.
 */
export function FooterPanel({
  value,
  onChange,
  contact,
  onContactChange,
  footer,
  onFooterChange,
}: {
  value: Socials;
  onChange: (next: Socials) => void;
  contact: Contact;
  onContactChange: (next: Contact) => void;
  footer: Footer;
  onFooterChange: (next: Footer) => void;
}) {
  function setSocial(index: number, patch: Partial<Socials[number]>) {
    onChange(value.map((social, i) => (i === index ? { ...social, ...patch } : social)));
  }

  const set = (patch: Partial<Contact>) => onContactChange({ ...contact, ...patch });

  return (
    <>
    <Panel title="About line">
      <TextArea
        label="Under the logo"
        value={footer.blurb}
        onChange={(blurb) => onFooterChange({ blurb })}
        rows={3}
        hint="One or two sentences saying what this organisation is. Blank hides it."
      />

      <Note className="mt-3">
        For the reader who arrived on a deck or an entry form and has never seen the home page —
        the footer is often the only thing on that page that says who you are.
      </Note>
    </Panel>

    <Panel title="Contact">
      <div className="space-y-3">
        <Field
          label="Heading"
          value={contact.heading}
          onChange={(heading) => set({ heading })}
          placeholder="Get in touch"
          hint="The small line above the address. Blank hides it."
        />

        <TextArea
          label="Office address"
          value={contact.address}
          onChange={(address) => set({ address })}
          rows={3}
          maxLength={CONTACT_MAX.address}
          hint="Printed on the lines you type it on. Blank leaves it out."
        />

        <Row>
          <Field
            label="Phone"
            value={contact.phone}
            onChange={(phone) => set({ phone })}
            maxLength={CONTACT_MAX.phone}
            placeholder="9500016999"
            hint={
              contact.phone
                ? telHref(contact.phone)
                  ? `Dials ${telHref(contact.phone).replace("tel:", "")}`
                  : "Nothing dialable in this — it will be printed, not linked."
                : "Blank leaves it out."
            }
          />
          <Field
            label="Email"
            value={contact.email}
            onChange={(email) => set({ email })}
            maxLength={CONTACT_MAX.email}
            placeholder="admin@example.com"
            hint={
              contact.email
                ? mailHref(contact.email)
                  ? "Opens a new message."
                  : "That is not an email address — it will be printed, not linked."
                : "Blank leaves it out."
            }
          />
        </Row>
      </div>

      <Note className="mt-3">
        This block is at the foot of EVERY page — the landing page, INCRC, the circuits, the
        decks and every entry form — because they all draw this one footer.
      </Note>
    </Panel>

    <Panel title="Message box">
      <div className="space-y-3">
        <Field
          label="Heading"
          value={contact.formHeading}
          onChange={(formHeading) => set({ formHeading })}
          placeholder="Send a message"
          hint="Blank hides it."
        />

        <TextArea
          label="Line under it"
          value={contact.formNote}
          onChange={(formNote) => set({ formNote })}
          rows={2}
          maxLength={CONTACT_MAX.formNote}
          hint="One sentence saying what happens next. Blank hides it."
        />
      </div>

      <Note className="mt-3">
        Only the wording is editable. The three boxes — name, email and query — are what the
        form is; there is no question to add or remove, and an entry form with real questions on
        it is what the Registrations screen is for.
      </Note>
    </Panel>

    <Panel title="Social links" hint={`${value.length} of ${MAX_SOCIALS}`}>
      <div className="space-y-1.5">
        {value.map((social, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <Select
              value={social.icon}
              onChange={(event) => setSocial(index, { icon: event.target.value as SocialIconName })}
              aria-label={`Link ${index + 1} icon`}
              className="h-8 w-[92px] shrink-0 px-1.5 text-xs"
            >
              {SOCIAL_ICONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </Select>
            <Input
              value={social.label}
              onChange={(event) => setSocial(index, { label: event.target.value })}
              placeholder="Label"
              aria-label={`Link ${index + 1} label`}
              className="h-8 w-24 shrink-0 text-xs"
            />
            <Input
              value={social.href}
              onChange={(event) => setSocial(index, { href: event.target.value })}
              placeholder="https://…"
              aria-label={`Link ${index + 1} address`}
              className="h-8 min-w-0 flex-1 text-xs"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              aria-label={`Remove ${social.label || "social link"}`}
              className="hover:text-destructive"
            >
              <XIcon />
            </Button>
          </div>
        ))}
      </div>

      {value.length === 0 ? <Note>No social links — the footer shows the brand only.</Note> : null}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...value, { label: "", href: "https://", icon: "website" }])}
        disabled={value.length >= MAX_SOCIALS}
        className="mt-2"
      >
        <PlusIcon />
        Add social
      </Button>

      <Note className="mt-3">
        The icon is picked from a fixed set — anything else falls back to the globe. These addresses
        are also what search engines are told about the organisation, so use the real profile URLs.
      </Note>
    </Panel>
    </>
  );
}
