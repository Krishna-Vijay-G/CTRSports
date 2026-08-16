import { BODY_MAX, isRecord, link, list, optionalText, text, withIds } from "@/lib/normalise";
import type { SectionModule } from "@/lib/sections/types";

export type RowItem = { id: string; label: string; title: string; meta: string; href: string };
export type Rows = { label: string; title: string; items: RowItem[] };

export const MAX_ROWS = 12;

export const BLANK_ROWS: Rows = { label: "", title: "", items: [] };

export const rows: SectionModule<Rows> = {
  type: "rows",
  label: "Bulletin",
  hint: "A list of rows, each one a link.",
  surface: ["home"],
  multiple: true,
  anchor: "rows",
  blank: () => ({ ...BLANK_ROWS, items: [] }),
  normalise: (raw) => {
    const d = BLANK_ROWS;
    const value = isRecord(raw) ? raw : {};

    return {
      label: text(value.label, d.label),
      title: text(value.title, d.title),
      items: withIds(
        list(
          value.items,
          MAX_ROWS,
          (entry) => ({
            id: optionalText(entry.id, 64),
            label: optionalText(entry.label, 40),
            title: optionalText(entry.title, BODY_MAX),
            meta: optionalText(entry.meta, 60),
            href: link(entry.href, "#"),
          }),
          d.items
        ),
        "row"
      ),
    };
  },
};
