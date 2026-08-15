"use client";

import { useEffect, useRef, useState } from "react";
import type { DeckSummary } from "@/lib/decks";
import type { FormSummary } from "@/lib/forms";
import { type IncrcContent } from "@/lib/incrcContent";
import type { LandingContent } from "@/lib/landingContent";
import type { Track } from "@/lib/tracks";
import { cn } from "@/lib/utils";
import { Badge } from "@/admin/ui/Badge";
import { Button } from "@/admin/ui/Button";
import { AdminRailSlot } from "@/admin/components/AdminShell";
import { EditorToolbar } from "@/admin/components/EditorToolbar";
import { IncrcPreview } from "@/admin/components/previews/IncrcPreview";
import { SectionRail } from "@/admin/components/SectionRail";
import { UploadFolder } from "@/admin/components/UploadFolder";
import { BannersPanel } from "@/admin/components/banners/BannersPanel";
import { TABS, type TabId } from "./sections";
import { CalendarPanel } from "./panels/CalendarPanel";
import { DecksPanel } from "./panels/DecksPanel";
import { FamilyPanel } from "./panels/FamilyPanel";
import { GridPanel } from "./panels/GridPanel";
import { IntroPanel } from "./panels/IntroPanel";
import { MarqueePanel } from "./panels/MarqueePanel";
import { PartnershipPanel } from "./panels/PartnershipPanel";
import { PostsPanel } from "./panels/PostsPanel";
import { RegisterPanel } from "./panels/RegisterPanel";
import { RegistrationsPanel } from "./panels/RegistrationsPanel";
import { RowsPanel } from "./panels/RowsPanel";
import { StatsPanel } from "./panels/StatsPanel";
import { VenuesPanel } from "./panels/VenuesPanel";
import { VisionPanel } from "./panels/VisionPanel";

/**
 * The whole /incrc page, edited on one screen.
 *
 * The list of tabs goes into the sidebar (see AdminRailSlot), so this screen is a
 * toolbar over two panes: the live page in the middle, and the fields for the
 * open tab down the right. Both the sidebar and the fields fold away, and the
 * toolbar does not, which is what keeps Save reachable in every one of the four
 * states.
 *
 * Only one tab's fields are mounted at a time, which is what keeps the pane short
 * enough to take in at a glance instead of scrolling a form the length of the
 * page.
 *
 * One document, one Save — unlike the landing editor, nothing on this page is a
 * database row of its own, so there is only ever one thing to write.
 *
 * The header and footer around the preview come from the LANDING document,
 * read-only here: they are edited at /admin/landing, and showing them makes the
 * preview the real page rather than a body with nothing around it.
 *
 * The running order is the sidebar. Dragging a section there moves it on the
 * page and the eye beside it takes it off — the list you pick a tab from and the
 * list the page is built from are one list, so there is nothing to keep in step
 * and no layout screen to go and find.
 */

/** The banners are not a section of the page, so they never move. */
const FIXED: TabId[] = ["banners"];

export function IncrcEditor({
  initialContent,
  chrome,
  tracks,
  forms,
  decks,
  year,
}: {
  initialContent: IncrcContent;
  chrome: LandingContent;
  tracks: Track[];
  /**
   * The entry forms for this page, read-only here: they are built on the
   * Registrations screen. The preview draws them, the registrations panel lists
   * them, and the register band's picker points at one.
   */
  forms: FormSummary[];
  /**
   * The published decks, read-only here for the same reason: they are made on
   * the Decks screen. The preview draws their cards and the decks panel picks
   * from them.
   */
  decks: DeckSummary[];
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

  /** The right-hand pane. Folded away, the preview takes the whole width. */
  const [fieldsOpen, setFieldsOpen] = useState(true);

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

  /**
   * The sidebar's list, in the order the page runs.
   *
   * The two fixed tabs first, then one row per section of the document carrying
   * its own on/off state — which is what tells the rail it may be dragged.
   */
  const railItems = [
    ...FIXED.flatMap((id) => TABS.filter((entry) => entry.id === id)),
    ...draft.sections.flatMap((entry) => {
      const match = TABS.find((item) => item.id === entry.id);
      return match ? [{ ...match, visible: entry.visible }] : [];
    }),
  ];

  /** Moves a section to the place another one currently holds. */
  function reorderSections(fromId: TabId, toId: TabId) {
    const from = draft.sections.findIndex((entry) => entry.id === fromId);
    const to = draft.sections.findIndex((entry) => entry.id === toId);
    if (from < 0 || to < 0 || from === to) return;

    const next = [...draft.sections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setPart("sections", next);
  }

  /**
   * On or off the page. Off is left out of the render entirely — not hidden with
   * CSS — so the section's anchor genuinely goes with it.
   */
  function toggleSection(id: TabId) {
    setPart(
      "sections",
      draft.sections.map((entry) =>
        entry.id === id ? { ...entry, visible: !entry.visible } : entry
      )
    );
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

  /** One case per tab. Adding a section adds a line here and a panel file. */
  function panel() {
    switch (active) {
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
        return (
          <IntroPanel
            value={draft.intro}
            onChange={(v) => setPart("intro", v)}
            meta={draft.meta}
            onMetaChange={(v) => setPart("meta", v)}
          />
        );
      case "stats":
        return <StatsPanel value={draft.stats} onChange={(v) => setPart("stats", v)} />;
      case "vision":
        return <VisionPanel value={draft.vision} onChange={(v) => setPart("vision", v)} />;
      case "grid":
        return <GridPanel value={draft.grid} onChange={(v) => setPart("grid", v)} />;
      case "venues":
        return <VenuesPanel value={draft.venues} onChange={(v) => setPart("venues", v)} />;
      case "calendar":
        return (
          <CalendarPanel
            value={draft.calendar}
            onChange={(v) => setPart("calendar", v)}
            tracks={tracks}
          />
        );
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
        return (
          <RegisterPanel
            value={draft.register}
            onChange={(v) => setPart("register", v)}
            forms={forms}
          />
        );
      case "decks":
        return (
          <DecksPanel
            value={draft.decks}
            onChange={(v) => setPart("decks", v)}
            decks={decks}
          />
        );
      case "registrations":
        return (
          <RegistrationsPanel
            value={draft.registrations}
            onChange={(v) => setPart("registrations", v)}
            forms={forms}
          />
        );
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
    // The other half of the banner-panel argument in LandingEditor: the same
    // component, the same field, a different page — and the folder is what says
    // which. See src/admin/components/UploadFolder.tsx.
    <UploadFolder folder="incrc">
    <div className="flex min-h-0 flex-col gap-2 md:h-full">
      <AdminRailSlot>
        <SectionRail
          items={railItems}
          active={active}
          onSelect={setActive}
          onReorder={reorderSections}
          onToggleVisible={toggleSection}
        />
      </AdminRailSlot>

      <EditorToolbar
        Icon={Icon}
        title={tab.title}
        hint={tab.hint}
        dirty={dirty}
        justSaved={justSaved}
        busy={busy}
        error={error}
        onSave={handleSave}
        fieldsOpen={fieldsOpen}
        onToggleFields={() => setFieldsOpen((open) => !open)}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row">
        {/*
          Hidden below lg: at that width the fields already fill the screen, and
          a preview shrunk into what is left would be unreadable rather than
          useful.
        */}
        <IncrcPreview
          content={draft}
          chrome={chrome}
          tracks={tracks}
          forms={forms}
          decks={decks}
          year={year}
          focus={tab.preview}
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
            fieldsOpen ? "lg:w-[440px] lg:flex-none xl:w-[520px]" : "lg:hidden"
          )}
        >
          <div className="space-y-2.5 bg-background/40 p-3">
            {off ? (
              <div className="flex items-center gap-2.5 rounded-md border border-border bg-background/60 px-2.5 py-2">
                <Badge variant="outline">Off</Badge>
                <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted-fg">
                  Not on the page, which is why the preview does not move.
                </p>
                <Button variant="outline" size="xs" onClick={() => toggleSection(tab.id)}>
                  Put it back
                </Button>
              </div>
            ) : null}

            {panel()}
          </div>
        </div>
      </div>
    </div>
    </UploadFolder>
  );
}
