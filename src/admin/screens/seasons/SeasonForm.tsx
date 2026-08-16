"use client";

import {
  SEASON_LIMITS,
  SEASON_STATUSES,
  SEASON_STATUS_LABELS,
  type Season,
  type SeasonStatus,
} from "@/lib/seasons";
import type { SlugHolder } from "@/lib/slug";
import { Button } from "@/admin/ui/Button";
import { Input, Label, Select } from "@/admin/ui/Input";
import { ExternalIcon, TrashIcon } from "@/admin/ui/icons";
import { Field, Hint, Note, Panel, Row, TextArea } from "@/admin/components/Fields";
import { FormerSlugs } from "@/admin/components/FormerSlugs";
import { ImageField } from "@/admin/components/ImageField";
import { SlugField } from "@/admin/components/SlugField";

/**
 * One season's fields.
 *
 * A pure controlled component, like `EventForm` and `ArticleForm`: no fetching,
 * no state of its own, everything through one `set`.
 *
 * Short, and deliberately so. A season is a heading with an address — its rounds
 * are the content, and they are on the Rounds screen. What is here is what a
 * season genuinely has of its own: what it is called, whether it is announced,
 * where it lives, what order it reads in and a picture.
 */
export function SeasonForm({
  season,
  rounds,
  siteUrl,
  onChange,
  onDelete,
  onReleasedSlug,
  busy,
}: {
  season: Season;
  /** How many rounds are filed under it. Read-only here; the delete needs it. */
  rounds: number;
  /**
   * Where the public site answers. The admin is on a different hostname, so a
   * relative link to a season from here would resolve against the admin host.
   */
  siteUrl: string;
  onChange: (next: Season) => void;
  onDelete: () => void;
  onReleasedSlug?: (holder: SlugHolder, slug: string) => void;
  busy?: boolean;
}) {
  const set = (patch: Partial<Season>) => onChange({ ...season, ...patch });

  return (
    <div className="space-y-2.5">
      <Panel title="Season">
        <div className="space-y-3">
          <Row>
            <Field
              label="Name"
              value={season.name}
              onChange={(name) => set({ name })}
              maxLength={SEASON_LIMITS.name}
              placeholder="2026 Season"
              hint="The heading on its own page, and on the home page's calendar band unless that band has a title of its own."
            />
            <label className="block">
              <Label>Status</Label>
              <Select
                value={season.status}
                onChange={(e) => set({ status: e.target.value as SeasonStatus })}
                disabled={busy}
                className="mt-1.5"
              >
                {SEASON_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {SEASON_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
              <Hint className="mt-1">
                A draft season and every round in it are off the site, whatever the rounds
                themselves say.
              </Hint>
            </label>
          </Row>

          <TextArea
            label="Subtitle"
            value={season.subtitle}
            onChange={(subtitle) => set({ subtitle })}
            rows={2}
            maxLength={SEASON_LIMITS.subtitle}
            hint="One line under the name on the season's page."
          />

          <SlugField
            kind="season"
            value={season.slug}
            onChange={(slug) => set({ slug })}
            exceptId={season.id}
            suggestion={season.name}
            onReleased={onReleasedSlug}
            disabled={busy}
          />

          <FormerSlugs
            kind="season"
            slugs={season.former_slugs}
            onChange={(former_slugs) => set({ former_slugs })}
            disabled={busy}
          />

          {season.status === "published" && season.slug ? (
            <a
              href={`${siteUrl}/calendar/${season.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-muted-fg underline underline-offset-2 transition-colors hover:text-foreground"
            >
              <ExternalIcon className="size-3.5" />
              Open /calendar/{season.slug}
            </a>
          ) : null}
        </div>
      </Panel>

      <Panel title="Order">
        <div className="space-y-3">
          <label className="block">
            <Label>Year</Label>
            <Input
              type="number"
              value={season.sort_order || ""}
              onChange={(e) => set({ sort_order: Number(e.target.value) || 0 })}
              disabled={busy}
              className="mt-1.5"
              placeholder="2026"
            />
          </label>

          {/*
            A number rather than a drag handle, which is what every other ordered
            list here has. A season's order is its year — the one fact about it
            that is never in doubt — and dragging four of them into the order
            they already have is work invented by the control.
          */}
          <Note>
            Seasons are listed newest first, here and on the site. The year is the number to put
            here; anything counts, as long as a later season's is higher.
          </Note>
        </div>
      </Panel>

      <Panel title="Cover">
        <ImageField
          label="Cover image"
          value={season.cover_image}
          onChange={(cover_image) => set({ cover_image })}
          disabled={busy}
          variant="photo"
          hint="At the top of the season's page. Blank shows the rounds straight away, which is usually the better page."
        />
      </Panel>

      <Panel title="Danger">
        <Note className="mb-2">
          {rounds === 0
            ? "Nothing is filed under this season, so deleting it only stops its address working."
            : rounds === 1
              ? "One round is filed under this season. Deleting it deletes that round as well — its address, its report and all — unless you move it to another season first."
              : `${rounds} rounds are filed under this season. Deleting it deletes them as well — their addresses, their reports and all — unless you move them to another season first.`}
        </Note>
        <Button variant="destructive" size="sm" onClick={onDelete} disabled={busy}>
          <TrashIcon />
          Delete this season
        </Button>
      </Panel>
    </div>
  );
}
