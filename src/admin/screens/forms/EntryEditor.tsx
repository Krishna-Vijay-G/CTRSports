"use client";

import { useMemo, useState } from "react";
import {
  ageKey,
  isMultiChoice,
  validateSubmission,
  type Form,
  type FormEntry,
  type FormField,
  type Submission,
} from "@/lib/forms";
import { cn } from "@/lib/utils";
import { Button } from "@/admin/ui/Button";
import { Dialog } from "@/admin/ui/Dialog";
import { Input, Label, Select, Textarea } from "@/admin/ui/Input";
import { CheckIcon } from "@/admin/ui/icons";
import { ErrorNote, Hint, Note } from "@/admin/components/Fields";

/**
 * One entry, added or corrected by hand.
 *
 * Built from the admin's own controls rather than the site's `RegisterForm`,
 * which is the one place in this project where NOT sharing a component is the
 * right call. That form is a public page: wide, generous, in the site's palette,
 * with a honeypot and a nonce and a submit that posts to the open route. This is
 * a tool — a dense dialog in the admin's greys, opened by somebody with a
 * telephone in their other hand.
 *
 * What IS shared is the part that matters: `validateSubmission` decides which
 * questions apply and which options are on offer here exactly as it does on the
 * site, so a form with branching branches the same way in both, and an entry
 * typed here cannot be a shape the public form could not produce.
 */
export function EntryEditor({
  form,
  entry,
  onClose,
  onSaved,
}: {
  form: Form;
  /** Null to add a new one. */
  entry: FormEntry | null;
  onClose: () => void;
  onSaved: (entry: FormEntry) => void;
}) {
  const [values, setValues] = useState<Submission>(() => seed(form.fields, entry));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The admin dialog puts every question on one screen whatever the sections
  // say — but it still has to know which pages are SKIPPED, or it would offer
  // questions the public form never asks.
  const shape = useMemo(
    () => validateSubmission(form.fields, values, new Date(), form.sections),
    [form.fields, form.sections, values]
  );

  function set(id: string, value: string | string[]) {
    setValues((current) => ({ ...current, [id]: value }));
    setErrors((current) => (current[id] ? { ...current, [id]: "" } : current));
  }

  async function save() {
    if (busy) return;

    if (Object.keys(shape.errors).length > 0) {
      setErrors(shape.errors);
      setProblem("Some answers need another look.");
      return;
    }

    setBusy(true);
    setProblem(null);

    try {
      const response = await fetch(
        entry
          ? `/api/admin/forms/${form.id}/entries/${entry.id}`
          : `/api/admin/forms/${form.id}/entries`,
        {
          method: entry ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ values: shape.values }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors as Record<string, string>);
          setProblem("Some answers need another look.");
        } else {
          setProblem(data.error ?? "That could not be saved.");
        }
        return;
      }

      onSaved(data.entry as FormEntry);
    } catch {
      setProblem("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={entry ? "Edit entry" : "Add an entry"}
      description={
        entry
          ? "Corrections only — when it was made does not change."
          : "For the ones that come in by telephone or on paper."
      }
      className="max-w-2xl"
    >
      {form.fields.length === 0 ? (
        <Note>This form has no questions yet, so there is nothing to fill in.</Note>
      ) : (
        <div className="space-y-3">
          {shape.asked.map((field) => (
            <Answer
              key={field.id}
              field={field}
              value={values[field.id]}
              options={shape.options[field.id] ?? field.options}
              age={field.age ? ((shape.values[ageKey(field.id)] as string) ?? "") : ""}
              error={errors[field.id]}
              disabled={busy}
              onChange={(value) => set(field.id, value)}
            />
          ))}

          {/* The questions the answers so far have ruled out. Said plainly,
              because a dialog that is shorter than the form somebody is reading
              down the telephone looks like a dialog that has lost something. */}
          {shape.asked.length < form.fields.length ? (
            <Note>
              {form.fields.length - shape.asked.length} question
              {form.fields.length - shape.asked.length === 1 ? " is" : "s are"} not being asked —
              the answers above rule {form.fields.length - shape.asked.length === 1 ? "it" : "them"}{" "}
              out. Change an answer and they come back.
            </Note>
          ) : null}
        </div>
      )}

      {problem ? <ErrorNote>{problem}</ErrorNote> : null}

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={busy} className="ml-auto">
          Cancel
        </Button>
        <Button size="sm" onClick={save} disabled={busy || form.fields.length === 0}>
          {busy ? "Saving…" : entry ? "Save changes" : "Add entry"}
        </Button>
      </div>
    </Dialog>
  );
}

/* ──────────────────────────── One answer ─────────────────────────────── */

function Answer({
  field,
  value,
  options,
  age,
  error,
  disabled,
  onChange,
}: {
  field: FormField;
  value: string | string[] | undefined;
  options: string[];
  age: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string | string[]) => void;
}) {
  const single = typeof value === "string" ? value : "";
  const picked = Array.isArray(value) ? value : [];

  return (
    <div className="block">
      <Label>
        {field.label || "Question"}
        {field.required ? <span className="ms-1 text-destructive">*</span> : null}
      </Label>

      <div className="mt-1.5">
        {field.type === "checkbox" ? (
          <Button
            variant={single === "Yes" ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(single === "Yes" ? "" : "Yes")}
            aria-pressed={single === "Yes"}
            disabled={disabled}
          >
            {single === "Yes" ? <CheckIcon /> : null}
            {single === "Yes" ? "Yes" : "No"}
          </Button>
        ) : isMultiChoice(field.type) ? (
          <div className="flex flex-wrap gap-1.5">
            {options.map((option) => {
              const on = picked.includes(option);

              return (
                <Button
                  key={option}
                  variant={on ? "default" : "outline"}
                  size="sm"
                  disabled={disabled}
                  aria-pressed={on}
                  onClick={() =>
                    onChange(
                      on ? picked.filter((entry) => entry !== option) : [...picked, option]
                    )
                  }
                  className={cn("h-7 px-2.5 text-xs font-normal", on && "font-medium")}
                >
                  {option}
                </Button>
              );
            })}
          </div>
        ) : field.type === "select" || field.type === "radio" ? (
          // Radio buttons and a dropdown store the same thing, and in a dialog
          // this narrow a dropdown is the one that fits whatever the site draws.
          <Select
            value={single}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            className="w-full"
          >
            <option value="">— no answer —</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        ) : field.type === "textarea" ? (
          <Textarea
            value={single}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
            rows={3}
          />
        ) : (
          <Input
            type={inputType(field.type)}
            value={single}
            onChange={(event) => onChange(event.target.value)}
            disabled={disabled}
          />
        )}
      </div>

      {options.length === 0 && (isMultiChoice(field.type) || field.type === "select" || field.type === "radio") ? (
        <Hint className="mt-1">Nothing on offer until the question it depends on is answered.</Hint>
      ) : null}

      {age ? <Hint className="mt-1">That makes them {age}.</Hint> : null}
      {field.help ? <Hint className="mt-1">{field.help}</Hint> : null}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function inputType(type: FormField["type"]): string {
  if (type === "email") return "email";
  if (type === "phone") return "tel";
  if (type === "number") return "number";
  if (type === "date") return "date";
  return "text";
}

/**
 * The starting answers.
 *
 * Only the questions the form asks TODAY: an entry may hold answers to ones
 * since deleted, and those are not editable here because there is no control to
 * edit them with. They are not lost either — the route puts them back on save.
 */
function seed(fields: FormField[], entry: FormEntry | null): Submission {
  const values: Submission = {};

  for (const field of fields) {
    const stored = entry?.answers[field.id];
    values[field.id] = isMultiChoice(field.type)
      ? Array.isArray(stored)
        ? stored
        : []
      : typeof stored === "string"
        ? stored
        : "";
  }

  return values;
}
