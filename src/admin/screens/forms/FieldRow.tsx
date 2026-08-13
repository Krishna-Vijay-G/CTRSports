"use client";

import {
  FIELD_TYPE_LABELS,
  FORM_FIELD_TYPES,
  FORM_LIMITS,
  MAX_FIELD_OPTIONS,
  isChoice,
  type FormField,
} from "@/lib/forms";
import { Label, Select } from "@/admin/ui/Input";
import { Button } from "@/admin/ui/Button";
import { CheckIcon } from "@/admin/ui/icons";
import { Field, Hint, Note, TextArea } from "@/admin/components/Fields";

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
 */
export function FieldRow({
  field,
  index,
  patch,
}: {
  field: FormField;
  index: number;
  patch: (patch: Partial<FormField>) => void;
}) {
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

      {isChoice(field.type) ? (
        <TextArea
          label="Options"
          value={field.options.join("\n")}
          onChange={(text) => patch({ options: text.split("\n").slice(0, MAX_FIELD_OPTIONS) })}
          rows={5}
          hint={`One per line, up to ${MAX_FIELD_OPTIONS}. What is typed here is what is stored, so renaming one later does not change what anybody has already chosen.`}
        />
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
          it.
        </Hint>
      </div>
    </>
  );
}
