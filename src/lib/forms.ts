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
  "file",
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
  file: "File upload",
};

/** Guidance in the builder, where "which of these four" is the actual question. */
export const FIELD_TYPE_HINTS: Partial<Record<FormFieldType, string>> = {
  select: "One answer, hidden behind a click. Right for a long list — a state, a category.",
  multiselect: "Several answers from one dropdown. Compact, but harder to use on a phone.",
  radio: "One answer, all of them on screen. Right for a handful of options.",
  checkboxes: "Several answers, all of them on screen. Right for a handful of options.",
  file:
    "One file per entry — a licence scan, a photograph, a signed form. Kept private: only this admin can open it.",
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
 * The reserved answer key that means "when it was submitted".
 *
 * The entries table sorts by it, so it must never also be a field's id — a
 * question whose id happened to be this word would be sorted by the timestamp
 * instead of by its own answers, silently. `normaliseFormFields` refuses it,
 * which is what makes the reservation real rather than a comment.
 */
export const CREATED_COLUMN = "created";

/**
 * Whole years between an ISO date and a given day, as a string.
 *
 * A string because every other answer is one, and a column that is sometimes a
 * number and sometimes text is worse to read than one that is always text.
 * Blank for anything that is not a usable birth date — no date, a date in the
 * future, or one further back than a person lives.
 *
 * ── Why this reads UTC ────────────────────────────────────────────────────
 *
 * It used to read `getFullYear`/`getMonth`/`getDate`, which are LOCAL to
 * whichever runtime called it — the visitor's browser on one side, the server's
 * clock on the other. A visitor in India submitting at one in the morning on
 * their eighteenth birthday got 18 in the browser and 17 on the server, and the
 * two halves then disagreed about the form itself: a question asked only of
 * over-18s was drawn, answered, and then dropped before the insert because the
 * server never considered it asked. Silently, with no error anywhere.
 *
 * So the arithmetic is UTC on both sides, and `now` is expected to be the
 * visitor's *local* day already shifted into UTC — see `dayFor`. `isoDate` in
 * normalise.ts pins to UTC for the same reason; the two halves of the date
 * pipeline now agree about what a day is.
 */
export function ageFrom(value: string, now: Date = new Date()): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!parts) return "";

  const [year, month, day] = parts.slice(1).map(Number);

  let age = now.getUTCFullYear() - year;
  // The birthday has not come round yet this year if we are in an earlier
  // month, or the same month and an earlier day.
  const before =
    now.getUTCMonth() + 1 < month || (now.getUTCMonth() + 1 === month && now.getUTCDate() < day);
  if (before) age -= 1;

  return age < 0 || age > 130 ? "" : String(age);
}

/**
 * The instant to work an age out against, from the visitor's own calendar.
 *
 * The browser sends `new Date().getTimezoneOffset()` — minutes to ADD to local
 * time to get UTC — and this shifts the clock so that "today" means the day it
 * is where the person filling in the form is standing, not where the server
 * happens to run. The browser passes its own offset and the route passes back
 * what it was sent, so both compute the same age from the same date.
 *
 * An absent or absurd offset falls back to the server's own clock. It is a hint
 * from a stranger, so it is bounded: real offsets run from −12:00 to +14:00.
 */
export function dayFor(offsetMinutes: unknown, now: Date = new Date()): Date {
  const offset = Number(offsetMinutes);
  if (!Number.isFinite(offset) || Math.abs(offset) > 14 * 60) return now;

  return new Date(now.getTime() - offset * 60_000);
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

/** What the free-text choice is called on screen. */
export function otherLabelOf(field: Pick<FormField, "otherLabel">): string {
  return field.otherLabel.trim() || "Other";
}

/**
 * Whether this answer is a typed one rather than a chosen option.
 *
 * Used by the page to decide whether the "Other" box is the one showing. There
 * is no marker on the value itself — what is stored is simply what they typed —
 * so "not on the list" IS the test.
 */
export function isOtherAnswer(field: FormField, value: string): boolean {
  return field.allowOther && value !== "" && !field.options.includes(value);
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

/* ────────────────────────── Rules about an answer ────────────────────── */

/**
 * A check on what somebody typed, beyond "is this the right kind of thing".
 *
 * The type already decides that a number is a number and a date is a date.
 * This is the layer above: a licence number is eight characters, an entrant is
 * between 8 and 60 years old, a team name is under forty letters. Without it
 * the only place those rules exist is in somebody's head, and they get caught
 * when the entry list is read rather than when it is filled in.
 *
 * Enforced inside `validateSubmission`, which is what makes it true on both
 * sides for free — the browser says so before the post, and the route says so
 * again about what actually arrived.
 *
 * A blank bound means no bound: `min` alone is "at least this", `max` alone is
 * "at most this", both is a range.
 */
export const RULE_KINDS = ["none", "length", "number", "date", "pattern"] as const;
export type RuleKind = (typeof RULE_KINDS)[number];

export const RULE_KIND_LABELS: Record<RuleKind, string> = {
  none: "Anything",
  length: "How long it is",
  number: "How big it is",
  date: "How early or late it is",
  pattern: "A particular shape",
};

export type FieldRule = {
  kind: RuleKind;
  /** Characters, value, or ISO date, depending on the kind. Blank = no bound. */
  min: string;
  max: string;
  /** Which named shape, or "custom" for one typed by hand. */
  preset: string;
  /** The expression itself, when the preset is "custom". */
  pattern: string;
  /** What the visitor is told. Blank falls back to a built-in sentence. */
  message: string;
};

export const NO_RULE: FieldRule = {
  kind: "none",
  min: "",
  max: "",
  preset: "",
  pattern: "",
  message: "",
};

/**
 * Shapes worth naming, so nobody has to write a regular expression.
 *
 * Presets rather than a free-text box as the default answer: an admin writing
 * their own expression is one typo away from a question nobody can answer, and
 * the failure looks like the visitor's fault. "Something else" is still there
 * for the case none of these fit.
 */
export const PATTERN_PRESETS: {
  id: string;
  label: string;
  pattern: string;
  hint: string;
  example: string;
}[] = [
  {
    id: "licence",
    label: "Licence number",
    pattern: "^[A-Za-z0-9][A-Za-z0-9/-]{3,23}$",
    hint: "Letters, digits, hyphens and slashes. Four to twenty-four characters.",
    example: "FMSCI-2026-0114",
  },
  {
    id: "chassis",
    label: "Chassis or engine number",
    pattern: "^[A-Za-z0-9-]{5,24}$",
    hint: "Letters, digits and hyphens.",
    example: "KRT-9F2210",
  },
  {
    id: "mobile-in",
    label: "Indian mobile number",
    pattern: "^[6-9][0-9]{9}$",
    hint: "Ten digits, starting 6 to 9. No country code, no spaces.",
    example: "9876543210",
  },
  {
    id: "pin-in",
    label: "PIN code",
    pattern: "^[1-9][0-9]{5}$",
    hint: "Six digits, not starting with a zero.",
    example: "600001",
  },
  {
    id: "custom",
    label: "Something else",
    pattern: "",
    hint: "A regular expression. Anchor it with ^ and $ unless you mean “contains”.",
    example: "",
  },
];

/** Which kinds of rule make sense for a kind of question. */
export function ruleKindsFor(type: FormFieldType): RuleKind[] {
  switch (type) {
    case "text":
    case "textarea":
      return ["none", "length", "pattern"];
    case "email":
    case "phone":
      return ["none", "pattern"];
    case "number":
      return ["none", "number"];
    case "date":
      return ["none", "date"];
    default:
      // A choice is already limited to its options, and a tick is a tick.
      return ["none"];
  }
}

/** The expression a rule actually tests with, preset or hand-written. */
export function patternOf(rule: FieldRule): string {
  if (rule.preset && rule.preset !== "custom") {
    return PATTERN_PRESETS.find((preset) => preset.id === rule.preset)?.pattern ?? "";
  }

  return rule.pattern;
}

/** The longest expression this will compile. Past it, something is wrong. */
const MAX_PATTERN = 200;

/**
 * A regular expression from an admin, compiled only if it looks safe to run.
 *
 * This is typed in a browser and executed on the server, against a string a
 * stranger sends. A pattern like `(a+)+$` takes exponential time on the right
 * input, so one careless expression in a form nobody has looked at since is a
 * way to hold a request open for as long as somebody cares to. Node has no
 * regex timeout.
 *
 * The test is deliberately conservative and blunt: a quantifier applied to a
 * group that already contains one is refused outright, whether or not it would
 * actually blow up. Refusing a handful of safe expressions costs an admin one
 * rewrite; accepting an unsafe one costs the site.
 *
 * Returns null for anything refused, and the caller treats that as "no rule" —
 * a question nobody can answer is worse than one that is not checked.
 */
export function safePattern(source: string): RegExp | null {
  const trimmed = source.trim();
  if (!trimmed || trimmed.length > MAX_PATTERN) return null;

  // A group whose body holds a quantifier, immediately quantified again.
  if (/\([^()]*[*+}][^()]*\)\s*[*+{]/.test(trimmed)) return null;
  // Nested groups both quantified: (( … )+)+
  if (/\([^()]*\([^()]*\)[^()]*\)\s*[*+{]/.test(trimmed)) return null;

  try {
    return new RegExp(trimmed);
  } catch {
    return null;
  }
}

/**
 * Whether an answer satisfies its field's rule. "" when it does.
 *
 * Only ever called with a non-empty answer: an empty one is the required
 * check's business, and telling somebody their blank answer is the wrong shape
 * is not help.
 */
export function checkRule(field: FormField, value: string): string {
  const rule = field.rule;
  if (rule.kind === "none") return "";

  const name = field.label || "This";
  const min = rule.min.trim();
  const max = rule.max.trim();

  switch (rule.kind) {
    case "length": {
      const low = Number(min);
      const high = Number(max);

      if (min && Number.isFinite(low) && value.length < low) {
        return rule.message || `${name} has to be at least ${low} characters.`;
      }
      if (max && Number.isFinite(high) && value.length > high) {
        return rule.message || `${name} has to be ${high} characters or fewer.`;
      }
      return "";
    }

    case "number": {
      const got = Number(value);
      if (!Number.isFinite(got)) return "";

      if (min && Number.isFinite(Number(min)) && got < Number(min)) {
        return rule.message || `${name} has to be ${min} or more.`;
      }
      if (max && Number.isFinite(Number(max)) && got > Number(max)) {
        return rule.message || `${name} has to be ${max} or less.`;
      }
      return "";
    }

    case "date": {
      // Both sides are ISO, so a string comparison IS a date comparison — and
      // one that cannot be caught out by a timezone.
      if (min && isoDate(min) && value < min) {
        return rule.message || `${name} cannot be earlier than ${min}.`;
      }
      if (max && isoDate(max) && value > max) {
        return rule.message || `${name} cannot be later than ${max}.`;
      }
      return "";
    }

    case "pattern": {
      const expression = safePattern(patternOf(rule));
      // Refused or unwritten: no rule rather than an unanswerable question.
      if (!expression) return "";

      return expression.test(value)
        ? ""
        : rule.message || `${name} is not in the expected format.`;
    }

    default:
      return "";
  }
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
  /** Which page of the form it is on. "" or unknown means the first. */
  sectionId: string;
  /** File questions: the largest one accepted, in megabytes. */
  maxMb: number;
  /** File questions: which kinds. Empty means the built-in list. */
  accept: string[];
  /** A check on the answer itself, beyond its type. See `checkRule`. */
  rule: FieldRule;
  /**
   * Choice types: offer a free-text "Other" alongside the options.
   *
   * What gets stored is what they TYPED, not the word "Other" — so the export
   * reads as an answer rather than as a pointer to a second column that would
   * have to exist. It also means an existing entry is unaffected by switching
   * this on, and switching it off leaves the typed answers where they are, as
   * answers to a question that no longer offers them.
   */
  allowOther: boolean;
  /** What the free-text choice is called. Blank uses "Other". */
  otherLabel: string;
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
  /**
   * When it opens and closes, and how many it takes. See `formState`.
   *
   * ISO 8601 strings or "" for no bound — `timestamptz` comes back from the
   * driver as a `Date`, so the repo converts on read, exactly as it does for an
   * entry's `created_at`. That type once lied and broke the CSV export; it is
   * not going to lie twice.
   */
  opens_at: string;
  closes_at: string;
  /** How many entries it will take. 0 is unlimited. */
  max_entries: number;
  fields: FormField[];
  /** The pages, in order. Empty means one page and no stepper. */
  sections: FormSection[];
  former_slugs: string[];
  sort_order: number;
};

/* ──────────────────────────────── Sections ───────────────────────────── */

/**
 * A form broken into pages.
 *
 * Forty questions on one screen is a form people abandon; the same forty in
 * four steps with a bar at the top is one they finish. This is that, and it is
 * also where Google Forms' "go to section based on answer" lives: a section
 * carries the same kind of rule a question does, so a whole branch can be
 * skipped in one go rather than by hiding six questions individually.
 *
 * ── Optional, and invisible when unused ───────────────────────────────────
 *
 * A form with no sections is drawn exactly as it always was: one page, no
 * stepper, no Next button. Every form that existed before this is that form, so
 * nothing about them changes — and a three-question form should not be made to
 * wear a progress bar.
 *
 * ── Order ─────────────────────────────────────────────────────────────────
 *
 * The questions are held in ONE list and sorted into section order when they
 * are saved, so the array order and the order they are put to somebody are the
 * same thing. That is what lets everything downstream stay as it was: "a rule
 * may only look backwards" is still a question about position in the list, and
 * `keysBefore` still means what it says. Moving a question to an earlier
 * section moves it up the list, and any rule that then points forwards is
 * dropped and reported, exactly as when it is dragged.
 */
export type FormSection = {
  id: string;
  title: string;
  /** A line under the title. Blank prints nothing. */
  blurb: string;
  /** Only shown when this passes. Same machinery as a question's. */
  when: Condition;
};

export const MAX_SECTIONS = 12;

export function blankSection(id: string): FormSection {
  return { id, title: "", blurb: "", when: { ...ALWAYS, values: [] } };
}

/** The section a field belongs to, or the first one if it names none. */
export function sectionOf(sections: FormSection[], field: FormField): FormSection | null {
  if (sections.length === 0) return null;
  return sections.find((section) => section.id === field.sectionId) ?? sections[0];
}

/**
 * The questions, in the order they will actually be put.
 *
 * Sorted by section, stably, so two questions in the same section keep the
 * order they were dragged into. A question naming a section that no longer
 * exists falls into the first one rather than disappearing.
 */
export function orderedFields(sections: FormSection[], fields: FormField[]): FormField[] {
  if (sections.length === 0) return fields;

  const rank = new Map(sections.map((section, index) => [section.id, index]));

  return fields
    .map((field, index) => ({ field, index, at: rank.get(field.sectionId) ?? 0 }))
    .sort((a, b) => a.at - b.at || a.index - b.index)
    .map((entry) => entry.field);
}

/* ────────────────────── Whether it is taking entries ─────────────────── */

/**
 * What a form is doing right now, as opposed to what its switch says.
 *
 * `status` is a person's decision; the window and the cap are conditions that
 * decide alongside it. Five states rather than three, because "not yet" and "no
 * places left" are different things to say to somebody who has just arrived:
 *
 *   draft      not on the internet at all
 *   scheduled  published, but its opening time has not come
 *   open       taking entries
 *   closed     shut, by the switch or by its closing time
 *   full       every place taken
 *
 * One function, used by the public page, the submit route, the cards on the
 * page and the admin — so a form cannot look open on a card, refuse an entry at
 * the route, and read as something else again in the builder. `count` is
 * optional because most callers do not need to know about the cap and counting
 * costs a query; without it, "full" is simply never returned.
 */
export const FORM_STATES = ["draft", "scheduled", "open", "closed", "full"] as const;
export type FormState = (typeof FORM_STATES)[number];

export function formState(
  form: Pick<Form, "status" | "opens_at" | "closes_at" | "max_entries">,
  count?: number,
  now: Date = new Date()
): FormState {
  if (form.status === "draft") return "draft";
  if (form.status === "closed") return "closed";

  const at = now.getTime();

  if (form.closes_at) {
    const closes = new Date(form.closes_at).getTime();
    if (Number.isFinite(closes) && at >= closes) return "closed";
  }

  if (form.opens_at) {
    const opens = new Date(form.opens_at).getTime();
    if (Number.isFinite(opens) && at < opens) return "scheduled";
  }

  // Last, so a form that is full but has also closed reads as closed: the cap
  // is the least interesting reason once the date has passed.
  if (form.max_entries > 0 && count !== undefined && count >= form.max_entries) return "full";

  return "open";
}

/** Whether an entry may be sent. The only test any caller should make. */
export function isTakingEntries(state: FormState): boolean {
  return state === "open";
}

/** Places left, or null when there is no cap. */
export function placesLeft(
  form: Pick<Form, "max_entries">,
  count: number
): number | null {
  return form.max_entries > 0 ? Math.max(form.max_entries - count, 0) : null;
}

/**
 * What a visitor is told when a form will not take their entry.
 *
 * The admin's own closed note wins wherever it is set — they know why it shut
 * and this does not. These are the fallbacks, and they differ per state
 * because "come back on Friday" and "it filled up" call for different actions.
 */
export function stateMessage(
  form: Pick<Form, "closed_note" | "opens_at">,
  state: FormState
): string {
  if (state === "scheduled") {
    const opens = form.opens_at ? new Date(form.opens_at) : null;
    return opens && !Number.isNaN(opens.getTime())
      ? `Entries open on ${opens.toLocaleDateString(undefined, {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}.`
      : "Entries have not opened yet.";
  }

  if (state === "full") {
    return form.closed_note || "Every place has been taken.";
  }

  return form.closed_note || "Entries for this one have closed.";
}

/** What a card and a picker need. Never the questions. */
export type FormSummary = Pick<
  Form,
  | "id"
  | "name"
  | "slug"
  | "page_key"
  | "status"
  | "blurb"
  | "sort_order"
  | "opens_at"
  | "closes_at"
  | "max_entries"
> & {
  /**
   * How many entries it already holds.
   *
   * Carried on the summary because a card cannot say "full" without it, and
   * asking per card would be one query per card. The list query counts them all
   * in one pass — see `listFormsForPage`.
   */
  entries: number;
};

/**
 * What an uploaded file is, once stored.
 *
 * Three things, and the reason for each: the KEY is where the bytes are and is
 * never shown to anybody; the NAME is what the person called it, which is what
 * the export prints and what an admin recognises; the SIZE is there so a list
 * can be scanned for the one that is obviously wrong without opening any of
 * them.
 *
 * Kept as a string, encoded, so `answers` stays a flat map of strings and every
 * existing reader — the table, the CSV, `answerText` — keeps working without
 * learning a second shape. `fileOf` decodes it.
 */
export const FILE_PREFIX = "file::";

export type StoredFile = { key: string; name: string; size: number };

export function encodeFile(file: StoredFile): string {
  return `${FILE_PREFIX}${JSON.stringify(file)}`;
}

export function fileOf(value: unknown): StoredFile | null {
  if (typeof value !== "string" || !value.startsWith(FILE_PREFIX)) return null;

  try {
    const parsed: unknown = JSON.parse(value.slice(FILE_PREFIX.length));
    if (!isRecord(parsed)) return null;

    const key = optionalText(parsed.key, 300);
    const name = optionalText(parsed.name, 200);
    return key ? { key, name: name || "file", size: Number(parsed.size) || 0 } : null;
  } catch {
    return null;
  }
}

export type Submission = Record<string, string | string[]>;

export type FormEntry = {
  id: string;
  form_id: string;
  answers: Submission;
  ip: string;
  user_agent: string;
  /**
   * ISO 8601. The driver hands back a `Date` for a `timestamptz`, so this is
   * only true because `entriesRepo` converts on every read — see the note there.
   */
  created_at: string;
};

/**
 * Where a page of entries stopped: both halves of the position.
 *
 * Here rather than in the repo because the browser holds one between pages and
 * sends it back, and the repo is `server-only`. The timestamp alone is not a
 * position — two entries can land in the same moment, and a cursor on the time
 * by itself steps over every row that shares it.
 */
export type EntryCursor = { at: string; id: string };

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
  field_rule_message: 200,
  field_other_label: 60,

  /* What one ANSWER may be. Nothing to do with the field's own copy: these are
     what a stranger can send, so they are the numbers that matter. */
  value_text: 300,
  value_textarea: 4000,
  value_email: 254,
  value_phone: 40,
  value_number: 20,
} as const;

/**
 * What a file question may accept, and the most it may ever take.
 *
 * The ceiling is here rather than in the admin because it bounds what a
 * STRANGER can send: an admin who types 500 into the box gets this. Images and
 * PDFs only — the things a registration actually asks for — because accepting
 * arbitrary types means storing whatever anyone cares to upload under this
 * site's name.
 */
export const FILE_KINDS = ["image", "pdf"] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export const FILE_KIND_LABELS: Record<FileKind, string> = {
  image: "Photographs (JPEG, PNG, WebP, HEIC)",
  pdf: "PDF documents",
};

export const FILE_TYPES: Record<FileKind, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
  pdf: ["application/pdf"],
};

/** The largest single file, whatever a question asks for. */
export const MAX_UPLOAD_MB = 10;

/** And the default, for a question that names no size of its own. */
export const DEFAULT_UPLOAD_MB = 5;

/** The kinds one question accepts, as content types. */
export function acceptedTypes(field: Pick<FormField, "accept">): string[] {
  const kinds = field.accept.length > 0 ? field.accept : FILE_KINDS;
  return kinds.flatMap((kind) => FILE_TYPES[kind as FileKind] ?? []);
}

/** The size limit one question actually applies, in bytes. */
export function uploadLimit(field: Pick<FormField, "maxMb">): number {
  const mb = field.maxMb > 0 ? Math.min(field.maxMb, MAX_UPLOAD_MB) : DEFAULT_UPLOAD_MB;
  return mb * 1024 * 1024;
}

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

/**
 * A new, empty question.
 *
 * Frozen, and so are the nested `when`, `optionsWhen` and `options` it carries.
 * Every construction site spreads it — `{ ...BLANK_FIELD, id }` — which is a
 * SHALLOW copy, so all of them share one `when` object and one `groups` record.
 * Nothing mutates them today; one line that did would corrupt the constant for
 * the life of the process, in every form the server touched afterwards.
 *
 * Freezing makes that a thrown error at the point of the mistake rather than a
 * silent corruption discovered days later. Callers that need to keep a copy
 * should build their own nested objects — see `fieldId` in FormBuilder.
 */
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) deepFreeze(nested);
    Object.freeze(value);
  }

  return value;
}

export const BLANK_FIELD: Omit<FormField, "id"> = deepFreeze({
  type: "text",
  label: "",
  help: "",
  placeholder: "",
  required: false,
  options: [],
  info: "",
  when: { ...ALWAYS },
  optionsWhen: { ...ALL_OPTIONS },
  rule: { ...NO_RULE },
  allowOther: false,
  otherLabel: "",
  sectionId: "",
  maxMb: 0,
  accept: [],
  age: false,
});

/**
 * A new question, safe to mutate.
 *
 * `BLANK_FIELD` is one object shared by every caller that spreads it, and a
 * spread is shallow — so all of them shared one `when` and one `groups` record.
 * This hands back a copy all the way down, which is what a caller building a
 * field actually wants; the frozen constant stays for reading defaults from.
 */
export function blankField(id: string): FormField {
  return {
    ...BLANK_FIELD,
    id,
    options: [],
    when: { ...ALWAYS, values: [] },
    optionsWhen: { key: "", groups: {} },
    rule: { ...NO_RULE },
  };
}

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
  opens_at: "",
  closes_at: "",
  max_entries: 0,
  fields: [],
  sections: [],
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

/**
 * Lower case, digits and hyphens; starts with a letter or a digit.
 *
 * One character is enough. It used to demand two, which put this validator at
 * odds with `slugify` — a form called "A" produced the slug `a`, which the
 * database accepted and this function then called unusable. Two halves of the
 * same rule disagreeing is worse than either rule.
 */
export function isUsableSlug(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,79}$/.test(value);
}

/** The value if it is a usable address, otherwise "". */
function usableSlug(value: string): string {
  return isUsableSlug(value) ? value : "";
}

/**
 * An address for a form whose name gives us nothing to work with.
 *
 * A name with no ASCII letters or digits at all — "日本レース", "!!!" — slugified
 * to the empty string, which is not NULL, so the first such form saved happily
 * with a broken `/register/` address and every one after it collided with it.
 * Anything unguessable is better than that; the admin can rename it, and the
 * builder shows the address it was given.
 */
function fallbackSlug(): string {
  return `form-${Math.random().toString(36).slice(2, 8)}`;
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
 * One option's text, canonical.
 *
 * Every rule in this file joins on option text by exact match — which options a
 * dropdown offers, which answer opens a branch, which group an option sits in.
 * Four places comparing the same string, and nothing used to guarantee they had
 * the same string to compare.
 *
 * They did not. Options were clamped to 240 characters on the way in and
 * answers to 120 on the way back, so an option in between could never be
 * chosen — and a required question carrying one could never be submitted at
 * all. A trailing space typed on an option ticked its group under `"Karting "`,
 * saved as `"Karting"`, and the group was silently dropped for not matching.
 *
 * So there is one gate, and everything goes through it: trim, clamp to the same
 * limit an answer is clamped to, and no blanks.
 */
export function optionText(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, FORM_LIMITS.field_option) : "";
}

/**
 * A whole option list: canonical, deduplicated, capped. Order is kept.
 *
 * `max` is a parameter so the builder can ask what the list WOULD be without
 * the cap, and say how many are about to be dropped — a limit that silently
 * eats the end of a pasted list is the version of this nobody can debug.
 */
export function optionList(value: unknown, max: number = MAX_FIELD_OPTIONS): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const kept: string[] = [];

  for (const entry of value) {
    const option = optionText(entry);
    // A repeated option is two tiles that light together and two React children
    // with one key — and there is no answer that could tell them apart.
    if (!option || seen.has(option)) continue;

    seen.add(option);
    kept.push(option);
    if (kept.length === max) break;
  }

  return kept;
}

/**
 * The questions, cleaned.
 *
 * A field with no id gets one built from its position, which is what carries a
 * form typed in the admin before it is first saved. Ids are deduplicated
 * because two fields sharing one would share an answer.
 *
 * `notes` collects what had to be changed to make the document coherent. The
 * save route hands them back so the admin is told — a rule that silently
 * disappears on save is the worst version of this, because the screen goes on
 * showing "Saved" while the form quietly stopped doing what it was built to do.
 */
export function normaliseFormFields(
  value: unknown,
  notes?: string[],
  sections: FormSection[] = []
): FormField[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();

  const built = value
    .filter(isRecord)
    .slice(0, MAX_FORM_FIELDS)
    .map((entry, index) => {
      const type = oneOf(entry.type, FORM_FIELD_TYPES, "text");

      // Stripping the dot here is what reserves it for derived keys: `<id>.age`
      // can never be mistaken for, or collide with, a field of its own. The
      // fallback is re-checked against `seen` too — building one from the index
      // could otherwise land on an id an earlier field had already taken.
      let id = optionalText(entry.id, 64).replace(/[^A-Za-z0-9_-]/g, "");
      if (!id || seen.has(id) || id === CREATED_COLUMN) {
        let n = index + 1;
        while (seen.has(`f${n}`)) n += 1;
        id = `f${n}`;
      }
      seen.add(id);

      // Only the choice types keep a list. A select turned into a text field
      // and back would otherwise carry options nothing renders.
      const options = isChoice(type) ? optionList(entry.options) : [];

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
        rule: fieldRule(entry.rule, type),
        sectionId: optionalText(entry.sectionId, 64).replace(/[^A-Za-z0-9_-]/g, ""),
        maxMb:
          type === "file"
            ? Math.min(Math.max(Math.trunc(Number(entry.maxMb) || 0), 0), MAX_UPLOAD_MB)
            : 0,
        accept:
          type === "file"
            ? lines(entry.accept, FILE_KINDS.length, []).filter((kind) =>
                (FILE_KINDS as readonly string[]).includes(kind)
              )
            : [],
        // Only the choice types can offer one; on anything else the whole
        // question is already free text.
        allowOther: isChoice(type) && entry.allowOther === true,
        otherLabel: isChoice(type)
          ? optionalText(entry.otherLabel, FORM_LIMITS.field_other_label)
          : "",
        age: type === "date" && entry.age === true,
      };
    });

  /*
   * Sorted into the order the questions will actually be PUT, before anything
   * judges which rule looks backwards.
   *
   * With sections, the list order and the asking order are otherwise two
   * different things, and "a rule may only look backwards" would mean two
   * different things with it. Sorting here collapses them back into one: the
   * array IS the order, so `keysBefore`, `keepRulesHonest` and the single
   * forward pass in `validateSubmission` all keep meaning exactly what they
   * meant before sections existed.
   */
  const fields = orderedFields(sections, built);

  keepRulesHonest(fields, notes);

  return fields;
}

/**
 * The pages, cleaned, with any rule that cannot work removed.
 *
 * A section may only depend on an answer from an EARLIER section — the same
 * backwards-only rule a question follows, for the same reason: the form is put
 * one page at a time, so a page cannot turn on something nobody has been asked
 * yet.
 */
export function normaliseSections(value: unknown, fields: unknown, notes?: string[]): FormSection[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();

  const sections = value
    .filter(isRecord)
    .slice(0, MAX_SECTIONS)
    .map((entry, index) => {
      let id = optionalText(entry.id, 64).replace(/[^A-Za-z0-9_-]/g, "");
      if (!id || seen.has(id)) {
        let n = index + 1;
        while (seen.has(`s${n}`)) n += 1;
        id = `s${n}`;
      }
      seen.add(id);

      return {
        id,
        title: optionalText(entry.title, FORM_LIMITS.field_label),
        blurb: optionalText(entry.blurb, FORM_LIMITS.field_help),
        when: condition(entry.when),
      };
    });

  // Which answers each section produces, so a rule can be checked against what
  // is available by the time that page is reached.
  const known = new Set<string>();
  const raw = Array.isArray(fields) ? fields.filter(isRecord) : [];

  for (const section of sections) {
    if (section.when.key && !known.has(section.when.key)) {
      section.when = { ...ALWAYS };
      notes?.push(
        `“${section.title || "A page"}” is shown to everybody now — it depended on an answer that is not on an earlier page.`
      );
    }

    for (const field of raw) {
      const belongs = optionalText(field.sectionId, 64).replace(/[^A-Za-z0-9_-]/g, "");
      // A question naming no section, or one that has gone, sits on the first.
      const home = sections.some((s) => s.id === belongs) ? belongs : sections[0]?.id;
      if (home !== section.id) continue;

      const id = optionalText(field.id, 64).replace(/[^A-Za-z0-9_-]/g, "");
      if (!id) continue;

      known.add(id);
      if (field.type === "date" && field.age === true) known.add(ageKey(id));
    }
  }

  return sections;
}

/**
 * Every rule, checked against the questions as they now stand.
 *
 * Three separate ways a rule goes bad, and all three used to survive the save
 * and fail silently on the live site:
 *
 *   it points FORWARDS      dragging a question above the one it depends on.
 *                           The rule evaluated against a blank and hid the
 *                           question for everybody.
 *   it points at the WRONG
 *   KIND of question        changing the parent from a dropdown to a text box.
 *                           The builder stopped showing the rule — the parent
 *                           had dropped out of its picker — while `offeredOptions`
 *                           went on filtering, so every grouped option was
 *                           hidden from every visitor, permanently, with the
 *                           admin insisting nothing was filtered.
 *   it names an answer that
 *   no longer EXISTS        renaming an option the rule compares against. The
 *                           condition could never be true again.
 *
 * All three are corrected to "no rule" rather than left in place, and every
 * correction is written to `notes`. A question that comes back is visible; a
 * question that silently never appears is not.
 */
function keepRulesHonest(fields: FormField[], notes?: string[]): void {
  const say = (message: string) => notes?.push(message);
  const named = (field: FormField, index: number) => field.label || `Question ${index + 1}`;

  /** Answer keys already defined, and the field each came from. */
  const known = new Map<string, FormField>();

  fields.forEach((field, index) => {
    const name = named(field, index);

    if (field.when.key) {
      const parent = known.get(field.when.key);
      const derived = field.when.key.endsWith(AGE_SUFFIX);

      if (!parent) {
        field.when = { ...ALWAYS };
        say(`“${name}” is asked of everybody now — it depended on an answer that is not above it.`);
      } else if (!derived && isChoice(parent.type) && opTakesValue(field.when.op)) {
        // The comparison is against option text, so the option has to be there.
        const kept = field.when.values.filter((option) => parent.options.includes(option));

        if (kept.length !== field.when.values.length) {
          const lost = field.when.values.filter((option) => !kept.includes(option));
          say(
            `“${name}” no longer compares against ${lost.map((o) => `“${o}”`).join(", ")} — ` +
              `that option is not on “${parent.label || "the question above"}” any more.`
          );
        }

        if (kept.length === 0) field.when = { ...ALWAYS };
        else field.when = { ...field.when, values: kept };
      }
      // A free-text, numeric or derived-age parent needs no such check: there
      // is no fixed set the compared value has to belong to.
    }

    if (field.optionsWhen.key) {
      const parent = known.get(field.optionsWhen.key);

      if (!parent || !isChoice(parent.type)) {
        field.optionsWhen = { ...ALL_OPTIONS };
        say(
          `“${name}” offers all of its options again — the question deciding which to show is ` +
            `${parent ? "no longer a choice question" : "not above it"}.`
        );
      } else {
        // Group KEYS are the parent's answers. One left behind by a rename kept
        // its options flagged as "belongs to a group", so they were excluded
        // from the always-offered set while no answer could ever unlock them.
        const groups: Record<string, string[]> = {};
        let dropped = 0;

        for (const [answer, listed] of Object.entries(field.optionsWhen.groups)) {
          if (!parent.options.includes(answer)) {
            dropped += 1;
            continue;
          }
          groups[answer] = listed;
        }

        if (dropped > 0) {
          say(
            `“${name}” lost ${dropped} option group${dropped === 1 ? "" : "s"} — ` +
              `the answer${dropped === 1 ? " it" : "s they"} belonged to is no longer offered by ` +
              `“${parent.label || "the question above"}”.`
          );
        }

        field.optionsWhen = { ...field.optionsWhen, groups };
      }
    }

    known.set(field.id, field);
    if (field.age) known.set(ageKey(field.id), field);
  });
}

/**
 * A moment, or "" for no moment at all.
 *
 * Accepts what `<input type="datetime-local">` produces as well as a full ISO
 * string, and normalises to ISO — a browser hands back "2026-03-01T18:00" with
 * no zone, which `new Date` reads in the visitor's own timezone. That is the
 * right reading: an admin setting a closing time means six o'clock where they
 * are, and this is the point where that becomes an instant.
 */
function instant(value: unknown): string {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  if (typeof value !== "string" || !value.trim()) return "";

  const at = new Date(value.trim());
  return Number.isNaN(at.getTime()) ? "" : at.toISOString();
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
    // Through the same gate as the options they are compared against — which is
    // the whole point of `optionText` existing.
    values: optionList(value.values),
  };
}

/**
 * The option groups, kept honest against the options that actually exist.
 *
 * A group naming an option that has since been renamed is dropped rather than
 * carried: the builder draws these as ticks against the current option list, so
 * a name it cannot find is a tick nobody can see and nobody can clear.
 *
 * This can only check the group's MEMBERS — its own field's options. The group
 * KEYS are the parent's answers and the parent is not in scope here; they are
 * checked in `keepRulesHonest`, which can see the whole list.
 */
/**
 * A rule, kept only where it applies.
 *
 * A question changed from a number to a dropdown would otherwise carry a range
 * check that nothing enforces and the builder no longer shows — the same class
 * of invisible leftover as a filter pointing at a question that has changed
 * type. Dropping it on the way in is what stops it becoming one.
 */
function fieldRule(value: unknown, type: FormFieldType): FieldRule {
  if (!isRecord(value)) return { ...NO_RULE };

  const kind = oneOf(value.kind, RULE_KINDS, "none");
  if (!ruleKindsFor(type).includes(kind)) return { ...NO_RULE };

  return {
    kind,
    min: optionalText(value.min, 40),
    max: optionalText(value.max, 40),
    preset: optionalText(value.preset, 40).replace(/[^a-z0-9-]/gi, ""),
    pattern: optionalText(value.pattern, MAX_PATTERN),
    message: optionalText(value.message, FORM_LIMITS.field_rule_message),
  };
}

function optionFilter(value: unknown, options: string[]): OptionFilter {
  if (!isRecord(value)) return { ...ALL_OPTIONS };

  const key = answerKey(value.key);
  if (!key || !isRecord(value.groups)) return { ...ALL_OPTIONS };

  const groups: Record<string, string[]> = {};

  for (const [answer, listed] of Object.entries(value.groups).slice(0, MAX_FIELD_OPTIONS)) {
    const kept = optionList(listed).filter((option) => options.includes(option));
    if (kept.length > 0) groups[optionText(answer)] = kept;
  }

  return { key, groups };
}

export function normaliseFormInput(input: unknown, notes?: string[]): Omit<Form, "id"> {
  const record = isRecord(input) ? input : {};
  const d = BLANK_FORM;

  const name = optionalText(record.name, FORM_LIMITS.name);
  const typed = optionalText(record.slug, FORM_LIMITS.slug).toLowerCase();
  const slug = usableSlug(typed) || usableSlug(slugify(name)) || fallbackSlug();

  if (typed && slug !== typed) {
    notes?.push(`The address was tidied up to “${slug}”.`);
  }

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
    opens_at: instant(record.opens_at),
    closes_at: instant(record.closes_at),
    max_entries: Math.max(0, Math.min(Math.trunc(Number(record.max_entries) || 0), 1_000_000)),
    sections: normaliseSections(record.sections, record.fields, notes),
    fields: normaliseFormFields(
      record.fields,
      notes,
      normaliseSections(record.sections, record.fields)
    ),
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
  /**
   * The pages actually shown, in order.
   *
   * Empty for a form with no sections, which is every form built before they
   * existed — the page then draws one continuous list, exactly as it always did.
   */
  sectionsAsked: FormSection[];
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
  now: Date = new Date(),
  sections: FormSection[] = []
): CheckedSubmission {
  const sent = isRecord(input) ? input : {};
  const values: Submission = {};
  const errors: Record<string, string> = {};
  const asked: FormField[] = [];
  const options: Record<string, string[]> = {};
  const sectionsAsked: FormSection[] = [];

  // The page currently being walked, and whether it is being shown at all. The
  // fields arrive already sorted into section order — see `normaliseFormFields`
  // — so this is one pass over one list, not a nested loop.
  let onSection = "";
  let sectionOpen = true;

  for (const field of fields) {
    const section = sectionOf(sections, field);

    if (section && section.id !== onSection) {
      onSection = section.id;
      // Against the answers so far, exactly as a question's rule is: a page can
      // only turn on something asked on an earlier page.
      sectionOpen = conditionPasses(section.when, values);
      if (sectionOpen) sectionsAsked.push(section);
    }

    // A skipped page takes its questions with it — including their required
    // checks, because nobody was ever shown them.
    if (!sectionOpen) continue;

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
        // Through the same gate as the options themselves, which is what makes
        // the comparison below meaningful — and de-duplicated, because a
        // hand-rolled post of ["A","A","A"] used to store three of them and
        // export "A; A; A". A tick box cannot be ticked twice.
        const sent = optionList(raw);

        // `offered`, not `field.options`: an option filtered out by an earlier
        // answer was not on the page, so choosing it is choosing nothing.
        const chosen = sent.filter((entry) => offered.includes(entry));

        // And, where the question offers one, a single typed answer. One,
        // because there is one box: a post carrying several is keeping the
        // first and dropping the rest rather than inventing extra boxes.
        const typed = field.allowOther ? sent.find((entry) => !field.options.includes(entry)) : "";

        value = typed ? [...chosen, typed] : chosen;
        break;
      }

      // As do radio buttons and a single dropdown.
      case "select":
      case "radio": {
        const one = clamp(raw, FORM_LIMITS.field_option);

        /*
         * An "Other" answer is not one of the options — that is what it is for.
         *
         * So the exact-match test cannot be the whole story here, and what is
         * stored is what they typed rather than the word "Other": the export
         * then reads as an answer instead of pointing at a second column that
         * would have to exist, and turning the setting off later leaves those
         * answers legible.
         *
         * It does mean this question stops enforcing its option list, including
         * any filter on it. That is the honest consequence of offering a free
         * text box beside the choices, and it is bounded by the same length
         * limit an option has.
         */
        value = offered.includes(one) ? one : field.allowOther ? optionText(one) : "";
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
        const sent = clamp(raw, 40);
        const one = isoDate(sent);

        if (!one && sent) {
          errors[field.id] = `${name} is not a date.`;
        } else if (one && field.age && !ageFrom(one, now)) {
          // A date this field is meant to work an age out of, that no age can
          // come from: a year typed 2035 instead of 1935, or a birthday in the
          // future. It used to pass, store a blank age, and quietly close every
          // branch that depended on being over or under some number of years —
          // so the person was asked the wrong questions and nothing said why.
          errors[field.id] = `${name} does not look like a date of birth.`;
        }

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

      case "file": {
        /*
         * By the time this runs the bytes are already in the bucket and this is
         * the note saying where — see the submit route, which uploads before it
         * validates because a file is not something you can hold in a JSON
         * body. Anything that does not decode as one of those notes is not a
         * file, which is what makes "required" mean "a file arrived".
         */
        value = fileOf(raw) ? (raw as string) : "";
        break;
      }

      default:
        value = clamp(raw, FORM_LIMITS.value_text);
    }

    // Required is checked on what survived, not on what arrived: a choice that
    // is not on the list is the same as no choice at all.
    /*
     * The field's own rule, on top of its type.
     *
     * Only on an answer that is actually there and has not already failed: a
     * blank answer is the required check's business, and telling somebody their
     * empty box is the wrong shape helps nobody. A list answer is not checked —
     * every entry in it came from the options, so there is nothing left to
     * disagree with.
     */
    if (!errors[field.id] && typeof value === "string" && value !== "") {
      const broken = checkRule(field, value);
      if (broken) errors[field.id] = broken;
    }

    /*
     * Required, but only if there was something to answer with.
     *
     * A choice question whose filter leaves nothing on offer cannot be
     * answered, so demanding an answer is a dead end with no way out: the
     * visitor sees "this is required" under a control with no options in it,
     * and no amount of clicking fixes a form that is misconfigured. The entry
     * goes through with that answer blank, and the admin has an empty column to
     * notice rather than an entry they never received.
     */
    const answerable = !isChoice(field.type) || offered.length > 0;

    const empty = Array.isArray(value) ? value.length === 0 : value === "";
    if (field.required && empty && answerable && !errors[field.id]) {
      errors[field.id] = field.type === "checkbox" ? `${name} has to be ticked.` : `${name} is required.`;
    }

    values[field.id] = value;

    // The derived answer, written straight after the one it comes from so that
    // any later condition comparing against an age finds it already there.
    if (field.age && field.type === "date") {
      values[ageKey(field.id)] = ageFrom(typeof value === "string" ? value : "", now);
    }
  }

  return { values, errors, asked, options, sectionsAsked };
}

/* ───────────────────────────── Reading entries ───────────────────────── */

/** What one answer prints as, whatever type it came from. */
export function answerText(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value.join("; ");

  // An attachment reads as its filename. The key it is stored under is of no
  // use to anybody reading a spreadsheet, and printing it in an export that
  // gets emailed around would be handing out the location of somebody's
  // identity documents.
  const file = fileOf(value);
  if (file) return file.name;

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
 * An edited entry, without losing what the edit could not see.
 *
 * `validateSubmission` returns answers only to the questions it actually ASKED,
 * so its output is never the whole entry. Two kinds of answer are missing from
 * it, and saving it straight over the row destroyed both:
 *
 *   retired questions   deleted from the form since. These are the ones the
 *                       table lists under "no longer asked" and the export
 *                       gives a column of their own — and the entry dialog
 *                       promises are safe from an edit.
 *   unasked questions   still on the form, but behind a branch that is closed
 *                       for this entry. Nothing marks these as special, so they
 *                       were simply gone, and gone quietly: not orphans, so not
 *                       listed anywhere, and not in the export either.
 *
 * The second one had a mundane trigger. Rename an option in the builder and
 * every stored answer naming the old text stops matching; the branch it opened
 * evaluates false; and the next unrelated typo fix wipes that whole branch off
 * the entry. Nobody would connect the two.
 *
 * So: everything the edit decided wins, and everything it did not mention is
 * left exactly as it was. An asked question that was deliberately cleared is
 * still cleared — `next` carries a blank for it, which counts as mentioning it.
 */
export function withOrphans(previous: Submission, next: Submission): Submission {
  return { ...previous, ...next };
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
