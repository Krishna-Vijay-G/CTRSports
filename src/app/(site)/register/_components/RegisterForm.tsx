"use client";

import { useState } from "react";
import {
  isChoice,
  validateSubmission,
  type Form,
  type FormField,
  type Submission,
} from "@/lib/forms";
import { cn } from "@/lib/utils";

/**
 * The form itself: the controls, and what happens when they are sent.
 *
 * The same component the admin's preview draws, which is the whole reason it
 * takes a `Form` and not a page's worth of props — the builder and the site
 * cannot drift, because they are one file.
 *
 * ── What it does not decide ───────────────────────────────────────────────
 *
 * Nothing here is a check. `validateSubmission` runs before the post so that a
 * missing answer is pointed at rather than round-tripped, but the route runs
 * the same function again on what actually arrives and its answer is the only
 * one that counts. Treat everything in this file as a courtesy to the person
 * filling it in.
 *
 * The honeypot is the exception, and it is deliberately dumb: a field placed
 * off-screen with a name a form-filler will recognise ("company"), no label,
 * and `tabIndex={-1}` so nobody using a keyboard ever lands on it. A submission
 * with it filled in is answered with a cheerful success and stored nowhere,
 * because telling a bot it failed is telling it what to fix.
 *
 * ── Success ───────────────────────────────────────────────────────────────
 *
 * Success replaces the form in place rather than navigating. A redirect would
 * put the answers in a URL or need a second route to read them back, and a
 * reload of a "thanks" page that posted nothing is a confusing thing to land
 * on from a browser's history.
 */

const CONTROL =
  "w-full rounded-lg border border-line bg-panel px-3.5 py-2.5 text-[15px] text-fg outline-none transition " +
  "placeholder:text-fg-faint/60 " +
  "focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/25 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export function RegisterForm({
  form,
  nonce = "",
  issuedAt = 0,
  disabled = false,
}: {
  form: Form;
  /** Proof the page was served, not fabricated. Checked by the route. */
  nonce?: string;
  issuedAt?: number;
  /** The admin's preview: everything renders, nothing sends. */
  disabled?: boolean;
}) {
  const [values, setValues] = useState<Submission>(() => blank(form.fields));
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function set(id: string, value: string | string[]) {
    setValues((current) => ({ ...current, [id]: value }));
    // The error under a control goes the moment it is touched: leaving it there
    // while someone fixes it makes them wonder whether they have.
    setErrors((current) => (current[id] ? { ...current, [id]: "" } : current));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (disabled || busy) return;

    const checked = validateSubmission(form.fields, values);
    if (Object.keys(checked.errors).length > 0) {
      setErrors(checked.errors);
      setProblem("Some answers need another look.");
      return;
    }

    setBusy(true);
    setProblem(null);

    try {
      const response = await fetch(`/api/register/${form.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: checked.values,
          company: honeypot,
          nonce,
          issuedAt,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors as Record<string, string>);
          setProblem("Some answers need another look.");
        } else {
          setProblem(data.error ?? "Your entry could not be sent. Please try again.");
        }
        return;
      }

      setDone(true);
    } catch {
      setProblem("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="panel-card p-8 text-center sm:p-10">
        <h2 className="headline text-[clamp(1.4rem,3vw,2rem)]">
          {form.success_title || "Thank you"}
        </h2>
        {form.success_body ? <p className="body-copy mx-auto mt-3 max-w-lg">{form.success_body}</p> : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="panel-card p-6 sm:p-8">
      <div className="space-y-6">
        {form.fields.map((field) => (
          <Control
            key={field.id}
            field={field}
            value={values[field.id]}
            error={errors[field.id]}
            disabled={disabled || busy}
            onChange={(value) => set(field.id, value)}
          />
        ))}
      </div>

      {/* Not a field. See the note at the top. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Company
          <input
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </label>
      </div>

      {problem ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {problem}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={disabled || busy}
          className={cn(
            "inline-flex items-center gap-2.5 rounded-full bg-accent px-7 py-3 text-sm font-semibold text-accent-ink",
            "transition-all duration-300 hover:bg-accent-dark hover:-translate-y-0.5 active:translate-y-0",
            "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          )}
        >
          {busy ? "Sending…" : form.submit_label || "Send"}
        </button>

        {form.fields.some((field) => field.required) ? (
          <span className="text-[13px] text-fg-faint">
            <span className="text-accent">*</span> is required
          </span>
        ) : null}
      </div>
    </form>
  );
}

/* ──────────────────────────── One question ───────────────────────────── */

function Control({
  field,
  value,
  error,
  disabled,
  onChange,
}: {
  field: FormField;
  value: string | string[] | undefined;
  error?: string;
  disabled: boolean;
  onChange: (value: string | string[]) => void;
}) {
  const id = `field-${field.id}`;
  const described = [field.help ? `${id}-help` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");

  const label = (
    <span className="block text-[15px] font-semibold text-fg">
      {field.label || "Question"}
      {field.required ? <span className="ms-1 text-accent">*</span> : null}
    </span>
  );

  const help = field.help ? (
    <span id={`${id}-help`} className="mt-1 block text-[13px] leading-relaxed text-fg-faint">
      {field.help}
    </span>
  ) : null;

  const problem = error ? (
    <span id={`${id}-error`} className="mt-1.5 block text-[13px] font-medium text-red-300">
      {error}
    </span>
  ) : null;

  const shared = {
    id,
    disabled,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": described || undefined,
    className: cn(CONTROL, error && "border-red-500/60"),
  };

  /* A tick is its own arrangement: the label sits beside the box, not above it. */
  if (field.type === "checkbox") {
    return (
      <div>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            {...shared}
            className={cn(
              "mt-0.5 size-5 shrink-0 cursor-pointer rounded border-line bg-panel text-accent",
              "focus-visible:ring-2 focus-visible:ring-accent/30",
              error && "border-red-500/60"
            )}
            checked={value === "Yes"}
            onChange={(event) => onChange(event.target.checked ? "Yes" : "")}
          />
          <span>
            {label}
            {help}
          </span>
        </label>
        {problem}
      </div>
    );
  }

  if (field.type === "checkboxes") {
    const picked = Array.isArray(value) ? value : [];

    return (
      <fieldset>
        <legend>{label}</legend>
        {help}

        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          {field.options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-panel px-3.5 py-2.5 text-[15px] text-fg transition hover:border-accent/40"
            >
              <input
                type="checkbox"
                disabled={disabled}
                checked={picked.includes(option)}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? [...picked, option]
                      : picked.filter((entry) => entry !== option)
                  )
                }
                className="size-4 shrink-0 cursor-pointer rounded border-line bg-surface text-accent focus-visible:ring-2 focus-visible:ring-accent/30"
              />
              {option}
            </label>
          ))}
        </div>

        {problem}
      </fieldset>
    );
  }

  const single = typeof value === "string" ? value : "";

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      {help}

      <div className="mt-2">
        {field.type === "textarea" ? (
          <textarea
            {...shared}
            rows={4}
            placeholder={field.placeholder}
            value={single}
            onChange={(event) => onChange(event.target.value)}
            className={cn(shared.className, "resize-y leading-relaxed")}
          />
        ) : isChoice(field.type) ? (
          <select {...shared} value={single} onChange={(event) => onChange(event.target.value)}>
            <option value="">{field.placeholder || "Choose one"}</option>
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            {...shared}
            type={inputType(field.type)}
            placeholder={field.placeholder}
            value={single}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      </div>

      {problem}
    </div>
  );
}

/** The real `type` attribute — which is what gets a phone keypad on a phone. */
function inputType(type: FormField["type"]): string {
  if (type === "email") return "email";
  if (type === "phone") return "tel";
  if (type === "number") return "number";
  if (type === "date") return "date";
  return "text";
}

function blank(fields: FormField[]): Submission {
  const values: Submission = {};
  for (const field of fields) values[field.id] = field.type === "checkboxes" ? [] : "";
  return values;
}
