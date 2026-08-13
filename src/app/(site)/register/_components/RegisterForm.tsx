"use client";

import { useMemo, useState } from "react";
import {
  FORM_LIMITS,
  ageKey,
  answerColumns,
  dayFor,
  isMultiChoice,
  acceptedTypes,
  isOtherAnswer,
  otherLabelOf,
  sectionOf,
  uploadLimit,
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

/**
 * The value the "Other" entry in a dropdown carries.
 *
 * Only ever inside the <select>: it is never stored and never sent, because
 * what gets stored is what the visitor types. It is longer than
 * FORM_LIMITS.field_option, and every option is clamped to that length on the
 * way in — so no option a person could write can ever equal it.
 */
const OTHER = `other-${"-".repeat(FORM_LIMITS.field_option)}`;

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

  /**
   * The chosen files, by question.
   *
   * Kept apart from `values` because a File is not something `validateSubmission`
   * can look at or JSON can carry — the answers say what was asked and these
   * ride alongside them in the same multipart body. `values` holds a marker so
   * that a required file question knows it has been answered.
   */
  const [files, setFiles] = useState<Record<string, File>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  /**
   * Which page is on screen, for a form broken into sections.
   *
   * Held as an INDEX into the pages currently being shown, not as a section id,
   * because answering a question can make a whole page appear or disappear
   * beneath you — and an index into the live list always points at something,
   * where an id can point at a page that has just been ruled out.
   */
  const [step, setStep] = useState(0);

  /**
   * The visitor's own calendar, posted with the answers.
   *
   * Minutes to add to local time to reach UTC. Without it the server works out
   * an age against its own clock and can land on a different day from the one
   * the person is standing in — which made the two halves disagree about which
   * questions the form even has. See `ageFrom`.
   *
   * Read once. It is only ever blank on the first render, where no date has
   * been answered and no age can be worked out either way, so it cannot make
   * the server-rendered markup differ from the browser's.
   */
  const tzOffset = useMemo(() => new Date().getTimezoneOffset(), []);

  /**
   * The form as it currently stands: which questions apply, what each of them
   * offers, and what would be stored. Recomputed on every answer, because every
   * answer can change all three.
   *
   * Cheap enough to do on a keystroke — one pass over at most forty fields —
   * and doing it any other way would mean this file deciding for itself what to
   * draw, which is the duplication the note at the top is about.
   */
  const shape = useMemo(
    () => validateSubmission(form.fields, values, dayFor(tzOffset), form.sections),
    [form.fields, form.sections, values, tzOffset]
  );

  /** Question labels by answer key, for "choose X first" and the age line. */
  const labels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const column of answerColumns(form.fields)) map[column.key] = column.label;
    return map;
  }, [form.fields]);

  /*
   * The pages, and the questions on the one being looked at.
   *
   * A form with no sections has no pages, and everything below falls through to
   * "draw all of them" — which is exactly what it did before sections existed,
   * and what every form built before them still gets.
   */
  const steps = shape.sectionsAsked;
  const at = Math.min(step, Math.max(steps.length - 1, 0));
  const current = steps[at] ?? null;

  const onThisPage = current
    ? shape.asked.filter((field) => sectionOf(steps, field)?.id === current.id)
    : shape.asked;

  const last = steps.length === 0 || at >= steps.length - 1;

  /** Errors for questions this page is not drawing — see the banner below. */
  const homeless = useMemo(() => {
    const drawn = new Set(shape.asked.map((field) => field.id));
    return Object.entries(errors).filter(([key, message]) => message && !drawn.has(key));
  }, [errors, shape.asked]);

  function set(id: string, value: string | string[]) {
    setValues((current) => {
      const next = { ...current, [id]: value };

      /*
       * An answer to a question this one has just closed goes with it.
       *
       * Choosing "Karts", picking a class, switching to "Circuit" and switching
       * back used to bring the old class back already selected — nobody chose
       * it the second time, and it was submitted. The post was never wrong
       * (hidden questions are dropped before it), but a form that fills itself
       * in behind you is a form nobody can trust.
       */
      const asked = new Set(
        validateSubmission(form.fields, next, dayFor(tzOffset), form.sections).asked.map(
          (field) => field.id
        )
      );

      for (const field of form.fields) {
        if (asked.has(field.id)) continue;
        const blankValue = isMultiChoice(field.type) ? [] : "";
        if (JSON.stringify(next[field.id]) !== JSON.stringify(blankValue)) {
          next[field.id] = blankValue;
        }
      }

      return next;
    });

    // The error under a control goes the moment it is touched: leaving it there
    // while someone fixes it makes them wonder whether they have.
    setErrors((current) => (current[id] ? { ...current, [id]: "" } : current));
    // And the banner goes once nothing is left to fix, rather than sitting there
    // contradicting a form that is now complete.
    setProblem(null);
  }

  /**
   * Forward a page, if this one is answered.
   *
   * Checked page by page rather than all at once: being told at the end that
   * something three pages back is wrong is the failure a stepper is supposed to
   * prevent, not one it should introduce.
   */
  function next() {
    const here: Record<string, string> = {};
    for (const field of onThisPage) {
      if (shape.errors[field.id]) here[field.id] = shape.errors[field.id];
    }

    if (Object.keys(here).length > 0) {
      setErrors((current) => ({ ...current, ...here }));
      setProblem("Some answers on this page need another look.");
      focusFirstError(onThisPage, here);
      return;
    }

    setProblem(null);
    setStep(at + 1);
    // The next page starts at its own top; carrying the scroll position over
    // lands somebody halfway down a page they have not seen.
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setProblem(null);
    setStep(Math.max(at - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (preview || busy) return;

    const checked = shape;
    if (Object.keys(checked.errors).length > 0) {
      setErrors(checked.errors);
      setProblem("Some answers need another look.");

      // The first problem may be on a page that is not on screen. Go to it
      // rather than reporting something the visitor cannot see.
      const first = checked.asked.find((field) => checked.errors[field.id]);
      const page = first ? sectionOf(steps, first) : null;
      const index = page ? steps.findIndex((section) => section.id === page.id) : -1;

      if (index >= 0 && index !== at) setStep(index);
      focusFirstError(checked.asked, checked.errors);
      return;
    }

    setBusy(true);
    setProblem(null);

    try {
      const carrying = Object.keys(files).length > 0;

      /*
       * JSON when there is nothing to carry, multipart when there is.
       *
       * Not always multipart: the JSON path is every submission this form has
       * ever made, it is smaller, and it is the one with a bounded read on the
       * server. A form with no file question should not pay for one.
       */
      const payload = {
        values: checked.values,
        company: honeypot,
        nonce,
        issuedAt,
        // So the server works an age out against the day this person is
        // standing in, not the day the server happens to be in.
        tzOffset,
      };

      let body: BodyInit;
      const headers: Record<string, string> = {};

      if (carrying) {
        const parcel = new FormData();
        parcel.set("values", JSON.stringify(checked.values));
        parcel.set("company", honeypot);
        parcel.set("nonce", nonce);
        parcel.set("issuedAt", String(issuedAt));
        parcel.set("tzOffset", String(tzOffset));
        for (const [id, file] of Object.entries(files)) parcel.set(id, file);
        body = parcel;
        // Deliberately no content-type: the browser sets it, WITH the boundary,
        // which cannot be written by hand.
      } else {
        body = JSON.stringify(payload);
        headers["Content-Type"] = "application/json";
      }

      const response = await fetch(`/api/register/${form.slug}`, {
        method: "POST",
        headers,
        body,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data.errors) {
          setErrors(data.errors as Record<string, string>);
          setProblem("Some answers need another look.");
          focusFirstError(checked.asked, data.errors as Record<string, string>);
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
      <div
        role="status"
        aria-live="polite"
        tabIndex={-1}
        ref={(node) => node?.focus()}
        className="panel-card p-8 text-center outline-none sm:p-10"
      >
        {/* The form it replaces has just been removed from the page, so focus
            was left on <body> and nothing was announced — somebody using a
            screen reader had no way to know the entry had gone. */}
        <h2 className="headline text-[clamp(1.4rem,3vw,2rem)]">
          {form.success_title || "Thank you"}
        </h2>
        {form.success_body ? <p className="body-copy mx-auto mt-3 max-w-lg">{form.success_body}</p> : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="panel-card p-6 sm:p-8">
      {/* Nothing at all for a form with no sections — which is every form built
          before they existed, and every short one built since. */}
      {steps.length > 1 && current ? (
        <div className="mb-8">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] font-semibold text-fg">
              {current.title || `Page ${at + 1}`}
            </p>
            <p className="shrink-0 text-[12px] text-fg-faint">
              Page {at + 1} of {steps.length}
            </p>
          </div>

          {/* The bar is decoration; the sentence above it is the information,
              which is why that is not aria-hidden and this is. */}
          <div aria-hidden className="mt-2 h-1 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${((at + 1) / steps.length) * 100}%` }}
            />
          </div>

          {current.blurb ? (
            <p className="mt-3 text-[13px] leading-relaxed text-fg-muted">{current.blurb}</p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-6">
        {onThisPage.map((field) => (
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
            waitingAnswered={answered(shape.values[field.optionsWhen.key])}
            age={field.age ? (shape.values[ageKey(field.id)] as string) || "" : ""}
            error={errors[field.id]}
            // Live even in the preview — that is how a rule gets checked.
            disabled={busy}
            onChange={(value) => set(field.id, value)}
            onFile={(file) =>
              setFiles((current) => {
                const next = { ...current };
                if (file) next[field.id] = file;
                else delete next[field.id];
                return next;
              })
            }
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

      {problem || homeless.length > 0 ? (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {problem ? <p>{problem}</p> : null}

          {/*
            Errors with nowhere to land.
            The server checks the form as it stands NOW, and this page was drawn
            a moment ago — an admin editing a question in between, or a branch
            the two sides read differently, produces an error keyed to a control
            that is not on screen. Rendered per-field only, it was invisible and
            unfixable: a red banner saying "some answers need another look" with
            nothing to look at, forever. Printed here instead, with the question
            it belongs to named.
          */}
          {homeless.length > 0 ? (
            <ul className="mt-1 space-y-1">
              {homeless.map(([key, message]) => (
                <li key={key}>
                  <span className="font-semibold">{labels[key] || "A question"}:</span> {message}
                </li>
              ))}
              <li className="pt-1 text-red-200/80">
                This form may have been changed while you were filling it in — reloading the page
                will show it as it now stands.
              </li>
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center gap-4">
        {steps.length > 1 && at > 0 ? (
          <button
            type="button"
            onClick={back}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-sm font-semibold text-fg-muted transition hover:border-accent/40 hover:text-fg disabled:opacity-60"
          >
            Back
          </button>
        ) : null}

        {/*
          Next is a button, not a submit, and Send only exists on the last page.
          A stepper whose middle pages can be sent by pressing return is one
          that takes half-finished entries.
        */}
        {!last ? (
          <button
            type="button"
            onClick={next}
            disabled={busy}
            className={cn(
              "inline-flex items-center gap-2.5 rounded-full bg-accent px-7 py-3 text-sm font-semibold text-accent-ink",
              "transition-all duration-300 hover:bg-accent-dark hover:-translate-y-0.5 active:translate-y-0",
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            Next
          </button>
        ) : null}

        <button
          type="submit"
          hidden={!last}
          disabled={preview || busy || !last}
          className={cn(
            "inline-flex items-center gap-2.5 rounded-full bg-accent px-7 py-3 text-sm font-semibold text-accent-ink",
            "transition-all duration-300 hover:bg-accent-dark hover:-translate-y-0.5 active:translate-y-0",
            "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          )}
        >
          {busy ? "Sending…" : form.submit_label || "Send"}
        </button>

        {onThisPage.some((field) => field.required) ? (
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

/**
 * Takes the visitor to the first thing that is wrong.
 *
 * On a long form the summary is at the bottom and the first bad answer can be a
 * screenful above it, so "some answers need another look" was a sentence with
 * nothing to look at. In the questions' own order, not the order the errors
 * happen to be keyed in — the first one a person would meet reading down.
 */
function focusFirstError(asked: FormField[], errors: Record<string, string>): void {
  const first = asked.find((field) => errors[field.id]);
  if (!first) return;

  const control = document.getElementById(`field-${first.id}`);
  if (!control) return;

  control.scrollIntoView({ behavior: "smooth", block: "center" });
  // Preventing the scroll here matters: focus() would jump instantly and undo
  // the smooth movement that has just started.
  (control as HTMLElement).focus({ preventScroll: true });
}

/* ──────────────────────────── One question ───────────────────────────── */

function Control({
  field,
  value,
  options,
  waitingFor,
  waitingAnswered,
  age,
  error,
  disabled,
  onChange,
  onFile,
}: {
  field: FormField;
  value: string | string[] | undefined;
  /** What this question offers RIGHT NOW — not always `field.options`. */
  options: string[];
  /** The question this one's options are still waiting on, if any. */
  waitingFor: string;
  /** Whether that question HAS been answered — an empty list then means the
   *  form is misconfigured, not that the visitor still has a step to take. */
  waitingAnswered: boolean;
  /** The age worked out from a date answer. Blank for everything else. */
  age: string;
  error?: string;
  disabled: boolean;
  onChange: (value: string | string[]) => void;
  /** File questions only: the chosen file, which does not go through `values`. */
  onFile?: (file: File | null) => void;
}) {
  const [showInfo, setShowInfo] = useState(false);

  /*
   * "Other is the one I want" — before anything has been typed into it.
   *
   * The stored answer carries no marker: an "Other" answer is simply one that
   * is not on the list. That is right for the export, but it leaves a gap the
   * moment somebody ticks the box and has not typed yet, because at that
   * instant the answer is blank and indistinguishable from having chosen
   * nothing. This holds the box open across that gap, and nothing else.
   */
  const [otherPicked, setOtherPicked] = useState(false);

  const id = `field-${field.id}`;
  const described = [
    field.help ? `${id}-help` : null,
    // Only while it is open. Pointing at an element that is not in the document
    // is a dangling reference, and a screen reader following it finds nothing.
    showInfo && field.info ? `${id}-info` : null,
    error ? `${id}-error` : null,
  ]
    .filter(Boolean)
    .join(" ");

  /*
   * The question's own words.
   *
   * Text only. It goes inside a <label> or a <legend>, and a <label> may not
   * contain another labelable element — a <button> is one, so the circled "i"
   * that used to live in here made every one of these invalid, with browsers
   * disagreeing about whether clicking it also toggled the control.
   *
   * The asterisk gets a spoken equivalent beside it. On its own it is announced
   * as "star", or as nothing at all.
   */
  const labelText = (
    <>
      {field.label || "Question"}
      {field.required ? (
        <>
          <span aria-hidden className="ms-1 text-accent">
            *
          </span>
          <span className="sr-only"> (required)</span>
        </>
      ) : null}
    </>
  );

  /*
   * The circled "i".
   *
   * A disclosure rather than a hover tooltip: a tooltip cannot be opened by
   * touch, which is most of the people filling this in, and one long enough to
   * be worth writing is too long to hang off a cursor. What it opens is
   * ordinary text in the flow, so it pushes the rest of the form down rather
   * than covering it, and it is wired to the control with aria-describedby so
   * it is read out with the question and not as loose text somewhere after it.
   *
   * Rendered as a SIBLING of the label, never inside it — see above.
   */
  const infoButton = field.info ? (
    <button
      type="button"
      onClick={() => setShowInfo((was) => !was)}
      aria-expanded={showInfo}
      {...(showInfo ? { "aria-controls": `${id}-info` } : {})}
      aria-label={
        showInfo
          ? `Hide the note on ${field.label || "this question"}`
          : `More about ${field.label || "this question"}`
      }
      className={cn(
        "mt-0.5 inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border text-[11px] font-bold leading-none transition",
        showInfo
          ? "border-accent bg-accent text-accent-ink"
          : "border-fg-faint/60 text-fg-faint hover:border-accent hover:text-accent"
      )}
    >
      i
    </button>
  ) : null;

  const info =
    field.info && showInfo ? (
      <p
        id={`${id}-info`}
        className="mt-2 whitespace-pre-line rounded-lg border border-line bg-surface px-3.5 py-2.5 text-[13px] leading-relaxed text-fg-muted"
      >
        {field.info}
      </p>
    ) : null;

  const help = field.help ? (
    <p id={`${id}-help`} className="mt-1 text-[13px] leading-relaxed text-fg-faint">
      {field.help}
    </p>
  ) : null;

  const problem = error ? (
    <p id={`${id}-error`} className="mt-1.5 text-[13px] font-medium text-red-300">
      {error}
    </p>
  ) : null;

  /** The label and its button, for everything that is not a group of choices. */
  const head = (
    <div className="flex items-start gap-2">
      <label htmlFor={id} className="text-[15px] font-semibold text-fg">
        {labelText}
      </label>
      {infoButton}
    </div>
  );

  const shared = {
    id,
    disabled,
    "aria-invalid": error ? true : undefined,
    "aria-required": field.required || undefined,
    "aria-describedby": described || undefined,
    className: cn(CONTROL, error && "border-red-500/60"),
  };

  /* A tick is its own arrangement: the label sits beside the box, not above it. */
  if (field.type === "checkbox") {
    return (
      <div>
        <div className="flex items-start gap-3">
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
          <div className="min-w-0">
            <div className="flex items-start gap-2">
              <label htmlFor={id} className="cursor-pointer text-[15px] font-semibold text-fg">
                {labelText}
              </label>
              {infoButton}
            </div>
            {/* Outside the label. Inside it, the help text and the info panel
                became part of the tick box's NAME and were then announced a
                second time as its description. */}
            {help}
            {info}
          </div>
        </div>
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

    // What is stored carries no marker — an "Other" answer is simply one that
    // is not on the list — so the box shows when the answer is off-list, or
    // when it has just been ticked and nothing has been typed into it yet.
    const otherText = many
      ? (picked.find((entry) => !field.options.includes(entry)) ?? "")
      : isOtherAnswer(field, single)
        ? single
        : "";
    const otherOn = field.allowOther && (otherText !== "" || otherPicked);

    return (
      <fieldset
        aria-describedby={described || undefined}
        aria-invalid={error ? true : undefined}
        aria-required={field.required || undefined}
      >
        {/* The whole group is the control here, so the description hangs off
            the fieldset — spread onto the individual inputs it would be read
            out once per option. */}
        <legend className="flex items-start gap-2 text-[15px] font-semibold text-fg">
          {labelText}
          {infoButton}
        </legend>
        {help}
        {info}

        {options.length === 0 ? <Waiting for={waitingFor} answered={waitingAnswered} /> : null}

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
                  // The first option carries the group's id, so the error jump
                  // has something to focus: a fieldset cannot take focus itself.
                  id={option === options[0] ? id : undefined}
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

          {/* The free-text choice, drawn as one more tile so it reads as one
              more answer rather than as a separate question. What gets stored
              is what they type — see `isOtherAnswer`. */}
          {field.allowOther ? (
            <label
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-lg border bg-panel px-3.5 py-2.5 text-[15px] text-fg transition sm:col-span-2",
                otherOn ? "border-accent/60" : "border-line hover:border-accent/40"
              )}
            >
              <input
                type={many ? "checkbox" : "radio"}
                name={many ? undefined : id}
                disabled={disabled}
                checked={otherOn}
                onChange={(event) => {
                  setOtherPicked(event.target.checked);
                  if (event.target.checked) return;
                  // Unticking clears what was typed: leaving it behind would
                  // submit an answer whose box is no longer on screen.
                  onChange(many ? picked.filter((entry) => options.includes(entry)) : "");
                }}
                className={cn(
                  "size-4 shrink-0 cursor-pointer border-line bg-surface text-accent focus-visible:ring-2 focus-visible:ring-accent/30",
                  many ? "rounded" : "rounded-full"
                )}
              />
              <span className="shrink-0">{otherLabelOf(field)}</span>
              <input
                type="text"
                disabled={disabled || !otherOn}
                value={otherText}
                onChange={(event) => {
                  const typed = event.target.value;
                  if (!many) {
                    onChange(typed);
                    return;
                  }
                  onChange([...picked.filter((entry) => options.includes(entry)), typed].filter(Boolean));
                }}
                aria-label={`${otherLabelOf(field)} — please say`}
                placeholder="Please say"
                className="w-full min-w-0 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[14px] text-fg outline-none focus-visible:border-accent disabled:opacity-50"
              />
            </label>
          ) : null}
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
        {head}
        {help}
        {info}

        {options.length === 0 ? <Waiting for={waitingFor} answered={waitingAnswered} /> : null}

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

  // Same reasoning as the tiles above: off-list means typed, and `otherPicked`
  // covers the instant between ticking and typing.
  const otherText = isOtherAnswer(field, single) ? single : "";
  const otherOn = field.allowOther && (otherText !== "" || otherPicked);
  const selectValue = otherOn ? OTHER : single;

  return (
    <div>
      {head}
      {help}
      {info}

      {field.type === "select" && options.length === 0 ? (
        <Waiting for={waitingFor} answered={waitingAnswered} />
      ) : null}

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
        ) : field.type === "file" ? (
          <input
            {...shared}
            type="file"
            accept={acceptedTypes(field).join(",")}
            onChange={(event) => {
              const chosen = event.target.files?.[0] ?? null;
              onFile?.(chosen);
              // The answer itself is a marker, so a required file question can
              // tell "chosen" from "not chosen" without the file being in
              // `values` — which it cannot be, because JSON has no files.
              onChange(chosen ? `file::{"key":"pending","name":${JSON.stringify(chosen.name)},"size":${chosen.size}}` : "");
            }}
            className={cn(shared.className, "file:mr-3 file:rounded-md file:border-0 file:bg-line file:px-3 file:py-1.5 file:text-[13px] file:text-fg")}
          />
        ) : field.type === "select" ? (
          <>
            <select
              {...shared}
              // A typed answer is not one of the options, so the select cannot
              // show it — it shows the "Other" entry instead, and the box below
              // holds the words.
              value={selectValue}
              onChange={(event) => {
                const chosen = event.target.value;
                if (chosen === OTHER) {
                  setOtherPicked(true);
                  onChange("");
                  return;
                }
                setOtherPicked(false);
                onChange(chosen);
              }}
            >
              <option value="">{field.placeholder || "Choose one"}</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              {field.allowOther ? <option value={OTHER}>{otherLabelOf(field)}</option> : null}
            </select>

            {otherOn ? (
              <input
                type="text"
                disabled={disabled}
                value={otherText}
                onChange={(event) => onChange(event.target.value)}
                aria-label={`${otherLabelOf(field)} — please say`}
                placeholder="Please say"
                className={cn(CONTROL, "mt-2")}
              />
            ) : null}
          </>
        ) : (
          <input
            {...shared}
            type={inputType(field.type)}
            placeholder={field.placeholder}
            /*
             * The same bounds as the rule, handed to the browser.
             *
             * Not a second implementation of the check — `validateSubmission`
             * remains the only thing that decides — but a date picker that will
             * not scroll past the latest allowed date, and a number spinner
             * that stops at the top, are worth more than the error they save.
             */
            {...bounds(field)}
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
 * A choice with nothing in it.
 *
 * An empty dropdown is indistinguishable from a broken one, so it says why.
 * There are two whys, and telling them apart matters: one is a step the visitor
 * can take, and the other is nothing to do with them at all.
 *
 * The second used to be reported as the first — "answer that question first"
 * about a question they had already answered — with the control still marked
 * required, so the form could never be sent. It is a misconfigured form, and
 * saying so plainly is the only honest option; the entry now goes through with
 * this one blank rather than trapping the visitor.
 */
function Waiting({ for: question, answered }: { for: string; answered: boolean }) {
  return (
    <p className="mt-2 rounded-lg border border-dashed border-line px-3.5 py-2.5 text-[13px] text-fg-faint">
      {answered ? (
        <>
          There are no choices here for that answer
          {question ? (
            <>
              {" "}
              to <span className="text-fg-muted">{question}</span>
            </>
          ) : null}
          . You can leave this one and carry on.
        </>
      ) : (
        <>
          Answer{" "}
          {question ? <span className="text-fg-muted">{question}</span> : "the question above"}{" "}
          first — what you can pick here depends on it.
        </>
      )}
    </p>
  );
}

/**
 * The rule's bounds as native attributes.
 *
 * A courtesy, like everything else in this file: `validateSubmission` is still
 * what decides. What these buy is a date picker that will not scroll past the
 * latest allowed date and a number spinner that stops at the top — being unable
 * to type a wrong answer beats being told about it afterwards.
 *
 * A date field that works out an age also gets a `max` of today whatever its
 * rule says, because a birth date in the future is refused on the server and
 * the picker may as well not offer one.
 */
function bounds(field: FormField): Record<string, string | undefined> {
  const rule = field.rule;

  if (field.type === "number" && rule.kind === "number") {
    return { min: rule.min || undefined, max: rule.max || undefined };
  }

  if (field.type === "date") {
    const today = new Date().toISOString().slice(0, 10);
    const latest = rule.kind === "date" ? rule.max || undefined : undefined;

    return {
      min: rule.kind === "date" ? rule.min || undefined : undefined,
      max: field.age ? (latest && latest < today ? latest : today) : latest,
    };
  }

  if ((field.type === "text" || field.type === "textarea") && rule.kind === "length") {
    // No `minLength`: it blocks submission through the browser's own validation
    // rather than through ours, which would show a bubble this form cannot
    // style, position or translate. The maximum is safe — it just stops typing.
    return { maxLength: rule.max || undefined } as Record<string, string | undefined>;
  }

  return {};
}

/** The real `type` attribute — which is what gets a phone keypad on a phone. */
function inputType(type: FormField["type"]): string {
  if (type === "email") return "email";
  if (type === "phone") return "tel";
  if (type === "number") return "number";
  if (type === "date") return "date";
  return "text";
}

/** Whether an answer key has anything in it. Blank and absent are the same. */
function answered(value: string | string[] | undefined): boolean {
  return Array.isArray(value) ? value.length > 0 : Boolean(value);
}

function blank(fields: FormField[]): Submission {
  const values: Submission = {};
  for (const field of fields) values[field.id] = isMultiChoice(field.type) ? [] : "";
  return values;
}
