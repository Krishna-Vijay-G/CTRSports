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

/* ─────────────────────────── Asking conditionally ────────────────────── */

/**
 * A form is not always a flat list of questions.
 *
 * "Which class are you entering?" only makes sense once somebody has said they
 * race karts, and the categories on offer are different for karts and for
 * circuit cars. Asking everything of everyone and letting people work out which
 * half to ignore is how a form gets long, and a long form is one people abandon.
 *
 * So two separate things can be made conditional, and they are separate on
 * purpose because they answer different questions:
 *
 *   `when`         whether the question is ASKED at all.
 *   `optionsWhen`  which of its options are OFFERED, for a question that is
 *                  asked either way — the cascading pair of dropdowns.
 *
 * Both look BACKWARDS only, at answers to questions already put. That is what
 * makes the whole thing one forward pass with no possibility of a loop: by the
 * time a field is reached, everything it can refer to is already decided.
 *
 * ── Keys, not field ids ───────────────────────────────────────────────────
 *
 * A condition points at an ANSWER KEY. Usually that is a field's id, but a date
 * field asked to work out an age produces a second answer, and that one is
 * `<id>.age`. A dot is stripped out of field ids on the way in, so a derived key
 * can never collide with a real one — see `normaliseFormFields`.
 */

export const CONDITION_OPS = ["is", "not", "any", "answered", "blank", "atLeast", "atMost"] as const;
export type ConditionOp = (typeof CONDITION_OPS)[number];

export const CONDITION_OP_LABELS: Record<ConditionOp, string> = {
  is: "is",
  not: "is not",
  any: "is one of",
  answered: "has been answered",
  blank: "was left blank",
  atLeast: "is at least",
  atMost: "is at most",
};

/** Whether this comparison needs something to compare against. */
export function opTakesValue(op: ConditionOp): boolean {
  return op !== "answered" && op !== "blank";
}

/** Whether it compares numbers — an age, a number field — rather than words. */
export function opIsNumeric(op: ConditionOp): boolean {
  return op === "atLeast" || op === "atMost";
}

export type Condition = {
  /** The answer key this looks at. Blank means no condition at all. */
  key: string;
  op: ConditionOp;
  /** `any` uses the whole list; every other comparison uses the first. */
  values: string[];
};

/** No condition — ask it of everybody. */
export const ALWAYS: Condition = { key: "", op: "is", values: [] };

export type OptionFilter = {
  /** The answer key that decides. Blank means every option is offered. */
  key: string;
  /**
   * That answer, to the options it puts on offer.
   *
   * An option that appears in NO group is offered whatever was answered, which
   * is what carries the "none of the above" that belongs to every branch. An
   * option in one or more groups is offered only for those.
   */
  groups: Record<string, string[]>;
};

export const ALL_OPTIONS: OptionFilter = { key: "", groups: {} };

/**
 * The second answer a date field can produce.
 *
 * Age is stored rather than worked out when the entry is read, because it is a
 * fact about the day they entered: someone who was 17 when they registered for
 * a junior class does not stop having been 17 when their birthday passes and
 * somebody opens the spreadsheet. The date is kept too — the age is derived
 * from it, never a replacement for it — and they are separate columns.
 */
export const AGE_SUFFIX = ".age";

export function ageKey(fieldId: string): string {
  return `${fieldId}${AGE_SUFFIX}`;
}

/**
 * Whole years between an ISO date and today, as a string.
 *
 * A string because every other answer is one, and a column that is sometimes a
 * number and sometimes text is worse to read than one that is always text.
 * Blank for anything that is not a usable birth date — no date, a date in the
 * future, or one further back than a person lives.
 */
export function ageFrom(value: string, now: Date = new Date()): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) return "";

  const [year, month, day] = parts.slice(1).map(Number);

  let age = now.getFullYear() - year;
  // The birthday has not come round yet this year if we are in an earlier
  // month, or the same month and an earlier day.
  const before = now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day);
  if (before) age -= 1;

  return age < 0 || age > 130 ? "" : String(age);
}

/** One answer as a list, whichever shape it was stored in. */
function asList(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

/**
 * Whether a condition holds, against the answers decided SO FAR.
 *
 * "So far" is the whole design: a question hidden by an earlier condition
 * contributes no answer, so anything hanging off it disappears with it and a
 * branch cannot be half-asked.
 *
 * An unanswered question satisfies "is not" — nobody who was never asked which
 * class they race is racing the one being excluded.
 */
export function conditionPasses(condition: Condition, answers: Submission): boolean {
  if (!condition.key) return true;

  const given = asList(answers[condition.key]);
  const wanted = condition.values;

  switch (condition.op) {
    case "answered":
      return given.length > 0;

    case "blank":
      return given.length === 0;

    case "not":
      return !given.includes(wanted[0] ?? "");

    case "any":
      return wanted.some((value) => given.includes(value));

    case "atLeast":
    case "atMost": {
      const got = Number(given[0]);
      const bar = Number(wanted[0]);
      // Neither side being a number is not "false is fine" — it is a comparison
      // that cannot be made, and the safe reading of that is not to ask.
      if (!Number.isFinite(got) || !Number.isFinite(bar)) return false;
      return condition.op === "atLeast" ? got >= bar : got <= bar;
    }

    default:
      return given.includes(wanted[0] ?? "");
  }
}

/**
 * The options this field actually offers, given what has been answered.
 *
 * Enforced on the server as well as drawn in the browser: an option that is not
 * on offer was not offered, and an answer naming it is dropped exactly like an
 * answer naming an option that does not exist.
 */
export function offeredOptions(field: FormField, answers: Submission): string[] {
  if (!isChoice(field.type) || !field.optionsWhen.key) return field.options;

  const chosen = asList(answers[field.optionsWhen.key]);
  const grouped = new Set(Object.values(field.optionsWhen.groups).flat());
  const allowed = new Set(chosen.flatMap((answer) => field.optionsWhen.groups[answer] ?? []));

  return field.options.filter((option) => !grouped.has(option) || allowed.has(option));
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
  /**
   * What goes behind the circled "i" beside the question.
   *
   * Separate from `help`, which is always on screen under the control. This is
   * the paragraph that would make the form twice as long if every question had
   * one printed: the eligibility rule, what a licence number looks like, why an
   * address is being asked for. Blank means no button at all.
   */
  info: string;
  /** Only asked when this passes. See the conditions block above. */
  when: Condition;
  /** Choice types: which options are offered, and when. */
  optionsWhen: OptionFilter;
  /**
   * Date fields: also store the age this date works out to, in its own column.
   * That age can then be compared against by any later question's condition.
   */
  age: boolean;
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
  field_info: 600,
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
  info: "",
  when: ALWAYS,
  optionsWhen: ALL_OPTIONS,
  age: false,
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

  const fields = value
    .filter(isRecord)
    .slice(0, MAX_FORM_FIELDS)
    .map((entry, index) => {
      const type = oneOf(entry.type, FORM_FIELD_TYPES, "text");

      // Stripping the dot here is what reserves it for derived keys: `<id>.age`
      // can never be mistaken for, or collide with, a field of its own.
      let id = optionalText(entry.id, 64).replace(/[^A-Za-z0-9_-]/g, "");
      if (!id || seen.has(id)) id = `f${index + 1}${seen.size ? `-${seen.size}` : ""}`;
      seen.add(id);

      // Only the choice types keep a list. A select turned into a text field
      // and back would otherwise carry options nothing renders.
      const options = isChoice(type)
        ? lines(entry.options, MAX_FIELD_OPTIONS, []).slice(0, MAX_FIELD_OPTIONS)
        : [];

      return {
        id,
        type,
        label: optionalText(entry.label, FORM_LIMITS.field_label),
        help: optionalText(entry.help, FORM_LIMITS.field_help),
        info: optionalText(entry.info, FORM_LIMITS.field_info),
        placeholder: optionalText(entry.placeholder, FORM_LIMITS.field_placeholder),
        required: entry.required === true,
        options,
        when: condition(entry.when),
        optionsWhen: isChoice(type) ? optionFilter(entry.optionsWhen, options) : { ...ALL_OPTIONS },
        age: type === "date" && entry.age === true,
      };
    });

  /*
   * Conditions may only look backwards.
   *
   * Dragging a question above the one it depends on is the way this gets broken,
   * and it is easy to do without noticing. Rather than leave a rule pointing at
   * an answer that does not exist yet — which would evaluate against a blank and
   * silently hide the question — the rule is dropped, so the question comes back
   * and whoever moved it can see what they did.
   */
  const known = new Set<string>();

  for (const field of fields) {
    if (field.when.key && !known.has(field.when.key)) field.when = { ...ALWAYS };
    if (field.optionsWhen.key && !known.has(field.optionsWhen.key)) {
      field.optionsWhen = { ...ALL_OPTIONS };
    }

    known.add(field.id);
    if (field.age) known.add(ageKey(field.id));
  }

  return fields;
}

/** An answer key as it may be written down: a field id, or one with `.age`. */
function answerKey(value: unknown): string {
  return optionalText(value, 80).replace(/[^A-Za-z0-9_.-]/g, "");
}

function condition(value: unknown): Condition {
  if (!isRecord(value)) return { ...ALWAYS };

  const key = answerKey(value.key);
  if (!key) return { ...ALWAYS };

  return {
    key,
    op: oneOf(value.op, CONDITION_OPS, "is"),
    values: lines(value.values, MAX_FIELD_OPTIONS, []),
  };
}

/**
 * The option groups, kept honest against the options that actually exist.
 *
 * A group naming an option that has since been renamed is dropped rather than
 * carried: the builder draws these as ticks against the current option list, so
 * a name it cannot find is a tick nobody can see and nobody can clear.
 */
function optionFilter(value: unknown, options: string[]): OptionFilter {
  if (!isRecord(value)) return { ...ALL_OPTIONS };

  const key = answerKey(value.key);
  if (!key || !isRecord(value.groups)) return { ...ALL_OPTIONS };

  const groups: Record<string, string[]> = {};

  for (const [answer, listed] of Object.entries(value.groups).slice(0, MAX_FIELD_OPTIONS)) {
    const kept = lines(listed, MAX_FIELD_OPTIONS, []).filter((option) => options.includes(option));
    if (kept.length > 0) groups[answer.slice(0, FORM_LIMITS.field_option)] = kept;
  }

  return { key, groups };
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

export type CheckedSubmission = {
  /** What gets stored, including any derived age. Hidden questions are absent. */
  values: Submission;
  errors: Record<string, string>;
  /** The questions actually put, in order. What the page draws. */
  asked: FormField[];
  /** Per field id, the options actually on offer. What the page draws. */
  options: Record<string, string[]>;
};

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
 * ── Also what the page is ─────────────────────────────────────────────────
 *
 * It returns the shape of the form as well as the verdict on the answers, and
 * the browser draws from that rather than working out for itself which
 * questions apply. There is one pass over the fields, in one file, and it
 * decides all three of: what is asked, what is offered, and what is kept.
 *
 * The alternative — the page deciding what to show and this deciding what to
 * store — is two implementations of the same branching logic that agree right
 * up until somebody edits one of them. Then a question is asked and thrown
 * away, or hidden and demanded, and neither failure is visible from the admin.
 *
 * A question that was not asked is ABSENT from `values` rather than blank: no
 * answer was given because no question was put, and a stored empty string says
 * something different from that.
 *
 * Errors come back keyed by field id so the page can put each one under its own
 * control. An empty `errors` is the only thing that means "store this".
 */
export function validateSubmission(
  fields: FormField[],
  input: unknown,
  now: Date = new Date()
): CheckedSubmission {
  const sent = isRecord(input) ? input : {};
  const values: Submission = {};
  const errors: Record<string, string> = {};
  const asked: FormField[] = [];
  const options: Record<string, string[]> = {};

  for (const field of fields) {
    // Against `values`, not against what was sent: a question hidden by an
    // earlier answer contributes nothing, so a whole branch falls away together.
    if (!conditionPasses(field.when, values)) continue;

    asked.push(field);

    const offered = offeredOptions(field, values);
    options[field.id] = offered;

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
          // `offered`, not `field.options`: an option filtered out by an earlier
          // answer was not on the page, so choosing it is choosing nothing.
          .filter((entry) => offered.includes(entry))
          .slice(0, MAX_FIELD_OPTIONS);
        break;
      }

      // As do radio buttons and a single dropdown.
      case "select":
      case "radio": {
        const one = clamp(raw, FORM_LIMITS.field_option);
        value = offered.includes(one) ? one : "";
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

    // The derived answer, written straight after the one it comes from so that
    // any later condition comparing against an age finds it already there.
    if (field.age && field.type === "date") {
      values[ageKey(field.id)] = ageFrom(typeof value === "string" ? value : "", now);
    }
  }

  return { values, errors, asked, options };
}

/* ───────────────────────────── Reading entries ───────────────────────── */

/** What one answer prints as, whatever type it came from. */
export function answerText(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.join("; ");
  return value ?? "";
}

/**
 * One column of the table and of the export.
 *
 * Not the same list as the fields: a date field asked to work out an age
 * produces two columns from one question. Everything that reads entries goes
 * through here, so the table, the dialog and the CSV cannot disagree about what
 * the columns are.
 */
export type AnswerColumn = {
  key: string;
  label: string;
  /** True for the age worked out from a date, false for a question's own answer. */
  derived: boolean;
};

export function answerColumns(fields: FormField[]): AnswerColumn[] {
  const columns: AnswerColumn[] = [];

  fields.forEach((field, index) => {
    const label = field.label || `Question ${index + 1}`;
    columns.push({ key: field.id, label, derived: false });

    if (field.age && field.type === "date") {
      columns.push({ key: ageKey(field.id), label: `${label} — age`, derived: true });
    }
  });

  return columns;
}

/** One row of the entries table: the current columns, in order, with answers. */
export function entryCells(
  fields: FormField[],
  entry: FormEntry
): { key: string; label: string; text: string }[] {
  return answerColumns(fields).map((column) => ({
    ...column,
    text: answerText(entry.answers[column.key]),
  }));
}

/**
 * Answers whose question no longer exists.
 *
 * Never dropped. The export is the only way these ever leave the database, and
 * a column that quietly disappears when somebody tidies up a form is data loss
 * nobody can see happening.
 */
export function orphanAnswers(fields: FormField[], entry: FormEntry): [string, string][] {
  const known = new Set(answerColumns(fields).map((column) => column.key));

  return Object.entries(entry.answers)
    .filter(([id]) => !known.has(id))
    .map(([id, value]) => [id, answerText(value)]);
}

/**
 * An edited entry, without losing what the form no longer asks.
 *
 * `validateSubmission` only ever returns answers to the CURRENT questions, so
 * saving its output straight over an entry would quietly delete every answer to
 * a question that has since been removed — the ones the table lists under "no
 * longer asked" and the export gives a column of their own. Correcting a typo
 * in somebody's phone number is not a reason to lose their old answers.
 *
 * So the retired ones are carried across untouched, and everything the form
 * asks today comes from the edit. A question hidden by branching is absent from
 * `next` and is dropped here too, which is right: the answer given before the
 * branch changed is no longer an answer to anything being asked.
 */
export function withOrphans(
  fields: FormField[],
  previous: Submission,
  next: Submission
): Submission {
  const current = new Set(answerColumns(fields).map((column) => column.key));
  const kept: Submission = {};

  for (const [key, value] of Object.entries(previous)) {
    if (!current.has(key)) kept[key] = value;
  }

  return { ...kept, ...next };
}

/* ─────────────────────────── What the builder needs ──────────────────── */

/**
 * The answers a question at `index` is allowed to look at — everything above it.
 *
 * The rule that conditions only look backwards is enforced on the way in by
 * `normaliseFormFields`; this is the same rule shown as a list of choices, so
 * the builder cannot offer a rule that would then be thrown away.
 */
export function keysBefore(fields: FormField[], index: number): AnswerColumn[] {
  return answerColumns(fields.slice(0, index));
}

/** The options behind an answer key, for building a picker of them. */
export function optionsForKey(fields: FormField[], key: string): string[] {
  const field = fields.find((entry) => entry.id === key);
  return field && isChoice(field.type) ? field.options : [];
}
