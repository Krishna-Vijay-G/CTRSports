"use client";

import { MAX_MARQUEE_ITEMS, type IncrcContent } from "@/lib/incrcContent";
import { Button } from "@/components/admin/ui/Button";
import { Input } from "@/components/admin/ui/Input";
import { PlusIcon, XIcon } from "@/components/admin/ui/icons";
import { Note, Panel } from "@/components/admin/Fields";

type Marquee = IncrcContent["marquee"];

/**
 * The ticker.
 *
 * One line each, edited in place — these are half a dozen words apiece, so a box
 * per item with a header and a remove button would be more chrome than content.
 */
export function MarqueePanel({
  value,
  onChange,
}: {
  value: Marquee;
  onChange: (next: Marquee) => void;
}) {
  const { items } = value;

  function setItems(next: string[]) {
    onChange({ ...value, items: next });
  }

  return (
    <>
      <Panel title="Announcements" hint={`${items.length} of ${MAX_MARQUEE_ITEMS}`}>
        <div className="space-y-1.5">
          {items.map((item, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <span className="w-4 shrink-0 text-center text-[11px] text-muted-fg/60">
                {index + 1}
              </span>
              <Input
                value={item}
                onChange={(event) =>
                  setItems(items.map((entry, i) => (i === index ? event.target.value : entry)))
                }
                placeholder="Round 01 · Kari Motor Speedway · 11–13 September"
                aria-label={`Announcement ${index + 1}`}
                className="h-8 min-w-0 flex-1 text-xs"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setItems(items.filter((_, i) => i !== index))}
                aria-label={`Remove announcement ${index + 1}`}
                className="hover:text-destructive"
              >
                <XIcon />
              </Button>
            </div>
          ))}
        </div>

        {items.length === 0 ? <Note>No announcements — the ticker is not drawn.</Note> : null}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setItems([...items, ""])}
          disabled={items.length >= MAX_MARQUEE_ITEMS}
          className="mt-2"
        >
          <PlusIcon />
          Add announcement
        </Button>
      </Panel>

      <Panel title="How it behaves">
        <Note>
          The items slide past on a loop with a diamond between each. An empty line is dropped when
          it is saved. Keep them short — anything much longer than a few words is gone before it can
          be read.
        </Note>
        <Note className="mt-2">
          It does not move for anyone whose system asks for reduced motion; the first few items sit
          there instead, which is still readable.
        </Note>
      </Panel>
    </>
  );
}
