"use client";

import { Field, Note, Panel } from "@/admin/components/Fields";
import { ImageField } from "@/admin/components/ImageField";
import type { SectionPanelProps } from "@/lib/sections/types";
import type { Splash } from "./model";


export function SplashPanel({ value, onChange }: SectionPanelProps<Splash>) {
  function set<K extends keyof Splash>(key: K, next: Splash[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <Panel title="Splash screen" hint="covers the page while the first banner loads">
      <Field label="Title" value={value.title} onChange={(v) => set("title", v)} />

      <ImageField
        label="Logo"
        value={value.logo}
        onChange={(v) => set("logo", v)}
        variant="logo"
        className="mt-3"
      />

      <Note className="mt-3">
        Not shown in the preview: it is fixed to the viewport, so it would cover the admin rather
        than the page beside it. Open the site in a new tab to see it.
      </Note>
    </Panel>
  );
}
