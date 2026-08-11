"use client";

import { useState } from "react";
import {
  DEFAULT_LANDING_CONTENT,
  MAX_NAV_LINKS,
  MAX_SOCIALS,
  SOCIAL_ICONS,
  type LandingContent,
  type SocialIconName,
} from "@/lib/landingContent";
import type { Sport } from "@/lib/sports";
import { Field, Panel, Row, TextArea } from "@/components/admin/Fields";
import { ImageField } from "@/components/admin/ImageField";
import { LandingPreview } from "@/components/admin/LandingPreview";

/**
 * Edits the whole landing-page document in one form.
 *
 * One draft, one Save. The document is small and always written as a whole, so
 * per-panel saves would only create ways for two fields to disagree.
 *
 * Laid out as a side panel of fields with a live preview of the real page
 * beside it: every keystroke re-renders the preview from the draft, so nothing
 * has to be saved to see what it looks like.
 */
export function LandingEditor({
  initialContent,
  sports,
  year,
}: {
  initialContent: LandingContent;
  sports: Sport[];
  year: number;
}) {
  const [draft, setDraft] = useState<LandingContent>(initialContent);
  const [saved, setSaved] = useState<LandingContent>(initialContent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  /**
   * Replaces one top-level section. Every field handler below funnels through
   * here, so nothing has to spread the whole document by hand.
   */
  function setSection<K extends keyof LandingContent>(key: K, value: LandingContent[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setJustSaved(false);
  }

  function setField<K extends keyof LandingContent>(
    section: K,
    field: keyof LandingContent[K],
    value: unknown
  ) {
    setSection(section, { ...draft[section], [field]: value } as LandingContent[K]);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }

      // Take the server's copy back — it has trimmed and clamped every field,
      // and the form should show what was actually stored.
      const stored = data.content as LandingContent;
      setDraft(stored);
      setSaved(stored);
      setJustSaved(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  /** Fills the form with the defaults. Nothing is written until Save. */
  function loadDefaults() {
    setDraft(structuredClone(DEFAULT_LANDING_CONTENT));
    setJustSaved(false);
  }

  return (
    <div className="flex h-full min-h-0">
      <form
        onSubmit={handleSubmit}
        className="flex min-w-0 flex-1 flex-col overflow-y-auto lg:w-[560px] lg:max-w-[560px] lg:flex-none lg:border-r lg:border-white/10"
      >
      {/* Sticky, so Save is reachable from anywhere in the form. */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-white/10 bg-carbon-950/95 px-4 py-3 backdrop-blur">
        <div className="mr-auto">
          <h1 className="text-lg font-bold text-white">Landing page</h1>
          <p className="text-[11px] text-white/35">
            Every word and picture on the page except the sport cards.
          </p>
        </div>

        {dirty ? (
          <span className="rounded-full bg-racing-yellow/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-racing-yellow">
            Unsaved
          </span>
        ) : justSaved ? (
          <span className="text-[11px] text-white/40">Saved — the site is updated.</span>
        ) : null}

        <button
          type="button"
          onClick={loadDefaults}
          disabled={busy}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/60 transition hover:text-white disabled:opacity-50"
        >
          Load defaults
        </button>

        <button
          type="submit"
          disabled={busy}
          className="btn-yellow px-5 py-2 text-[11px] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="space-y-3 p-4">
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300"
        >
          {error}
        </p>
      ) : null}

        <Panel title="Brand" hint="header, footer and splash">
          <Row>
            <Field
              label="Name"
              value={draft.brand.name}
              onChange={(v) => setField("brand", "name", v)}
            />
            <Field
              label="Subtitle"
              value={draft.brand.subtitle}
              onChange={(v) => setField("brand", "subtitle", v)}
            />
          </Row>
          <ImageField
            label="Logo"
            value={draft.brand.logo}
            onChange={(v) => setField("brand", "logo", v)}
            className="mt-3"
          />
        </Panel>

        <Panel title="Splash" hint="shown while the hero photo loads">
          <Row>
            <Field
              label="Title"
              value={draft.splash.title}
              onChange={(v) => setField("splash", "title", v)}
            />
            <ImageField
              label="Logo"
              value={draft.splash.logo}
              onChange={(v) => setField("splash", "logo", v)}
            />
          </Row>
        </Panel>

        <Panel title="Hero">
          <Row>
            <TextArea
              label="Headline"
              value={draft.hero.headline}
              onChange={(v) => setField("hero", "headline", v)}
              rows={3}
              hint="Line breaks are kept."
            />
            <div>
              <ImageField
                label="Background photo"
                value={draft.hero.background}
                onChange={(v) => setField("hero", "background", v)}
              />
              <Field
                label="Proof line"
                value={draft.hero.proof}
                onChange={(v) => setField("hero", "proof", v)}
                className="mt-3"
              />
            </div>
          </Row>
          <Row className="mt-3">
            <Field
              label="Button label"
              value={draft.hero.ctaLabel}
              onChange={(v) => setField("hero", "ctaLabel", v)}
            />
            <Field
              label="Button link"
              value={draft.hero.ctaHref}
              onChange={(v) => setField("hero", "ctaHref", v)}
              placeholder="#sports"
            />
          </Row>
        </Panel>

        <Panel title="Hero card" hint="floats over the right of the hero">
          <Row>
            <Field
              label="Title"
              value={draft.hero.cardTitle}
              onChange={(v) => setField("hero", "cardTitle", v)}
            />
            <Field
              label="Subtitle"
              value={draft.hero.cardSubtitle}
              onChange={(v) => setField("hero", "cardSubtitle", v)}
            />
          </Row>
          <Row className="mt-3">
            <Field
              label="Button label"
              value={draft.hero.cardCtaLabel}
              onChange={(v) => setField("hero", "cardCtaLabel", v)}
            />
            <Field
              label="Button link"
              value={draft.hero.cardCtaHref}
              onChange={(v) => setField("hero", "cardCtaHref", v)}
            />
          </Row>
        </Panel>

        <Panel title="Navigation">
          <NavLinksEditor
            links={draft.nav.links}
            onChange={(links) => setSection("nav", { ...draft.nav, links })}
          />
          <Row className="mt-3">
            <Field
              label="Button label"
              value={draft.nav.cta.label}
              onChange={(v) => setSection("nav", { ...draft.nav, cta: { ...draft.nav.cta, label: v } })}
            />
            <Field
              label="Button link"
              value={draft.nav.cta.href}
              onChange={(v) => setSection("nav", { ...draft.nav, cta: { ...draft.nav.cta, href: v } })}
            />
          </Row>
        </Panel>

        <Panel title="About">
          <Row>
            <Field
              label="Chip label"
              value={draft.about.label}
              onChange={(v) => setField("about", "label", v)}
            />
            <Field
              label="Section title"
              value={draft.about.title}
              onChange={(v) => setField("about", "title", v)}
            />
          </Row>
          <Row className="mt-3">
            <div>
              <Field
                label="Heading"
                value={draft.about.heading}
                onChange={(v) => setField("about", "heading", v)}
              />
              <Row className="mt-3">
                <Field
                  label="Button label"
                  value={draft.about.ctaLabel}
                  onChange={(v) => setField("about", "ctaLabel", v)}
                />
                <Field
                  label="Button link"
                  value={draft.about.ctaHref}
                  onChange={(v) => setField("about", "ctaHref", v)}
                />
              </Row>
            </div>
            <TextArea
              label="Body"
              value={draft.about.body}
              onChange={(v) => setField("about", "body", v)}
              rows={6}
              hint="Leave a blank line between paragraphs."
            />
          </Row>
          <Row className="mt-3">
            {draft.about.photos.map((photo, index) => (
              <div key={index} className="rounded-lg border border-white/5 p-2.5">
                <ImageField
                  label={`Photo ${index + 1}`}
                  value={photo.src}
                  onChange={(src) => {
                    const photos = draft.about.photos.map((entry, i) =>
                      i === index ? { ...entry, src } : entry
                    );
                    setField("about", "photos", photos);
                  }}
                />
                <Field
                  label="Caption chip"
                  value={photo.label}
                  onChange={(label) => {
                    const photos = draft.about.photos.map((entry, i) =>
                      i === index ? { ...entry, label } : entry
                    );
                    setField("about", "photos", photos);
                  }}
                  className="mt-2"
                />
              </div>
            ))}
          </Row>
        </Panel>

        <Panel title="Sports section" hint="the heading above the cards">
          <Field
            label="Chip label"
            value={draft.sportsSection.label}
            onChange={(v) => setField("sportsSection", "label", v)}
          />
          <Field
            label="Title"
            value={draft.sportsSection.title}
            onChange={(v) => setField("sportsSection", "title", v)}
            className="mt-3"
          />
        </Panel>

        <Panel title="Call-to-action band" hint="the yellow strip before the footer">
          <Row>
            <Field
              label="Chip label"
              value={draft.ctaBand.label}
              onChange={(v) => setField("ctaBand", "label", v)}
            />
            <Field
              label="Title"
              value={draft.ctaBand.title}
              onChange={(v) => setField("ctaBand", "title", v)}
            />
          </Row>
          <TextArea
            label="Body"
            value={draft.ctaBand.body}
            onChange={(v) => setField("ctaBand", "body", v)}
            rows={2}
            className="mt-3"
          />
          <Row className="mt-3">
            <Field
              label="Button label"
              value={draft.ctaBand.ctaLabel}
              onChange={(v) => setField("ctaBand", "ctaLabel", v)}
            />
            <Field
              label="Button link"
              value={draft.ctaBand.ctaHref}
              onChange={(v) => setField("ctaBand", "ctaHref", v)}
            />
          </Row>
        </Panel>

        <Panel title="Socials" hint="footer icons">
          <SocialsEditor
            socials={draft.socials}
            onChange={(socials) => setSection("socials", socials)}
          />
        </Panel>
        </div>
      </form>

      {/*
        Hidden below lg: at that width the panel already fills the screen, and a
        preview shrunk to what is left would be unreadable rather than useful.
      */}
      <div className="hidden min-w-0 flex-1 overflow-y-auto bg-black lg:block">
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/10 bg-carbon-950/95 px-4 py-2 backdrop-blur">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
            Live preview
          </span>
          <span className="text-[10px] text-white/25">updates as you type · not yet saved</span>
        </div>
        <LandingPreview content={draft} sports={sports} year={year} />
      </div>
    </div>
  );
}

/* ─────────────────────────── Repeating lists ─────────────────────────── */

const listButton =
  "rounded-lg border border-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40";

function NavLinksEditor({
  links,
  onChange,
}: {
  links: LandingContent["nav"]["links"];
  onChange: (links: LandingContent["nav"]["links"]) => void;
}) {
  return (
    <div>
      <span className="admin-label">Links</span>
      <div className="mt-1.5 space-y-1.5">
        {links.map((link, index) => (
          <div key={index} className="flex gap-1.5">
            <input
              type="text"
              value={link.label}
              onChange={(e) =>
                onChange(links.map((l, i) => (i === index ? { ...l, label: e.target.value } : l)))
              }
              placeholder="Label"
              className="admin-field w-28 shrink-0 py-1.5 text-xs"
            />
            <input
              type="text"
              value={link.href}
              onChange={(e) =>
                onChange(links.map((l, i) => (i === index ? { ...l, href: e.target.value } : l)))
              }
              placeholder="#anchor"
              className="admin-field min-w-0 flex-1 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={() => onChange(links.filter((_, i) => i !== index))}
              aria-label={`Remove ${link.label || "link"}`}
              className={`${listButton} shrink-0 text-white/45 hover:border-red-400/60 hover:text-red-300`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange([...links, { label: "", href: "#" }])}
        disabled={links.length >= MAX_NAV_LINKS}
        className={`${listButton} mt-2 text-white/60 hover:border-racing-yellow/60 hover:text-racing-yellow`}
      >
        + Add link
      </button>
    </div>
  );
}

function SocialsEditor({
  socials,
  onChange,
}: {
  socials: LandingContent["socials"];
  onChange: (socials: LandingContent["socials"]) => void;
}) {
  return (
    <div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {socials.map((social, index) => (
          <div key={index} className="flex gap-1.5">
            <select
              value={social.icon}
              onChange={(e) =>
                onChange(
                  socials.map((s, i) =>
                    i === index ? { ...s, icon: e.target.value as SocialIconName } : s
                  )
                )
              }
              aria-label="Icon"
              className="admin-field w-24 shrink-0 py-1.5 text-xs"
            >
              {SOCIAL_ICONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={social.label}
              onChange={(e) =>
                onChange(socials.map((s, i) => (i === index ? { ...s, label: e.target.value } : s)))
              }
              placeholder="Label"
              className="admin-field w-24 shrink-0 py-1.5 text-xs"
            />
            <input
              type="text"
              value={social.href}
              onChange={(e) =>
                onChange(socials.map((s, i) => (i === index ? { ...s, href: e.target.value } : s)))
              }
              placeholder="https://…"
              className="admin-field min-w-0 flex-1 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={() => onChange(socials.filter((_, i) => i !== index))}
              aria-label={`Remove ${social.label || "social link"}`}
              className={`${listButton} shrink-0 text-white/45 hover:border-red-400/60 hover:text-red-300`}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange([...socials, { label: "", href: "https://", icon: "website" }])}
        disabled={socials.length >= MAX_SOCIALS}
        className={`${listButton} mt-2 text-white/60 hover:border-racing-yellow/60 hover:text-racing-yellow`}
      >
        + Add social
      </button>
    </div>
  );
}
