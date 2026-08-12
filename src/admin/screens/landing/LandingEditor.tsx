"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_LANDING_CONTENT, type LandingContent } from "@/lib/landingContent";
import type { Sport } from "@/lib/sports";
import { cn } from "@/lib/utils";
import { AdminRailSlot } from "@/admin/components/AdminShell";
import { EditorToolbar } from "@/admin/components/EditorToolbar";
import { LandingPreview } from "@/admin/components/previews/LandingPreview";
import { SectionRail } from "@/admin/components/SectionRail";
import { BannersPanel } from "@/admin/components/banners/BannersPanel";
import { SECTIONS, type SectionId } from "./sections";
import { AboutPanel } from "./panels/AboutPanel";
import { BrandPanel } from "./panels/BrandPanel";
import { CtaPanel } from "./panels/CtaPanel";
import { FooterPanel } from "./panels/FooterPanel";
import { NavPanel } from "./panels/NavPanel";
import { SplashPanel } from "./panels/SplashPanel";
import { SportsPanel } from "./panels/SportsPanel";

/**
 * The whole landing page, edited on one screen.
 *
 * The list of sections goes into the sidebar (see AdminRailSlot), so this screen
 * is a toolbar over two panes: the live page in the middle, and the fields for
 * the open section down the right. Both the sidebar and the fields fold away,
 * and the toolbar does not, which is what keeps Save reachable in every one of
 * the four states.
 *
 * Only one section's fields are mounted at a time, which is what keeps the pane
 * short enough to take in at a glance instead of scrolling a form the length of
 * the page.
 *
 * Two things are being edited here and they save differently, on purpose:
 *
 *   the page document — one JSONB row, always written whole, one Save
 *   the sport cards   — a database row each, so a Save per card
 *
 * Both feed the preview from the draft, so an unsaved card shows up beside the
 * form exactly as it will on the site.
 *
 * This is deliberately NOT a <form>: the sport rows are forms of their own, and
 * a form inside a form is invalid HTML that browsers silently unnest.
 */

export function LandingEditor({
  initialContent,
  initialSports,
  year,
}: {
  initialContent: LandingContent;
  initialSports: Sport[];
  year: number;
}) {
  const [active, setActive] = useState<SectionId>(SECTIONS[0].id);

  const [draft, setDraft] = useState<LandingContent>(initialContent);
  const [saved, setSaved] = useState<LandingContent>(initialContent);

  // Two arrays, not one: `sports` is what is on screen and in the preview,
  // `savedSports` is the last copy the server sent back. A row is "unsaved"
  // when its two entries differ.
  const [sports, setSports] = useState<Sport[]>(initialSports);
  const [savedSports, setSavedSports] = useState<Sport[]>(initialSports);

  /**
   * Which banner the preview should hold on. Set while a banner is open in the
   * editor; undefined lets the carousel rotate on its own again.
   */
  const [bannerIndex, setBannerIndex] = useState<number | undefined>(undefined);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  /** The right-hand pane. Folded away, the preview takes the whole width. */
  const [fieldsOpen, setFieldsOpen] = useState(true);

  const section = SECTIONS.find((entry) => entry.id === active) ?? SECTIONS[0];
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  /** Switching sections should start at the top of the new one, not halfway down. */
  const columnRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    columnRef.current?.scrollTo({ top: 0 });
    // Leaving the banners section hands the carousel back to itself.
    if (active !== "banners") setBannerIndex(undefined);
  }, [active]);

  /**
   * Replaces one top-level part of the document. Every panel funnels through
   * here, so nothing has to spread the whole document by hand.
   */
  function setPart<K extends keyof LandingContent>(key: K, value: LandingContent[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setJustSaved(false);
  }

  async function handleSave() {
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

  /** One case per section. Adding a section adds a line here and a panel file. */
  function panel() {
    switch (active) {
      case "brand":
        return <BrandPanel value={draft.brand} onChange={(v) => setPart("brand", v)} />;
      case "splash":
        return <SplashPanel value={draft.splash} onChange={(v) => setPart("splash", v)} />;
      case "nav":
        return <NavPanel value={draft.nav} onChange={(v) => setPart("nav", v)} />;
      case "banners":
        return (
          <BannersPanel
            banners={draft.banners}
            onChange={(v) => setPart("banners", v)}
            onFocus={setBannerIndex}
            newHref="#sports"
          />
        );
      case "about":
        return <AboutPanel value={draft.about} onChange={(v) => setPart("about", v)} />;
      case "sports":
        return (
          <SportsPanel
            heading={draft.sportsSection}
            onHeadingChange={(v) => setPart("sportsSection", v)}
            sports={sports}
            savedSports={savedSports}
            onSportsChange={setSports}
            onSavedSportsChange={setSavedSports}
          />
        );
      case "cta":
        return <CtaPanel value={draft.ctaBand} onChange={(v) => setPart("ctaBand", v)} />;
      case "footer":
        return <FooterPanel value={draft.socials} onChange={(v) => setPart("socials", v)} />;
    }
  }

  const { Icon } = section;

  return (
    <div className="flex min-h-0 flex-col gap-2 md:h-full">
      <AdminRailSlot>
        <SectionRail items={SECTIONS} active={active} onSelect={setActive} />
      </AdminRailSlot>

      <EditorToolbar
        Icon={Icon}
        title={section.title}
        hint={section.hint}
        dirty={dirty}
        justSaved={justSaved}
        busy={busy}
        error={error}
        onSave={handleSave}
        onLoadDefaults={loadDefaults}
        fieldsOpen={fieldsOpen}
        onToggleFields={() => setFieldsOpen((open) => !open)}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row">
        {/*
          Hidden below lg: at that width the fields already fill the screen, and
          a preview shrunk into what is left would be unreadable rather than
          useful.
        */}
        <LandingPreview
          content={draft}
          sports={sports}
          year={year}
          focus={section.preview}
          bannerIndex={bannerIndex}
          className="hidden lg:block lg:min-w-0 lg:flex-1"
        />

        {/* The fields. Below lg they are the whole screen; from lg they are the
            right-hand pane, and folding them away hands the width to the
            preview. */}
        <div
          ref={columnRef}
          className={cn(
            "min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-card md:overflow-y-auto",
            fieldsOpen
              ? "lg:w-[440px] lg:flex-none xl:w-[520px]"
              : "lg:hidden"
          )}
        >
          <div className="bg-background/40 p-3">{panel()}</div>
        </div>
      </div>
    </div>
  );
}
