/**
 * A registration form: what it asks, and what an answer to it has to look like.
 *
 * The site used to send anyone wanting to enter to a form on another site. This
 * is that form, here — which is what makes an entry a row in this database, and
 * what lets the person who owns entries be somebody other than the person who
 * owns the page it is linked from.
 *
 * ── Two things a form is ──────────────────────────────────────────────────
 *
 * A DOCUMENT, edited in the admin: a name, an address, some copy, and a list of
 * questions. That half looks like every other content model here — a type, a
 * table of limits, and a normaliser that runs on the way in and on the way out.
 *
 * And a CONTRACT, which is new. Nothing else in this project accepts anything
 * from a stranger. `validateSubmission` is where that happens, and it is the
 * only thing that decides what gets stored: the browser runs it to say so
 * before anything is sent, and the route runs it again because the browser's
 * word is worth nothing. One function, so the two cannot disagree about what is
 * acceptable — and the server's answer is the one that counts.
 *
 * ── What a field is ───────────────────────────────────────────────────────
 *
 * Every type here is a real `<input type>` or a `<select>`; none of them is a
 * widget we have to build and maintain.
 *
 * The four CHOICE types are a grid — dropdown or buttons, one answer or several
 * — and they are four types rather than two with a flag because the shape is an
 * editorial decision. Four options read at a glance as radio buttons and are
 * hidden behind a click as a dropdown; twenty are the other way round, and only
 * whoever writes the question knows which it is. What they store is shared:
 * `select` and `radio` store one option, `checkboxes` and `multiselect` store a
 * list, so the two pairs are the same answer drawn differently and swapping
 * between them never invalidates a stored entry.
 *
 * Deliberately absent:
 *
 *   file upload   the only upload path in this project is behind an authed
 *                 admin route. Opening one to the public needs a size quota, an
 *                 expiry for the orphans a half-finished form leaves behind,
 *                 and an answer about what ends up in the bucket. None of that
 *                 is a form-builder problem, so it is not solved here.
 *
 * A field's `id` is stable for its whole life and is never reused, because a
 * stored answer is keyed by it. Renaming a label is free; deleting a field
 * leaves its answers behind in the entries, and the CSV export prints them
 * under "No longer asked" rather than quietly dropping them.
 *
 * Shared by the server and the browser, so nothing here may import
 * `server-only`.
 */

import { BODY_MAX, isRecord, isoDate, lines, oneOf, optionalText, text } from "@/lib/normalise";
import { FORM_PAGE_KEYS, type FormPageKey } from "@/lib/roles";

/* ──────────────────────────────── Shape ──────────────────────────────── */

/**
 * Draft, open, or closed.
 *
 * Three rather than a boolean, because "not accepting entries" and "not a page
 * yet" are different things to a visitor: a closed form still explains what it
 * was and says entries have shut, and a draft is not on the internet at all.
 */
export const FORM_STATUSES = ["draft", "open", "closed"] as const;
export type FormStatus = (typeof FORM_STATUSES)[number];

export const STATUS_LABELS: Record<FormStatus, string> = {
  draft: "Draft",
  open: "Open",
  closed: "Closed",
};

export const FORM_FIELD_TYPES = [
  "text",
  "textarea",
  "email",
  "phone",
  "number",
  "select",
  "multiselect",
  "radio",
  "checkboxes",
  "checkbox",
  "date",
] as const;
export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

/**
 * The four choice types are a grid, and the labels say so: the SHAPE the
 * question takes, then how many answers it allows.
 *
 * They are four types rather than two with a flag because the shape is a real
 * editorial decision, not a rendering detail. Four options are read at a glance
 * as buttons and hidden behind a click as a dropdown; twenty are the other way
 * round. Whoever writes the question is the one who knows which.
 */
export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: "Short text",
  textarea: "Long text",
  email: "Email",
  phone: "Phone",
  number: "Number",
  select: "Dropdown — one",
  multiselect: "Dropdown — several",
  radio: "Radio buttons — one",
  checkboxes: "Tick boxes — several",
  checkbox: "Yes / no",
  date: "Date",
};

/** Guidance in the builder, where "which of these four" is the actual question. */
export const FIELD_TYPE_HINTS: Partial<Record<FormFieldType, string>> = {
  select: "One answer, hidden behind a click. Right for a long list — a state, a category.",
  multiselect: "Several answers from one dropdown. Compact, but harder to use on a phone.",
  radio: "One answer, all of them on screen. Right for a handful of options.",
  checkboxes: "Several answers, all of them on screen. Right for a handful of options.",
};

/** The types that read `options`. Every other type ignores the list. */
export const CHOICE_TYPES: readonly FormFieldType[] = [
  "select",
  "multiselect",
  "radio",
  "checkboxes",
];

export function isChoice(type: FormFieldType): boolean {
  return CHOICE_TYPES.includes(type);
}

/**
 * Whether an answer to this is a LIST rather than one value.
 *
 * The one thing that actually changes downstream: what is stored, what the
 * blank value is, and whether the export joins it. Everything else about the
 * four choice types is how they are drawn.
 */
export function isMultiChoice(type: FormFieldType): boolean {
  return type === "checkboxes" || type === "multiselect";
}

export type FormField = {
  /** Stable for the life of the field. Answers are keyed by it; never reused. */
  id: string;
  type: FormFieldType;
  label: string;
  /** The line under the control. Blank prints nothing. */
  help: string;
  placeholder: string;
  required: boolean;
  /**
   * Choice types only. The label IS the stored value — renaming an option must
   * not rewrite what somebody actually chose, and the export wants the words
   * they picked rather than a code nobody can read.
   */
  options: string[];
};

export type Form = {
  id: string;
  name: string;
  slug: string;
  /** '' when the form belongs to no page — reachable only by its own address. */
  page_key: FormPageKey | "";
  status: FormStatus;
  /** One line, printed on the card that links to it. */
  blurb: string;
  intro_title: string;
  intro_body: string;
  submit_label: string;
  success_title: string;
  success_body: string;
  closed_note: string;
  /** Stored, not yet read. See src/lib/server/notify.ts. */
  notify_to: string;
  fields: FormField[];
  former_slugs: string[];
  sort_order: number;
};

/** What a card and a picker need. Never the questions. */
export type FormSummary = Pick<
  Form,
  "id" | "name" | "slug" | "page_key" | "status" | "blurb" | "sort_order"
>;

export type Submission = Record<string, string | string[]>;

export type FormEntry = {
  id: string;
  form_id: string;
  answers: Submission;
  ip: string;
  user_agent: string;
  created_at: string;
};

/* ──────────────────────────────── Limits ─────────────────────────────── */

export const FORM_LIMITS = {
  name: 120,
  slug: 80,
  blurb: 200,
  intro_title: 160,
  intro_body: BODY_MAX,
  submit_label: 40,
  success_title: 160,
  success_body: BODY_MAX,
  closed_note: 300,
  notify_to: 200,

  field_label: 160,
  field_help: 300,
  field_placeholder: 120,
  field_option: 120,

  /* What one ANSWER may be. Nothing to do with the field's own copy: these are
     what a stranger can send, so they are the numbers that matter. */
  value_text: 300,
  value_textarea: 4000,
  value_email: 254,
  value_phone: 40,
  value_number: 20,
} as const;

export const MAX_FORM_FIELDS = 40;
export const MAX_FIELD_OPTIONS = 30;

/**
 * Everything one person may send in one go.
 *
 * A backstop rather than a real limit — 40 fields of 4 000 characters would not
 * reach it. It is here so a body that is nothing like a submission is refused
 * by its size before it is parsed.
 */
export const MAX_SUBMISSION_BYTES = 64 * 1024;

export const BLANK_FIELD: Omit<FormField, "id"> = {
  type: "text",
  label: "",
  help: "",
  placeholder: "",
  required: false,
  options: [],
};

export const BLANK_FORM: Omit<Form, "id"> = {
  name: "",
  slug: "",
  page_key: "",
  status: "draft",
  blurb: "",
  intro_title: "",
  intro_body: "",
  submit_label: "Send",
  success_title: "Thank you",
  success_body: "Your entry has been received. We will be in touch.",
  closed_note: "Entries for this one have closed.",
  notify_to: "",
  fields: [],
  former_slugs: [],
  sort_order: 0,
};

/* ─────────────────────────────── Addresses ───────────────────────────── */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Same reasoning as the circuits: a malformed id should 404, not reach Postgres. */
export function isFormId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/**
 * A slug suggested from a name.
 *
 * Only ever a suggestion. The column is the truth, because the address outlives
 * the name — see the note at the top of the table in scripts/schema.mjs.
 */
export function slugify(name: string): string {
  // Same decomposition trackSlug uses: strip the accents, then anything that is
  // not a letter or a digit becomes a hyphen.
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, FORM_LIMITS.slug);
}

/** Lower case, digits and hyphens; starts with a letter or a digit. */
export function isUsableSlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,79}$/.test(value);
}

export function formHref(form: Pick<Form, "slug">): string {
  return `/register/${form.slug}`;
}

/** The slug in a stored `/register/<slug>` link, or "" if it is not one. */
export function slugFromHref(href: string): string {
  const match = /^\/register\/([a-z0-9][a-z0-9-]*)$/.exec(href.trim());
  return match ? match[1] : "";
}

/* ───────────────────────────── Normalisation ─────────────────────────── */

/**
 * The questions, cleaned.
 *
 * A field with no id gets one built from its position, which is what carries a
 * form typed in the admin before it is first saved. Ids are deduplicated
 * because two fields sharing one would share an answer.
 */
export function normaliseFormFields(value: unknown): FormField[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();

  return value
    .filter(isRecord)
    .slice(0, MAX_FORM_FIELDS)
    .map((entry, index) => {
      const type = oneOf(entry.type, FORM_FIELD_TYPES, "text");

      let id = optionalText(entry.id, 64).replace(/[^A-Za-z0-9_-]/g, "");
      if (!id || seen.has(id)) id = `f${index + 1}${seen.size ? `-${seen.size}` : ""}`;
      seen.add(id);

      return {
        id,
        type,
        label: optionalText(entry.label, FORM_LIMITS.field_label),
        help: optionalText(entry.help, FORM_LIMITS.field_help),
        placeholder: optionalText(entry.placeholder, FORM_LIMITS.field_placeholder),
        required: entry.required === true,
        // Only the choice types keep a list. A select turned into a text field
        // and back would otherwise carry options nothing renders.
        options: isChoice(type)
          ? lines(entry.options, MAX_FIELD_OPTIONS, []).slice(0, MAX_FIELD_OPTIONS)
          : [],
      };
    });
}

export function normaliseFormInput(input: unknown): Omit<Form, "id"> {
  const record = isRecord(input) ? input : {};
  const d = BLANK_FORM;

  const name = optionalText(record.name, FORM_LIMITS.name);
  const typed = optionalText(record.slug, FORM_LIMITS.slug).toLowerCase();
  const slug = isUsableSlug(typed) ? typed : slugify(name || typed);

  return {
    name,
    slug,
    page_key: oneOf(record.page_key, FORM_PAGE_KEYS, "" as FormPageKey | ""),
    status: oneOf(record.status, FORM_STATUSES, "draft"),
    blurb: optionalText(record.blurb, FORM_LIMITS.blurb),
    intro_title: optionalText(record.intro_title, FORM_LIMITS.intro_title),
    intro_body: optionalText(record.intro_body, FORM_LIMITS.intro_body),
    submit_label: text(record.submit_label, d.submit_label, FORM_LIMITS.submit_label),
    success_title: optionalText(record.success_title, FORM_LIMITS.success_title),
    success_body: optionalText(record.success_body, FORM_LIMITS.success_body),
    closed_note: optionalText(record.closed_note, FORM_LIMITS.closed_note),
    notify_to: optionalText(record.notify_to, FORM_LIMITS.notify_to),
    fields: normaliseFormFields(record.fields),
    former_slugs: lines(record.former_slugs, 20, []).filter(isUsableSlug),
    sort_order: Number.isFinite(Number(record.sort_order))
      ? Math.trunc(Number(record.sort_order))
      : 0,
  };
}

/* ───────────────────────────── Submissions ───────────────────────────── */

/** Two dots either side of one @, nothing exotic. Postel, not a parser. */
function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@.]+\.[^\s@]+$/.test(value) && value.length <= FORM_LIMITS.value_email;
}

/** Digits, and the punctuation a person writes a number with. */
function isPhone(value: string): boolean {
  if (!/^[0-9+\-()\s]+$/.test(value)) return false;
  return (value.match(/\d/g) ?? []).length >= 7;
}

function clamp(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * One submission, checked against the questions as they are stored NOW.
 *
 * Everything a stranger sent that this does not recognise is dropped rather
 * than corrected: an unknown key is not a field, a choice that is not on the
 * list was not offered, and a "number" that is not one is not a number. What
 * survives is exactly what the form asked for, clamped to what an answer may
 * be — so what reaches the database can never be larger or stranger than the
 * form itself allows, whatever the browser did.
 *
 * Errors come back keyed by field id so the page can put each one under its own
 * control. An empty `errors` is the only thing that means "store this".
 */
export function validateSubmission(
  fields: FormField[],
  input: unknown
): { values: Submission; errors: Record<string, string> } {
  const sent = isRecord(input) ? input : {};
  const values: Submission = {};
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const raw = sent[field.id];
    const name = field.label || "This";

    let value: string | string[] = "";

    switch (field.type) {
      case "checkbox":
        // Stored as words rather than a boolean: the export is read by a person,
        // and a column of "true" is worse than a column of "Yes".
        value = raw === true || raw === "Yes" || raw === "on" ? "Yes" : "";
        break;

      // Tick boxes and a multiple dropdown differ only in how they are drawn.
      case "checkboxes":
      case "multiselect": {
        const picked = Array.isArray(raw) ? raw : [];
        value = picked
          .filter((entry): entry is string => typeof entry === "string")
          .filter((entry) => field.options.includes(entry))
          .slice(0, MAX_FIELD_OPTIONS);
        break;
      }

      // As do radio buttons and a single dropdown.
      case "select":
      case "radio": {
        const one = clamp(raw, FORM_LIMITS.field_option);
        value = field.options.includes(one) ? one : "";
        break;
      }

      case "number": {
        const one = clamp(raw, FORM_LIMITS.value_number);
        if (one && !Number.isFinite(Number(one))) {
          errors[field.id] = `${name} has to be a number.`;
        } else {
          value = one;
        }
        break;
      }

      case "date": {
        const one = isoDate(clamp(raw, 10));
        if (!one && clamp(raw, 20)) errors[field.id] = `${name} is not a date.`;
        value = one;
        break;
      }

      case "email": {
        const one = clamp(raw, FORM_LIMITS.value_email);
        if (one && !isEmail(one)) errors[field.id] = `${name} does not look like an email address.`;
        else value = one;
        break;
      }

      case "phone": {
        const one = clamp(raw, FORM_LIMITS.value_phone);
        if (one && !isPhone(one)) errors[field.id] = `${name} does not look like a phone number.`;
        else value = one;
        break;
      }

      case "textarea":
        value = clamp(raw, FORM_LIMITS.value_textarea);
        break;

      default:
        value = clamp(raw, FORM_LIMITS.value_text);
    }

    // Required is checked on what survived, not on what arrived: a choice that
    // is not on the list is the same as no choice at all.
    const empty = Array.isArray(value) ? value.length === 0 : value === "";
    if (field.required && empty && !errors[field.id]) {
      errors[field.id] = field.type === "checkbox" ? `${name} has to be ticked.` : `${name} is required.`;
    }

    values[field.id] = value;
  }

  return { values, errors };
}

/* ───────────────────────────── Reading entries ───────────────────────── */

/** What one answer prints as, whatever type it came from. */
export function answerText(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.join("; ");
  return value ?? "";
}

/** One row of the entries table: the current questions, in order, with answers. */
export function entryCells(fields: FormField[], entry: FormEntry): { field: FormField; text: string }[] {
  return fields.map((field) => ({ field, text: answerText(entry.answers[field.id]) }));
}

/**
 * Answers whose question no longer exists.
 *
 * Never dropped. The export is the only way these ever leave the database, and
 * a column that quietly disappears when somebody tidies up a form is data loss
 * nobody can see happening.
 */
export function orphanAnswers(fields: FormField[], entry: FormEntry): [string, string][] {
  const known = new Set(fields.map((field) => field.id));

  return Object.entries(entry.answers)
    .filter(([id]) => !known.has(id))
    .map(([id, value]) => [id, answerText(value)]);
}
