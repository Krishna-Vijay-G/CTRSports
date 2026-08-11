"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_INCRC_CONTENT, type IncrcContent } from "@/lib/incrcContent";
import type { LandingContent } from "@/lib/landingContent";
import { Badge } from "@/components/admin/ui/Badge";
import { Button } from "@/components/admin/ui/Button";
import { ErrorNote } from "@/components/admin/Fields";
import { IncrcPreview } from "@/components/admin/IncrcPreview";
import { SectionRail } from "@/components/admin/SectionRail";
import { BannersPanel } from "@/components/admin/banners/BannersPanel";
import { TABS, type TabId } from "./sections";
import { CalendarPanel } from "./panels/CalendarPanel";
import { FamilyPanel } from "./panels/FamilyPanel";
import { GridPanel } from "./panels/GridPanel";
import { IdentityPanel } from "./panels/IdentityPanel";
import { IntroPanel } from "./panels/IntroPanel";
import { LayoutPanel } from "./panels/LayoutPanel";
import { MarqueePanel } from "./panels/MarqueePanel";
import { PartnershipPanel } from "./panels/PartnershipPanel";
import { PostsPanel } from "./panels/PostsPanel";
import { RegisterPanel } from "./panels/RegisterPanel";
import { RowsPanel } from "./panels/RowsPanel";
import { StatsPanel } from "./panels/StatsPanel";
import { VenuesPanel } from "./panels/VenuesPanel";
import { VisionPanel } from "./panels/VisionPanel";

/**
 * The whole /incrc page, edited on one screen.
 *
 * Three columns: a rail of tabs, the fields for the one that is open, and a live
 * preview of the real page. Only one tab's fields are mounted at a time, which
 * is what keeps the middle column short enough to take in at a glance instead of
 * scrolling a form the length of the page.
 *
 * One document, one Save — unlike the landing editor, nothing on this page is a
 * database row of its own, so there is only ever one thing to write.
 *
 * The header and footer around the preview come from the LANDING document,
 * read-only here: they are edited at /admin/landing, and showing them makes the
 * preview the real page rather than a body with nothing around it.
 */
export function IncrcEditor({
  initialContent,
  chrome,
  year,
}: {
  initialContent: IncrcContent;
  chrome: LandingContent;
  year: number;
}) {
  const [active, setActive] = useState<TabId>(TABS[0].id);

  const [draft, setDraft] = useState<IncrcContent>(initialContent);
  const [saved, setSaved] = useState<IncrcContent>(initialContent);

  /**
   * Which banner the preview should hold on. Set while a banner is open in the
   * editor; undefined lets the carousel rotate on its own again.
   */
  const [bannerIndex, setBannerIndex] = useState<number | undefined>(undefined);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  const tab = TABS.find((entry) => entry.id === active) ?? TABS[0];
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  /** Switching tabs should start at the top of the new one, not halfway down. */
  const columnRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    columnRef.current?.scrollTo({ top: 0 });
    // Leaving the banners tab hands the carousel back to itself.
    if (active !== "banners") setBannerIndex(undefined);
  }, [active]);

  /**
   * Replaces one top-level part of the document. Every panel funnels through
   * here, so nothing has to spread the whole document by hand.
   */
  function setPart<K extends keyof IncrcContent>(key: K, value: IncrcContent[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setJustSaved(false);
  }

  async function handleSave() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/incrc", {
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
      const stored = data.content as IncrcContent;
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
    setDraft(structuredClone(DEFAULT_INCRC_CONTENT));
    setJustSaved(false);
  }

  /** One case per tab. Adding a section adds a line here and a panel file. */
  function panel() {
    switch (active) {
      case "layout":
        return (
          <LayoutPanel
            value={draft.sections}
            onChange={(v) => setPart("sections", v)}
            onOpen={setActive}
          />
        );
      case "identity":
        return <IdentityPanel value={draft.meta} onChange={(v) => setPart("meta", v)} />;
      case "banners":
        return (
          <BannersPanel
            banners={draft.banners}
            onChange={(v) => setPart("banners", v)}
            onFocus={setBannerIndex}
            newHref="#register"
          />
        );
      case "marquee":
        return <MarqueePanel value={draft.marquee} onChange={(v) => setPart("marquee", v)} />;
      case "intro":
        return <IntroPanel value={draft.intro} onChange={(v) => setPart("intro", v)} />;
      case "stats":
        return <StatsPanel value={draft.stats} onChange={(v) => setPart("stats", v)} />;
      case "vision":
        return <VisionPanel value={draft.vision} onChange={(v) => setPart("vision", v)} />;
      case "grid":
        return <GridPanel value={draft.grid} onChange={(v) => setPart("grid", v)} />;
      case "venues":
        return <VenuesPanel value={draft.venues} onChange={(v) => setPart("venues", v)} />;
      case "calendar":
        return <CalendarPanel value={draft.calendar} onChange={(v) => setPart("calendar", v)} />;
      case "partnership":
        return (
          <PartnershipPanel
            value={draft.partnership}
            onChange={(v) => setPart("partnership", v)}
          />
        );
      case "family":
        return <FamilyPanel value={draft.family} onChange={(v) => setPart("family", v)} />;
      case "rows":
        return <RowsPanel value={draft.rows} onChange={(v) => setPart("rows", v)} />;
      case "posts":
        return <PostsPanel value={draft.posts} onChange={(v) => setPart("posts", v)} />;
      case "register":
        return <RegisterPanel value={draft.register} onChange={(v) => setPart("register", v)} />;
    }
  }

  const { Icon } = tab;

  // A tab whose section is switched off is still editable — you often turn one
  // on precisely because you have just written it — but say so, or the preview
  // not moving looks like a fault.
  const off = tab.preview
    ? draft.sections.some((entry) => entry.id === tab.preview && !entry.visible)
    : false;

  return (
    <div className="flex min-h-0 flex-col gap-2 md:h-full lg:flex-row">
      <SectionRail items={TABS} active={active} onSelect={setActive} />

      <div
        ref={columnRef}
        className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card md:overflow-y-auto lg:w-[480px] lg:max-w-[480px] lg:flex-none"
      >
        {/* Sticky, so Save is reachable wherever the fields have got to. */}
        <div className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-border bg-card/95 px-4 py-2.5 backdrop-blur">
          <Icon className="size-5 shrink-0 text-muted-fg" />

          <div className="mr-auto min-w-0">
            <h1 className="truncate font-medium tracking-tight text-foreground">{tab.title}</h1>
            <p className="truncate text-[11px] text-muted-fg">{tab.hint}</p>
          </div>

          {dirty ? (
            <Badge variant="default">Unsaved</Badge>
          ) : justSaved ? (
            <span className="shrink-0 text-[11px] text-muted-fg">Saved</span>
          ) : null}

          <Button onClick={handleSave} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>

        <div className="space-y-2.5 bg-background/40 p-3">
          {error ? <ErrorNote>{error}</ErrorNote> : null}

          {off ? (
            <div className="flex items-center gap-2.5 rounded-md border border-border bg-background/60 px-3 py-2">
              <Badge variant="outline">Off</Badge>
              <span className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted-fg">
                This section is not on the page. Switch it on under Page layout.
              </span>
              <Button variant="outline" size="xs" onClick={() => setActive("layout")}>
                Layout
              </Button>
            </div>
          ) : null}

          {panel()}

          <div className="flex items-center gap-3 px-1 pt-1">
            <Button variant="ghost" size="xs" onClick={loadDefaults} disabled={busy}>
              Load defaults
            </Button>
            <p className="text-[11px] leading-relaxed text-muted-fg/70">
              Refills every section with the built-in copy. Nothing is written until you Save.
            </p>
          </div>
        </div>
      </div>

      {/*
        Hidden below lg: at that width the fields already fill the screen, and a
        preview shrunk into what is left would be unreadable rather than useful.
      */}
      <IncrcPreview
        content={draft}
        chrome={chrome}
        year={year}
        focus={tab.preview}
        bannerIndex={bannerIndex}
        className="hidden lg:block lg:min-w-0 lg:flex-1"
      />
    </div>
  );
}
