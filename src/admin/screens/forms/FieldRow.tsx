"use client";

import {
  FIELD_TYPE_HINTS,
  FIELD_TYPE_LABELS,
  FORM_FIELD_TYPES,
  FORM_LIMITS,
  MAX_FIELD_OPTIONS,
  isChoice,
  isMultiChoice,
  keysBefore,
  optionsForKey,
  type FormField,
} from "@/lib/forms";
import { Label, Select } from "@/admin/ui/Input";
import { Button } from "@/admin/ui/Button";
import { CheckIcon } from "@/admin/ui/icons";
import { Field, Hint, Note, TextArea } from "@/admin/components/Fields";
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
  patch,
}: {
  field: FormField;
  index: number;
  /** Every question on the form, in order. Read for the rule pickers only. */
  fields: FormField[];
  patch: (patch: Partial<FormField>) => void;
}) {
  const earlier = keysBefore(fields, index);

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
          <TextArea
            label="Options"
            value={field.options.join("\n")}
            onChange={(text) => patch({ options: text.split("\n").slice(0, MAX_FIELD_OPTIONS) })}
            rows={5}
            hint={`One per line, up to ${MAX_FIELD_OPTIONS}. What is typed here is what is stored, so renaming one later does not change what anybody has already chosen.`}
          />

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
