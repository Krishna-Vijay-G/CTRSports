"use client";

import { useState } from "react";
import type { IncrcContent } from "@/lib/incrcContent";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/admin/ui/Badge";
import { Button } from "@/components/admin/ui/Button";
import {
  CaretDownIcon,
  DragIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@/components/admin/ui/icons";
import { Note, Panel } from "@/components/admin/Fields";
import { TABS, type TabId } from "../sections";

type Sections = IncrcContent["sections"];

/**
 * The running order.
 *
 * This is the panel that adds and removes sections. A section switched off here
 * is not rendered on the page at all — not hidden with CSS — so its anchor is
 * genuinely gone and it costs nothing to serve.
 *
 * The list is fixed: every section the code knows about is in it exactly once.
 * There is no "add section" button because a section is a piece of layout, not a
 * piece of content — a new one is a component and a `case`, not a row in a form.
 *
 * Reordering is a drag handle plus arrow buttons, and the buttons are not a
 * fallback: HTML5 drag does not work on touch at all.
 */
export function LayoutPanel({
  value,
  onChange,
  onOpen,
}: {
  value: Sections;
  onChange: (next: Sections) => void;
  /** Jumps to that section's own tab — the row's name is the shortcut. */
  onOpen: (id: TabId) => void;
}) {
  const [dragging, setDragging] = useState<number | null>(null);

  const shown = value.filter((entry) => entry.visible).length;

  function moveTo(from: number, to: number) {
    if (to < 0 || to >= value.length || from === to) return;

    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);

    if (dragging === from) setDragging(to);
  }

  function toggle(index: number) {
    onChange(
      value.map((entry, i) => (i === index ? { ...entry, visible: !entry.visible } : entry))
    );
  }

  return (
    <>
      <Panel title="Sections" hint={`${shown} of ${value.length} on the page`}>
        <ul className="space-y-1.5">
          {value.map((entry, index) => {
            const tab = TABS.find((item) => item.id === entry.id);
            const Icon = tab?.Icon;

            return (
              <li
                key={entry.id}
                draggable={dragging === index}
                onDragEnter={() => (dragging === null ? undefined : moveTo(dragging, index))}
                onDragOver={(event) => event.preventDefault()}
                onDragEnd={() => setDragging(null)}
                className={cn(
                  "flex items-center gap-2 rounded-md border p-1.5 transition-colors",
                  dragging === index ? "border-primary/60 opacity-40" : "border-border",
                  entry.visible ? "bg-background" : "bg-background/40"
                )}
              >
                <button
                  type="button"
                  aria-label={`Reorder ${tab?.title ?? entry.id}. Use the arrow keys.`}
                  onPointerDown={() => setDragging(index)}
                  onPointerUp={() => setDragging(null)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      moveTo(index, index - 1);
                    } else if (event.key === "ArrowDown") {
                      event.preventDefault();
                      moveTo(index, index + 1);
                    }
                  }}
                  className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded text-muted-fg/60 transition hover:bg-muted hover:text-foreground active:cursor-grabbing"
                >
                  <DragIcon className="size-4" />
                </button>

                {Icon ? (
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      entry.visible ? "text-muted-fg" : "text-muted-fg/40"
                    )}
                  />
                ) : null}

                <button
                  type="button"
                  onClick={() => onOpen(entry.id)}
                  title={tab?.hint}
                  className="min-w-0 flex-1 text-left"
                >
                  <span
                    className={cn(
                      "block truncate text-[13px] font-medium",
                      entry.visible ? "text-foreground" : "text-muted-fg"
                    )}
                  >
                    {tab?.title ?? entry.id}
                  </span>
                </button>

                {!entry.visible ? <Badge variant="outline">Off</Badge> : null}

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => moveTo(index, index - 1)}
                  disabled={index === 0}
                  aria-label="Move up"
                >
                  <CaretDownIcon className="rotate-180" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => moveTo(index, index + 1)}
                  disabled={index === value.length - 1}
                  aria-label="Move down"
                >
                  <CaretDownIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => toggle(index)}
                  aria-pressed={entry.visible}
                  aria-label={entry.visible ? "Take off the page" : "Put on the page"}
                  title={entry.visible ? "Take off the page" : "Put on the page"}
                >
                  {entry.visible ? <EyeIcon /> : <EyeSlashIcon />}
                </Button>
              </li>
            );
          })}
        </ul>
      </Panel>

      <Panel title="How this works">
        <Note>
          A section that is off is left out of the page entirely, so its link target goes with it —
          check the header links if you switch off something the navigation points at. Click a name
          to jump to its fields.
        </Note>
        <Note className="mt-2">
          The banners are not in this list. They carry the header, so they are always first; empty
          the banner list to remove the carousel and the header becomes a plain bar.
        </Note>
      </Panel>
    </>
  );
}
