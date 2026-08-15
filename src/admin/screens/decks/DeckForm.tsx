"use client";

import { useRef, useState } from "react";
import {
  DECK_LIMITS,
  DECK_STATUSES,
  DECK_STATUS_LABELS,
  MAX_DECK_PAGES,
  blankDeckPage,
  type Deck,
  type DeckPage,
} from "@/lib/decks";
import { DOCUMENT_EDGE, toWebp } from "@/lib/client/toWebp";
import { slugify, type SlugHolder } from "@/lib/slug";
import { Button } from "@/admin/ui/Button";
import { Label, Select } from "@/admin/ui/Input";
import { CheckIcon, ExternalIcon, TrashIcon, UploadIcon } from "@/admin/ui/icons";
import { ErrorNote, Field, Hint, Note, Panel, TextArea } from "@/admin/components/Fields";
import { FormerSlugs } from "@/admin/components/FormerSlugs";
import { ImageField } from "@/admin/components/ImageField";
import { Repeater } from "@/admin/components/Repeater";
import { SlugField } from "@/admin/components/SlugField";
import { useUploadFolder } from "@/admin/components/UploadFolder";

/**
 * One deck's record: what it is called, where it lives, and its pages in order.
 *
 * The pages are the screen. Everything above them is four fields, because a
 * deck has almost nothing to say about itself — it IS the images, and the
 * preview beside this is where the actual work is checked.
 */
export function DeckForm({
  deck,
  siteUrl,
  onChange,
  onDelete,
  onReleasedSlug,
  busy,
}: {
  deck: Deck;
  /** The public origin — the admin is on a different host. See DecksEditor. */
  siteUrl: string;
  onChange: (next: Deck) => void;
  onDelete: () => void;
  /** An address taken from another deck's history — see DecksEditor. */
  onReleasedSlug?: (holder: SlugHolder, slug: string) => void;
  busy?: boolean;
}) {
  const set = (patch: Partial<Deck>) => onChange({ ...deck, ...patch });

  return (
    <>
      <Panel title="Deck">
        <div className="space-y-3">
          <Field
            label="Name"
            value={deck.name}
            onChange={(name) => set({ name })}
            maxLength={DECK_LIMITS.name}
            placeholder="2026 entry pack"
          />

          {/* The suggestion is offered as a button and never applied on its own.
              The address outlives the name — it goes on a poster — so renaming a
              deck must not move it. */}
          <SlugField
            kind="deck"
            value={deck.slug}
            onChange={(slug) => set({ slug })}
            exceptId={deck.id}
            suggestion={slugify(deck.name)}
            onReleased={onReleasedSlug}
            disabled={busy}
          />

          <FormerSlugs
            kind="deck"
            slugs={deck.former_slugs}
            onChange={(former_slugs) => set({ former_slugs })}
            disabled={busy}
          />

          <Hint>
            Changing the address keeps the old one working — it moves into the list above and
            starts redirecting here.
          </Hint>

          <label className="block">
            <Label>Status</Label>
            <Select
              value={deck.status}
              onChange={(event) => set({ status: event.target.value as Deck["status"] })}
              className="mt-1.5 w-full"
            >
              {DECK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {DECK_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
            <Hint className="mt-1">
              A draft is not on the internet at all — its address answers &ldquo;not
              found&rdquo;, and it is not offered to any page that links to decks.
            </Hint>
          </label>

          <TextArea
            label="Blurb"
            value={deck.blurb}
            onChange={(blurb) => set({ blurb })}
            rows={2}
            maxLength={DECK_LIMITS.blurb}
            hint="One line under the heading, and what a card linking here says. Blank hides it."
          />

          <div className="flex items-center gap-2.5 rounded-md border border-border bg-background/60 p-3">
            <Button
              variant={deck.show_heading ? "default" : "outline"}
              size="sm"
              onClick={() => set({ show_heading: !deck.show_heading })}
              aria-pressed={deck.show_heading}
            >
              {deck.show_heading ? <CheckIcon /> : null}
              Print the name above the pages
            </Button>
            <span className="text-[11px] leading-relaxed text-muted-fg">
              Off for a deck whose first page is already a cover — otherwise the title is said
              twice. The name is still on the browser tab and read out to screen readers.
            </span>
          </div>

          {deck.status === "published" && deck.slug ? (
            <a
              href={`${siteUrl}/deck/${deck.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] text-muted-fg transition hover:text-foreground"
            >
              <ExternalIcon className="size-3.5" />
              Open /deck/{deck.slug} on the site
            </a>
          ) : null}
        </div>
      </Panel>

      <AddPages
        count={deck.pages.length}
        onAdd={(added) =>
          set({ pages: [...deck.pages, ...added].slice(0, MAX_DECK_PAGES) })
        }
        busy={busy}
      />

      <Repeater<DeckPage>
        title="Pages"
        addLabel="Add a page"
        items={deck.pages}
        max={MAX_DECK_PAGES}
        onChange={(pages) => set({ pages })}
        blank={blankDeckPage}
        expand="accordion"
        summary={(page, index) => ({
          title: `Page ${index + 1}`,
          hint: page.alt || fileName(page.url) || "No picture yet",
          image: page.url || undefined,
        })}
        empty="No pages yet. Upload them above, or add one at a time to paste addresses."
        note={
          <>
            They appear on the page in this order, one below another. Drag a row by its handle to
            move it — or focus the handle and use the arrow keys. A row with no picture on it is
            dropped when you save.
          </>
        }
      >
        {(page, index, patch) => (
          <div className="space-y-3">
            <ImageField
              label={`Page ${index + 1}`}
              value={page.url}
              onChange={(url) => patch({ url })}
              maxEdge={DOCUMENT_EDGE}
              hint="Upload, choose one already stored, or paste an address."
            />
            <Field
              label="Describe it"
              value={page.alt}
              onChange={(alt) => patch({ alt })}
              maxLength={DECK_LIMITS.alt}
              placeholder={`Page ${index + 1}`}
              hint="Read out to anyone who cannot see the image. Blank falls back to the deck's name and the page number."
            />
          </div>
        )}
      </Repeater>

      <Panel title="Danger">
        <Button variant="outline" size="sm" onClick={onDelete} disabled={busy}>
          <TrashIcon />
          Delete this deck
        </Button>
        <Note className="mt-2">
          The pictures stay in the media library — they are shared with the rest of the site, so
          another page may be using one.
        </Note>
      </Panel>
    </>
  );
}

/** The tail of a URL, for the one-line summary of a page. */
function fileName(url: string): string {
  const tail = url.split("?")[0].split("/").pop() ?? "";
  return tail.length > 28 ? `…${tail.slice(-27)}` : tail;
}

/**
 * Many pages at once.
 *
 * A fifty-page deck added one row at a time, each through its own file dialog,
 * is the difference between this feature being used and being abandoned. The
 * files are converted and sent ONE AT A TIME rather than in parallel: fifty
 * simultaneous canvas encodes will stall a laptop, and fifty simultaneous
 * uploads is how a phone's connection gives up halfway.
 *
 * They are added in the order they were picked, which for a scanned document is
 * the order the file names sort in — so the deck usually comes out already in
 * the right order, and the handles are there for when it does not.
 *
 * Anything that fails is counted and said. A silent partial upload of a
 * document is the worst outcome here: the pages that landed look complete.
 */
function AddPages({
  count,
  onAdd,
  busy,
}: {
  count: number;
  onAdd: (pages: DeckPage[]) => void;
  busy?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const folder = useUploadFolder();
  const room = MAX_DECK_PAGES - count;
  const working = progress !== null;

  async function handleFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    // Cleared immediately, so picking the same files again fires this again.
    event.target.value = "";
    if (picked.length === 0) return;

    setError(null);

    const taking = picked.slice(0, room);
    const overflow = picked.length - taking.length;

    const added: DeckPage[] = [];
    let failed = 0;
    /** The first thing the server said, which is more useful than a count. */
    let reason = "";

    for (const [index, file] of taking.entries()) {
      setProgress({ done: index, total: taking.length });

      try {
        const webp = await toWebp(file, DOCUMENT_EDGE);
        const form = new FormData();
        form.append("file", webp);
        // Fifty scanned pages arriving in the root is the exact mess the folders
        // exist to prevent, so this uploader names its destination too.
        form.append("folder", folder);

        const response = await fetch("/api/admin/upload", { method: "POST", body: form });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || typeof data.url !== "string") {
          failed += 1;
          if (!reason && typeof data.error === "string") reason = data.error;
          continue;
        }

        added.push({ url: data.url, alt: "" });
      } catch {
        failed += 1;
      }
    }

    setProgress(null);
    // One update rather than one per file: appending inside the loop would
    // reorder against any drag the editor did while it ran.
    if (added.length > 0) onAdd(added);

    if (failed > 0) {
      const count =
        failed === 1
          ? "One page could not be uploaded."
          : `${failed} pages could not be uploaded.`;
      setError(`${count}${reason ? ` ${reason}` : ""} The rest were added.`);
    } else if (overflow > 0) {
      setError(
        `A deck holds ${MAX_DECK_PAGES} pages, so the last ${overflow} were not added.`
      );
    }
  }

  return (
    <Panel title="Add pages" hint={`${room} of ${MAX_DECK_PAGES} free`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="hidden"
      />

      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={busy || working || room <= 0}
      >
        <UploadIcon />
        {progress ? `Uploading ${progress.done + 1} of ${progress.total}…` : "Choose the pictures"}
      </Button>

      <Note className="mt-2">
        {room <= 0
          ? `This deck is full at ${MAX_DECK_PAGES} pages.`
          : "Pick as many as you like at once — they are added in the order they are named, and resized before they leave this machine. To paste an address instead, use “Add a page” below."}
      </Note>

      {error ? <div className="mt-2"><ErrorNote>{error}</ErrorNote></div> : null}
    </Panel>
  );
}
