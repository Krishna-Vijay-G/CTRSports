"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RACE_CATEGORY_LIST, categoryLabel, type RaceCategoryId } from "@/lib/raceCategories";
import { ageFromDob } from "@/lib/registrations";

type FormState = {
  name: string;
  dob: string;
  category: RaceCategoryId | "";
  phone: string;
  email: string;
  /** Honeypot — left empty by real visitors, invisible to them. */
  company: string;
};

const EMPTY_FORM: FormState = { name: "", dob: "", category: "", phone: "", email: "", company: "" };

const fieldClass =
  "mt-2 w-full rounded-xl border border-ctr-navy/15 bg-white px-4 py-3 text-sm text-ctr-navy outline-none transition focus:border-ctr-gold focus:ring-2 focus:ring-ctr-gold/20";

const labelClass = "font-display text-xs font-bold uppercase tracking-[0.18em] text-ctr-navy/50";

export function RegistrationForm({ maxDob }: { maxDob: string }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const age = useMemo(() => ageFromDob(form.dob), [form.dob]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/academy/registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => ({}) as Record<string, unknown>);

      if (!response.ok) {
        setError((data.error as string) ?? "Could not save your registration. Please try again.");
        setBusy(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <section className="section-container flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
        <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gold-gradient text-ctr-navy shadow-gold">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h1 className="display-title text-ctr-navy text-[clamp(1.8rem,4vw,2.8rem)]">You're on the grid.</h1>
        <p className="body-copy mt-4 max-w-lg text-ctr-body/80">
          Thanks, {form.name.trim()} — your registration for{" "}
          <span className="font-semibold text-ctr-navy">
            {RACE_CATEGORY_LIST.find((c) => c.id === form.category)?.name}
          </span>{" "}
          has been received. Our team will reach out at {form.phone.trim()} or {form.email.trim()} with
          next steps.
        </p>
        <Link href="/academy" className="btn-gold mt-8">
          Back to Our Story
        </Link>
      </section>
    );
  }

  return (
    <section className="section-container py-16 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <p className="kicker">2026 Season · Registration Open</p>
        <h1 className="display-title mt-2 text-ctr-navy text-[clamp(2rem,5vw,3.2rem)]">Race With CTR</h1>
        <p className="body-copy mt-4 max-w-xl">
          Pick your category and fill in your details — our team will get you on the entry list and
          reach out with the next steps.
        </p>

        <form
          onSubmit={handleSubmit}
          className="story-card mt-10 p-6 sm:p-9"
        >
          {/* Honeypot — hidden from real visitors, off the tab order. */}
          <input
            type="text"
            name="company"
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
          />

          <label className="block">
            <span className={labelClass}>Full name</span>
            <input
              type="text"
              required
              maxLength={120}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              autoComplete="name"
              className={fieldClass}
            />
          </label>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Date of birth</span>
              <input
                type="date"
                required
                max={maxDob}
                value={form.dob}
                onChange={(e) => set("dob", e.target.value)}
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Age</span>
              <div className={`${fieldClass} flex items-center bg-ctr-mist text-ctr-body/70`}>
                {age !== null ? `${age} years` : "—"}
              </div>
            </label>
          </div>

          <label className="mt-5 block">
            <span className={labelClass}>Category</span>
            <select
              required
              value={form.category}
              onChange={(e) => set("category", e.target.value as RaceCategoryId)}
              className={fieldClass}
            >
              <option value="" disabled>
                Choose a category…
              </option>
              {RACE_CATEGORY_LIST.map((category) => (
                <option key={category.id} value={category.id}>
                  {categoryLabel(category)}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Phone</span>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                autoComplete="tel"
                placeholder="+91 9XXXX XXXXX"
                className={fieldClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Email</span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                autoComplete="email"
                className={fieldClass}
              />
            </label>
          </div>

          {error ? (
            <p role="alert" className="mt-6 rounded-xl border border-red-500/30 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={busy} className="btn-gold mt-8 w-full disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? "Submitting…" : "Submit Registration"}
          </button>
        </form>
      </div>
    </section>
  );
}
