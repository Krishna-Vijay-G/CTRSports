"use client";

import { STATUS_LABELS, formHref, slugFromHref, type FormSummary } from "@/lib/forms";
import type { FormPageKey } from "@/lib/roles";
import { Input, Label } from "@/admin/ui/Input";
import { Select } from "@/admin/ui/Input";
import { Hint } from "@/admin/components/Fields";

/**
 * Points a button at a registration form, instead of typing a URL.
 *
 * ── What gets stored ──────────────────────────────────────────────────────
 *
 * The resolved path — `/register/<slug>` — and not the form's id. An id would
 * be the tidier foreign key, and it is the wrong choice here: this value lands
 * in a page's JSONB document, and `normaliseIncrcContent` runs in the BROWSER
 * as well as on the server, where it cannot look anything up. The same document
 * already says so about a round's `trackId`. Storing the path keeps every
 * renderer, preview and normaliser working on the string it already had.
 *
 * What that costs is a rename, and that is paid for elsewhere: renaming a form
 * pushes the old address into `former_slugs`, and /register/[slug] permanently
 * redirects it. So a stored link keeps working; it just points at the door
 * rather than the room.
 *
 * ── Two things it says out loud ───────────────────────────────────────────
 *
 * A form's status is in the option text, so nobody points a live button at a
 * draft — which would be a 404 for every visitor — without seeing the word
 * "draft" as they pick it.
 *
 * A stored path matching no form gets a warning rather than silence. That is a
 * button on the live site going nowhere, and the whole reason it is worth a
 * component instead of a text field.
 */
export function FormPicker({
  label,
  value,
  onChange,
  forms,
  page,
  hint,
}: {
  label: string;
  /** The stored href. A /register/… path shows as a chosen form. */
  value: string;
  onChange: (href: string) => void;
  /** Every form this account may point at. Loaded server-side. */
  forms: FormSummary[];
  /** Only this page's forms, and the ones on no page, are offered. */
  page: FormPageKey;
  hint?: string;
}) {
  // A form with no page belongs to nobody in particular, so it is offered
  // everywhere rather than nowhere.
  const options = forms.filter((form) => form.page_key === page || form.page_key === "");

  const slug = slugFromHref(value);
  const chosen = slug ? options.find((form) => form.slug === slug) : undefined;

  /*
   * Two different things used to read as "deleted".
   *
   * `options` is already narrowed to this page, so a form Registrations MOVED
   * to another page dropped out of it and the picker declared it gone —
   * "anyone clicking it gets a not found page" — about a link that works
   * perfectly well. `forms` is the unnarrowed list this account may see, so
   * looking there first tells the two apart.
   */
  const elsewhere = !chosen && slug ? forms.find((form) => form.slug === slug) : undefined;
  const missing = slug !== "" && !chosen && !elsewhere;

  return (
    <div className="block">
      <Label>{label}</Label>

      <Select
        value={chosen ? chosen.id : missing || elsewhere ? "__missing" : "__url"}
        onChange={(event) => {
          const picked = options.find((form) => form.id === event.target.value);
          // Choosing the escape hatch empties the field rather than keeping the
          // last form's path — otherwise it looks chosen while claiming not to be.
          onChange(picked ? formHref(picked) : "");
        }}
        className="mt-1.5 w-full"
      >
        <option value="__url">— type a link instead —</option>

        {missing ? (
          <option value="__missing">/register/{slug} — no longer exists</option>
        ) : null}

        {elsewhere ? (
          <option value="__missing">/register/{slug} — now on another page</option>
        ) : null}

        {options.map((form) => (
          <option key={form.id} value={form.id}>
            {form.name}
            {form.status === "open" ? "" : ` · ${STATUS_LABELS[form.status].toLowerCase()}`}
          </option>
        ))}
      </Select>

      {/* Only when it is not a form: a typed link still has to be editable, and
          this is the same input it was before the picker existed. */}
      {!chosen ? (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#register"
          className="mt-1.5"
        />
      ) : null}

      <Hint className="mt-1">
        {missing ? (
          <span className="text-destructive">
            This points at a form that no longer exists — anyone clicking it gets a
            &ldquo;not found&rdquo; page.
          </span>
        ) : elsewhere ? (
          <span>
            <span className="text-foreground">{elsewhere.name}</span> has been moved to another
            page. The link still works — you just cannot pick it from this list any more.
          </span>
        ) : chosen && chosen.status !== "open" ? (
          <span className="text-destructive">
            That form is {STATUS_LABELS[chosen.status].toLowerCase()}.{" "}
            {chosen.status === "draft"
              ? "Nobody can open it until Registrations publishes it."
              : "Anyone clicking it is told entries have closed."}
          </span>
        ) : options.length === 0 ? (
          "No registration forms for this page yet. Registrations makes them on their own screen."
        ) : (
          (hint ?? "Pick a form, or type any address.")
        )}
      </Hint>
    </div>
  );
}
