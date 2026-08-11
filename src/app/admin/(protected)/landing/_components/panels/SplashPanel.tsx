"use client";

import type { LandingContent } from "@/lib/landingContent";
import { Field, Note, Panel } from "@/components/admin/Fields";
import { ImageField } from "@/components/admin/ImageField";

type Splash = LandingContent["splash"];

export function SplashPanel({
  value,
  onChange,
}: {
  value: Splash;
  onChange: (next: Splash) => void;
}) {
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
