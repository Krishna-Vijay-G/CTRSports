import "server-only";

import type { Form, FormEntry } from "@/lib/forms";
import type { StoredEnquiry } from "@/lib/server/enquiriesRepo";

/**
 * Tells whoever owns a form that somebody has entered it.
 *
 * There is no mail transport in this project and this does not add one. What it
 * IS, is the single place one would go: the address is already stored on the
 * form (`notify_to`), the submit route already calls this after the insert, and
 * the call is already wrapped so that a failure here can never lose an entry
 * the database has taken. Adding email later is this function's body and an
 * environment variable — not a migration, and not a change to the route.
 *
 * Until then it logs, so it is visible in the server output that an entry
 * arrived and where it was meant to go.
 *
 * Whatever fills this in should keep two rules. Never throw: the caller
 * swallows it, but a rejection that escapes an unawaited promise is a process
 * that falls over for a reason nobody can see. And never put the answers in the
 * subject line — an entry is somebody's name and phone number, and a subject
 * line is the part of an email that leaks into notifications on a lock screen.
 */
export async function notifyNewEntry(form: Form, entry: FormEntry): Promise<void> {
  if (!form.notify_to) return;

  console.info("[register] entry %s on %s → %s", entry.id, form.slug, form.notify_to);
}

/**
 * The same, for a message sent from the footer.
 *
 * There IS a screen that reads these now — /enquiries in the console — so this
 * is no longer the only trace that one arrived. It is still worth filling in:
 * the screen has to be opened to be read, and the point of a notification is
 * the message that does not wait for somebody to think of looking.
 *
 * Whatever fills the function above in should fill this in at the same time and
 * send it to the footer's own email address — the one edited in the admin,
 * which is by definition the address the organisation publishes for exactly
 * this.
 *
 * The message body is deliberately not logged. It is somebody's enquiry, and a
 * server log is not where it should be readable.
 */
export async function notifyNewEnquiry(enquiry: StoredEnquiry): Promise<void> {
  console.info("[enquiry] %s from %s <%s>", enquiry.id, enquiry.name, enquiry.email);
}
