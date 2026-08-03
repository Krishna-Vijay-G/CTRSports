"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_LANDING_CONTENT,
  SOCIAL_ICONS,
  type LandingContent,
  type SocialIconName,
  type SocialLink,
  type Sport,
} from "@/data/landingContent";
import { MAX_SOCIALS, MAX_SPORTS } from "@/lib/normaliseContent";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { cn } from "@/lib/utils";

const fieldClass =
  "mt-2 w-full rounded-xl border border-white/10 bg-carbon-900 px-4 py-2.5 text-sm text-white outline-none transition focus:border-racing-yellow/60";

const labelClass = "font-display text-[11px] font-bold uppercase tracking-[0.18em] text-white/40";

/* ─────────────────────────── field primitives ─────────────────────────── */

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  maxLength = 200,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={fieldClass}
      />
      {hint ? <span className="mt-1 block text-[11px] text-white/30">{hint}</span> : null}
    </label>
  );
}

function TextArea({
  label,
  hint,
  value,
  onChange,
  rows = 3,
  maxLength = 2000,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        maxLength={maxLength}
        className={cn(fieldClass, "resize-y")}
      />
      <span className="mt-1 flex justify-between gap-3 text-[11px] text-white/30">
        <span>{hint}</span>
        <span>
          {value.length}/{maxLength}
        </span>
      </span>
    </label>
  );
}

/** Path or URL, with a thumbnail so a typo is obvious before saving. */
function ImageField({
  label,
  value,
  onChange,
  hint = "A path like /media/logo.png, or a full https:// URL.",
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div className="mt-2 flex items-center gap-3">
        <span className="flex h-14 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/40 p-1">
          {value ? (
            <img src={value} alt="" aria-hidden className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[9px] uppercase tracking-wider text-white/25">None</span>
          )}
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/media/ctr-logo.png"
          className="w-full rounded-xl border border-white/10 bg-carbon-900 px-4 py-2.5 text-sm text-white outline-none transition focus:border-racing-yellow/60"
        />
      </div>
      <span className="mt-1 block text-[11px] text-white/30">{hint}</span>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="font-display text-base font-bold uppercase tracking-wide text-white">
        {title}
      </h2>
      {description ? <p className="mt-1 text-xs text-white/40">{description}</p> : null}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

function RowButton({
  children,
  onClick,
  disabled,
  danger,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-35",
        danger
          ? "border-white/15 text-white/70 hover:border-red-400/60 hover:text-red-300"
          : "border-white/15 text-white/70 hover:border-racing-yellow/60 hover:text-racing-yellow"
      )}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────── the editor ─────────────────────────── */

function emptySport(index: number): Sport {
  return {
    id: `sport-${index + 1}`,
    name: "",
    team_name: "",
    description: "",
    website_url: "#",
    logo_image: DEFAULT_LANDING_CONTENT.brand.logo_image,
    visit_label: "Visit",
  };
}

const EMPTY_SOCIAL: SocialLink = { label: "", href: "", icon: "website" };

export function ContentEditor({
  initialContent,
  username,
}: {
  initialContent: LandingContent;
  username: string;
}) {
  const router = useRouter();

  const [content, setContent] = useState<LandingContent>(initialContent);
  const [saved, setSaved] = useState<LandingContent>(initialContent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const dirty = useMemo(
    () => JSON.stringify(content) !== JSON.stringify(saved),
    [content, saved]
  );

  /** Patches one group (splash, brand, hero, sports_section) in place. */
  function patch<K extends keyof LandingContent>(
    group: K,
    values: Partial<LandingContent[K]>
  ) {
    setContent((prev) => ({ ...prev, [group]: { ...prev[group], ...values } }));
  }

  function patchSport(index: number, values: Partial<Sport>) {
    setContent((prev) => ({
      ...prev,
      sports: prev.sports.map((sport, i) => (i === index ? { ...sport, ...values } : sport)),
    }));
  }

  function moveSport(index: number, delta: number) {
    setContent((prev) => {
      const next = [...prev.sports];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, sports: next };
    });
  }

  function patchSocial(index: number, values: Partial<SocialLink>) {
    setContent((prev) => ({
      ...prev,
      socials: prev.socials.map((social, i) => (i === index ? { ...social, ...values } : social)),
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not save the page content.");
        return;
      }

      // The server hands back the normalised document — clamped numbers and
      // rejected URLs show up in the form rather than silently differing.
      const stored = data.content as LandingContent;
      setContent(stored);
      setSaved(stored);
      setNotice("Saved. The landing page is updated.");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleReset() {
    if (!window.confirm("Discard your unsaved changes?")) return;
    setContent(saved);
    setError(null);
    setNotice(null);
  }

  function handleRestoreDefaults() {
    if (
      !window.confirm(
        "Replace everything in this form with the built-in defaults? Nothing is saved until you press Save changes."
      )
    ) {
      return;
    }
    setContent(DEFAULT_LANDING_CONTENT);
    setNotice(null);
  }

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 sm:px-6">
      <AdminHeader username={username} active="content" title="Site Content" />

      <p className="mt-5 text-sm leading-relaxed text-white/45">
        Everything on the landing page except the posts. Changes go live as soon as you save —
        the page rebuilds immediately rather than waiting for the next revalidation.
      </p>

      {notice ? (
        <p className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {notice}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <Section
          title="Splash"
          description="The logo screen shown for a moment before the page appears."
        >
          <Field
            label="Title"
            value={content.splash.title}
            onChange={(title) => patch("splash", { title })}
          />
          <Field
            label="Screen-reader label"
            hint="Announced while the splash is on screen."
            value={content.splash.aria_label}
            onChange={(aria_label) => patch("splash", { aria_label })}
          />
          <ImageField
            label="Logo"
            value={content.splash.logo_image}
            onChange={(logo_image) => patch("splash", { logo_image })}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className={labelClass}>Fade starts after (ms)</span>
              <input
                type="number"
                min={0}
                max={10000}
                value={content.splash.fade_in_ms}
                onChange={(e) => patch("splash", { fade_in_ms: Number(e.target.value) })}
                className={cn(fieldClass, "[color-scheme:dark]")}
              />
            </label>
            <label className="block">
              <span className={labelClass}>Removed after (ms)</span>
              <input
                type="number"
                min={0}
                max={12000}
                value={content.splash.hide_ms}
                onChange={(e) => patch("splash", { hide_ms: Number(e.target.value) })}
                className={cn(fieldClass, "[color-scheme:dark]")}
              />
            </label>
          </div>
          {content.splash.hide_ms < content.splash.fade_in_ms ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300">
              The splash is removed before it starts fading, so it will disappear abruptly.
            </p>
          ) : null}
        </Section>

        <Section title="Brand" description="The logo and wordmark in the header and footer.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Name"
              value={content.brand.name}
              onChange={(name) => patch("brand", { name })}
            />
            <Field
              label="Subtitle"
              value={content.brand.subtitle}
              onChange={(subtitle) => patch("brand", { subtitle })}
            />
          </div>
          <ImageField
            label="Logo"
            value={content.brand.logo_image}
            onChange={(logo_image) => patch("brand", { logo_image })}
          />
          <Field
            label="Home link label"
            hint="Screen-reader text for the logo link back to the top."
            value={content.brand.home_aria_label}
            onChange={(home_aria_label) => patch("brand", { home_aria_label })}
          />
        </Section>

        <Section title="Hero" description="The full-height opening section.">
          <Field
            label="Kicker"
            value={content.hero.kicker}
            onChange={(kicker) => patch("hero", { kicker })}
          />
          <Field
            label="Title"
            value={content.hero.title}
            onChange={(title) => patch("hero", { title })}
          />
          <TextArea
            label="Subtitle"
            hint="Line breaks are preserved."
            rows={2}
            value={content.hero.subtitle}
            onChange={(subtitle) => patch("hero", { subtitle })}
          />
          <Field
            label="About panel title"
            value={content.hero.about_title}
            onChange={(about_title) => patch("hero", { about_title })}
          />
          <TextArea
            label="About panel body"
            rows={5}
            value={content.hero.about_body}
            onChange={(about_body) => patch("hero", { about_body })}
          />
          <Field
            label="Button label"
            hint="Scrolls down to the sports section."
            maxLength={40}
            value={content.hero.cta_label}
            onChange={(cta_label) => patch("hero", { cta_label })}
          />
          <ImageField
            label="Background image"
            value={content.hero.background_image}
            onChange={(background_image) => patch("hero", { background_image })}
          />
        </Section>

        <Section title="Sports section heading">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Kicker"
              value={content.sports_section.kicker}
              onChange={(kicker) => patch("sports_section", { kicker })}
            />
            <Field
              label="Title"
              value={content.sports_section.title}
              onChange={(title) => patch("sports_section", { title })}
            />
          </div>
        </Section>

        {/* ─── Sport cards ─── */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold uppercase tracking-wide text-white">
                Sport cards
              </h2>
              <p className="mt-1 text-xs text-white/40">
                The alternating rows down the landing page. Order here is the order on the page.
              </p>
            </div>
            <span className="text-xs text-white/40">
              {content.sports.length} / {MAX_SPORTS}
            </span>
          </div>

          {content.sports.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-dashed border-white/15 px-6 py-10 text-center text-sm text-white/40">
              No sport cards. The whole section is hidden on the landing page.
            </p>
          ) : (
            <ul className="mt-5 space-y-4">
              {content.sports.map((sport, index) => (
                <li key={sport.id} className="rounded-2xl border border-white/10 bg-carbon-900/40 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-display text-xs font-bold uppercase tracking-[0.18em] text-racing-yellow">
                      {String(index + 1).padStart(2, "0")} · {sport.name || "Untitled"}
                    </span>
                    <div className="flex gap-2">
                      <RowButton
                        onClick={() => moveSport(index, -1)}
                        disabled={index === 0}
                        title="Move up"
                      >
                        ↑
                      </RowButton>
                      <RowButton
                        onClick={() => moveSport(index, 1)}
                        disabled={index === content.sports.length - 1}
                        title="Move down"
                      >
                        ↓
                      </RowButton>
                      <RowButton
                        danger
                        onClick={() =>
                          setContent((prev) => ({
                            ...prev,
                            sports: prev.sports.filter((_, i) => i !== index),
                          }))
                        }
                      >
                        Remove
                      </RowButton>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Name"
                      value={sport.name}
                      onChange={(name) => patchSport(index, { name })}
                    />
                    <Field
                      label="Team name"
                      value={sport.team_name}
                      onChange={(team_name) => patchSport(index, { team_name })}
                    />
                  </div>

                  <div className="mt-4">
                    <TextArea
                      label="Description"
                      rows={2}
                      value={sport.description}
                      onChange={(description) => patchSport(index, { description })}
                    />
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Link"
                      hint="A path like /volleyball/post, a full https:// URL, or # for none."
                      value={sport.website_url}
                      onChange={(website_url) => patchSport(index, { website_url })}
                    />
                    <Field
                      label="Link label"
                      maxLength={40}
                      value={sport.visit_label}
                      onChange={(visit_label) => patchSport(index, { visit_label })}
                    />
                  </div>

                  <div className="mt-4">
                    <ImageField
                      label="Logo"
                      value={sport.logo_image}
                      onChange={(logo_image) => patchSport(index, { logo_image })}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5">
            <RowButton
              onClick={() =>
                setContent((prev) => ({
                  ...prev,
                  sports: [...prev.sports, emptySport(prev.sports.length)],
                }))
              }
              disabled={content.sports.length >= MAX_SPORTS}
            >
              + Add sport card
            </RowButton>
          </div>
        </section>

        {/* ─── Socials ─── */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold uppercase tracking-wide text-white">
                Footer links
              </h2>
              <p className="mt-1 text-xs text-white/40">
                A link with no full https:// address is dropped on save.
              </p>
            </div>
            <span className="text-xs text-white/40">
              {content.socials.length} / {MAX_SOCIALS}
            </span>
          </div>

          <ul className="mt-5 space-y-3">
            {content.socials.map((social, index) => (
              <li
                key={index}
                className="grid gap-3 rounded-2xl border border-white/10 bg-carbon-900/40 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto_auto] sm:items-end"
              >
                <Field
                  label="Label"
                  maxLength={40}
                  value={social.label}
                  onChange={(label) => patchSocial(index, { label })}
                />
                <Field
                  label="URL"
                  value={social.href}
                  onChange={(href) => patchSocial(index, { href })}
                />
                <label className="block">
                  <span className={labelClass}>Icon</span>
                  <select
                    value={social.icon}
                    onChange={(e) =>
                      patchSocial(index, { icon: e.target.value as SocialIconName })
                    }
                    className={cn(fieldClass, "[color-scheme:dark]")}
                  >
                    {SOCIAL_ICONS.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="pb-1">
                  <RowButton
                    danger
                    onClick={() =>
                      setContent((prev) => ({
                        ...prev,
                        socials: prev.socials.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    Remove
                  </RowButton>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-5">
            <RowButton
              onClick={() =>
                setContent((prev) => ({ ...prev, socials: [...prev.socials, EMPTY_SOCIAL] }))
              }
              disabled={content.socials.length >= MAX_SOCIALS}
            >
              + Add footer link
            </RowButton>
          </div>
        </section>

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </p>
        ) : null}

        {/* Sticky so Save is reachable without scrolling back up a long form. */}
        <div className="sticky bottom-0 -mx-5 flex flex-wrap items-center gap-3 border-t border-white/10 bg-carbon-950/90 px-5 py-4 backdrop-blur-md sm:-mx-6 sm:px-6">
          <button
            type="submit"
            disabled={busy || !dirty}
            className="rounded-full bg-racing-yellow px-7 py-3 font-display text-sm font-bold uppercase tracking-wider text-carbon-950 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-10px_rgba(247,214,25,0.55)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          >
            {busy ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
          <RowButton onClick={handleReset} disabled={busy || !dirty}>
            Discard changes
          </RowButton>
          <RowButton onClick={handleRestoreDefaults} disabled={busy}>
            Load defaults
          </RowButton>
          {dirty ? (
            <span className="text-xs text-white/40">Unsaved changes</span>
          ) : null}
        </div>
      </form>
    </div>
  );
}
