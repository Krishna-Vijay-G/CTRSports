"use client";

import { hexColour } from "@/lib/normalise";
import { cn } from "@/lib/utils";
import { Input, Label } from "@/admin/ui/Input";
import { Hint } from "@/admin/components/Fields";

/**
 * Picks a colour, two ways: the operating system's colour panel, or by typing
 * the hex.
 *
 * ── Why the text box is not validated as you type ─────────────────────────
 *
 * `#F7D619` passes through `#`, `#F`, `#F7`… on the way to being typed, and
 * none of those is a colour. A field that corrected every keystroke would make
 * the hex box unusable — you would type one character and watch it be replaced.
 *
 * So what is typed is kept as typed, and `hexColour` runs on `blur` and on the
 * document's way to the database, where the value is finished being written.
 * The swatch beside it shows the last thing that WAS a colour, so a half-typed
 * value looks half-typed rather than looking like the colour going wrong.
 *
 * That means this component's `value` is not always a colour, which is exactly
 * why the page renderer normalises again rather than trusting it.
 */
export function ColourField({
  label,
  value,
  onChange,
  fallback,
  hint,
  className,
}: {
  label: string;
  /** The stored hex. May be mid-edit, so never assume it is six digits. */
  value: string;
  onChange: (colour: string) => void;
  /** What an unreadable value becomes. The same one the normaliser uses. */
  fallback: string;
  hint?: React.ReactNode;
  className?: string;
}) {
  // The swatch and the OS panel both need a real colour, and neither has a way
  // to say "not yet". This is what they are given while the box is mid-word.
  const settled = hexColour(value, fallback);

  return (
    <div className={cn("block", className)}>
      <Label>{label}</Label>

      <div className="mt-1.5 flex gap-2">
        {/*
          A native colour input, sized to the row and with its own chrome
          stripped: browsers draw a padded, bordered box around the swatch, and
          left alone it sits a few pixels proud of every other control on the
          screen. The wrapper carries the app's border and radius instead.
        */}
        <span className="relative size-9 shrink-0 overflow-hidden rounded-md border border-input">
          <input
            type="color"
            value={settled}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            aria-label={`${label} — colour picker`}
            className="absolute -inset-2 h-[calc(100%+1rem)] w-[calc(100%+1rem)] cursor-pointer border-0 bg-transparent p-0"
          />
        </span>

        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          // Finished typing is when it is worth tidying — and doing it here
          // rather than only on Save means the swatch and the box agree before
          // anybody looks away.
          onBlur={() => onChange(hexColour(value, fallback))}
          placeholder={fallback}
          spellCheck={false}
          className="font-mono uppercase"
        />
      </div>

      {hint ? <Hint className="mt-1">{hint}</Hint> : null}
    </div>
  );
}
