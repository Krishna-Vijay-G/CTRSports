"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { assembleChrome } from "@/lib/chrome";
import {
  blankSection,
  surfaceOf,
  typesOf,
  type Section,
} from "@/lib/sections/document";
import { SECTION_PANELS } from "@/lib/sections/panels";
import { SECTION_MODULES, isSectionType, placeableTypes } from "@/lib/sections/registry";
import type { SectionRecords } from "@/lib/sections/types";
import { PAGE_KIND_LABELS, type PageKind, type Site } from "@/lib/sites";
import type { Sport } from "@/lib/sports";
import { cn } from "@/lib/utils";
import { Badge } from "@/admin/ui/Badge";
import { Button } from "@/admin/ui/Button";
import { TrashIcon } from "@/admin/ui/icons";
import { AdminRailSlot } from "@/admin/components/AdminShell";
import { EditorToolbar } from "@/admin/components/EditorToolbar";
import { PagePreview } from "@/admin/components/previews/PagePreview";
import { SectionRail, type RailChoice, type RailItem } from "@/admin/components/SectionRail";
import { UploadFolder } from "@/admin/components/UploadFolder";

/**
 * A whole page, edited on one screen.
 *
 * One editor for every page of every site. There used to be two — `LandingEditor`
 * and `IncrcEditor` — and they were two because their pages were two hand-written
 * content types with a `switch` each. A page is an ordered list of section
 * instances now, so there is one screen, and adding a section to it is a folder
 * under src/lib/sections rather than an edit here.
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
 * ── Two things are being edited here, and they save differently ───────────
 *
 *   the sections   rows of ctr.page_sections, written whole, one Save
 *   the sport cards  a database row each, so a Save per card
 *
 * Both feed the preview from the draft, so an unsaved card shows up beside the
 * form exactly as it will on the site. This is deliberately NOT a <form>: the
 * sport rows are forms of their own, and a form inside a form is invalid HTML
 * that browsers silently unnest.
 *
 * ── The running order is the sidebar ──────────────────────────────────────
 *
 * Dragging a section there moves it on the page, the eye beside it takes it off,
 * and the `+` at the foot adds one — so the list you pick a section from and the
 * list the page is built from are one list. There is nothing to keep in step and
 * no layout screen to go and find.
 *
 * ── The same screen edits the header and footer ───────────────────────────
 *
 * `kind="chrome"` and it is the site's chrome page instead. Everything about the
 * screen falls out of that one prop rather than branching on it: the `+` offers
 * nothing because every chrome section is `fixed`, the rail draws no handles and
 * no eyes for the same reason, and the delete button is not there either. Two
 * screens for two pages of the same shape would have been two screens to keep in
 * step, which is the thing this whole phase is about.
 *
 * What DOES differ is which half of the preview is live. Editing the page, the
 * body is the draft and the chrome around it is fixed; editing the chrome, the
 * chrome is the draft and the body is what the site actually has. So the editor
 * is handed both pages and decides which is which.
 */
export function PageEditor({
  site,
  kind,
  initialSections,
  counterpart,
  records: initialRecords,
  year,
}: {
  site: Site;
  /** Which page of the site this is editing. Decides everything below. */
  kind: PageKind;
  initialSections: Section[];
  /**
   * The site's OTHER page, read-only, so the preview is a whole page either way.
   *
   * Editing the body, this is the chrome that goes around it. Editing the
   * chrome, this is the body that goes inside it — and the preview shows the
   * real home page rather than an empty card, which is the only way to judge a
   * header.
   */
  counterpart: Section[];
  /**
   * The decks, forms, circuits, articles and sport cards the sections draw.
   * Read-only apart from the cards, which have their own screen inside the
   * sports panel.
   */
  records: SectionRecords;
  year: number;
}) {
  const surface = surfaceOf(kind);
  const [draft, setDraft] = useState<Section[]>(initialSections);
  const [saved, setSaved] = useState<Section[]>(initialSections);
  const [active, setActive] = useState<string>(initialSections[0]?.id ?? "");

  // Two arrays, not one: `sports` is what is on screen and in the preview,
  // `savedSports` is the last copy the server sent back. A row is "unsaved" when
  // its two entries differ.
  const [sports, setSports] = useState<Sport[]>(initialRecords.sports);
  const [savedSports, setSavedSports] = useState<Sport[]>(initialRecords.sports);

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

  const section = draft.find((entry) => entry.id === active) ?? draft[0];
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  /** Switching sections should start at the top of the new one, not halfway down. */
  const columnRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    columnRef.current?.scrollTo({ top: 0 });
    // Leaving the banners section hands the carousel back to itself.
    if (section?.type !== "banners") setBannerIndex(undefined);
  }, [active, section?.type]);

  /**
   * The records the sections are drawn from.
   *
   * The sport cards come from local state rather than the props, so an unsaved
   * card is in the preview; the page's identity is read out of the draft, so
   * renaming it on the identity panel corrects the follow button as you type.
   */
  const records: SectionRecords = useMemo(() => {
    const meta = draft.find((entry) => entry.type === "meta");
    return {
      ...initialRecords,
      sports,
      meta: meta ? (meta.data as SectionRecords["meta"]) : initialRecords.meta,
    };
  }, [initialRecords, sports, draft]);

  function setData(id: string, data: unknown) {
    setDraft((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, data } : entry))
    );
    setJustSaved(false);
  }

  /**
   * The sidebar's list, in the order the page runs.
   *
   * Fixed sections first — the page's identity, and the header and footer — then
   * one row per placed section carrying its own on/off state, which is what
   * tells the rail it may be dragged.
   */
  const railItems: RailItem<string>[] = draft.map((entry) => {
    const module = SECTION_MODULES[entry.type];
    const { Icon } = SECTION_PANELS[entry.type];

    return {
      id: entry.id,
      short: module.label,
      title: module.label,
      hint: module.hint,
      visible: module.fixed ? undefined : entry.visible,
      Icon,
    };
  });

  /** What the `+` offers: the registry, minus what this site cannot or need not have. */
  const choices: RailChoice[] = placeableTypes(surface, site, typesOf(draft)).map((type) => ({
    type,
    label: SECTION_MODULES[type].label,
    hint: SECTION_MODULES[type].hint,
    Icon: SECTION_PANELS[type].Icon,
  }));

  /** Moves a section to the place another one currently holds. */
  function reorder(fromId: string, toId: string) {
    const from = draft.findIndex((entry) => entry.id === fromId);
    const to = draft.findIndex((entry) => entry.id === toId);
    if (from < 0 || to < 0 || from === to) return;

    const next = [...draft];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDraft(next);
    setJustSaved(false);
  }

  /**
   * On or off the page. Off is left out of the render entirely — not hidden with
   * CSS — so the section's anchor genuinely goes with it.
   */
  function toggleVisible(id: string) {
    setDraft((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, visible: !entry.visible } : entry))
    );
    setJustSaved(false);
  }

  function add(type: string) {
    if (!isSectionType(type)) return;

    const made = blankSection(type);
    setDraft((current) => [...current, made]);
    setActive(made.id);
    setJustSaved(false);
  }

  function remove(id: string) {
    const entry = draft.find((one) => one.id === id);
    if (!entry) return;

    // Typed confirmations are for records that took work to make; a section is
    // one Save away from being back. What this does warn about is the part that
    // is NOT recoverable by adding it again: its banners, posts, partners or
    // rounds go with it.
    const module = SECTION_MODULES[entry.type];
    const extra = module.promoted ? ` Its ${module.promoted} go with it.` : "";
    if (!window.confirm(`Remove the ${module.label.toLowerCase()} section?${extra}`)) return;

    const at = draft.findIndex((one) => one.id === id);
    setDraft((current) => current.filter((one) => one.id !== id));
    setActive(draft[at + 1]?.id ?? draft[at - 1]?.id ?? "");
    setJustSaved(false);
  }

  async function handleSave() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/pages?site=${encodeURIComponent(site.slug)}&page=${encodeURIComponent(kind)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sections: draft }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Could not save.");
        return;
      }

      // Take the server's copy back — it has trimmed and clamped every field,
      // and the form should show what was actually stored.
      const stored = data.sections as Section[];
      setDraft(stored);
      setSaved(stored);
      setJustSaved(true);

      // A section deleted server-side (an unknown type, say) must not leave the
      // fields pane pointing at nothing.
      if (!stored.some((entry) => entry.id === active)) setActive(stored[0]?.id ?? "");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!section) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-fg">
        This page has no sections. Reload to start again.
      </div>
    );
  }

  const module = SECTION_MODULES[section.type];
  const { Panel, Icon } = SECTION_PANELS[section.type];

  // A section that is switched off is still editable — you often turn one on
  // precisely because you have just written it — but say so, or the preview not
  // moving looks like a fault.
  const off = !module.fixed && !section.visible;

  /*
   * Which half of the preview the draft is.
   *
   * The other half is `counterpart`, which the server read and nothing here
   * changes — so a header being written is shown around the site's real page,
   * and a page being written is shown inside the site's real header.
   */
  const editingChrome = surface === "chrome";
  const previewBody = editingChrome ? counterpart : draft;
  const previewChrome = assembleChrome(editingChrome ? draft : counterpart);

  /*
   * Where the preview scrolls when a section is opened.
   *
   * A page band is found by its own instance id. A chrome section has no
   * element of its own — it is drawn inside the header or the footer — so it
   * names one of those two landmarks instead, which is what `previewAt` is for.
   */
  const focus = module.previewAt ?? (module.fixed ? undefined : section.id);

  return (
    // Everything uploaded from this screen belongs to this site. See
    // src/admin/components/UploadFolder.tsx.
    <UploadFolder folder={site.slug}>
      <div className="flex min-h-0 flex-col gap-2 md:h-full">
        <AdminRailSlot>
          <SectionRail
            items={railItems}
            active={section.id}
            onSelect={setActive}
            onReorder={reorder}
            onToggleVisible={toggleVisible}
            choices={choices}
            onAdd={add}
            heading={editingChrome ? PAGE_KIND_LABELS.chrome : "Sections"}
          />
        </AdminRailSlot>

        <EditorToolbar
          Icon={Icon}
          title={module.label}
          hint={module.hint}
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
            Hidden below lg: at that width the fields already fill the screen,
            and a preview shrunk into what is left would be unreadable rather
            than useful.
          */}
          <PagePreview
            sections={previewBody}
            chrome={previewChrome}
            records={records}
            year={year}
            focus={focus}
            bannerIndex={bannerIndex}
            className="hidden lg:block lg:min-w-0 lg:flex-1"
          />

          {/* The fields. Below lg they are the whole screen; from lg they are
              the right-hand pane, and folding them away hands the width to the
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
                  <Button variant="outline" size="xs" onClick={() => toggleVisible(section.id)}>
                    Put it back
                  </Button>
                </div>
              ) : null}

              <Panel
                key={section.id}
                value={section.data}
                onChange={(next: unknown) => setData(section.id, next)}
                ctx={{
                  records,
                  sports: {
                    items: sports,
                    saved: savedSports,
                    onItems: setSports,
                    onSaved: setSavedSports,
                  },
                  focusBanner: setBannerIndex,
                }}
              />

              {/*
                Removal is here rather than on the rail row. The rail already
                carries a handle, a label and an eye per row, and a fourth
                control on each of them would be a row of switches; here it is
                one button under the fields of the section it deletes, which is
                the one place you can see what you are removing.
              */}
              {module.fixed ? null : (
                <div className="flex justify-end pt-1">
                  <Button variant="outline" size="sm" onClick={() => remove(section.id)}>
                    <TrashIcon />
                    Remove this section
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </UploadFolder>
  );
}
