"use client";

import { useState } from "react";
import {
  MODULE_HINTS,
  MODULE_LABELS,
  SITE_MODULES,
  siteSlugProblem,
  type Site,
  type SiteModule,
} from "@/lib/sites";
import { Button } from "@/admin/ui/Button";
import { Input, Label, Select } from "@/admin/ui/Input";
import { CheckIcon, PlusIcon, TrashIcon } from "@/admin/ui/icons";
import { Hint, Note, Panel } from "@/admin/components/Fields";

/**
 * The sports, and what each one has.
 *
 * The owner's screen, and the one place a sport comes into existence. Creating
 * one mints three things at once that cannot be renamed afterwards — a URL
 * prefix, a media folder root and a permission scope — so the address is the
 * only field with a live validator on it, and it is checked again by the route
 * and a third time by a CHECK constraint.
 *
 * ── Switching a module off does not delete anything ───────────────────────
 *
 * Its screen and its routes go; the rows stay in the table. An accidental
 * untick would otherwise be an unrecoverable delete of every deck a sport has,
 * and a module switched back on finds its records where it left them.
 */
export function SitesEditor({ initialSites }: { initialSites: Site[] }) {
  const [sites, setSites] = useState(initialSites);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string[] | null>(null);

  const [adding, setAdding] = useState(false);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");

  const taken = sites.map((site) => site.slug);
  const slugError = adding && slug ? siteSlugProblem(slug, taken) : null;

  async function send(path: string, init: RequestInit): Promise<Record<string, unknown> | null> {
    setBusy(true);
    setError(null);
    setNotes(null);

    try {
      const response = await fetch(path, {
        headers: { "Content-Type": "application/json" },
        ...init,
      });
      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

      if (!response.ok) {
        setError(typeof data.error === "string" ? data.error : "That could not be saved.");
        return null;
      }

      if (Array.isArray(data.notes)) setNotes(data.notes as string[]);
      return data;
    } catch {
      setError("That could not be saved.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    const problem = siteSlugProblem(slug, taken);
    if (problem) {
      setError(problem);
      return;
    }

    const data = await send("/api/admin/sites", {
      method: "POST",
      body: JSON.stringify({ slug, name: name || slug, status: "draft", modules: [] }),
    });

    if (!data?.site) return;

    setSites((current) => [...current, data.site as Site]);
    setAdding(false);
    setSlug("");
    setName("");
  }

  async function save(site: Site, patch: Partial<Site>) {
    const next = { ...site, ...patch };

    const data = await send(`/api/admin/sites/${site.id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: next.name,
        status: next.status,
        accent: next.accent,
        modules: next.modules,
      }),
    });

    if (!data?.site) return;
    setSites((current) => current.map((one) => (one.id === site.id ? (data.site as Site) : one)));
  }

  async function remove(site: Site) {
    // Typed, not clicked. Everything on the sport goes with it and there is no
    // undo, so the confirmation asks for something only somebody who meant it
    // would produce.
    const typed = window.prompt(
      `This deletes ${site.name} and everything on it — its page, decks, forms, articles, ` +
        `circuits and addresses. There is no undo.\n\nType "${site.slug}" to confirm.`
    );
    if (typed !== site.slug) return;

    const data = await send(`/api/admin/sites/${site.id}`, { method: "DELETE" });
    if (!data?.ok) return;

    setSites((current) => current.filter((one) => one.id !== site.id));
  }

  function toggleModule(site: Site, module: SiteModule) {
    const on = site.modules.includes(module);
    const modules = on
      ? site.modules.filter((one) => one !== module)
      : SITE_MODULES.filter((one) => one === module || site.modules.includes(one));

    void save(site, { modules });
  }

  return (
    <div className="flex min-h-0 flex-col gap-2 md:h-full">
      <header className="rounded-lg border border-border bg-card px-3 py-2.5">
        <h1 className="text-sm font-semibold text-foreground">Sports</h1>
        <p className="text-xs text-muted-fg">
          Every site this deployment serves, and what each one has
        </p>
      </header>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto">
        {error ? (
          <Note className="rounded-md border border-destructive/40 px-2.5 py-2 text-destructive">
            {error}
          </Note>
        ) : null}
        {notes?.map((note) => (
          <Note key={note} className="rounded-md border border-border px-2.5 py-2">
            {note}
          </Note>
        ))}

        {sites.map((site) => (
          <Panel
            key={site.id}
            title={site.name}
            hint={site.kind === "root" ? "/ — the landing page" : `/${site.slug}`}
          >
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <Label>Name</Label>
                  <Input
                    value={site.name}
                    onChange={(event) =>
                      setSites((current) =>
                        current.map((one) =>
                          one.id === site.id ? { ...one, name: event.target.value } : one
                        )
                      )
                    }
                    onBlur={() => void save(site, {})}
                    disabled={busy}
                    className="mt-1.5"
                  />
                </label>

                <label className="block">
                  <Label>Status</Label>
                  <Select
                    value={site.status}
                    onChange={(event) =>
                      void save(site, { status: event.target.value as Site["status"] })
                    }
                    disabled={busy || site.kind === "root"}
                    className="mt-1.5"
                  >
                    <option value="draft">Draft — admins only</option>
                    <option value="live">Live — on the internet</option>
                  </Select>
                  <Hint className="mt-1">
                    {site.kind === "root"
                      ? "The landing page is always live."
                      : "A draft sport 404s for everybody. Look at it in the preview beside these fields until it is ready."}
                  </Hint>
                </label>
              </div>

              <div className="block">
                <Label>What it has</Label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {SITE_MODULES.map((module) => {
                    const on = site.modules.includes(module);

                    return (
                      <Button
                        key={module}
                        variant={on ? "default" : "outline"}
                        size="sm"
                        disabled={busy}
                        onClick={() => toggleModule(site, module)}
                        aria-pressed={on}
                        title={MODULE_HINTS[module]}
                      >
                        {on ? <CheckIcon /> : null}
                        {MODULE_LABELS[module]}
                      </Button>
                    );
                  })}
                </div>
                <Hint className="mt-1">
                  Switching one off hides its screen and its pages. Nothing is deleted — turn it
                  back on and the records are where they were.
                </Hint>
              </div>

              {site.kind === "root" ? null : (
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => remove(site)}>
                    <TrashIcon />
                    Delete this sport
                  </Button>
                </div>
              )}
            </div>
          </Panel>
        ))}

        {adding ? (
          <Panel title="A new sport">
            <div className="space-y-3">
              <label className="block">
                <Label>Address</Label>
                <Input
                  value={slug}
                  onChange={(event) => setSlug(event.target.value.toLowerCase())}
                  placeholder="pickle"
                  disabled={busy}
                  className="mt-1.5"
                />
                <Hint className="mt-1">
                  {slugError ?? `It will be served at /${slug || "…"} and cannot be changed later.`}
                </Hint>
              </label>

              <label className="block">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Pickleball"
                  disabled={busy}
                  className="mt-1.5"
                />
              </label>

              <div className="flex gap-2">
                <Button onClick={create} disabled={busy || !slug || Boolean(slugError)}>
                  Create it
                </Button>
                <Button variant="outline" onClick={() => setAdding(false)} disabled={busy}>
                  Cancel
                </Button>
              </div>

              <Hint>
                It starts as a draft with no modules. Switch on what it needs, then give somebody
                “Everything on this sport” from Accounts to make them its admin.
              </Hint>
            </div>
          </Panel>
        ) : (
          <Button variant="outline" onClick={() => setAdding(true)} disabled={busy}>
            <PlusIcon />
            Add a sport
          </Button>
        )}
      </div>
    </div>
  );
}
