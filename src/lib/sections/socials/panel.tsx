"use client";

import { Button } from "@/admin/ui/Button";
import { Input, Select } from "@/admin/ui/Input";
import { PlusIcon, XIcon } from "@/admin/ui/icons";
import { Note, Panel } from "@/admin/components/Fields";
import type { SectionPanelProps } from "@/lib/sections/types";
import { MAX_SOCIALS, SOCIAL_ICONS, type SocialIconName, type Socials } from "./model";

/** The row of accounts in the footer. */
export function SocialsPanel({ value, onChange }: SectionPanelProps<Socials>) {
  function setSocial(index: number, patch: Partial<Socials[number]>) {
    onChange(value.map((social, i) => (i === index ? { ...social, ...patch } : social)));
  }

  return (
    <Panel title="Social links" hint={`${value.length} of ${MAX_SOCIALS}`}>
      <div className="space-y-1.5">
        {value.map((social, index) => (
          <div key={index} className="flex items-center gap-1.5">
            <Select
              value={social.icon}
              onChange={(event) => setSocial(index, { icon: event.target.value as SocialIconName })}
              aria-label={`Link ${index + 1} icon`}
              className="h-8 w-[92px] shrink-0 px-1.5 text-xs"
            >
              {SOCIAL_ICONS.map((icon) => (
                <option key={icon} value={icon}>
                  {icon}
                </option>
              ))}
            </Select>
            <Input
              value={social.label}
              onChange={(event) => setSocial(index, { label: event.target.value })}
              placeholder="Label"
              aria-label={`Link ${index + 1} label`}
              className="h-8 w-24 shrink-0 text-xs"
            />
            <Input
              value={social.href}
              onChange={(event) => setSocial(index, { href: event.target.value })}
              placeholder="https://…"
              aria-label={`Link ${index + 1} address`}
              className="h-8 min-w-0 flex-1 text-xs"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              aria-label={`Remove ${social.label || "social link"}`}
              className="hover:text-destructive"
            >
              <XIcon />
            </Button>
          </div>
        ))}
      </div>

      {value.length === 0 ? <Note>No social links — the footer shows the brand only.</Note> : null}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...value, { label: "", href: "https://", icon: "website" }])}
        disabled={value.length >= MAX_SOCIALS}
        className="mt-2"
      >
        <PlusIcon />
        Add social
      </Button>

      <Note className="mt-3">
        The icon is picked from a fixed set — anything else falls back to the globe. These
        addresses are also what search engines are told about the organisation, so use the real
        profile URLs.
      </Note>
    </Panel>
  );
}
