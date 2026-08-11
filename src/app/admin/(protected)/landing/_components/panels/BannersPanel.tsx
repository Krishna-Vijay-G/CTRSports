"use client";

import { useEffect, useState } from "react";
import {
  BANNER_TEMPLATE_META,
  MAX_BANNERS,
  blankBanner,
  type Banner,
  type BannerTemplate,
} from "@/lib/banners";
import { cn } from "@/lib/utils";
import { Button } from "@/components/admin/ui/Button";
import { Badge } from "@/components/admin/ui/Badge";
import { Label } from "@/components/admin/ui/Input";
import { CaretDownIcon, DragIcon, PlusIcon, TrashIcon } from "@/components/admin/ui/icons";
import { ButtonFields, Field, Note, Panel, TextArea } from "@/components/admin/Fields";
import { ImageField } from "@/components/admin/ImageField";
import { TemplatePicker } from "./TemplatePicker";

/**
 * The banners at the top of the page.
 *
 * One strip per banner, opening into its editor. Opening a banner also points
 * the preview at it — `onFocus` reports the index up to the editor, which holds
 * the carousel still on that one for as long as it is open. Without that the
 * preview would keep rotating and you would be editing a banner you cannot see.
 *
 * Everything here is part of the page document, so it all goes with the one Save
 * at the top. Nothing in this panel writes on its own.
 */
export function BannersPanel({
  banners,
  onChange,
  onFocus,
}: {
  banners: Banner[];
  onChange: (next: Banner[]) => void;
  onFocus: (index: number | undefined) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(banners[0]?.id ?? null);
  const [dragId, setDragId] = useState<string | null>(null);

  /**
   * Keep the preview pinned to whichever banner is open — including the one that
   * is open on arrival, and including after a reorder has changed its index.
   *
   * Derived here rather than reported from each handler: `banners` changes on
   * every keystroke, so this runs constantly, but it hands back the same number
   * and React drops the no-op render.
   */
  useEffect(() => {
    const index = banners.findIndex((banner) => banner.id === openId);
    onFocus(index < 0 ? undefined : index);
  }, [openId, banners, onFocus]);

  function open(id: string | null) {
    setOpenId(id);
  }

  function setBanner(id: string, patch: Partial<Banner>) {
    onChange(banners.map((banner) => (banner.id === id ? { ...banner, ...patch } : banner)));
  }

  function move(index: number, delta: -1 | 1) {
    const to = index + delta;
    if (to < 0 || to >= banners.length) return;

    const next = [...banners];
    const [moved] = next.splice(index, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  /** Reorders live as the pointer passes over a strip, not only on drop. */
  function dragOver(targetId: string) {
    if (!dragId || dragId === targetId) return;

    const from = banners.findIndex((banner) => banner.id === dragId);
    const to = banners.findIndex((banner) => banner.id === targetId);
    if (from < 0 || to < 0) return;

    const next = [...banners];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  function add() {
    // crypto.randomUUID is what keeps two banners added in one session apart;
    // the ids only ever have to be unique inside this one document.
    const banner = blankBanner(crypto.randomUUID());
    onChange([...banners, banner]);
    open(banner.id);
  }

  function remove(id: string) {
    onChange(banners.filter((banner) => banner.id !== id));
    if (openId === id) open(null);
  }

  return (
    <>
      <Panel title="Banners" hint={`${banners.length} of ${MAX_BANNERS}`}>
        {banners.length === 0 ? (
          <p className="rounded-md border border-dashed border-input px-4 py-8 text-center text-xs text-muted-fg">
            No banners. The page opens straight on the about section.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {banners.map((banner, index) => {
              const expanded = openId === banner.id;

              return (
                <li
                  key={banner.id}
                  draggable={dragId === banner.id}
                  onDragEnter={() => dragOver(banner.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDragEnd={() => setDragId(null)}
                  className={cn(
                    "rounded-md border bg-background/60 transition-colors",
                    dragId === banner.id ? "border-primary/60 opacity-40" : "border-border",
                    expanded && "border-input bg-background"
                  )}
                >
                  <div className="flex items-center gap-2 p-1.5">
                    <button
                      type="button"
                      aria-label={`Reorder banner ${index + 1}. Use the arrow keys.`}
                      onPointerDown={() => setDragId(banner.id)}
                      onPointerUp={() => setDragId(null)}
                      onKeyDown={(event) => {
                        if (event.key === "ArrowUp") {
                          event.preventDefault();
                          move(index, -1);
                        } else if (event.key === "ArrowDown") {
                          event.preventDefault();
                          move(index, 1);
                        }
                      }}
                      className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded text-muted-fg/60 transition hover:bg-muted hover:text-foreground active:cursor-grabbing"
                    >
                      <DragIcon className="size-4" />
                    </button>

                    <span className="h-10 w-16 shrink-0 overflow-hidden rounded border border-border bg-background">
                      <img src={banner.image} alt="" className="h-full w-full object-cover" />
                    </span>

                    <button
                      type="button"
                      onClick={() => open(expanded ? null : banner.id)}
                      aria-expanded={expanded}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-[13px] font-medium text-foreground">
                        {banner.title || "Untitled banner"}
                      </span>
                      <span className="block truncate text-[11px] text-muted-fg">
                        {BANNER_TEMPLATE_META[banner.template].name}
                        {banner.subtitle ? ` · ${banner.subtitle}` : ""}
                      </span>
                    </button>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => open(expanded ? null : banner.id)}
                      aria-expanded={expanded}
                      aria-label={expanded ? "Close banner" : "Edit banner"}
                    >
                      <CaretDownIcon className={cn("transition-transform", expanded && "rotate-180")} />
                    </Button>
                  </div>

                  {expanded ? (
                    <div className="space-y-3 border-t border-border p-3">
                      <div>
                        <Label>Template</Label>
                        <TemplatePicker
                          value={banner.template}
                          onChange={(template: BannerTemplate) =>
                            setBanner(banner.id, { template })
                          }
                          className="mt-1.5"
                        />
                      </div>

                      <ImageField
                        label="Photo"
                        value={banner.image}
                        onChange={(image) => setBanner(banner.id, { image })}
                      />

                      <TextArea
                        label="Title"
                        value={banner.title}
                        onChange={(title) => setBanner(banner.id, { title })}
                        rows={2}
                        hint="Line breaks are kept exactly as typed."
                      />

                      <Field
                        label="Subtext"
                        value={banner.subtitle}
                        onChange={(subtitle) => setBanner(banner.id, { subtitle })}
                        hint="One supporting line under the title."
                      />

                      <ButtonFields
                        title="Link"
                        hint="where the banner sends people"
                        label={banner.ctaLabel}
                        href={banner.ctaHref}
                        onLabel={(ctaLabel) => setBanner(banner.id, { ctaLabel })}
                        onHref={(ctaHref) => setBanner(banner.id, { ctaHref })}
                      />

                      <div className="flex items-center gap-1.5 border-t border-border pt-3">
                        {/* The touch path for reordering — an HTML5 drag source
                            does not work there. */}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => move(index, -1)}
                          disabled={index === 0}
                          aria-label="Move up"
                        >
                          <CaretDownIcon className="rotate-180" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => move(index, 1)}
                          disabled={index === banners.length - 1}
                          aria-label="Move down"
                        >
                          <CaretDownIcon />
                        </Button>
                        <Badge variant="outline">
                          {index + 1} of {banners.length}
                        </Badge>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => remove(banner.id)}
                          className="ml-auto"
                        >
                          <TrashIcon />
                          Remove
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={add}
          disabled={banners.length >= MAX_BANNERS}
          className="mt-3"
        >
          <PlusIcon />
          Add banner
        </Button>
      </Panel>

      <Panel title="How they behave">
        <Note>
          Banners rotate on their own every few seconds, and pause while the pointer rests on them.
          A single banner does not rotate and shows no dots. The preview holds still on whichever
          banner is open here, so what you are editing is what you are looking at.
        </Note>
      </Panel>
    </>
  );
}
