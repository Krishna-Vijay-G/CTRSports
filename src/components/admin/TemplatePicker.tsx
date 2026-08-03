"use client";

import { useEffect, useRef, useState } from "react";
import type { MediaPost } from "@/lib/posts";
import { TEMPLATE_LIST, type TemplateId } from "@/lib/templates";
import { BannerTemplate } from "@/components/landing/BannerTemplates";
import { cn } from "@/lib/utils";

/** Width the preview is rendered at before being scaled down to fit. */
const STAGE_WIDTH = 1440;
const STAGE_HEIGHT = 640;

/* ─── Miniature wireframes, one per template ─── */

function Wireframe({ id, active }: { id: TemplateId; active: boolean }) {
  const media = active ? "bg-racing-yellow/70" : "bg-white/25";
  const line = active ? "bg-racing-yellow/45" : "bg-white/20";
  const heading = active ? "bg-racing-yellow" : "bg-white/45";

  switch (id) {
    case "wedge":
      return (
        <div className="relative h-full w-full overflow-hidden rounded bg-carbon-950">
          <div
            className={cn("absolute inset-y-0 right-0 w-[62%]", media)}
            style={{ clipPath: "polygon(18% 0, 100% 0, 100% 100%, 0 100%)" }}
          />
          <div className="absolute inset-y-0 left-0 flex w-[42%] flex-col justify-center gap-1 p-2">
            <div className={cn("h-1 w-8 rounded-sm", heading)} />
            <div className={cn("h-1 w-10 rounded-sm", line)} />
            <div className={cn("h-1 w-6 rounded-sm", line)} />
          </div>
        </div>
      );

    case "cinematic":
      return (
        <div className="relative h-full w-full overflow-hidden rounded bg-carbon-950">
          <div className={cn("absolute inset-0", media)} />
          <div className="absolute inset-x-0 bottom-0 h-[52%] bg-gradient-to-t from-carbon-950 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-2">
            <div className={cn("h-1 w-9 rounded-sm", heading)} />
            <div className={cn("h-1 w-12 rounded-sm", line)} />
          </div>
        </div>
      );

    case "split":
      return (
        <div className="relative flex h-full w-full overflow-hidden rounded bg-carbon-950">
          <div className="flex w-1/2 flex-col justify-center gap-1 p-2">
            <div className={cn("h-1 w-8 rounded-sm", heading)} />
            <div className={cn("h-1 w-10 rounded-sm", line)} />
            <div className={cn("h-1 w-6 rounded-sm", line)} />
          </div>
          <div className={cn("w-1/2", media)} />
        </div>
      );

    case "spotlight":
      return (
        <div className="relative flex h-full w-full items-center overflow-hidden rounded bg-carbon-950">
          <div className="flex h-full w-[55%] flex-col justify-center gap-1 p-2">
            <div className={cn("h-1 w-8 rounded-sm", heading)} />
            <div className={cn("h-1 w-10 rounded-sm", line)} />
          </div>
          <div className="flex h-full w-[45%] items-center justify-center">
            <div className={cn("h-[62%] w-[62%] rounded-sm border border-racing-yellow/40", media)} />
          </div>
        </div>
      );

    case "marquee":
      return (
        <div className="relative h-full w-full overflow-hidden rounded bg-carbon-950">
          <div className={cn("absolute inset-0 opacity-50", media)} />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <div className={cn("h-1.5 w-14 rounded-sm", heading)} />
            <div className={cn("h-1 w-10 rounded-sm", line)} />
          </div>
        </div>
      );
  }
}

/* ─── Live preview of the real template with the real content ─── */

function LivePreview({ post, kicker }: { post: MediaPost; kicker?: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;

    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / STAGE_WIDTH);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={frameRef}
      className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-carbon-950"
      style={{ height: STAGE_HEIGHT * scale }}
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ width: STAGE_WIDTH, height: STAGE_HEIGHT, transform: `scale(${scale})` }}
      >
        {/* Same components the live site renders, so this is not an approximation. */}
        <div className="relative h-full w-full overflow-hidden bg-carbon-950">
          <BannerTemplate post={post} muted reducedMotion kicker={kicker} />
        </div>
      </div>
    </div>
  );
}

export function TemplatePicker({
  value,
  onChange,
  previewPost,
  previewKicker,
}: {
  value: TemplateId;
  onChange: (next: TemplateId) => void;
  previewPost: MediaPost | null;
  previewKicker?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {TEMPLATE_LIST.map((template) => {
          const active = template.id === value;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onChange(template.id)}
              aria-pressed={active}
              title={template.description}
              className={cn(
                "group flex flex-col gap-2 rounded-xl border p-2 text-left transition",
                active
                  ? "border-racing-yellow/70 bg-racing-yellow/[0.07]"
                  : "border-white/10 bg-carbon-900/60 hover:border-white/25"
              )}
            >
              <div className="aspect-[16/9] w-full">
                <Wireframe id={template.id} active={active} />
              </div>
              <span
                className={cn(
                  "font-display text-[11px] font-bold uppercase tracking-[0.14em]",
                  active ? "text-racing-yellow" : "text-white/60"
                )}
              >
                {template.name}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] leading-relaxed text-white/40">
        {TEMPLATE_LIST.find((t) => t.id === value)?.description}
      </p>

      {previewPost ? (
        <div>
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-white/40">
            Live preview
          </span>
          <div className="mt-2">
            <LivePreview post={previewPost} kicker={previewKicker} />
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-xs text-white/35">
          Add a title, subtext or media to see a live preview.
        </p>
      )}
    </div>
  );
}
