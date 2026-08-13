/**
 * The message somebody sends from the footer.
 *
 * Three fields and a send button, on every page. It is the smallest possible
 * cousin of a registration form and it is written the same way, for the same
 * reason: ONE function decides what is acceptable, the browser runs it to say
 * so before anything is sent, and the route runs it again because the browser's
 * word is worth nothing. Two copies of "is this a valid email" is how the page
 * accepts something the server then refuses, or worse, the other way round.
 *
 * What it is NOT is a form builder. There is one of those in src/lib/forms.ts,
 * and a footer contact box has no questions to configure, no branching and no
 * entries screen — reusing that machinery here would mean carrying all of it to
 * ask somebody their name.
 *
 * Shared by the server and the browser, so nothing here may import `server-only`.
 */

import { isRecord } from "@/lib/normalise";

export const ENQUIRY_LIMITS = {
  name: 80,
  email: 254,
  message: 2000,
} as const;

/** Below this, a "message" is not one — it is a test of the send button. */
const MESSAGE_MIN = 10;
const NAME_MIN = 2;

export type Enquiry = { name: string; email: string; message: string };

export const BLANK_ENQUIRY: Enquiry = { name: "", email: "", message: "" };

/**
 * The same test the registration forms use.
 *
 * Deliberately loose: the only way to know an address works is to send to it,
 * and every rule stricter than this one refuses somebody's real address. What
 * it catches is a typo with no @ in it, which is the mistake that actually
 * happens.
 */
function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(value) && value.length <= ENQUIRY_LIMITS.email;
}

function clamp(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * What was typed, and what is wrong with it.
 *
 * Errors are keyed by field so the browser can put each message under the box
 * it belongs to. An empty `errors` object means it may be sent — the route
 * checks the same thing and stores `values`, never the raw input.
 */
export function checkEnquiry(input: unknown): {
  values: Enquiry;
  errors: Partial<Record<keyof Enquiry, string>>;
} {
  const record = isRecord(input) ? input : {};

  const values: Enquiry = {
    name: clamp(record.name, ENQUIRY_LIMITS.name),
    email: clamp(record.email, ENQUIRY_LIMITS.email),
    message: clamp(record.message, ENQUIRY_LIMITS.message),
  };

  const errors: Partial<Record<keyof Enquiry, string>> = {};

  if (values.name.length < NAME_MIN) {
    errors.name = "Please tell us your name.";
  }

  if (!values.email) {
    errors.email = "Please leave an email address, so we can reply.";
  } else if (!isEmail(values.email)) {
    errors.email = "That does not look like an email address.";
  }

  if (values.message.length < MESSAGE_MIN) {
    errors.message = "Please say a little more about what you need.";
  }

  return { values, errors };
}
