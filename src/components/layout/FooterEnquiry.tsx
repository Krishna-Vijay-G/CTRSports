"use client";

import { useId, useRef, useState } from "react";
import { BLANK_ENQUIRY, ENQUIRY_LIMITS, checkEnquiry, type Enquiry } from "@/lib/enquiry";

/**
 * Name, email, message, send — at the foot of every page.
 *
 * ── Checked in one place ──────────────────────────────────────────────────
 *
 * `checkEnquiry` decides what is acceptable and BOTH sides run it: this one so
 * nothing is sent that will only come back refused, and the route because the
 * browser's word is worth nothing. Two copies of that rule is how a page
 * accepts what the server rejects.
 *
 * ── What it does with a failure ───────────────────────────────────────────
 *
 * Nothing is validated until Send is pressed. Marking a field wrong while
 * somebody is still typing their address is telling them they have made a
 * mistake in the middle of not having made one yet; after the first press,
 * corrections are checked as they type, which is when that feedback is help
 * rather than nagging.
 *
 * Errors are announced and the first bad field is focused, because a message
 * under a box below the fold is a message nobody sees — and this form is at the
 * bottom of a long page.
 *
 * ── The invisible field ───────────────────────────────────────────────────
 *
 * `website` is a honeypot: off-screen, not tabbable, and hidden from screen
 * readers, so nothing a person uses can reach it. Filled in means a bot. The
 * route answers "thank you" and stores nothing — and logs it, because a
 * password manager filling it in would otherwise swallow real messages.
 */
export function FooterEnquiry({ heading, note }: { heading: string; note: string }) {
  const id = useId();
  const [values, setValues] = useState<Enquiry>(BLANK_ENQUIRY);
  const [errors, setErrors] = useState<Partial<Record<keyof Enquiry, string>>>({});
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState("");

  const honeypot = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);

  function set(patch: Partial<Enquiry>) {
    const next = { ...values, ...patch };
    setValues(next);
    // Only once they have already been told. See the note above.
    if (tried) setErrors(checkEnquiry(next).errors);
  }

  /** Puts the cursor in the first box that is wrong. */
  function focusFirstError(found: Partial<Record<keyof Enquiry, string>>) {
    const first = (["name", "email", "message"] as const).find((key) => found[key]);
    if (!first) return;
    form.current?.querySelector<HTMLElement>(`#${CSS.escape(`${id}-${first}`)}`)?.focus();
  }

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setTried(true);
    setFailed("");

    const checked = checkEnquiry(values);
    setErrors(checked.errors);

    if (Object.keys(checked.errors).length > 0) {
      focusFirstError(checked.errors);
      return;
    }

    setBusy(true);

    try {
      const response = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...checked.values,
          website: honeypot.current?.value ?? "",
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 422 && data.errors) {
        // The server refused something this side let through — show it where it
        // belongs rather than as a general failure.
        setErrors(data.errors);
        focusFirstError(data.errors);
        return;
      }

      if (!response.ok) {
        setFailed(data.error ?? "Could not send that just now. Please try again.");
        return;
      }

      setSent(true);
      setValues(BLANK_ENQUIRY);
      setErrors({});
      setTried(false);
    } catch {
      setFailed("No connection. Please check and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-panel border border-line bg-panel p-5">
        {/* role="status" so it is announced: somebody who cannot see the panel
            appear otherwise has no idea the button did anything. */}
        <p role="status" className="text-sm leading-relaxed text-fg">
          Thank you — your message has been sent. We will be in touch by email.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-3 text-[13px] font-semibold text-accent underline-offset-4 hover:underline"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form ref={form} onSubmit={send} noValidate className="flex flex-col gap-3">
      {heading ? (
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-fg-faint">
          {heading}
        </h2>
      ) : null}

      {note ? <p className="-mt-1 text-[13px] leading-relaxed text-fg-muted">{note}</p> : null}

      <Line
        id={`${id}-name`}
        label="Your name"
        value={values.name}
        onChange={(name) => set({ name })}
        error={errors.name}
        maxLength={ENQUIRY_LIMITS.name}
        autoComplete="name"
      />

      <Line
        id={`${id}-email`}
        label="Email"
        type="email"
        value={values.email}
        onChange={(email) => set({ email })}
        error={errors.email}
        maxLength={ENQUIRY_LIMITS.email}
        autoComplete="email"
      />

      <Line
        id={`${id}-message`}
        label="Your query"
        value={values.message}
        onChange={(message) => set({ message })}
        error={errors.message}
        maxLength={ENQUIRY_LIMITS.message}
        rows={3}
      />

      {/* The honeypot. `tabIndex={-1}` and `aria-hidden` keep every real input
          method away from it; it is positioned off-screen rather than
          `display:none`, which some bots skip. */}
      <input
        ref={honeypot}
        type="text"
        name="website"
        tabIndex={-1}
        aria-hidden
        autoComplete="off"
        className="absolute left-[-9999px] h-px w-px opacity-0"
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[13px] font-bold uppercase tracking-wide text-accent-ink transition hover:brightness-95 disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send"}
          {busy ? null : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M4 12h15m-6-6 6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>

        {failed ? (
          <p role="alert" className="text-[13px] text-accent">
            {failed}
          </p>
        ) : null}
      </div>
    </form>
  );
}

/**
 * One labelled box, with its error tied to it.
 *
 * `aria-describedby` points at the message and `aria-invalid` marks the field,
 * which is what makes the error reachable to somebody who cannot see it sitting
 * underneath. A textarea when `rows` is given, an input otherwise — the two are
 * identical in every other respect, so writing them twice is how they drift.
 */
function Line({
  id,
  label,
  value,
  onChange,
  error,
  maxLength,
  type = "text",
  rows,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  maxLength: number;
  type?: string;
  rows?: number;
  autoComplete?: string;
}) {
  const box =
    "w-full rounded-[8px] border bg-page px-3 py-2 text-sm text-fg outline-none transition placeholder:text-fg-faint focus:border-accent";

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[11px] font-medium text-fg-faint">
        {label}
      </label>

      {rows ? (
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={rows}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${box} resize-y ${error ? "border-accent" : "border-line"}`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={maxLength}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`${box} ${error ? "border-accent" : "border-line"}`}
        />
      )}

      {error ? (
        <p id={`${id}-error`} className="mt-1 text-[11px] text-accent">
          {error}
        </p>
      ) : null}
    </div>
  );
}
