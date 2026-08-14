"use client";

import { useId } from "react";
import { COUNTRIES, checkNational, countryFor, digitsOf, joinNumber, splitNumber } from "@/lib/dialling";
import { cn } from "@/lib/utils";

/**
 * A phone number: the country, then the number.
 *
 * ── Why a native <select> ─────────────────────────────────────────────────
 *
 * Because most of the people filling this in are on a phone, and a native
 * select is the one control a phone draws itself — a wheel on iOS, a full
 * screen list on Android, both scrollable with a thumb and both searchable by
 * typing. A hand-built dropdown of fifty countries is a scrolling div that has
 * to reinvent focus trapping, typeahead, and being taller than the keyboard.
 *
 * It is laid UNDER a visible flag and code rather than shown directly, because
 * a select shows its whole option — "🇮🇳 India +91" — and that is too wide to
 * sit beside a number. So the select is transparent and stretched across the
 * left of the control, and what you read is drawn beneath it. The select is
 * still the real control: it takes focus, it opens on touch, and it is what a
 * screen reader announces.
 *
 * ── What is stored ────────────────────────────────────────────────────────
 *
 * "+91 9876543210" — the dialling code, a space, and the digits. One string,
 * which is what the answer has always been, so nothing downstream changes: the
 * export reads it, the entries table prints it, and an old answer with no code
 * in it still opens here with its digits intact.
 *
 * Nothing typed stores NOTHING, not a bare "+91" — otherwise every skipped
 * optional phone question would be answered with a country nobody chose, and
 * "required" would be satisfied by having left it alone.
 */
export function PhoneField({
  value,
  onChange,
  id,
  disabled = false,
  invalid = false,
  describedBy,
  placeholder,
  className,
}: {
  /** The stored answer: "+91 9876543210", or "" for nothing yet. */
  value: string;
  onChange: (next: string) => void;
  /** The id the label points at. It goes on the number box, not the picker. */
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  /** Overrides the country's own example. Blank uses the example. */
  placeholder?: string;
  className?: string;
}) {
  const fallbackId = useId();
  const boxId = id ?? fallbackId;

  const { country, national } = splitNumber(value);

  // As they type, not only on the way out: a number one digit short should say
  // so while the keyboard is still up, not after they have moved on.
  const tooLongOrShort = checkNational(country, national);
  const complete = national !== "" && tooLongOrShort === "";

  return (
    <div>
      <div
        className={cn(
          "flex w-full items-stretch overflow-hidden rounded-lg border border-line bg-panel transition",
          "focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25",
          invalid && "border-red-500/60",
          disabled && "cursor-not-allowed opacity-60",
          className
        )}
      >
        <div className="relative flex shrink-0 items-center gap-1.5 border-e border-line ps-3 pe-2 text-[15px] text-fg">
          <span aria-hidden className="text-base leading-none">
            {country.flag}
          </span>
          <span aria-hidden className="tabular-nums text-fg-muted">
            {country.dial}
          </span>
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="size-3.5 shrink-0 text-fg-faint"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5.5 8l4.5 4.5L14.5 8" />
          </svg>

          {/*
            The real control, laid over what is drawn. `opacity-0` rather than
            `sr-only` on purpose: a positioned, full-size, transparent select is
            what makes the whole flag-and-code area tappable, and it keeps the
            browser's own picker — which is the entire reason for using one.
          */}
          <select
            aria-label="Country dialling code"
            disabled={disabled}
            value={country.code}
            onChange={(event) => {
              const next = countryFor(event.target.value);
              // The digits stay put. Changing the country of a number you have
              // already typed is how somebody corrects a wrong guess, and
              // clearing it would punish them for it.
              onChange(joinNumber(next, national));
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          >
            {COUNTRIES.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.flag} {entry.name} {entry.dial}
              </option>
            ))}
          </select>
        </div>

        <input
          id={boxId}
          type="tel"
          // The numeric keypad, and no autocorrect turning digits into words.
          inputMode="tel"
          autoComplete="tel-national"
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          value={national}
          onChange={(event) => {
            /*
             * Only digits are kept, and the cap is the country's longest.
             *
             * A number pasted in as "+91 98765 43210" or "(555) 123-4567" is
             * common enough to be the normal case rather than an edge one: the
             * spaces and brackets are dropped, and a pasted dialling code is
             * dropped too, because the picker beside it already says which.
             */
            const typed = event.target.value;
            const pasted = typed.trim().startsWith("+") ? splitNumber(typed) : null;

            const next = pasted
              ? joinNumber(pasted.country, pasted.national.slice(0, pasted.country.max))
              : joinNumber(country, digitsOf(typed).slice(0, country.max));

            onChange(next);
          }}
          placeholder={placeholder || country.example}
          className={cn(
            "w-full min-w-0 bg-transparent px-3 py-2.5 text-[15px] text-fg outline-none",
            "placeholder:text-fg-faint/60 disabled:cursor-not-allowed"
          )}
        />

        {/* Only the tick, and only once it is right. A cross beside a number
            somebody is halfway through typing is an error message for not
            having finished, which is not something to be told. */}
        {complete ? (
          <span className="flex shrink-0 items-center pe-3 text-accent" aria-hidden>
            <svg
              viewBox="0 0 20 20"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4.5 10.5l3.5 3.5 7.5-8" />
            </svg>
          </span>
        ) : null}
      </div>
    </div>
  );
}
