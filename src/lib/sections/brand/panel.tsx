"use client";

import { Field, Note, Panel, Row } from "@/admin/components/Fields";
import { ImageField } from "@/admin/components/ImageField";
import type { SectionPanelProps } from "@/lib/sections/types";
import type { Brand } from "./model";


export function BrandPanel({ value, onChange }: SectionPanelProps<Brand>) {
  function set<K extends keyof Brand>(key: K, next: Brand[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <Panel title="Brand" hint="header, footer and splash">
      <Row>
        <Field label="Name" value={value.name} onChange={(v) => set("name", v)} />
        <Field label="Subtitle" value={value.subtitle} onChange={(v) => set("subtitle", v)} />
      </Row>

      <ImageField
        label="Logo"
        value={value.logo}
        onChange={(v) => set("logo", v)}
        variant="logo"
        className="mt-3"
      />

      <Note className="mt-3">
        The name and subtitle sit beside the logo in the header and again in the footer. The logo is
        also what a search result and a shared link show.
      </Note>
    </Panel>
  );
}
