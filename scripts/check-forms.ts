/**
 * The registration form's rules, checked.
 *
 *   npm run check:forms
 *
 * `src/lib/forms.ts` decides three things at once — which questions are asked,
 * which options are offered, and what is stored — and both the browser and the
 * submit route run it. That makes it the one file here where a quiet mistake
 * reaches the database, and the one worth a harness: every case below is a bug
 * that actually shipped, so this is a list of things that have gone wrong once
 * and must not again.
 *
 * No database and no network — the whole point is that this logic is pure and
 * can be exercised in a second. What it cannot check is the SQL or the screens;
 * those are in the verification steps of the plan.
 */

import {
  MAX_FORM_FIELDS,
  MAX_OPTION_BANDS,
  MAX_SECTIONS,
  MAX_UPLOAD_MB,
  keyIsNumeric,
  addField,
  addSection,
  fieldsOn,
  keysBeforeSection,
  moveSection,
  nudgeField,
  placeField,
  removeSection,
  type Outline,
  ageFrom,
  ageKey,
  answerColumns,
  answerText,
  encodeFile,
  fileOf,
  dayFor,
  formState,
  isTakingEntries,
  normaliseFormFields,
  normaliseFormInput,
  ruleKindsFor,
  isOtherAnswer,
  offeredOptions,
  placesLeft,
  safePattern,
  validateSubmission,
  withOrphans,
} from "@/lib/forms";
import { checkNational, countryFor, joinNumber, splitNumber } from "@/lib/dialling";

let failures = 0;

function check(label: string, got: unknown, want: unknown): void {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures += 1;
  console.log(`${ok ? "  ok  " : " FAIL "}${label}`);
  if (!ok) console.log(`        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`);
}

function section(title: string): void {
  console.log(`\n${title}`);
}

/* ───────────────────────── Options as a join key ──────────────────────── */

section("Option text is canonical everywhere it is compared");
{
  const [field] = normaliseFormFields([
    { id: "a", type: "radio", options: ["  Karting  ", "", "Karting", "Circuit", "x".repeat(300)] },
  ]);

  check("trimmed, blanks dropped, repeats dropped", field.options.slice(0, 2), [
    "Karting",
    "Circuit",
  ]);
  check("clamped to the same length an answer is", field.options[2].length, 120);
}

{
  // An option between the two old limits could be stored but never chosen, so
  // a required question carrying one could never be submitted at all.
  const long = "y".repeat(150);
  const fields = normaliseFormFields([
    { id: "a", type: "select", required: true, options: [long] },
  ]);
  const checked = validateSubmission(fields, { a: fields[0].options[0] });

  check("a long option is pickable", checked.values.a, fields[0].options[0]);
  check("and does not error", checked.errors.a, undefined);
}

{
  const [, child] = normaliseFormFields([
    { id: "p", type: "radio", options: ["Karting ", "Circuit"] },
    {
      id: "c",
      type: "select",
      options: [" Micro Max ", "Formula 4", "Other"],
      optionsWhen: { key: "p", groups: { "Karting ": ["Micro Max"], Circuit: ["Formula 4"] } },
    },
  ]);

  check("a trailing space does not orphan a group", Object.keys(child.optionsWhen.groups).sort(), [
    "Circuit",
    "Karting",
  ]);
  check("and the filter still works", offeredOptions(child, { p: "Karting" }), [
    "Micro Max",
    "Other",
  ]);
}

/* ─────────────────────────── Rules stay honest ────────────────────────── */

section("A rule that has stopped making sense is dropped, and said out loud");
{
  const notes: string[] = [];
  const fields = normaliseFormFields(
    [
      { id: "p", type: "radio", options: ["Karting", "Circuit"] },
      { id: "c", type: "text", when: { key: "p", op: "is", values: ["Rallying"] } },
    ],
    notes
  );

  check("compares against an option that is gone", fields[1].when.key, "");
  check("and reports it", notes.some((note) => note.includes("Rallying")), true);
}

{
  const notes: string[] = [];
  const fields = normaliseFormFields(
    [
      { id: "p", type: "text" },
      { id: "c", type: "select", options: ["A", "B"], optionsWhen: { key: "p", groups: { X: ["A"] } } },
    ],
    notes
  );

  check("parent stopped being a choice question", fields[1].optionsWhen.key, "");
  check("so every option is offered again", offeredOptions(fields[1], {}), ["A", "B"]);
  check("and reports it", notes.some((n) => n.includes("no longer a choice question")), true);
}

{
  const notes: string[] = [];
  const fields = normaliseFormFields(
    [
      { id: "p", type: "radio", options: ["Karting"] },
      {
        id: "c",
        type: "select",
        options: ["A", "B"],
        optionsWhen: { key: "p", groups: { Karting: ["A"], Rallying: ["B"] } },
      },
    ],
    notes
  );

  check("a group key left by a rename is dropped", Object.keys(fields[1].optionsWhen.groups), [
    "Karting",
  ]);
  // B belonged only to the dead group, so it is ungrouped now — and an
  // ungrouped option is always on offer.
  check("its options come back", offeredOptions(fields[1], { p: "Karting" }), ["A", "B"]);
  check("and reports it", notes.some((n) => n.includes("option group")), true);
}

{
  const fields = normaliseFormFields([
    { id: "early", type: "text", when: { key: "later", op: "answered", values: [] } },
    { id: "later", type: "text" },
  ]);

  check("a rule may not look forwards", fields[0].when.key, "");
}

/* ─────────────────────────────── Branching ────────────────────────────── */

section("Branching decides what is asked, offered and kept — in one pass");
{
  const fields = normaliseFormFields([
    { id: "disc", type: "radio", required: true, options: ["Karting", "Circuit"] },
    {
      id: "cls",
      type: "select",
      options: ["Micro Max", "Formula 4", "Other"],
      optionsWhen: { key: "disc", groups: { Karting: ["Micro Max"], Circuit: ["Formula 4"] } },
    },
    { id: "kart", type: "text", when: { key: "disc", op: "is", values: ["Karting"] } },
    { id: "team", type: "text", when: { key: "disc", op: "is", values: ["Circuit"] } },
  ]);

  const karting = validateSubmission(fields, { disc: "Karting", cls: "Formula 4", kart: "7" });

  check("only this branch is asked", karting.asked.map((f) => f.id), ["disc", "cls", "kart"]);
  check("only this branch's options are offered", karting.options.cls, ["Micro Max", "Other"]);
  check("an answer from the other branch is dropped", karting.values.cls, "");
  check("an unasked question stores nothing at all", "team" in karting.values, false);
  check("and the asked one is kept", karting.values.kart, "7");
}

{
  // A filter that leaves nothing on offer is a question nobody can answer, so
  // requiring it trapped the visitor on a form that could never be sent.
  const fields = normaliseFormFields([
    { id: "p", type: "radio", options: ["A", "B"] },
    {
      id: "c",
      type: "select",
      required: true,
      options: ["only-for-a"],
      optionsWhen: { key: "p", groups: { A: ["only-for-a"] } },
    },
  ]);

  const checked = validateSubmission(fields, { p: "B" });
  check("nothing on offer means nothing is required", checked.errors.c, undefined);
  check("and the answer is simply blank", checked.values.c, "");
}

/* ─────────────────────── Branching on a number ────────────────────────── */

section("Options can be decided by a number as well as by words");
{
  const fields = normaliseFormFields([
    { id: "dob", type: "date", age: true },
    {
      id: "cls",
      type: "select",
      options: ["Micro Max", "Senior Max", "Formula 4", "Other"],
      optionsWhen: {
        key: "dob.age",
        bands: [
          { min: "", max: "15", options: ["Micro Max"] },
          { min: "16", max: "", options: ["Senior Max", "Formula 4"] },
        ],
      },
    },
  ]);
  const cls = fields[1];

  check("both ranges survive the way in", cls.optionsWhen.bands.length, 2);
  check("a fourteen-year-old", offeredOptions(cls, { [ageKey("dob")]: "14" }), [
    "Micro Max",
    "Other",
  ]);
  // Both ends count, so the two ranges meet without a gap and without an overlap.
  check("the top of a range is in it", offeredOptions(cls, { [ageKey("dob")]: "15" }), [
    "Micro Max",
    "Other",
  ]);
  check("and so is the bottom of the next", offeredOptions(cls, { [ageKey("dob")]: "16" }), [
    "Senior Max",
    "Formula 4",
    "Other",
  ]);
  check("no age given yet, so only the unclaimed one", offeredOptions(cls, {}), ["Other"]);
  check("an answer that is not a number matches no range", offeredOptions(cls, { [ageKey("dob")]: "grown up" }), [
    "Other",
  ]);

  // The whole way through, in the order the server does it: the date is read,
  // the age is written, and the age decides what the next question offers.
  const noon = new Date("2026-08-14T12:00:00Z");
  const young = validateSubmission(fields, { dob: "2014-01-01", cls: "Formula 4" }, noon);

  check("the age is written before the filter reads it", young.values[ageKey("dob")], "12");
  check("so a class that age does not unlock is dropped", young.values.cls, "");
  check("and the offer says the same", young.options.cls, ["Micro Max", "Other"]);

  const grown = validateSubmission(fields, { dob: "2000-01-01", cls: "Formula 4" }, noon);
  check("one it does unlock is kept", grown.values.cls, "Formula 4");
}

{
  const fields = normaliseFormFields([
    { id: "seats", type: "number" },
    {
      id: "kit",
      type: "checkboxes",
      options: ["A", "B", "C"],
      optionsWhen: {
        key: "seats",
        bands: [
          { min: "1", max: "2", options: ["A"] },
          { min: "2", max: "4", options: ["B"] },
          { min: "5", max: "", options: ["C"] },
        ],
      },
    },
  ]);

  check("overlapping ranges both apply, once each", offeredOptions(fields[1], { seats: "2" }), [
    "A",
    "B",
  ]);
  check("a number in no range at all", offeredOptions(fields[1], { seats: "0" }), []);
  check("a decimal falls where it lands", offeredOptions(fields[1], { seats: "1.5" }), ["A"]);
}

{
  const fields = normaliseFormFields([
    { id: "n", type: "number" },
    {
      id: "c",
      type: "select",
      options: ["A", "B"],
      optionsWhen: {
        key: "n",
        bands: [
          { min: "", max: "", options: ["A"] },
          { min: "1", max: "2", options: [] },
          { min: "3", max: "", options: ["B", "not an option"] },
        ],
      },
    },
  ]);

  check("a range with no numbers, and one with no options, are dropped", fields[1].optionsWhen.bands, [
    { min: "3", max: "", options: ["B"] },
  ]);
  // A claimed by nothing now, so it is offered to everybody — the same reading
  // an option in no group gets.
  check("and what they claimed comes back", offeredOptions(fields[1], {}), ["A"]);

  // Before the save, a half-written range must be inert rather than hiding what
  // it has ticked: the builder writes one of these the moment "Add a range" is
  // pressed, and options vanishing under an empty box is not an edit anybody made.
  const halfWritten = {
    ...fields[1],
    optionsWhen: {
      ...fields[1].optionsWhen,
      bands: [...fields[1].optionsWhen.bands, { min: "", max: "", options: ["A"] }],
    },
  };
  check("a half-written range hides nothing in the meantime", offeredOptions(halfWritten, {}), ["A"]);
}

{
  const many = Array.from({ length: 12 }, (_, at) => ({
    min: String(at),
    max: String(at),
    options: ["X"],
  }));
  const fields = normaliseFormFields([
    { id: "n", type: "number" },
    { id: "c", type: "select", options: ["X"], optionsWhen: { key: "n", bands: many } },
  ]);

  check("the number of ranges is capped", fields[1].optionsWhen.bands.length, MAX_OPTION_BANDS);
}

section("The two halves of a filter never apply to the wrong kind of parent");
{
  const notes: string[] = [];
  const fields = normaliseFormFields(
    [
      { id: "p", type: "radio", options: ["A", "B"] },
      {
        id: "c",
        type: "select",
        options: ["X"],
        optionsWhen: { key: "p", bands: [{ min: "1", max: "2", options: ["X"] }] },
      },
    ],
    notes
  );

  check("ranges against a choice question are dropped", fields[1].optionsWhen.bands, []);
  check("and reported", notes.some((note) => note.includes("number ranges")), true);
  check("the filter itself survives", fields[1].optionsWhen.key, "p");
}

{
  const notes: string[] = [];
  const fields = normaliseFormFields(
    [
      { id: "n", type: "number" },
      { id: "c", type: "select", options: ["X"], optionsWhen: { key: "n", groups: { "1": ["X"] } } },
    ],
    notes
  );

  check("groups against a number question are dropped", Object.keys(fields[1].optionsWhen.groups), []);
  check("and reported", notes.some((note) => note.includes("option groups")), true);
  check("so every option is on offer meanwhile", offeredOptions(fields[1], { n: "1" }), ["X"]);
}

{
  const fields = normaliseFormFields([
    // The age is NOT switched on, so `dob.age` is not an answer anybody gives.
    { id: "dob", type: "date" },
    {
      id: "c",
      type: "select",
      options: ["X"],
      optionsWhen: { key: "dob.age", bands: [{ min: "18", max: "", options: ["X"] }] },
    },
  ]);

  check("an age that is never worked out cannot decide anything", fields[1].optionsWhen.key, "");
}

check("a number question answers with a number", keyIsNumeric([{ id: "n", type: "number" }] as never, "n"), true);
check("a text question does not", keyIsNumeric([{ id: "t", type: "text" }] as never, "t"), false);
check(
  "a date does not, but the age it works out does",
  [
    keyIsNumeric([{ id: "d", type: "date", age: true }] as never, "d"),
    keyIsNumeric([{ id: "d", type: "date", age: true }] as never, ageKey("d")),
    keyIsNumeric([{ id: "d", type: "date", age: false }] as never, ageKey("d")),
  ],
  [false, true, false]
);

section("A range is one comparison, and it keeps both of its ends");
{
  const fields = normaliseFormFields([
    { id: "dob", type: "date", age: true },
    { id: "j", type: "text", when: { key: ageKey("dob"), op: "between", values: ["12", "16"] } },
  ]);
  const noon = new Date("2026-08-14T12:00:00Z");
  const asked = (dob: string) =>
    validateSubmission(fields, { dob }, noon).asked.map((field) => field.id);

  check("below the range", asked("2020-01-01"), ["dob"]);
  check("the bottom of it", asked("2014-01-01"), ["dob", "j"]);
  check("the top of it", asked("2010-01-01"), ["dob", "j"]);
  check("above it", asked("2009-01-01"), ["dob"]);
  check("and no answer at all", asked(""), ["dob"]);
}

{
  /*
   * A range is a PAIR held by position, not a list of values. Through
   * `optionList` — which every other comparison uses — "between 12 and 12" would
   * lose its second end to the repeat check, and a blank first end would slide
   * the second one into its place and quietly become "at least 16".
   */
  const [, same] = normaliseFormFields([
    { id: "n", type: "number" },
    { id: "c", type: "text", when: { key: "n", op: "between", values: ["12", "12"] } },
  ]);
  check("both ends survive being the same number", same.when.values, ["12", "12"]);

  const fields = normaliseFormFields([
    { id: "n", type: "number" },
    { id: "c", type: "text", when: { key: "n", op: "between", values: ["", "16"] } },
  ]);
  check("a missing end stays missing rather than sliding along", fields[1].when.values, ["", "16"]);
  check(
    "and a range with a missing end asks nobody",
    validateSubmission(fields, { n: "3" }).asked.map((field) => field.id),
    ["n"]
  );
}

{
  const notes: string[] = [];
  const fields = normaliseFormFields(
    [
      { id: "p", type: "radio", options: ["A", "B"] },
      { id: "c", type: "text", when: { key: "p", op: "atLeast", values: ["18"] } },
    ],
    notes
  );

  check("a number compared against words is dropped whole", fields[1].when.key, "");
  check("and reported as what it is", notes.some((note) => note.includes("answers with words")), true);
}

{
  /*
   * A bound nobody typed is not a bound of zero.
   *
   * `Number("")` is 0, so "is at least [blank]" was true of every positive
   * answer and "is at most [blank]" of every negative one — a rule the builder
   * draws as unfinished and the form treated as satisfied.
   */
  const fields = normaliseFormFields([
    { id: "n", type: "number" },
    { id: "c", type: "text", when: { key: "n", op: "atLeast", values: [] } },
  ]);

  check(
    "an empty bound asks nobody rather than everybody",
    validateSubmission(fields, { n: "40" }).asked.map((field) => field.id),
    ["n"]
  );

  const bands = normaliseFormFields([
    { id: "n", type: "number" },
    {
      id: "c",
      type: "select",
      options: ["A"],
      optionsWhen: { key: "n", bands: [{ min: " ", max: "", options: ["A"] }] },
    },
  ]);

  check("and a range of nothing but a space is no range", bands[1].optionsWhen.bands, []);
}

section("A phone number carries the country it belongs to");
{
  const [india, uk] = [countryFor("IN"), countryFor("GB")];

  check("a stored number splits back into the two halves it was built from", splitNumber("+91 9876543210"), {
    country: india,
    national: "9876543210",
  });
  // Longest code first, or "+1" claims a "+94" number and a Sri Lankan entrant
  // is told a ten-digit number is the wrong length for the United States.
  check("a longer code is not eaten by a shorter one", splitNumber("+94 712345678").country.code, "LK");
  check("what people type between digits is decoration", splitNumber("+44 (7911) 123-456").national, "7911123456");

  // Nothing before the picker existed is thrown away: it comes back on the home
  // country with its digits intact, which is what the box then shows.
  check("a number with no code at all", splitNumber("98765 43210"), { country: india, national: "9876543210" });
  check("and nothing at all", splitNumber(""), { country: india, national: "" });

  check("joined as it is stored", joinNumber(india, "98765 43210"), "+91 9876543210");
  check("nothing typed stores nothing, not a bare code", joinNumber(india, ""), "");

  check("the right length for the country", checkNational(india, "9876543210"), "");
  check(
    "one digit short",
    checkNational(india, "987654321"),
    "A number in India is 10 digits after +91 — that has 9."
  );
  check("a range is a range", [checkNational(uk, "791112345"), checkNational(uk, "7911123456")], ["", ""]);
  check("nothing typed is not an error, it is unanswered", checkNational(india, ""), "");
}

{
  /*
   * The half that matters: the browser drawing a picker is a courtesy, and the
   * route is what decides. A number the control could not have produced must
   * not be accepted just because it was posted around the control.
   */
  const [field] = normaliseFormFields([{ id: "p", type: "phone", label: "Mobile" }]);
  const at = (typed: string) => validateSubmission([field], { p: typed });

  check("ten digits on +91 is accepted", at("+91 9876543210").errors.p, undefined);
  check("and stored as it was sent", at("+91 9876543210").values.p, "+91 9876543210");
  check("nine is refused by the route, not only by the box", at("+91 987654321").errors.p !== undefined, true);
  check("and the refusal names the country", at("+91 987654321").errors.p?.includes("India"), true);

  // An answer given before the picker existed has no code, so no country claims
  // it — and a form that starts rejecting the numbers it already holds is one
  // that broke on the day a control was added.
  check("a codeless number is left alone", at("9876543210").errors.p, undefined);
  check("as is a landline written the old way", at("044 2345 6789").errors.p, undefined);
  check("but nonsense is still nonsense", at("not a number").errors.p !== undefined, true);
}

section("Digits are counted, and a value is measured — they are different rules");
{
  /*
   * The bug this section exists for. A mobile number was written as a Number
   * question with "How big it is → at least 10", and nine digits sailed through:
   * 987654321 is bigger than ten. The rule was right; the reading of it was not,
   * and until now there was no rule that could say "ten digits".
   */
  const [value] = normaliseFormFields([
    { id: "m", type: "number", label: "Mobile Number", rule: { kind: "number", min: "10" } },
  ]);
  check(
    "nine digits passes a bound on the value, as it always did",
    validateSubmission([value], { m: "987654321" }).errors.m,
    undefined
  );

  const [digits] = normaliseFormFields([
    { id: "m", type: "number", label: "Mobile Number", rule: { kind: "digits", min: "10" } },
  ]);
  check(
    "and fails a bound on the digits",
    validateSubmission([digits], { m: "987654321" }).errors.m,
    "Mobile Number has to have at least 10 digits — that has 9 digits."
  );
  check("ten of them is accepted", validateSubmission([digits], { m: "9876543210" }).errors.m, undefined);
}

{
  const [phone] = normaliseFormFields([
    { id: "p", type: "phone", label: "Mobile", rule: { kind: "digits", min: "10", max: "10" } },
  ]);
  const at = (typed: string) => validateSubmission([phone], { p: typed }).errors.p;

  check("the punctuation people write a number with is not counted", at("98765 43210"), undefined);
  check("nor are brackets and hyphens", at("(98765)-43210"), undefined);
  check("but a country code is digits", at("+91 98765 43210") !== undefined, true);
  check("and nine is still nine", at("987654321") !== undefined, true);
}

{
  // A phone question could carry no bound at all before this: its only rule was
  // a regular expression, which is a lot to ask for "ten digits".
  check("a phone question can be counted now", ruleKindsFor("phone").includes("digits"), true);
  check("and so can a number question", ruleKindsFor("number").includes("digits"), true);
  check("a text question is measured, not counted", ruleKindsFor("text").includes("digits"), false);
}

{
  const notes: string[] = [];
  const fields = normaliseFormFields(
    [{ id: "m", type: "number", label: "Mobile", rule: { kind: "length", min: "10" } }],
    notes
  );

  check("a rule the new type cannot enforce is dropped", fields[0].rule.kind, "none");
  check(
    "and it is reported rather than vanishing",
    notes.some((note) => note.includes("Mobile") && note.includes("accepts any answer now")),
    true
  );
}

section("A date question can refuse an age as well as a date");
{
  const noon = new Date("2026-08-14T12:00:00Z");
  const fields = normaliseFormFields([
    {
      id: "dob",
      type: "date",
      age: true,
      label: "Date of birth",
      rule: { kind: "age", min: "12", max: "16" },
    },
  ]);

  check("the rule survives on a date question", fields[0].rule.kind, "age");

  const at = (dob: string) => validateSubmission(fields, { dob }, noon).errors.dob;

  // Both ends count, so the day somebody turns 12 is the first day they are in.
  check("too young", at("2015-01-01") !== undefined, true);
  check("the day they turn twelve", at("2014-08-14"), undefined);
  check("the day before that", at("2014-08-15") !== undefined, true);
  check("the last day of being sixteen", at("2009-08-15"), undefined);
  check("and the day they turn seventeen", at("2009-08-14") !== undefined, true);
  check("the sentence says what it wants and what it got", at("2015-01-01"), [
    "You have to be 12 or older on the day you enter — that date works out to 11.",
  ][0]);

  // The rule is checked against the SAME day the stored age is worked out from,
  // or the two halves of one entry disagree about somebody's birthday.
  const entry = validateSubmission(fields, { dob: "2014-08-14" }, noon);
  check("and the age it stored agrees with it", entry.values[ageKey("dob")], "12");
}

{
  const fields = normaliseFormFields([
    { id: "dob", type: "date", rule: { kind: "age", min: "18", max: "" } },
  ]);
  const noon = new Date("2026-08-14T12:00:00Z");

  // The age COLUMN is off here. The rule works the age out for itself, so
  // switching that column off cannot silently drop an age limit with it.
  check("an age limit does not need the age column", fields[0].rule.min, "18");
  check(
    "and it is still enforced",
    validateSubmission(fields, { dob: "2012-01-01" }, noon).errors.dob !== undefined,
    true
  );
  check(
    "the age is not stored, though",
    ageKey("dob") in validateSubmission(fields, { dob: "2000-01-01" }, noon).values,
    false
  );
}

{
  const fields = normaliseFormFields([
    { id: "dob", type: "date", rule: { kind: "age", min: "18", max: "" } },
  ]);
  const noon = new Date("2026-08-14T12:00:00Z");

  check(
    "a date no age can come from is refused by the rule too",
    validateSubmission(fields, { dob: "2035-01-01" }, noon).errors.dob !== undefined,
    true
  );
}

{
  // The wrong kind of rule on the wrong kind of question is dropped on the way
  // in, exactly as a length rule on a date already was.
  const fields = normaliseFormFields([{ id: "n", type: "number", rule: { kind: "age", min: "18" } }]);
  check("an age rule only belongs to a date", fields[0].rule.kind, "none");
}

section("Less than is its own comparison, not at most with the number moved");
{
  const fields = normaliseFormFields([
    { id: "dob", type: "date", age: true },
    { id: "u", type: "text", when: { key: ageKey("dob"), op: "lessThan", values: ["18"] } },
    { id: "o", type: "text", when: { key: ageKey("dob"), op: "moreThan", values: ["18"] } },
  ]);
  const noon = new Date("2026-08-14T12:00:00Z");
  const asked = (dob: string) =>
    validateSubmission(fields, { dob }, noon).asked.map((field) => field.id);

  check("seventeen is under eighteen", asked("2009-01-01"), ["dob", "u"]);
  check("eighteen is neither under nor over it", asked("2008-01-01"), ["dob"]);
  check("nineteen is over it", asked("2007-01-01"), ["dob", "o"]);
}

/* ──────────────────────────── Dates and ages ──────────────────────────── */

section("Age is worked out the same way on both sides of the wire");
{
  const noon = new Date("2026-08-13T12:00:00Z");

  check("the day before a birthday", ageFrom("2008-08-14", noon), "17");
  check("the birthday itself", ageFrom("2008-08-13", noon), "18");
  check("a date in the future", ageFrom("2030-01-01", noon), "");

  // The bug this replaced: local-time getters meant a visitor in India at one
  // in the morning got a different answer from a server running in UTC.
  const midnightUtc = new Date("2026-08-13T18:30:00Z");
  const inIndia = dayFor(-330, midnightUtc);
  check("the visitor's own day decides", ageFrom("2008-08-14", inIndia), "18");
  check("an absurd offset is ignored", dayFor(99999, noon).toISOString(), noon.toISOString());
}

{
  const fields = normaliseFormFields([
    { id: "dob", type: "date", age: true },
    {
      id: "lic",
      type: "text",
      label: "Licence number",
      required: true,
      when: { key: "dob.age", op: "atLeast", values: ["18"] },
    },
  ]);
  const stamp = new Date("2026-08-13T12:00:00Z");

  const grown = validateSubmission(fields, { dob: "2000-01-01" }, stamp);
  check("the age is stored beside the date", grown.values[ageKey("dob")], "26");
  check("and can gate a later question", grown.errors.lic, "Licence number is required.");

  const child = validateSubmission(fields, { dob: "2015-06-01" }, stamp);
  check("under age, the question is not asked", child.asked.some((f) => f.id === "lic"), false);
  check("so it cannot be required either", child.errors.lic, undefined);

  const wrong = validateSubmission(fields, { dob: "2035-06-01" }, stamp);
  check("a date no age can come from is an error", wrong.errors.dob !== undefined, true);
}

/* ────────────────────────────── Submissions ───────────────────────────── */

section("What a stranger sends is clamped to what the form allows");
{
  const fields = normaliseFormFields([{ id: "a", type: "checkboxes", options: ["A", "B"] }]);
  check(
    "repeats in a multi-answer are dropped",
    validateSubmission(fields, { a: ["A", "A", "B", "A"] }).values.a,
    ["A", "B"]
  );
}

{
  const fields = normaliseFormFields([{ id: "created", type: "text" }]);
  check("the reserved sort key cannot be a field id", fields[0].id !== "created", true);
}

{
  const fields = normaliseFormFields([{ id: "f2", type: "text" }, { id: "", type: "text" }]);
  check("a generated id never collides", fields[0].id !== fields[1].id, true);
}

{
  const fields = normaliseFormFields([{ id: "dob", type: "date", age: true }]);
  check("a date that works out an age is two columns", answerColumns(fields).map((c) => c.key), [
    "dob",
    "dob.age",
  ]);
}

/* ─────────────────────── Rules about an answer ────────────────────────── */

section("A field's own rule is enforced on both sides");
{
  const fields = normaliseFormFields([
    {
      id: "team",
      type: "text",
      label: "Team",
      rule: { kind: "length", min: "3", max: "10" },
    },
    {
      id: "age",
      type: "number",
      label: "Age",
      rule: { kind: "number", min: "8", max: "60", message: "Entrants are 8 to 60." },
    },
    {
      id: "when",
      type: "date",
      label: "Race day",
      rule: { kind: "date", min: "2026-01-01", max: "2026-12-31" },
    },
    {
      id: "pin",
      type: "text",
      label: "PIN code",
      rule: { kind: "pattern", preset: "pin-in" },
    },
  ]);

  check("too short", validateSubmission(fields, { team: "AB" }).errors.team, "Team has to be at least 3 characters.");
  check("too long", validateSubmission(fields, { team: "A".repeat(11) }).errors.team !== undefined, true);
  check("just right", validateSubmission(fields, { team: "Turbo" }).errors.team, undefined);

  check("below the range", validateSubmission(fields, { age: "6" }).errors.age, "Entrants are 8 to 60.");
  check("above the range", validateSubmission(fields, { age: "61" }).errors.age, "Entrants are 8 to 60.");
  check("inside it", validateSubmission(fields, { age: "17" }).errors.age, undefined);

  check("before the window", validateSubmission(fields, { when: "2025-12-31" }).errors.when !== undefined, true);
  check("inside the window", validateSubmission(fields, { when: "2026-06-01" }).errors.when, undefined);

  check("a preset that does not match", validateSubmission(fields, { pin: "012345" }).errors.pin !== undefined, true);
  check("a preset that does", validateSubmission(fields, { pin: "600001" }).errors.pin, undefined);

  // A blank answer is the required check's business, not the rule's.
  check("a rule never fires on a blank", validateSubmission(fields, { team: "" }).errors.team, undefined);
}

{
  // A rule only survives on a question it can apply to — otherwise changing a
  // question's type leaves a check nothing enforces and nothing displays.
  const [field] = normaliseFormFields([
    { id: "a", type: "select", options: ["x"], rule: { kind: "length", min: "3", max: "9" } },
  ]);
  check("a rule that cannot apply is dropped", field.rule.kind, "none");
}

section("A dangerous expression is refused rather than run");
{
  check("plain expression compiles", safePattern("^[0-9]{6}$") !== null, true);
  check("nested quantifier refused", safePattern("^(a+)+$"), null);
  check("nested star refused", safePattern("^(\\d*)*$"), null);
  check("nested group refused", safePattern("^((ab)+)+$"), null);
  check("an over-long one refused", safePattern("a".repeat(300)), null);
  check("an invalid one refused", safePattern("^([a-z]$"), null);

  // A refused expression must not become an unanswerable question.
  const [field] = normaliseFormFields([
    { id: "a", type: "text", label: "A", rule: { kind: "pattern", preset: "custom", pattern: "^(a+)+$" } },
  ]);
  check("so it checks nothing", validateSubmission([field], { a: "anything" }).errors.a, undefined);
}

section("A choice question can offer a box to type in");
{
  const fields = normaliseFormFields([
    { id: "one", type: "select", options: ["A", "B"], allowOther: true },
    { id: "many", type: "checkboxes", options: ["A", "B"], allowOther: true },
    { id: "strict", type: "select", options: ["A", "B"] },
  ]);

  check("a typed answer is kept as typed", validateSubmission(fields, { one: "Something else" }).values.one, "Something else");
  check("a chosen option still works", validateSubmission(fields, { one: "A" }).values.one, "A");
  check("without the box, off-list is dropped", validateSubmission(fields, { strict: "Nope" }).values.strict, "");

  check(
    "options and one typed answer together",
    validateSubmission(fields, { many: ["A", "Something else"] }).values.many,
    ["A", "Something else"]
  );
  check(
    "only one typed answer, however many are sent",
    validateSubmission(fields, { many: ["First", "Second"] }).values.many,
    ["First"]
  );

  check("and it is recognised as typed", isOtherAnswer(fields[0], "Something else"), true);
  check("while an option is not", isOtherAnswer(fields[0], "A"), false);

  // Turning it off leaves stored answers alone but stops accepting new ones.
  const [off] = normaliseFormFields([{ id: "one", type: "select", options: ["A"], allowOther: false }]);
  check("the flag does not survive on a non-choice", normaliseFormFields([{ id: "t", type: "text", allowOther: true }])[0].allowOther, false);
  check("and off means off", validateSubmission([off], { one: "typed" }).values.one, "");
}

section("Whether a form is taking entries is derived, not just its switch");
{
  const base = { status: "open" as const, opens_at: "", closes_at: "", max_entries: 0 };
  const now = new Date("2026-06-15T12:00:00Z");

  check("plainly open", formState(base, 0, now), "open");
  check("a draft is a draft whatever else says", formState({ ...base, status: "draft", max_entries: 1 }, 5, now), "draft");
  check("the switch still closes it", formState({ ...base, status: "closed" }, 0, now), "closed");

  check("before its opening time", formState({ ...base, opens_at: "2026-07-01T00:00:00Z" }, 0, now), "scheduled");
  check("after its opening time", formState({ ...base, opens_at: "2026-01-01T00:00:00Z" }, 0, now), "open");
  check("past its closing time", formState({ ...base, closes_at: "2026-06-01T00:00:00Z" }, 0, now), "closed");
  check("inside its window", formState({ ...base, opens_at: "2026-01-01T00:00:00Z", closes_at: "2026-12-01T00:00:00Z" }, 0, now), "open");

  check("under the cap", formState({ ...base, max_entries: 60 }, 59, now), "open");
  check("at the cap", formState({ ...base, max_entries: 60 }, 60, now), "full");
  check("over the cap", formState({ ...base, max_entries: 60 }, 61, now), "full");
  check("no cap means never full", formState(base, 9999, now), "open");

  // Closed beats full: once the date has gone, the cap is the less interesting
  // of the two reasons and "come back next year" is the useful sentence.
  check(
    "closed wins over full",
    formState({ ...base, closes_at: "2026-06-01T00:00:00Z", max_entries: 1 }, 5, now),
    "closed"
  );

  check("places left", placesLeft({ max_entries: 60 }, 58), 2);
  check("never negative", placesLeft({ max_entries: 60 }, 61), 0);
  check("null without a cap", placesLeft({ max_entries: 0 }, 61), null);

  check("only open takes entries", ["draft", "scheduled", "open", "closed", "full"].filter((state) => isTakingEntries(state as never)), ["open"]);
}

{
  // A closing time typed into the builder survives the round trip as an instant.
  const saved = normaliseFormInput({ name: "X", closes_at: "2026-03-01T18:00:00.000Z", max_entries: "60" });
  check("a closing time is kept", saved.closes_at, "2026-03-01T18:00:00.000Z");
  check("places are a number", saved.max_entries, 60);
  check("rubbish is no bound at all", normaliseFormInput({ name: "X", opens_at: "not a date" }).opens_at, "");
  check("negative places mean no cap", normaliseFormInput({ name: "X", max_entries: "-5" }).max_entries, 0);
}

section("A form can be broken into pages");
{
  const form = normaliseFormInput({
    name: "Entry",
    sections: [
      { id: "s1", title: "You" },
      { id: "s2", title: "Your car", when: { key: "disc", op: "is", values: ["Circuit"] } },
      { id: "s3", title: "Declaration" },
    ],
    fields: [
      // Deliberately out of page order in the list: the normaliser sorts them.
      { id: "sign", type: "checkbox", label: "Agreed", sectionId: "s3", required: true },
      { id: "disc", type: "radio", label: "Discipline", options: ["Karting", "Circuit"], sectionId: "s1" },
      { id: "car", type: "text", label: "Car", sectionId: "s2", required: true },
    ],
  });

  check("questions are sorted into page order", form.fields.map((f) => f.id), ["disc", "car", "sign"]);

  const karting = validateSubmission(form.fields, { disc: "Karting", sign: "Yes" }, new Date(), form.sections);
  check("a skipped page is not shown", karting.sectionsAsked.map((s) => s.id), ["s1", "s3"]);
  check("and its questions are not asked", karting.asked.map((f) => f.id), ["disc", "sign"]);
  check("so its required question does not fire", karting.errors.car, undefined);
  check("and nothing is stored for it", "car" in karting.values, false);

  const circuit = validateSubmission(form.fields, { disc: "Circuit", sign: "Yes" }, new Date(), form.sections);
  check("the page appears when it should", circuit.sectionsAsked.map((s) => s.id), ["s1", "s2", "s3"]);
  check("and now its question is required", circuit.errors.car, "Car is required.");
}

{
  // A page may only depend on an answer from an EARLIER page.
  const notes: string[] = [];
  const form = normaliseFormInput(
    {
      name: "X",
      sections: [
        { id: "s1", title: "First", when: { key: "later", op: "answered", values: [] } },
        { id: "s2", title: "Second" },
      ],
      fields: [{ id: "later", type: "text", sectionId: "s2" }],
    },
    notes
  );

  check("a forward-looking page rule is dropped", form.sections[0].when.key, "");
  check("and reported", notes.some((n) => n.includes("earlier page")), true);
}

{
  // No sections at all behaves exactly as it always did.
  const form = normaliseFormInput({
    name: "X",
    fields: [{ id: "a", type: "text", label: "A", required: true }],
  });
  const checked = validateSubmission(form.fields, {}, new Date(), form.sections);

  check("no pages means no stepper", checked.sectionsAsked, []);
  check("and every question is still asked", checked.asked.map((f) => f.id), ["a"]);
  check("and still required", checked.errors.a, "A is required.");
}

/* ─────────────────────────────── The outline ──────────────────────────── */

section("The builder writes the order the server would have sorted into");
{
  // Built the way the outline builds it: a page, then questions onto it.
  let o: Outline = { sections: [], fields: [] };
  o = addSection(o, "s1");
  o = addField(o, "s1", "a");
  o = addField(o, "s1", "b");
  o = addSection(o, "s2");
  o = addField(o, "s2", "c");
  o = addSection(o, "s3");
  o = addField(o, "s3", "d");

  // Shuffle it about the way somebody would.
  o = nudgeField(o, "b", 1);
  o = nudgeField(o, "d", -1);

  const server = normaliseFormFields(o.fields, [], o.sections);

  check(
    "the array the builder holds is the array the server would store",
    server.map((f) => f.id),
    o.fields.map((f) => f.id)
  );
  check(
    "and every question keeps the page the outline put it on",
    server.map((f) => f.sectionId),
    o.fields.map((f) => f.sectionId)
  );
}

{
  let o: Outline = { sections: [], fields: [] };
  o = addSection(o, "s1");
  o = addField(o, "s1", "a");
  o = addField(o, "s1", "b");
  o = addSection(o, "s2");
  o = addField(o, "s2", "c");

  const down = nudgeField(o, "b", 1);
  check("past the end of a page is the top of the next", fieldsOn(down, "s2").map((f) => f.id), ["b", "c"]);
  check("and the question says so", down.fields.find((f) => f.id === "b")?.sectionId, "s2");

  const back = nudgeField(down, "b", -1);
  check("and back again", fieldsOn(back, "s1").map((f) => f.id), ["a", "b"]);

  // The dirty check compares whole documents, and a drag fires this on every
  // pointer move — a no-op has to be free.
  check("the very top does not move", nudgeField(o, "a", -1), o);
  check("nor the very bottom", nudgeField(o, "c", 1), o);
  check("nor a drop where it already is", placeField(o, "a", "s1", 0), o);
}

{
  // An empty page is a stop on the way, not something to jump over — otherwise
  // a page you have just made cannot be reached by the keyboard at all.
  let o: Outline = { sections: [], fields: [] };
  o = addSection(o, "s1");
  o = addField(o, "s1", "a");
  o = addSection(o, "s2");
  o = addSection(o, "s3");
  o = addField(o, "s3", "b");

  const once = nudgeField(o, "a", 1);
  check("it lands on the empty page", once.fields.find((f) => f.id === "a")?.sectionId, "s2");

  const twice = nudgeField(once, "a", 1);
  check("and moves off it on the next press", fieldsOn(twice, "s3").map((f) => f.id), ["a", "b"]);
}

section("Page surgery never costs a question");
{
  let o: Outline = { sections: [], fields: [] };
  o = addSection(o, "s1");
  o = addField(o, "s1", "a");
  o = addSection(o, "s2");
  o = addField(o, "s2", "b");
  o = addField(o, "s2", "c");
  o = addSection(o, "s3");
  o = addField(o, "s3", "d");

  const before = o.fields.map((f) => f.id);

  const middle = removeSection(o, "s2");
  check("the questions survive", middle.fields.map((f) => f.id), before);
  check("in exactly the order they were in", middle.fields.map((f) => f.id), ["a", "b", "c", "d"]);
  check("on the page above", fieldsOn(middle, "s1").map((f) => f.id), ["a", "b", "c"]);

  const first = removeSection(o, "s1");
  check("deleting the first page keeps the order too", first.fields.map((f) => f.id), before);
  check("and its questions join the new first page", fieldsOn(first, "s2").map((f) => f.id), ["a", "b", "c"]);

  const moved = moveSection(o, "s3", 0);
  check("a page carries its questions with it", moved.fields.map((f) => f.id), ["d", "a", "b", "c"]);
}

{
  // Down to one page, then none: the form goes back to a single screen.
  let o: Outline = { sections: [], fields: [] };
  o = addSection(o, "s1");
  o = addField(o, "s1", "a");
  o = addField(o, "s1", "b");

  const none = removeSection(o, "s1");
  check("the last page leaves no pages", none.sections, []);
  check("every question stays", none.fields.map((f) => f.id), ["a", "b"]);
  check("and none of them names a page", none.fields.map((f) => f.sectionId), ["", ""]);

  const asked = validateSubmission(none.fields, {}, new Date(), none.sections);
  check("which is a form with no stepper", asked.sectionsAsked, []);
}

{
  // The first page adopts everything, which is why adding one is invisible on
  // the public form: the stepper only appears at two pages.
  let o: Outline = { sections: [], fields: [] };
  o = addField(o, "", "a");
  o = addField(o, "", "b");

  const paged = addSection(o, "s1");
  check("every question joins the first page", paged.fields.map((f) => f.sectionId), ["s1", "s1"]);
  check("in the order they were in", paged.fields.map((f) => f.id), ["a", "b"]);

  const one = validateSubmission(paged.fields, {}, new Date(), paged.sections);
  const flat = validateSubmission(o.fields, {}, new Date(), o.sections);
  check("one page is one page", one.sectionsAsked.map((s) => s.id), ["s1"]);
  check("and asks exactly what no pages asked", one.asked.map((f) => f.id), flat.asked.map((f) => f.id));
}

{
  // A page with nothing on it is never reached — the push onto `sectionsAsked`
  // happens inside the per-question loop. The outline warns about this, so the
  // warning is pinned to a checked fact rather than to a belief.
  const form = normaliseFormInput({
    name: "X",
    sections: [{ id: "s1", title: "One" }, { id: "s2", title: "Empty" }],
    fields: [{ id: "a", type: "text", label: "A", sectionId: "s1" }],
  });

  const checked = validateSubmission(form.fields, {}, new Date(), form.sections);
  check("an empty page is not on the form at all", checked.sectionsAsked.map((s) => s.id), ["s1"]);
}

{
  // The caps hold whether or not the button that respects them was the caller.
  let full: Outline = { sections: [], fields: [] };
  for (let n = 0; n < MAX_FORM_FIELDS; n += 1) full = addField(full, "", `f${n}`);
  check("forty questions is forty", full.fields.length, MAX_FORM_FIELDS);
  check("and the next is refused", addField(full, "", "over"), full);

  let pages: Outline = { sections: [], fields: [] };
  for (let n = 0; n < MAX_SECTIONS; n += 1) pages = addSection(pages, `s${n}`);
  check("twelve pages is twelve", pages.sections.length, MAX_SECTIONS);
  check("and the next is refused", addSection(pages, "over"), pages);
}

{
  // What a page's own rule may point at: only what is asked before it.
  const form = normaliseFormInput({
    name: "X",
    sections: [{ id: "s1" }, { id: "s2" }, { id: "s3" }],
    fields: [
      { id: "born", type: "date", label: "Born", sectionId: "s1", age: true },
      { id: "car", type: "text", label: "Car", sectionId: "s2" },
      { id: "note", type: "text", label: "Note", sectionId: "s3" },
    ],
  });

  check("the first page may look at nothing", keysBeforeSection(form.sections, form.fields, 0), []);
  check(
    "the third sees both earlier pages, and a derived age",
    keysBeforeSection(form.sections, form.fields, 2).map((column) => column.key),
    ["born", "born.age", "car"]
  );
}

section("An attachment is a note saying where the bytes are");
{
  const stored = encodeFile({ key: "ctr-sports/entries/f1/abc.pdf", name: "licence.pdf", size: 2048 });

  check("it round-trips", fileOf(stored)?.name, "licence.pdf");
  check("and prints as its name", answerText(stored), "licence.pdf");
  check("plain text is not one", fileOf("just an answer"), null);
  check("nor is nonsense that starts like one", fileOf("file::not json"), null);
  check("nor one with no key", fileOf('file::{"name":"x"}'), null);

  const fields = normaliseFormFields([
    { id: "lic", type: "file", label: "Licence", required: true, maxMb: 99, accept: ["pdf", "nonsense"] },
  ]);

  check("the size ceiling is enforced", fields[0].maxMb, MAX_UPLOAD_MB);
  check("and unknown kinds are dropped", fields[0].accept, ["pdf"]);
  check("a real note is accepted", validateSubmission(fields, { lic: stored }).values.lic, stored);
  check("anything else is not a file", validateSubmission(fields, { lic: "/etc/passwd" }).values.lic, "");
  check("and required still means required", validateSubmission(fields, {}).errors.lic, "Licence is required.");

  // A file question on a non-file type carries none of this.
  const [text] = normaliseFormFields([{ id: "t", type: "text", maxMb: 5, accept: ["pdf"] }]);
  check("no size on a text question", text.maxMb, 0);
  check("and no kinds either", text.accept, []);
}

/* ──────────────────────────── Editing an entry ────────────────────────── */

section("Editing an entry keeps what the edit could not see");
{
  const previous = { name: "Priya", retired: "an answer to a deleted question", hidden: "kept" };
  const next = { name: "Priya Sharma" };

  check("the edit wins where it spoke", withOrphans(previous, next).name, "Priya Sharma");
  check("a retired question survives", withOrphans(previous, next).retired, previous.retired);
  check("so does one behind a closed branch", withOrphans(previous, next).hidden, "kept");
}

/* ─────────────────────────────── Addresses ────────────────────────────── */

section("A form always gets a usable address");
{
  check("a name with no letters still gets one", normaliseFormInput({ name: "!!!" }).slug.length > 0, true);
  check("a one-letter name is not rejected", normaliseFormInput({ name: "A" }).slug, "a");
  check("a typed address is kept", normaliseFormInput({ name: "X", slug: "season-2026" }).slug, "season-2026");

  const notes: string[] = [];
  normaliseFormInput({ name: "X", slug: "Season 2026!" }, notes);
  check("and a tidied one is reported", notes.some((n) => n.includes("tidied")), true);
}

console.log(
  failures === 0
    ? `\nAll checks passed.`
    : `\n${failures} check(s) FAILED — see above.`
);

process.exit(failures === 0 ? 0 : 1);
