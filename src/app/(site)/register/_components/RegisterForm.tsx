"use client";

import { useMemo, useState } from "react";
import {
  ageKey,
  answerColumns,
  isMultiChoice,
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
 * That goes for the branching too, and it is the reason this file has no logic
 * of its own about which questions apply. `validateSubmission` runs on every
 * keystroke and hands back the questions to ask and the options to offer, and
 * this draws exactly that. The alternative is the same branching written twice,
 * agreeing until somebody edits one copy — after which a question is either
 * asked and thrown away, or hidden and then demanded.
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
  preview = false,
}: {
  form: Form;
  /** Proof the page was served, not fabricated. Checked by the route. */
  nonce?: string;
  issuedAt?: number;
  /**
   * The admin's preview: the questions WORK, the send does not.
   *
   * They used to be dead controls, which was fine when a form was a flat list —
   * you could see all of it at once. It stopped being fine the moment a question
   * could depend on an answer: a branch that only appears once something is
   * ticked is invisible in a preview where nothing can be ticked, and the one
   * place to check a rule would be the live site.
   */
  preview?: boolean;
}) {
  const [values, setValues] = useState<Submission>(() => blank(form.fields));
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  /**
   * The form as it currently stands: which questions apply, what each of them
   * offers, and what would be stored. Recomputed on every answer, because every
   * answer can change all three.
   *
   * Cheap enough to do on a keystroke — one pass over at most forty fields —
   * and doing it any other way would mean this file deciding for itself what to
   * draw, which is the duplication the note at the top is about.
   */
  const shape = useMemo(() => validateSubmission(form.fields, values), [form.fields, values]);

  /** Question labels by answer key, for "choose X first" and the age line. */
  const labels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const column of answerColumns(form.fields)) map[column.key] = column.label;
    return map;
  }, [form.fields]);

  function set(id: string, value: string | string[]) {
    setValues((current) => ({ ...current, [id]: value }));
    // The error under a control goes the moment it is touched: leaving it there
    // while someone fixes it makes them wonder whether they have.
    setErrors((current) => (current[id] ? { ...current, [id]: "" } : current));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (preview || busy) return;

    const checked = shape;
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
        {shape.asked.map((field) => (
          <Control
            key={field.id}
            field={field}
            value={values[field.id]}
            options={shape.options[field.id] ?? field.options}
            // Only ever set for a dropdown whose options are still waiting on an
            // earlier answer — an empty list with nothing said about it reads as
            // a broken control.
            waitingFor={
              field.optionsWhen.key && (shape.options[field.id] ?? []).length === 0
                ? labels[field.optionsWhen.key] || "the question above"
                : ""
            }
            age={field.age ? (shape.values[ageKey(field.id)] as string) || "" : ""}
            error={errors[field.id]}
            // Live even in the preview — that is how a rule gets checked.
            disabled={busy}
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
          disabled={preview || busy}
          className={cn(
            "inline-flex items-center gap-2.5 rounded-full bg-accent px-7 py-3 text-sm font-semibold text-accent-ink",
            "transition-all duration-300 hover:bg-accent-dark hover:-translate-y-0.5 active:translate-y-0",
            "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          )}
        >
          {busy ? "Sending…" : form.submit_label || "Send"}
        </button>

        {shape.asked.some((field) => field.required) ? (
          <span className="text-[13px] text-fg-faint">
            <span className="text-accent">*</span> is required
          </span>
        ) : null}

        {preview ? (
          <span className="text-[13px] text-fg-faint">
            Preview — answer the questions to try the rules. Nothing is sent.
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
  options,
  waitingFor,
  age,
  error,
  disabled,
  onChange,
}: {
  field: FormField;
  value: string | string[] | undefined;
  /** What this question offers RIGHT NOW — not always `field.options`. */
  options: string[];
  /** The question this one's options are still waiting on, if any. */
  waitingFor: string;
  /** The age worked out from a date answer. Blank for everything else. */
  age: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string | string[]) => void;
}) {
  const [showInfo, setShowInfo] = useState(false);

  const id = `field-${field.id}`;
  const described = [
    field.help ? `${id}-help` : null,
    showInfo ? `${id}-info` : null,
    error ? `${id}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  /*
   * The circled "i".
   *
   * A disclosure rather than a hover tooltip: a tooltip cannot be opened by
   * touch, which is most of the people filling this in, and one long enough to
   * be worth writing is too long to hang off a cursor. What it opens is
   * ordinary text in the flow, so it pushes the rest of the form down rather
   * than covering it, and it is wired to the control with aria-describedby so
   * it is read out with the question and not as loose text somewhere after it.
   */
  const label = (
    <span className="flex items-start gap-2 text-[15px] font-semibold text-fg">
      <span>
        {field.label || "Question"}
        {field.required ? <span className="ms-1 text-accent">*</span> : null}
      </span>

      {field.info ? (
        <button
          type="button"
          onClick={() => setShowInfo((was) => !was)}
          aria-expanded={showInfo}
          aria-controls={`${id}-info`}
          aria-label={showInfo ? "Hide the note on this question" : "More about this question"}
          className={cn(
            "mt-0.5 inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border text-[11px] font-bold leading-none transition",
            showInfo
              ? "border-accent bg-accent text-accent-ink"
              : "border-fg-faint/60 text-fg-faint hover:border-accent hover:text-accent"
          )}
        >
          i
        </button>
      ) : null}
    </span>
  );

  const info =
    field.info && showInfo ? (
      <span
        id={`${id}-info`}
        className="mt-2 block whitespace-pre-line rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[13px] leading-relaxed text-fg-muted"
      >
        {field.info}
      </span>
    ) : null;

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
            {info}
          </span>
        </label>
        {problem}
      </div>
    );
  }

  /* Tick boxes and radio buttons are one arrangement — every option on screen,
     in a row of tiles. The only difference is how many can be lit at once, so
     they are drawn together and the input type is the variable. */
  if (field.type === "checkboxes" || field.type === "radio") {
    const many = field.type === "checkboxes";
    const picked = Array.isArray(value) ? value : [];
    const single = typeof value === "string" ? value : "";

    return (
      <fieldset>
        <legend>{label}</legend>
        {help}
        {info}

        {options.length === 0 ? <Waiting for={waitingFor} /> : null}

        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          {options.map((option) => {
            const on = many ? picked.includes(option) : single === option;

            return (
              <label
                key={option}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg border bg-panel px-3.5 py-2.5 text-[15px] text-fg transition",
                  on ? "border-accent/60" : "border-line hover:border-accent/40"
                )}
              >
                <input
                  type={many ? "checkbox" : "radio"}
                  // A radio group is one control: the shared name is what makes
                  // the browser treat these as alternatives to each other.
                  name={many ? undefined : id}
                  disabled={disabled}
                  checked={on}
                  onChange={(event) => {
                    if (!many) {
                      onChange(option);
                      return;
                    }
                    onChange(
                      event.target.checked
                        ? [...picked, option]
                        : picked.filter((entry) => entry !== option)
                    );
                  }}
                  className={cn(
                    "size-4 shrink-0 cursor-pointer border-line bg-surface text-accent focus-visible:ring-2 focus-visible:ring-accent/30",
                    many ? "rounded" : "rounded-full"
                  )}
                />
                {option}
              </label>
            );
          })}
        </div>

        {problem}
      </fieldset>
    );
  }

  /* A dropdown that takes several. Native `<select multiple>`, which is plain
     and works everywhere — it is also the least pleasant of the four to use,
     which is why the builder says so and offers tick boxes beside it. `size`
     is set so it opens as a list rather than a one-line box nobody can tell is
     scrollable. */
  if (field.type === "multiselect") {
    const picked = Array.isArray(value) ? value : [];

    return (
      <div>
        <label htmlFor={id}>{label}</label>
        {help}
        {info}

        {options.length === 0 ? <Waiting for={waitingFor} /> : null}

        <div className="mt-2">
          <select
            {...shared}
            multiple
            size={Math.min(Math.max(options.length, 3), 6)}
            value={picked}
            onChange={(event) =>
              onChange(Array.from(event.target.selectedOptions, (option) => option.value))
            }
            className={cn(shared.className, "py-2")}
          >
            {options.map((option) => (
              <option key={option} value={option} className="px-1 py-1">
                {option}
              </option>
            ))}
          </select>
        </div>

        <span className="mt-1.5 block text-[13px] text-fg-faint">
          Pick as many as apply — hold Ctrl (or Cmd) to add another.
        </span>

        {problem}
      </div>
    );
  }

  const single = typeof value === "string" ? value : "";

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      {help}
      {info}

      {field.type === "select" && options.length === 0 ? <Waiting for={waitingFor} /> : null}

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
        ) : field.type === "select" ? (
          <select {...shared} value={single} onChange={(event) => onChange(event.target.value)}>
            <option value="">{field.placeholder || "Choose one"}</option>
            {options.map((option) => (
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

      {/* The age is shown back rather than kept quiet. It is stored, it decides
          what gets asked next, and a date typed a year out is the easiest
          mistake to make on a form — so it is put where it can be caught. */}
      {age ? (
        <span className="mt-1.5 block text-[13px] text-fg-muted">
          That makes them <span className="font-semibold text-fg">{age}</span>.
        </span>
      ) : null}

      {problem}
    </div>
  );
}

/**
 * A choice whose options have not arrived yet.
 *
 * An empty dropdown is indistinguishable from a broken one, so it says which
 * answer it is waiting on instead of showing nothing at all.
 */
function Waiting({ for: question }: { for: string }) {
  return (
    <span className="mt-2 block rounded-lg border border-dashed border-line px-3.5 py-2.5 text-[13px] text-fg-faint">
      Answer {question ? <span className="text-fg-muted">{question}</span> : "the question above"}{" "}
      first — what you can pick here depends on it.
    </span>
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
  for (const field of fields) values[field.id] = isMultiChoice(field.type) ? [] : "";
  return values;
}
