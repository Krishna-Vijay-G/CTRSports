"use client";

import type { IncrcContent } from "@/lib/incrcContent";
import { Button } from "@/components/admin/ui/Button";
import { CheckIcon } from "@/components/admin/ui/icons";
import { Field, Note, Panel, TextArea } from "@/components/admin/Fields";
import { ImageField } from "@/components/admin/ImageField";

type Family = IncrcContent["family"];

export function FamilyPanel({
  value,
  onChange,
}: {
  value: Family;
  onChange: (next: Family) => void;
}) {
  const set = (patch: Partial<Family>) => onChange({ ...value, ...patch });

  return (
    <>
      <Panel title="Photograph" hint="full width, behind the quote">
        <ImageField label="Photo" value={value.image} onChange={(image) => set({ image })} />
        <Note className="mt-3">
          It is darkened heavily and heaviest at the foot, because the quote crosses the middle of
          it. A busy photograph works here; a bright one does not.
        </Note>
      </Panel>

      <Panel title="Quote">
        <div className="space-y-3">
          <Field
            label="Lead-in"
            value={value.lead}
            onChange={(lead) => set({ lead })}
            hint="The smaller line above. Blank hides it."
          />
          <TextArea label="Quote" value={value.quote} onChange={(quote) => set({ quote })} rows={2} />

          <div className="flex items-center gap-2.5 rounded-md border border-border bg-background/60 p-3">
            <Button
              variant={value.showFlag ? "default" : "outline"}
              size="sm"
              onClick={() => set({ showFlag: !value.showFlag })}
              aria-pressed={value.showFlag}
            >
              {value.showFlag ? <CheckIcon /> : null}
              Tricolour divider
            </Button>
            <span className="text-[11px] leading-relaxed text-muted-fg">
              The flag between the two rules. Off leaves a plain rule.
            </span>
          </div>

          <Note>
            The follow button under the quote uses the same Instagram handle as the introduction,
            and is edited there.
          </Note>
        </div>
      </Panel>
    </>
  );
}
