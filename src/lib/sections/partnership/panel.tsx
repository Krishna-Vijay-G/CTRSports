"use client";

import { keepOrDefault, resolveCollage, type CollageLayoutId } from "@/lib/collage";
import { MAX_SHOTS, type Shot, type Partnership } from "./model";
import { Field, Panel, TextArea } from "@/admin/components/Fields";
import { CollageDesigner } from "@/admin/components/collage/CollageDesigner";
import { ImageField } from "@/admin/components/ImageField";
import { Repeater } from "@/admin/components/Repeater";
import type { SectionPanelProps } from "@/lib/sections/types";


/**
 * The signing: the copy, the shape of the collage, and the photographs in it.
 *
 * The photographs are a list and the arrangement is a shape with numbered
 * cells; the two are joined by position, so the first photograph is the first
 * cell. That is why adding or removing one has to reach the arrangement as well
 * — `keepOrDefault` holds the choice while it still fits and moves to the
 * default for the new count when it does not, rather than leaving the document
 * asking for a five-cell layout with four photographs in it.
 */
export function PartnershipPanel({ value, onChange }: SectionPanelProps<Partnership>) {
  const set = (patch: Partial<Partnership>) => onChange({ ...value, ...patch });

  /** Every change to the list, so the arrangement can never be left behind. */
  const setShots = (shots: Shot[]) =>
    onChange({ ...value, shots, layout: keepOrDefault(value.layout, shots.length) });

  const layout = resolveCollage(value.layout, value.shots.length);

  function swap(from: number, to: number) {
    const next = [...value.shots];
    [next[from], next[to]] = [next[to], next[from]];
    setShots(next);
  }

  return (
    <>
      <Panel title="Copy">
        <div className="space-y-3">
          <Field label="Label" value={value.label} onChange={(label) => set({ label })} />
          <Field label="Title" value={value.title} onChange={(title) => set({ title })} />
          <TextArea label="Body" value={value.body} onChange={(body) => set({ body })} rows={3} />
        </div>
      </Panel>

      <Panel
        title="Collage"
        hint={layout ? layout.label : `${value.shots.length} of ${MAX_SHOTS}`}
      >
        <CollageDesigner
          layout={layout}
          shots={value.shots}
          onLayout={(id) => set({ layout: id as CollageLayoutId })}
          onSwap={swap}
        />
      </Panel>

      <Repeater<Shot>
        title="Photographs"
        addLabel="Add photograph"
        items={value.shots}
        max={MAX_SHOTS}
        onChange={setShots}
        blank={() => ({ image: "", alt: "" })}
        summary={(shot, index) => ({
          title: shot.alt || `Photograph ${index + 1}`,
          hint: `Cell ${index + 1}`,
          image: shot.image,
        })}
        empty="No photographs — the section shows its copy only."
        note="One to six. The order here is the order of the cells, so dragging a photograph up the list moves it into an earlier cell — or swap two in the collage above."
      >
        {(shot, index, patch) => (
          <>
            <ImageField label="Photo" value={shot.image} onChange={(image) => patch({ image })} />
            <Field
              label="Alt text"
              value={shot.alt}
              onChange={(alt) => patch({ alt })}
              placeholder={`Photograph ${index + 1}`}
              hint="What it shows, for someone who cannot see it."
            />
          </>
        )}
      </Repeater>
    </>
  );
}
