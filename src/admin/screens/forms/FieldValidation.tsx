"use client";

import { useState } from "react";
import {
  FORM_LIMITS,
  NO_RULE,
  PATTERN_PRESETS,
  RULE_KIND_LABELS,
  checkRule,
  patternOf,
  ruleKindsFor,
  safePattern,
  type FieldRule,
  type FormField,
} from "@/lib/forms";
import { Input, Label, Select } from "@/admin/ui/Input";
import { Field, Hint, Note } from "@/admin/components/Fields";

/**
 * What an answer has to look like, beyond being the right kind of thing.
 *
 * The type already says a number is a number. This says it is between 8 and 60,
 * or that a licence number is eight characters of a particular shape. Without
 * it those rules live only in somebody's head and get enforced by reading the
 * entry list afterwards, which is not enforcement.
 *
 * ── Why presets, and why a test box ───────────────────────────────────────
 *
 * Because the failure mode of a hand-written expression is a question nobody
 * can answer, and it looks like the visitor's fault. The named shapes cover
 * what this site actually asks for; "Something else" is there for the rest, and
 * the box below it runs the expression against whatever you type, so it is
 * checked here rather than by the first person who tries to enter.
 *
 * The expression is also refused outright if it looks capable of catastrophic
 * backtracking — see `safePattern`. That check is blunt and will occasionally
 * turn down something harmless; it runs on the server against a string a
 * stranger sends, and Node has no way to time a regular expression out.
 */
export function FieldValidation({
  field,
  onChange,
}: {
  field: FormField;
  onChange: (next: FieldRule) => void;
}) {
  const [trial, setTrial] = useState("");

  const kinds = ruleKindsFor(field.type);
  const rule = field.rule;

  // Nothing to offer: a choice is already limited to its options, and a tick
  // box has two states.
  if (kinds.length <= 1) return null;

  const preset = PATTERN_PRESETS.find((entry) => entry.id === rule.preset);
  const source = patternOf(rule);
  const compiled = rule.kind === "pattern" ? safePattern(source) : null;
  const refused = rule.kind === "pattern" && source.trim() !== "" && !compiled;

  return (
    <div className="block space-y-2 rounded-md border border-border bg-background/60 p-3">
      <div>
        <Label>What counts as a valid answer</Label>
        <Select
          value={rule.kind}
          onChange={(event) =>
            // A change of kind drops the old bounds: "at least 3" carried from
            // a length check to a date check is a rule that reads as sense and
            // is not.
            onChange({ ...NO_RULE, kind: event.target.value as FieldRule["kind"] })
          }
          className="mt-1.5 w-full"
        >
          {kinds.map((kind) => (
            <option key={kind} value={kind}>
              {RULE_KIND_LABELS[kind]}
            </option>
          ))}
        </Select>
      </div>

      {BOUNDED.includes(rule.kind) ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="block">
              <Label>
                {rule.kind === "date" ? "No earlier than" : rule.kind === "age" ? "No younger than" : "At least"}
              </Label>
              <Input
                type={rule.kind === "date" ? "date" : "number"}
                value={rule.min}
                onChange={(event) => onChange({ ...rule, min: event.target.value })}
                className="mt-1.5"
                placeholder={rule.kind === "age" ? "18" : undefined}
                aria-label={rule.kind === "age" ? "Youngest age allowed" : "Lowest allowed"}
              />
            </div>
            <div className="block">
              <Label>
                {rule.kind === "date" ? "No later than" : rule.kind === "age" ? "No older than" : "At most"}
              </Label>
              <Input
                type={rule.kind === "date" ? "date" : "number"}
                value={rule.max}
                onChange={(event) => onChange({ ...rule, max: event.target.value })}
                className="mt-1.5"
                placeholder={rule.kind === "age" ? "any" : undefined}
                aria-label={rule.kind === "age" ? "Oldest age allowed" : "Highest allowed"}
              />
            </div>
          </div>

          <Hint>
            Leave one blank for an open end — a lowest with no highest is “at least this”.
            {rule.kind === "length" ? " Counted in characters." : null}
            {rule.kind === "digits"
              ? " Counted in digits only: spaces, brackets, hyphens and the plus sign are ignored," +
                " so “98765 43210” is ten. A country code is digits though — “+91 98765 43210” is" +
                " twelve — so set a highest only if you mean to turn those away."
              : null}
            {rule.kind === "age"
              ? " In whole years, worked out on the day they send the form — not when the form was" +
                " written, so it stays true next season. Both ends count: 18 with no highest is" +
                " “18 and over”, and “under 18” is a highest of 17."
              : null}
          </Hint>

          {/*
            The trap this note exists for: "How big it is → at least 10" on a
            mobile number question, which accepts nine digits because 987654321
            is bigger than ten. The rule is doing what it says; what it says is
            not what it was read as.
          */}
          {rule.kind === "number" ? (
            <Note>
              This is the value itself, not how many digits it has — 987654321 is nine digits and
              far bigger than 10. For a count of digits, choose “How many digits it has”. And for a
              mobile number, a Phone question is the right kind: a Number question loses a leading
              zero and cannot hold “+91”.
            </Note>
          ) : null}

          {/* The country picker already does most of this job on a Phone
              question, and its digits are counted here too. */}
          {rule.kind === "digits" && field.type === "phone" ? (
            <Note>
              A Phone question already checks the length for the country picked — ten digits for
              India, nine for Australia — so this is only worth setting if you want the same bound
              whatever country they choose. Remember the dialling code counts: “+91 9876543210” is
              twelve digits, not ten.
            </Note>
          ) : null}

          {rule.kind === "digits" && crossed(rule.min, rule.max) ? (
            <Note className="text-destructive">
              The fewest is above the most, so no answer can be accepted.
            </Note>
          ) : null}

          {rule.kind === "age" ? (
            <>
              {/*
                Only a warning. The rule works whether or not the age is stored —
                it works the age out itself — and refusing to accept it would
                mean switching the column off quietly dropped the age limit too.
              */}
              {!field.age ? (
                <Note>
                  This checks the age without storing it. Switch “Work out their age too” on above
                  if you also want it as a column in the export, or want a later question to depend
                  on it.
                </Note>
              ) : null}

              {crossed(rule.min, rule.max) ? (
                <Note className="text-destructive">
                  The youngest is above the oldest, so no date of birth can be accepted.
                </Note>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      {rule.kind === "pattern" ? (
        <>
          <div className="block">
            <Label>Shape</Label>
            <Select
              value={rule.preset || "licence"}
              onChange={(event) => onChange({ ...rule, preset: event.target.value, pattern: "" })}
              className="mt-1.5 w-full"
            >
              {PATTERN_PRESETS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </Select>
            {preset ? <Hint className="mt-1">{preset.hint}</Hint> : null}
          </div>

          {rule.preset === "custom" ? (
            <Field
              label="Expression"
              value={rule.pattern}
              onChange={(pattern) => onChange({ ...rule, pattern })}
              placeholder="^[A-Z]{3}-[0-9]{4}$"
              hint="A regular expression. Anchor it with ^ and $ unless you mean “contains”."
            />
          ) : null}

          {refused ? (
            <Note className="text-destructive">
              This expression was refused. Either it does not compile, or it applies a repeat to a
              group that already contains one — <code>(a+)+</code> and its relatives can take an
              enormous amount of time on the right input, and this runs on the server against
              whatever a stranger sends. A refused expression checks nothing at all, so the question
              will accept any answer until it is fixed.
            </Note>
          ) : null}

          {/* Tried here rather than by the first person who fills the form in. */}
          {compiled ? (
            <div className="block">
              <Label>Try it</Label>
              <Input
                value={trial}
                onChange={(event) => setTrial(event.target.value)}
                placeholder={preset?.example || "Type an answer to test"}
                className="mt-1.5"
              />
              {trial ? (
                <Hint className="mt-1">
                  {compiled.test(trial) ? (
                    <span className="text-foreground">That would be accepted.</span>
                  ) : (
                    <span className="text-destructive">
                      That would be rejected — {rule.message || "and told it is not in the expected format."}
                    </span>
                  )}
                </Hint>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      {rule.kind !== "none" ? (
        <>
          <Field
            label="What to say when it fails"
            value={rule.message}
            onChange={(message) => onChange({ ...rule, message })}
            maxLength={FORM_LIMITS.field_rule_message}
            placeholder={placeholderMessage(field)}
            hint="Blank uses the sentence above. Write your own when the reason is not obvious from the rule — “Your licence number is on the back of the card”."
          />

          <Note>
            Checked in the browser as they type and again on the server when they send, so an entry
            cannot arrive in a shape this rule forbids. It is not checked on answers already stored:
            adding a rule does not invalidate the entries you have.
          </Note>
        </>
      ) : null}
    </div>
  );
}

/** The kinds that are written as a pair of bounds, either of which may be blank. */
const BOUNDED: FieldRule["kind"][] = ["length", "number", "digits", "date", "age"];

/** A pair of bounds that can never both be satisfied. */
function crossed(min: string, max: string): boolean {
  if (!min.trim() || !max.trim()) return false;

  const low = Number(min);
  const high = Number(max);
  return Number.isFinite(low) && Number.isFinite(high) && low > high;
}

/** The built-in sentence, shown as the placeholder so its wording is visible. */
function placeholderMessage(field: FormField): string {
  /*
   * An age rule needs a DATE to fail against, and which date fails depends on
   * which end is set: today makes somebody 0, which is under any minimum, and a
   * date long ago makes them ancient, which is over any maximum. One of the two
   * produces the sentence; both being blank is a rule with no bounds at all.
   */
  if (field.rule.kind === "age") {
    const today = new Date().toISOString().slice(0, 10);
    // A hundred years back rather than a fixed year: `ageFrom` refuses anything
    // over 130, so a literal 1900 would quietly stop working one day.
    const ancient = `${new Date().getUTCFullYear() - 100}-01-01`;

    return (
      checkRule(field, today) ||
      checkRule(field, ancient) ||
      "You have to be within the ages this accepts."
    );
  }

  /*
   * Runs the real thing rather than repeating its wording here — two copies of
   * a sentence is one copy that goes stale. What it needs is a value that FAILS
   * whatever rule is set, so the sentence comes back rather than "".
   *
   * The empty string is that value, and it is the right one for a second reason:
   * it must be plain text. This argument used to be a literal NUL byte, which
   * TypeScript accepts inside a string and the production build escapes on the
   * way out — but the development bundler emitted the raw byte into the chunk,
   * where the browser read it as the end of the script and the whole forms
   * screen died with "literal not terminated before end of script". Nothing in
   * `tsc` or `next build` sees it. Keep this printable.
   *
   * It also fails more rules than the NUL did: a zero-length string is under
   * every minimum length, where a one-character control code was not.
   */
  return checkRule(field, "") || "Not in the expected format.";
}
