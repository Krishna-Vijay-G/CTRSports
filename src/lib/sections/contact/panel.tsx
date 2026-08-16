"use client";

import { Field, Note, Panel, Row, TextArea } from "@/admin/components/Fields";
import type { SectionPanelProps } from "@/lib/sections/types";
import { CONTACT_MAX, mailHref, telHref, type Contact } from "./model";

/**
 * How to reach the organisation, and the wording over the message box.
 *
 * Split out of the old footer panel, which edited three sections at once
 * because they were three keys of one document. They are three sections now,
 * and three panels is the shape that follows — each one edits exactly what it
 * stores.
 */
export function ContactPanel({ value, onChange }: SectionPanelProps<Contact>) {
  const set = (patch: Partial<Contact>) => onChange({ ...value, ...patch });

  return (
    <>
      <Panel title="Contact">
        <div className="space-y-3">
          <Field
            label="Heading"
            value={value.heading}
            onChange={(heading) => set({ heading })}
            placeholder="Get in touch"
            hint="The small line above the address. Blank hides it."
          />

          <TextArea
            label="Office address"
            value={value.address}
            onChange={(address) => set({ address })}
            rows={3}
            maxLength={CONTACT_MAX.address}
            hint="Printed on the lines you type it on. Blank leaves it out."
          />

          <Row>
            <Field
              label="Phone"
              value={value.phone}
              onChange={(phone) => set({ phone })}
              maxLength={CONTACT_MAX.phone}
              placeholder="9500016999"
              hint={
                value.phone
                  ? telHref(value.phone)
                    ? `Dials ${telHref(value.phone).replace("tel:", "")}`
                    : "Nothing dialable in this — it will be printed, not linked."
                  : "Blank leaves it out."
              }
            />
            <Field
              label="Email"
              value={value.email}
              onChange={(email) => set({ email })}
              maxLength={CONTACT_MAX.email}
              placeholder="admin@example.com"
              hint={
                value.email
                  ? mailHref(value.email)
                    ? "Opens a new message."
                    : "That is not an email address — it will be printed, not linked."
                  : "Blank leaves it out."
              }
            />
          </Row>
        </div>

        <Note className="mt-3">
          This block is at the foot of every page this site serves, because they all draw the one
          footer.
        </Note>
      </Panel>

      <Panel title="Message box">
        <div className="space-y-3">
          <Field
            label="Heading"
            value={value.formHeading}
            onChange={(formHeading) => set({ formHeading })}
            placeholder="Send a message"
            hint="Blank hides it."
          />

          <TextArea
            label="Line under it"
            value={value.formNote}
            onChange={(formNote) => set({ formNote })}
            rows={2}
            maxLength={CONTACT_MAX.formNote}
            hint="One sentence saying what happens next. Blank hides it."
          />
        </div>

        <Note className="mt-3">
          Only the wording is editable. The three boxes — name, email and query — are what the
          form is; there is no question to add or remove, and an entry form with real questions on
          it is what the Registrations screen is for.
        </Note>
      </Panel>
    </>
  );
}
