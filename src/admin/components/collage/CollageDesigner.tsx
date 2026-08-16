"use client";

import { useState } from "react";
import { cellName, collageGrid, layoutsFor, type CollageLayout } from "@/lib/collage";
import type { Shot } from "@/lib/sections/partnership/model";
import { cn } from "@/lib/utils";
import { Note } from "@/admin/components/Fields";
import { CheckIcon } from "@/admin/ui/icons";

/**
 * Arranges a collage: which shape it takes, and which photograph is in which
 * cell of it.
 *
 * Two halves, and the order of them is the point. The plan on top is the real
 * photographs in the real arrangement — the thing being edited, not a
 * description of it — and clicking two of them swaps the cells they are in,
 * which is the whole of "put that one there". The row of diagrams underneath
 * changes the shape.
 *
 * Both are drawn from the arrangement data in src/lib/collage.ts, by the same
 * grid rules the page uses, so a shape added there appears here with nothing
 * drawn by hand — and the diagram cannot show an arrangement the page would not
 * draw. Only the arrangements that hold exactly this many photographs are
 * offered, because a layout with an empty cell in it is not a layout.
 */
export function CollageDesigner({
  layout,
  shots,
  onLayout,
  onSwap,
}: {
  /** The arrangement in force — already resolved against the photo count. */
  layout: CollageLayout | null;
  shots: Shot[];
  onLayout: (id: string) => void;
  /** Swaps the two photographs, which is what moves one into another's cell. */
  onSwap: (from: number, to: number) => void;
}) {
  /** The cell waiting for somewhere to go, if one has been clicked. */
  const [picked, setPicked] = useState<number | null>(null);

  if (!layout) {
    return (
      <Note>
        Add a photograph below and the arrangements that hold that many appear here — one to
        six.
      </Note>
    );
  }

  const options = layoutsFor(shots.length);
  // A removal can leave the pick pointing past the end of the list.
  const held = picked !== null && picked < shots.length ? picked : null;

  function choose(index: number) {
    if (held === null) {
      setPicked(index);
      return;
    }

    if (held !== index) onSwap(held, index);
    setPicked(null);
  }

  return (
    <div className="space-y-3">
      <div
        style={collageGrid(layout) as React.CSSProperties}
        className="gap-1.5 rounded-md border border-border bg-background/60 p-1.5"
      >
        {shots.slice(0, layout.cells).map((shot, index) => (
          <button
            key={index}
            type="button"
            style={{ gridArea: cellName(index) }}
            onClick={() => choose(index)}
            aria-pressed={held === index}
            aria-label={
              held === null
                ? `Photograph ${index + 1}. Click it, then click where it should go.`
                : held === index
                  ? `Photograph ${index + 1}, held. Click it again to put it back.`
                  : `Put photograph ${held + 1} here, in cell ${index + 1}.`
            }
            className={cn(
              "group relative overflow-hidden rounded-sm border outline-none transition",
              "focus-visible:ring-[3px] focus-visible:ring-ring/40",
              held === index
                ? "border-primary ring-2 ring-primary/40"
                : held === null
                  ? "border-border hover:border-input"
                  : "border-dashed border-primary/50 hover:border-primary"
            )}
          >
            {shot.image ? (
              <img
                src={shot.image}
                alt=""
                className={cn(
                  "h-full w-full object-cover transition",
                  held !== null && held !== index && "opacity-50 group-hover:opacity-80"
                )}
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-muted text-[10px] text-muted-fg">
                No photo
              </span>
            )}

            <span className="absolute left-1 top-1 flex size-4 items-center justify-center rounded-sm bg-black/70 text-[10px] font-semibold text-white">
              {index + 1}
            </span>
          </button>
        ))}
      </div>

      <Note>
        {held === null
          ? "Click a photograph, then click another, to swap the cells they are in. The numbers are the order of the list below."
          : `Photograph ${held + 1} is held — click the cell it should move to, or click it again to put it back.`}
      </Note>

      {options.length > 1 ? (
        <div className="grid grid-cols-4 gap-1.5">
          {options.map((option) => {
            const selected = option.id === layout.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onLayout(option.id)}
                aria-pressed={selected}
                className={cn(
                  "rounded-md border p-1.5 text-left outline-none transition",
                  "focus-visible:ring-[3px] focus-visible:ring-ring/40",
                  selected
                    ? "border-primary bg-primary/[0.07]"
                    : "border-border hover:border-input hover:bg-muted/50"
                )}
              >
                <span
                  style={collageGrid(option) as React.CSSProperties}
                  className="w-full gap-[3px]"
                >
                  {Array.from({ length: option.cells }, (_, index) => (
                    <span
                      key={index}
                      style={{ gridArea: cellName(index) }}
                      className={cn(
                        "flex items-center justify-center rounded-[2px] text-[9px] font-semibold",
                        selected ? "bg-primary/25 text-foreground" : "bg-muted-fg/25 text-muted-fg"
                      )}
                    >
                      {index + 1}
                    </span>
                  ))}
                </span>

                <span className="mt-1.5 flex items-center gap-1">
                  <span className="truncate text-[11px] font-medium text-foreground">
                    {option.label}
                  </span>
                  {selected ? <CheckIcon className="size-3 shrink-0 text-primary" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
