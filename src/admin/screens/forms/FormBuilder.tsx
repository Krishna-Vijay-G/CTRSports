"use client";

import {
  FIELD_TYPE_LABELS,
  FORM_LIMITS,
  FORM_STATUSES,
  STATUS_LABELS,
  formState,
  slugify,
  type Form,
} from "@/lib/forms";
import type { SlugHolder } from "@/lib/slug";
import { Button } from "@/admin/ui/Button";
import { Input, Label, Select } from "@/admin/ui/Input";
import { TrashIcon } from "@/admin/ui/icons";
import { Field, Hint, Note, Panel, Row, TextArea } from "@/admin/components/Fields";
import { FormerSlugs } from "@/admin/components/FormerSlugs";
import { SlugField } from "@/admin/components/SlugField";
import { FormOutline } from "./FormOutline";

/**
 * An instant, as `<input type="datetime-local">` wants it.
 *
 * That control speaks the visitor's own wall clock with no zone attached, so
 * this converts out of UTC on the way in and `fromInput` converts back on the
 * way out. The stored value is always an instant; only the box is local.
 */
function forInput(iso: string): string {
  if (!iso) return "";

  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";

  // Shifted into local time, then trimmed to the minute — the format the
  // control accepts, and the precision it offers.
  return new Date(at.getTime() - at.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function fromInput(value: string): string {
  if (!value) return "";

  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? "" : at.toISOString();
}

/** What the form is doing right now, for the panel's own heading. */
function liveState(form: Form): string {
  const state = formState(form);

  if (state === "scheduled") return "waiting to open";
  if (state === "closed") return "not taking entries";
  if (state === "draft") return "a draft";

  return form.max_entries > 0 ? `open · ${form.max_entries} places` : "open";
}

/**
 * One form's record: where it lives, what it says, and what it asks.
 *
 * The address is the field with the most care around it, because it is the one
 * that gets printed. It is shown as the whole URL rather than a slug in a box,
 * so what is being decided is obvious, and changing it says out loud that the
 * old one keeps working — which it does, from `former_slugs`.
 *
 * Status is a select rather than a switch because there are three states and
 * they are not a spectrum: a draft is invisible, an open form takes entries,
 * and a closed one still explains itself to anyone arriving on an old link.
 */
export function FormBuilder({
  form,
  onChange,
  onDelete,
  onFocusPage,
  onReleasedSlug,
  readOnly,
  busy,
}: {
  form: Form;
  onChange: (next: Form) => void;
  onDelete: () => void;
  /** Handed to the outline: which page the preview beside this should show. */
  onFocusPage?: (sectionId: string) => void;
  /** An address taken from another form's history — see FormsEditor. */
  onReleasedSlug?: (holder: SlugHolder, slug: string) => void;
  /** A page editor may look, so they can point a button at it. Nothing more. */
  readOnly: boolean;
  busy: boolean;
}) {
  const set = (patch: Partial<Form>) => onChange({ ...form, ...patch });

  if (readOnly) return <ReadOnly form={form} />;

  return (
    <>
      <Panel title="Form">
        <div className="space-y-3">
          <Field
            label="Name"
            value={form.name}
            /*
             * The address does NOT follow the name.
             *
             * It used to, while the two still matched, which was a reasonable
             * rule back when the address was invented by the screen — the form
             * arrived called "New form" at `/register/new-form` and the rule
             * was the only thing that ever moved it off. It is asked for at
             * creation now, so the address is always something a person chose,
             * and a rule that quietly moved it because somebody fixed a typo in
             * the title would be moving a decision they had already made. The
             * "Use the name" button beside the box is the same offer, out loud.
             */
            onChange={(name) => set({ name })}
            maxLength={FORM_LIMITS.name}
            placeholder="2026 season entry"
            hint="What the admin and the cards on the page call it."
          />

          <SlugField
            kind="form"
            value={form.slug}
            onChange={(slug) => set({ slug })}
            exceptId={form.id}
            suggestion={slugify(form.name)}
            onReleased={onReleasedSlug}
            disabled={busy}
          />

          <FormerSlugs
            kind="form"
            slugs={form.former_slugs}
            onChange={(former_slugs) => set({ former_slugs })}
            disabled={busy}
          />

          <Hint>
            Changing the address keeps the old one working — it moves into the list above and
            starts redirecting, so a printed link or a QR code does not break.
          </Hint>

          <Row>
            {/*
              The "On which page" select is gone.

              A form belonged to `landing`, `incrc` or nothing, and that choice
              decided who could link to it. It belongs to a SPORT now, set when
              it is created from that sport's screen and never moved — so there
              is nothing here to choose, and offering the choice would be
              offering to move a form between sports, which is not a thing the
              slug table or the media folders would survive.
            */}

            <div className="block">
              <Label>Status</Label>
              <Select
                value={form.status}
                onChange={(event) => set({ status: event.target.value as Form["status"] })}
                className="mt-1.5 w-full"
              >
                {FORM_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
              <Hint className="mt-1">
                {form.status === "draft"
                  ? "Not on the internet at all — the address 404s."
                  : form.status === "open"
                    ? "Live, and taking entries."
                    : "Live, but the questions are replaced by the closed note."}
              </Hint>
            </div>
          </Row>

          <Field
            label="One line"
            value={form.blurb}
            onChange={(blurb) => set({ blurb })}
            maxLength={FORM_LIMITS.blurb}
            hint="Printed on the card that links to it."
          />
        </div>
      </Panel>

      <Panel title="When and how many" hint={liveState(form)}>
        <div className="space-y-3">
          <Row>
            <div className="block">
              <Label>Opens</Label>
              <Input
                type="datetime-local"
                value={forInput(form.opens_at)}
                onChange={(event) => set({ opens_at: fromInput(event.target.value) })}
                className="mt-1.5"
              />
              <Hint className="mt-1">Blank means as soon as the status is Open.</Hint>
            </div>

            <div className="block">
              <Label>Closes</Label>
              <Input
                type="datetime-local"
                value={forInput(form.closes_at)}
                onChange={(event) => set({ closes_at: fromInput(event.target.value) })}
                className="mt-1.5"
              />
              <Hint className="mt-1">Blank means until somebody closes it by hand.</Hint>
            </div>
          </Row>

          <div className="block">
            <Label>Places</Label>
            <Input
              type="number"
              min={0}
              value={form.max_entries || ""}
              onChange={(event) => set({ max_entries: Math.max(0, Number(event.target.value) || 0) })}
              placeholder="No limit"
              className="mt-1.5"
            />
            <Hint className="mt-1">
              Blank or zero takes entries until it is closed. With a number, it shuts itself the
              moment the last place goes — counted inside the write, so two people cannot both take
              it.
            </Hint>
          </div>

          {form.opens_at && form.closes_at && form.closes_at <= form.opens_at ? (
            <Note className="text-destructive">
              It closes before it opens, so it will never take an entry.
            </Note>
          ) : null}

          <Note>
            These are read in the visitor&rsquo;s browser as a moment in time, not as a wall clock —
            a form closing at six on Friday closes at six here, whatever time that is for somebody
            entering from abroad. Status still wins: none of this opens a form set to Draft.
          </Note>
        </div>
      </Panel>

      <Panel title="Copy">
        <div className="space-y-3">
          <Field
            label="Heading"
            value={form.intro_title}
            onChange={(intro_title) => set({ intro_title })}
            maxLength={FORM_LIMITS.intro_title}
            placeholder={form.name}
            hint="The headline on the form's own page. Blank uses the name."
          />
          <TextArea
            label="Introduction"
            value={form.intro_body}
            onChange={(intro_body) => set({ intro_body })}
            rows={3}
            hint="What this is for, who it is for, and anything they should have to hand."
          />
          <Field
            label="Button"
            value={form.submit_label}
            onChange={(submit_label) => set({ submit_label })}
            maxLength={FORM_LIMITS.submit_label}
            placeholder="Send"
          />

          <div className="h-px bg-border" />

          <Field
            label="Thank-you heading"
            value={form.success_title}
            onChange={(success_title) => set({ success_title })}
            maxLength={FORM_LIMITS.success_title}
          />
          <TextArea
            label="Thank-you message"
            value={form.success_body}
            onChange={(success_body) => set({ success_body })}
            rows={2}
            hint="Shown in place of the form once it is sent. Say what happens next."
          />
          <TextArea
            label="Closed note"
            value={form.closed_note}
            onChange={(closed_note) => set({ closed_note })}
            rows={2}
            hint="What someone arriving on an old link sees once the status is Closed."
          />
        </div>
      </Panel>

      {/*
        The pages, with their questions nested under them. One component, because
        the two lists cannot be edited apart: moving a question to another page
        writes on the QUESTION, and deleting a page rewrites every question that
        was on it. See FormOutline for why it is not two `Repeater`s.
      */}
      {/* Keyed by the form: opening a page or a question is a statement about
          THIS form, and switching to another one must not carry it over. */}
      <FormOutline
        key={form.id}
        sections={form.sections}
        fields={form.fields}
        onChange={set}
        onFocusPage={onFocusPage}
      />

      <Panel title="Notifications">
        <div className="space-y-3">
          <Field
            label="Send entries to"
            value={form.notify_to}
            onChange={(notify_to) => set({ notify_to })}
            maxLength={FORM_LIMITS.notify_to}
            placeholder="entries@example.com"
          />
          <Note>
            Nothing is emailed yet — there is no mail set up on this site. The address is stored
            so that when it is, this form already knows where its entries go. Every entry is
            saved either way, and the Entries tab is where they are read.
          </Note>
        </div>
      </Panel>

      <div className="flex">
        <Button variant="destructive" size="sm" onClick={onDelete} disabled={busy}>
          <TrashIcon />
          Delete form
        </Button>
      </div>
    </>
  );
}

/**
 * What a page editor sees.
 *
 * The whole form, plainly, and no controls: they are here to find out which one
 * to point a button at, and the fastest way to know is to see what it asks.
 */
function ReadOnly({ form }: { form: Form }) {
  return (
    <>
      <Panel title={form.name || "Untitled form"} hint={`/register/${form.slug}`}>
        <div className="space-y-2">
          <p className="text-[13px] leading-relaxed text-foreground">
            {form.blurb || "No description."}
          </p>
          <p className="text-xs text-muted-fg">
            {STATUS_LABELS[form.status]}
          </p>
        </div>
      </Panel>

      <Panel title="Questions" hint={`${form.fields.length} in all`}>
        {form.fields.length === 0 ? (
          <p className="rounded-md border border-dashed border-input px-4 py-6 text-center text-xs text-muted-fg">
            No questions yet.
          </p>
        ) : (
          <ol className="space-y-1.5">
            {form.fields.map((field, index) => (
              <li
                key={field.id}
                className="rounded-md border border-border bg-background/60 px-3 py-2"
              >
                <p className="text-[13px] font-medium text-foreground">
                  {field.label || `Question ${index + 1}`}
                  {field.required ? <span className="text-muted-fg"> · required</span> : null}
                </p>
                <p className="text-[11px] text-muted-fg">{FIELD_TYPE_LABELS[field.type]}</p>
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <Note>
        Registrations owns this form. You are looking at it so you can point a button on your
        page at it — the picker on any “Links to” field lists the forms for your pages.
      </Note>
    </>
  );
}
