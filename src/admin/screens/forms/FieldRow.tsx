"use client";

import {
  FIELD_TYPE_HINTS,
  FIELD_TYPE_LABELS,
  FORM_FIELD_TYPES,
  DEFAULT_UPLOAD_MB,
  FILE_KINDS,
  FILE_KIND_LABELS,
  FORM_LIMITS,
  MAX_FIELD_OPTIONS,
  MAX_UPLOAD_MB,
  isChoice,
  isMultiChoice,
  keysBefore,
  optionList,
  optionsForKey,
  sectionOf,
  type FormField,
  type FormSection,
} from "@/lib/forms";
import { Input, Label, Select } from "@/admin/ui/Input";
import { Button } from "@/admin/ui/Button";
import { CheckIcon } from "@/admin/ui/icons";
import { Field, Hint, Note, TextArea } from "@/admin/components/Fields";
import { FieldValidation } from "./FieldValidation";
import { ConditionEditor, OptionGroups } from "./FieldRules";

/**
 * One question, as it is edited.
 *
 * The options are a textarea, one per line, rather than a list with its own add
 * and remove buttons. This whole row already lives inside a Repeater's dialog,
 * and a repeater inside a repeater is a window inside a window — five options
 * typed on five lines is faster than five rows of chrome, and pasting a
 * category list from somewhere else works in one go.
 *
 * The type is a plain select rather than a row of icons: nine types with names
 * like "Pick several" are read, not recognised, so a picker of glyphs would be
 * nine tooltips.
 *
 * It takes the WHOLE list of questions, not just this one, because the rules at
 * the bottom point at earlier answers and have to be able to name them. Only
 * what is above this row is offered — see `keysBefore`.
 */
export function FieldRow({
  field,
  index,
  fields,
  sections,
  patch,
}: {
  field: FormField;
  index: number;
  /** Every question on the form, in order. Read for the rule pickers only. */
  fields: FormField[];
  /** The pages, if this form has any. */
  sections: FormSection[];
  patch: (patch: Partial<FormField>) => void;
}) {
  const earlier = keysBefore(fields, index);

  // What the normaliser will drop on save: blanks and repeats do not count
  // towards the limit, so this counts what actually survives.
  const tooMany = Math.max(
    optionList(field.options, Number.MAX_SAFE_INTEGER).length - MAX_FIELD_OPTIONS,
    0
  );

  // Only the choice questions can sort another question's options into groups.
  const branchable = earlier
    .filter((key) => !key.derived)
    .map((key) => ({ ...key, options: optionsForKey(fields, key.key) }))
    .filter((key) => key.options.length > 0);

  return (
    <>
      <div className="block">
        <Label>Kind</Label>
        <Select
          value={field.type}
          onChange={(event) => patch({ type: event.target.value as FormField["type"] })}
          className="mt-1.5 w-full"
        >
          {FORM_FIELD_TYPES.map((type) => (
            <option key={type} value={type}>
              {FIELD_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
        {FIELD_TYPE_HINTS[field.type] ? (
          <Hint className="mt-1">{FIELD_TYPE_HINTS[field.type]}</Hint>
        ) : null}
      </div>

      {sections.length > 0 ? (
        <div className="block">
          <Label>On which page</Label>
          <Select
            value={sectionOf(sections, field)?.id ?? ""}
            onChange={(event) => patch({ sectionId: event.target.value })}
            className="mt-1.5 w-full"
          >
            {sections.map((section, order) => (
              <option key={section.id} value={section.id}>
                {order + 1}. {section.title || `Page ${order + 1}`}
              </option>
            ))}
          </Select>
          <Hint className="mt-1">
            Questions are put in page order, so moving this to an earlier page moves it up the
            list — and a rule that then points at an answer below it is dropped on save.
          </Hint>
        </div>
      ) : null}

      <Field
        label="Question"
        value={field.label}
        onChange={(label) => patch({ label })}
        maxLength={FORM_LIMITS.field_label}
        placeholder={`Question ${index + 1}`}
        hint="What the person filling it in reads. It is also the column heading in the export."
      />

      <Field
        label="Help"
        value={field.help}
        onChange={(help) => patch({ help })}
        maxLength={FORM_LIMITS.field_help}
        hint="The smaller line under the question. Blank hides it."
      />

      <TextArea
        label="Info button"
        value={field.info}
        onChange={(info) => patch({ info })}
        rows={3}
        hint="Puts a small circled “i” beside the question, which opens this. For the paragraph that would make the form twice as long printed under every question — an eligibility rule, where to find a licence number. Blank means no button."
      />

      {isChoice(field.type) ? (
        <>
          {/*
            No slicing as it is typed.
            The textarea's value is rebuilt from `field.options` on every
            keystroke, so capping the array here made text vanish under the
            caret the moment somebody passed the limit — and because the cap
            counted LINES, a list pasted with a blank line between each entry
            lost its second half before the normaliser ever saw it. The cap is
            the normaliser's job; this only has to say so.
          */}
          <TextArea
            label="Options"
            value={field.options.join("\n")}
            onChange={(text) => patch({ options: text.split("\n") })}
            rows={5}
            hint={`One per line, up to ${MAX_FIELD_OPTIONS}. What is typed here is what is stored, so renaming one later does not change what anybody has already chosen.`}
          />

          {tooMany > 0 ? (
            <Note className="text-destructive">
              {tooMany} option{tooMany === 1 ? "" : "s"} past the limit of {MAX_FIELD_OPTIONS} —
              the extra {tooMany === 1 ? "one is" : "ones are"} dropped when this is saved.
            </Note>
          ) : null}

          <div className="block">
            <Label>Other</Label>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Button
                variant={field.allowOther ? "default" : "outline"}
                size="sm"
                onClick={() => patch({ allowOther: !field.allowOther })}
                aria-pressed={field.allowOther}
              >
                {field.allowOther ? <CheckIcon /> : null}
                {field.allowOther ? "Offer a box to type in" : "Only these options"}
              </Button>

              {field.allowOther ? (
                <Input
                  value={field.otherLabel}
                  onChange={(event) => patch({ otherLabel: event.target.value })}
                  maxLength={FORM_LIMITS.field_other_label}
                  placeholder="Other"
                  aria-label="What to call the box"
                  className="h-8 w-40 text-xs"
                />
              ) : null}
            </div>

            <Hint className="mt-1">
              Adds one more choice with a box beside it. What gets stored is what they type — not
              the word “Other” — so the export reads as an answer rather than pointing at a column
              that would have to exist.
            </Hint>

            {field.allowOther && field.optionsWhen.key ? (
              <Note className="mt-2">
                This question also filters its options by an earlier answer. A typed answer is by
                definition not on the list, so it is accepted whatever that filter says — the box
                is a way round the filter, which is usually the point of having one.
              </Note>
            ) : null}
          </div>

          {/* Swapping between the four choice kinds is safe, and saying so is
              what stops somebody rebuilding a question to change its shape. */}
          <Note>
            {isMultiChoice(field.type)
              ? "Takes several answers, stored as a list and exported separated by semicolons."
              : "Takes one answer."}{" "}
            Switching between the four choice kinds keeps the options and every answer already
            given — as long as you stay on the same side of one-or-several.
          </Note>

          {field.type === "select" || field.type === "multiselect" ? (
            <Note>
              A dropdown hides its options until it is clicked. With five or fewer, radio buttons
              or tick boxes are read at a glance and are easier to use on a phone.
            </Note>
          ) : null}
        </>
      ) : field.type === "checkbox" ? (
        <Note>
          A single tick. It is stored as “Yes” or blank, which is what makes the export readable
          by a person rather than a column of true and false.
        </Note>
      ) : (
        <Field
          label="Placeholder"
          value={field.placeholder}
          onChange={(placeholder) => patch({ placeholder })}
          maxLength={FORM_LIMITS.field_placeholder}
          hint="The grey example inside the box. Not a label — it disappears as soon as they type."
        />
      )}

      {field.type === "file" ? (
        <>
          <div className="block">
            <Label>Largest file</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={MAX_UPLOAD_MB}
                value={field.maxMb || ""}
                onChange={(event) => patch({ maxMb: Number(event.target.value) || 0 })}
                placeholder={String(DEFAULT_UPLOAD_MB)}
                className="h-8 w-24 text-xs"
              />
              <span className="text-xs text-muted-fg">MB, up to {MAX_UPLOAD_MB}</span>
            </div>
          </div>

          <div className="block">
            <Label>What it accepts</Label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {FILE_KINDS.map((kind) => {
                const on = field.accept.length === 0 || field.accept.includes(kind);

                return (
                  <Button
                    key={kind}
                    variant={on ? "default" : "outline"}
                    size="sm"
                    aria-pressed={on}
                    onClick={() => {
                      const chosen = field.accept.length === 0 ? [...FILE_KINDS] : field.accept;
                      const next = chosen.includes(kind)
                        ? chosen.filter((entry) => entry !== kind)
                        : [...chosen, kind];
                      // Nothing ticked means the built-in list rather than a
                      // question nobody can answer.
                      patch({ accept: next.length === 0 ? [] : next });
                    }}
                    className="h-7 px-2.5 text-xs font-normal"
                  >
                    {FILE_KIND_LABELS[kind]}
                  </Button>
                );
              })}
            </div>
          </div>

          <Note>
            One file per entry. It is stored privately and never given a public address — the only
            way to open it is from the entries table, signed in. Deleting the form deletes the
            files with it.
          </Note>
        </>
      ) : null}

      {field.type === "date" ? (
        <div className="block">
          <Label>Age</Label>
          <div className="mt-1.5">
            <Button
              variant={field.age ? "default" : "outline"}
              size="sm"
              onClick={() => patch({ age: !field.age })}
              aria-pressed={field.age}
            >
              {field.age ? <CheckIcon /> : null}
              {field.age ? "Work out their age too" : "Just the date"}
            </Button>
          </div>
          <Hint className="mt-1">
            Adds a second column beside the date, filled in when the form is sent. It is stored, not
            recalculated later — somebody who was 17 the day they entered stays 17 in the export
            after their birthday. Later questions can be asked only of an age over or under a
            number.
          </Hint>
        </div>
      ) : null}

      <div className="block">
        <Label>Required</Label>
        <div className="mt-1.5">
          <Button
            variant={field.required ? "default" : "outline"}
            size="sm"
            onClick={() => patch({ required: !field.required })}
            aria-pressed={field.required}
          >
            {field.required ? <CheckIcon /> : null}
            {field.required ? "Must be answered" : "Optional"}
          </Button>
        </div>
        <Hint className="mt-1">
          Checked on the server as well as in the browser, so an entry can never arrive without
          it. A question that is not being asked is not required — the rule below wins.
        </Hint>
      </div>

      <FieldValidation field={field} onChange={(rule) => patch({ rule })} />

      <ConditionEditor
        value={field.when}
        onChange={(when) => patch({ when })}
        keys={earlier}
        fields={fields}
      />

      <OptionGroups
        field={field}
        onChange={(optionsWhen) => patch({ optionsWhen })}
        keys={branchable}
      />
    </>
  );
}
