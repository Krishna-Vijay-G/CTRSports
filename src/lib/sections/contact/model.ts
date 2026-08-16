import { isRecord, text } from "@/lib/normalise";
import type { SectionModule } from "@/lib/sections/types";

/**
 * Where the organisation actually is, and how to reach it.
 *
 * In the footer, which is where the header's "Get in Touch" has always pointed —
 * the button existed before there was anything at the other end of it.
 *
 * Every field is optional. Blank leaves that line out of the footer entirely
 * rather than printing a label with nothing after it, so an organisation with no
 * public phone number simply has no phone line.
 */
export type Contact = {
  heading: string;
  address: string;
  phone: string;
  email: string;
  /** The small line over the message box. Blank hides it. */
  formHeading: string;
  /** One sentence under that heading. Blank hides it. */
  formNote: string;
};

/**
 * What the contact block will hold.
 *
 * The address is the long one because it is several lines; the other two are the
 * lengths a phone number and an address can actually be. They are here rather
 * than inline so the admin's inputs and the normaliser cannot disagree about
 * where the text is cut.
 */
export const CONTACT_MAX = { address: 300, phone: 40, email: 200, formNote: 200 } as const;

export const BLANK_CONTACT: Contact = {
  heading: "",
  address: "",
  phone: "",
  email: "",
  formHeading: "",
  formNote: "",
};

/**
 * `tel:` and `mailto:` addresses for what somebody typed.
 *
 * A phone number is written for a human — "9500016999", "+91 95000 16999",
 * "044 2834 1234" — and a `tel:` link has to be the digits, so the two cannot be
 * the same string. Everything that is not a digit goes, except a leading plus,
 * which is the one piece of punctuation that changes what is dialled.
 *
 * Returns "" when there is nothing dialable left, and the footer then prints the
 * line as plain text rather than as a link to nowhere.
 */
export function telHref(phone: string): string {
  const trimmed = phone.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/\D/g, "");
  return digits ? `tel:${plus}${digits}` : "";
}

/** The same for an address, which is only a link if it looks like one. */
export function mailHref(email: string): string {
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(trimmed) ? `mailto:${trimmed}` : "";
}

export const contact: SectionModule<Contact> = {
  type: "contact",
  label: "Contact",
  hint: "The address, number and message box at the foot of every page.",
  surface: ["chrome"],
  multiple: false,
  fixed: true,
  previewAt: "foot",
  blank: () => ({ ...BLANK_CONTACT }),
  normalise: (raw) => {
    const d = BLANK_CONTACT;
    const value = isRecord(raw) ? raw : {};

    return {
      heading: text(value.heading, d.heading),
      // `text` keeps an empty string and only falls back on a MISSING or
      // wrong-typed field, which is what makes clearing a line a real editorial
      // choice here rather than a change that silently reverts on the next read.
      address: text(value.address, d.address, CONTACT_MAX.address),
      phone: text(value.phone, d.phone, CONTACT_MAX.phone),
      email: text(value.email, d.email, CONTACT_MAX.email),
      formHeading: text(value.formHeading, d.formHeading),
      formNote: text(value.formNote, d.formNote, CONTACT_MAX.formNote),
    };
  },
};
