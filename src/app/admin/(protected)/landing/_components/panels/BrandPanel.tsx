"use client";

import type { LandingContent } from "@/lib/landingContent";
import { Field, Note, Panel, Row } from "@/components/admin/Fields";
import { ImageField } from "@/components/admin/ImageField";

type Brand = LandingContent["brand"];

export function BrandPanel({
  value,
  onChange,
}: {
  value: Brand;
  onChange: (next: Brand) => void;
}) {
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
