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
  MAX_UPLOAD_MB,
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
  isOtherAnswer,
  offeredOptions,
  placesLeft,
  safePattern,
  validateSubmission,
  withOrphans,
} from "@/lib/forms";

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

section("An attachment is a note saying where the bytes are");
{
  const stored = encodeFile({ key: "ctr-unified/entries/f1/abc.pdf", name: "licence.pdf", size: 2048 });

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
