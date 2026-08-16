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

import { isRecord, oneOf } from "@/lib/normalise";

export const ENQUIRY_LIMITS = {
  name: 80,
  email: 254,
  message: 2000,
} as const;

/**
 * Where an enquiry has got to.
 *
 * Three states rather than the `handled` boolean this replaces, because two
 * could not express the one thing a monitor is for: a message nobody has opened
 * and a message somebody is part-way through answering both read as "not
 * handled", and they need entirely different actions from whoever is looking.
 *
 * The order here is the order they are shown in and the order they are worked
 * through, so it is also the order the filter chips appear in.
 */
export const ENQUIRY_STATUSES = ["unread", "in_progress", "resolved"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  unread: "Unread",
  in_progress: "In progress",
  resolved: "Resolved",
};

/**
 * An unrecognised status reads as `unread`, never as `resolved`.
 *
 * The same rule `normaliseRole` follows and for the same reason: the fallback
 * has to be the state that gets a message LOOKED at. A bad value that quietly
 * became "resolved" is a customer nobody ever replies to.
 */
export function normaliseEnquiryStatus(value: unknown): EnquiryStatus {
  return oneOf(value, ENQUIRY_STATUSES, "unread");
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Same reasoning as `isFormId`: a malformed id should 400, not blow up Postgres. */
export function isEnquiryId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/**
 * An enquiry as it is stored, which is what the console screen renders.
 *
 * Here rather than in enquiriesRepo for the reason `Form` and `FormEntry` are
 * in src/lib/forms.ts: the table that draws these is a client component, and a
 * type it needs cannot live behind `server-only`. `import type` would erase at
 * build time and happen to work, but it puts a browser file one careless edit
 * away from pulling the database driver into the bundle.
 */
export type StoredEnquiry = Enquiry & {
  id: string;
  status: EnquiryStatus;
  /** When it was archived, or null while it is still in the working list. */
  archived_at: string | null;
  ip: string;
  user_agent: string;
  created_at: string;
};

/**
 * Where the next page starts.
 *
 * Both halves. Two enquiries can share a millisecond, and a cursor on the
 * timestamp alone steps over whichever of them lands on a page boundary — the
 * same rule, and the same reasoning, as `EntryCursor`.
 */
export type EnquiryCursor = { at: string; id: string };

/** The counts behind the filter chips. */
export type EnquiryCounts = Record<EnquiryStatus, number> & { archived: number };

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
