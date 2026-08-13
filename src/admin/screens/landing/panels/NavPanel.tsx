"use client";

import { MAX_NAV_LINKS, type LandingContent } from "@/lib/landingContent";
import { Button } from "@/admin/ui/Button";
import { Input } from "@/admin/ui/Input";
import { PlusIcon, XIcon } from "@/admin/ui/icons";
import { ButtonFields, Note, Panel } from "@/admin/components/Fields";

type Nav = LandingContent["nav"];

export function NavPanel({ value, onChange }: { value: Nav; onChange: (next: Nav) => void }) {
  const { links } = value;

  function setLinks(next: Nav["links"]) {
    onChange({ ...value, links: next });
  }

  function setLink(index: number, patch: Partial<Nav["links"][number]>) {
    setLinks(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  }

  return (
    <>
      <Panel title="Links" hint={`${links.length} of ${MAX_NAV_LINKS}`}>
        <div className="space-y-1.5">
          {links.map((link, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <span className="w-4 shrink-0 text-center text-[11px] text-muted-fg/60">
                {index + 1}
              </span>
              <Input
                value={link.label}
                onChange={(event) => setLink(index, { label: event.target.value })}
                placeholder="Label"
                aria-label={`Link ${index + 1} label`}
                className="h-8 w-28 shrink-0 text-xs"
              />
              <Input
                value={link.href}
                onChange={(event) => setLink(index, { href: event.target.value })}
                placeholder="#anchor"
                aria-label={`Link ${index + 1} destination`}
                className="h-8 min-w-0 flex-1 text-xs"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setLinks(links.filter((_, i) => i !== index))}
                aria-label={`Remove ${link.label || "link"}`}
                className="hover:text-destructive"
              >
                <XIcon />
              </Button>
            </div>
          ))}
        </div>

        {links.length === 0 ? (
          <Note>No links — the header shows the logo and the button only.</Note>
        ) : null}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setLinks([...links, { label: "", href: "#" }])}
          disabled={links.length >= MAX_NAV_LINKS}
          className="mt-2"
        >
          <PlusIcon />
          Add link
        </Button>

        <Note className="mt-3">
          A link with no label is dropped when it is saved — it would be invisible and unclickable
          on the page. Destinations are usually in-page anchors: <code>#about</code>,{" "}
          <code>#sports</code>, <code>#footer</code>.
        </Note>

        <Note className="mt-2">
          This header is on every page, so an anchor that only exists here is sent to the same
          place on the home page from the others — <code>#about</code> becomes{" "}
          <code>/#about</code>, and <code>#top</code> becomes the home page itself. On a phone the
          links move into a dropdown behind the menu button.
        </Note>
      </Panel>

      <Panel title="Header button" hint="home page only">
        <Note className="mb-3">
          Shown on the home page and nowhere else. It points at the footer, and the footer it means
          is this one — on a circuit or a registration page it would be a second route to the same
          contact details, competing with what the visitor came for. Those pages show a{" "}
          <span className="text-foreground">Back</span> button in its place.
        </Note>

        <ButtonFields
          label={value.cta.label}
          href={value.cta.href}
          onLabel={(label) => onChange({ ...value, cta: { ...value.cta, label } })}
          onHref={(href) => onChange({ ...value, cta: { ...value.cta, href } })}
        />
      </Panel>
    </>
  );
}
