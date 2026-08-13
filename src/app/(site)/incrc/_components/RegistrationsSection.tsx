import Link from "next/link";
import { formHref, type FormSummary } from "@/lib/forms";
import type { IncrcContent } from "@/lib/incrcContent";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Every entry form for this page, as cards.
 *
 * This is the answer to "there is more than one thing to register for". The
 * yellow band above asks once, loudly, and points at whichever form matters
 * most; this lists all of them — the season entry, the marshals, the media
 * accreditation — so the second and third are not stranded on addresses nobody
 * can find.
 *
 * ── Which forms ───────────────────────────────────────────────────────────
 *
 * Not a list chosen here. The section shows every published form assigned to
 * this page, in the order the registrations screen puts them in. That is the
 * whole point of the split: somebody who owns entry forms can publish one and
 * have it appear, without asking whoever owns this page to add a line to a
 * document. A draft never appears, because a draft is not on the internet.
 *
 * A closed form still appears by default, greyed and labelled. Somebody looking
 * for a category that has shut is owed the answer "it closed", not a page that
 * never mentions it — but `showClosed` is there for the day the list gets long.
 *
 * Nothing to show means nothing rendered. That matters more than usual here:
 * the section id was appended to INCRC_SECTION_IDS, which switches it ON for
 * every stored document, so a deploy would otherwise put an empty band on a
 * live page.
 */
export function RegistrationsSection({
  registrations,
  forms,
}: {
  registrations: IncrcContent["registrations"];
  forms: FormSummary[];
}) {
  const shown = registrations.showClosed ? forms : forms.filter((form) => form.status === "open");

  if (shown.length === 0) return null;

  return (
    <section id="registrations" className="shell py-16 sm:py-20">
      <SectionHeading label={registrations.label} title={registrations.title} />

      {registrations.body ? (
        <Reveal className="mt-5">
          <p className="body-copy mx-auto max-w-2xl text-center">{registrations.body}</p>
        </Reveal>
      ) : null}

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((form, index) => (
          // The Reveal is INSIDE the li: a <div> between a <ul> and its <li> is
          // invalid and browsers reparent it.
          <li key={form.id} className="flex">
            <Reveal delay={Math.min(index, 5) * 0.06} className="flex w-full">
              <FormCard form={form} />
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FormCard({ form }: { form: FormSummary }) {
  const closed = form.status !== "open";

  /* A closed form is not a link. There is a page at the other end and it does
     explain itself, but a card that invites a click and then says "no" is a
     worse answer than a card that says "no" where it stands. */
  const body = (
    <>
      <span className="flex items-center gap-2">
        <span
          className={
            closed
              ? "inline-flex items-center rounded-full border border-line px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-fg-faint"
              : "inline-flex items-center rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent-ink"
          }
        >
          {closed ? "Entries closed" : "Open"}
        </span>
      </span>

      <span className="mt-4 block font-display text-lg font-bold leading-snug text-fg transition-colors group-hover:text-accent">
        {form.name}
      </span>

      {form.blurb ? (
        <span className="mt-2 block text-sm leading-relaxed text-fg-muted">{form.blurb}</span>
      ) : null}

      <span
        className={
          closed
            ? "mt-auto inline-flex items-center gap-2 pt-6 text-[13px] font-semibold text-fg-faint"
            : "mt-auto inline-flex items-center gap-2 pt-6 text-[13px] font-semibold text-fg-faint transition-colors group-hover:text-accent"
        }
      >
        {closed ? "Closed" : "Enter"}
        {closed ? null : (
          <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
            &rarr;
          </span>
        )}
      </span>
    </>
  );

  if (closed) {
    return <div className="panel-card flex h-full w-full flex-col p-6 opacity-70">{body}</div>;
  }

  return (
    <Link
      href={formHref(form)}
      className="panel-card group flex h-full w-full flex-col p-6 transition-colors duration-300 hover:border-accent/40"
    >
      {body}
    </Link>
  );
}
