import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { SITE } from "@/config/site";
import { formHref, formState, placesLeft, stateMessage } from "@/lib/forms";
import { countEntries } from "@/lib/server/entriesRepo";
import { getFormBySlug } from "@/lib/server/formsRepo";
import { issueToken } from "@/lib/server/registerToken";
import type { Site } from "@/lib/sites";
import { Reveal } from "@/components/ui/Reveal";
import { RegisterForm } from "../register/RegisterForm";
import { SiteShell } from "../SiteShell";

/**
 * One registration form, on this site.
 *
 * ── Why this is not cached ────────────────────────────────────────────────
 *
 * Every other public route here is `revalidate = 60`, and this one deliberately
 * is not. A form that has just been closed has to be closed on the very next
 * request: a minute of a cached page still saying "open" is a minute of entries
 * arriving for something that has shut. The submit route re-reads the row
 * anyway, so a stale page could never actually store one — but showing somebody
 * a form, letting them fill it in and then refusing it is a worse minute than a
 * page that renders a fraction slower.
 *
 * ── Three states ──────────────────────────────────────────────────────────
 *
 *   missing or draft   404. A draft is not on the internet, and "this exists
 *                      but you cannot see it" is a way of putting it there.
 *   a former address   a permanent redirect to the current one, so a printed
 *                      link or a QR code corrects itself rather than dying.
 *   closed             the introduction, and the closed note in place of the
 *                      questions. Somebody arriving on an old link is owed an
 *                      explanation, not a 404.
 *
 * The chrome is the site's own — a registration page reached from a poster with
 * no way back into the site is a dead end.
 *
 * It is `noindex` on purpose. A form has nothing to rank for, and a closed one
 * sitting in a search result is worse than nothing.
 */

export async function registerMetadata(site: Site, slug: string): Promise<Metadata> {
  const form = await getFormBySlug(site.id, slug).catch(() => null);

  if (!form || form.status === "draft") return { title: "Form not found" };

  const title = form.name || "Registration";
  const description = form.blurb || `Enter ${form.name}.`;

  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: { canonical: formHref(site, form) },
    openGraph: {
      title,
      description,
      url: `${SITE.url}${formHref(site, form)}`,
      siteName: SITE.name,
      type: "website",
      locale: SITE.locale,
    },
  };
}

export async function RegisterDetail({ site, slug }: { site: Site; slug: string }) {
  // The throwing loader, for the reason the circuit page gives: a database
  // that is down must be a 500, not a 404 that a crawler will believe.
  const form = await getFormBySlug(site.id, slug);

  if (!form || form.status === "draft") notFound();
  if (form.slug !== slug) permanentRedirect(formHref(site, form));

  const { nonce, issuedAt } = issueToken(form.slug);

  /*
   * Whether it is taking entries, decided the same way the submit route decides
   * it — status, opening and closing times, and the cap, weighed together.
   *
   * The count is only asked for when there IS a cap: without one it changes
   * nothing, and it is a query on every view of a public page.
   */
  const taken = form.max_entries > 0 ? await countEntries(form.id) : 0;
  const state = formState(form, taken);
  const left = placesLeft(form, taken);

  return (
    <SiteShell site={site} year={new Date().getFullYear()}>
          {/*
            One centred column, not a page-wide spread.
            A form is read and filled in top to bottom, and at 1560px a 672px
            column pinned to the left leaves two thirds of the card empty beside
            it — which reads as a page that failed to load the rest. Everything
            in this section shares the same centred column, so the heading, the
            places-left line and the form itself all line up on one axis. The
            TEXT inside stays left-aligned: a centred paragraph is harder to read
            because every line starts in a different place.
          */}
          <section className="shell py-14 sm:py-20">
            <Reveal className="mx-auto max-w-2xl">
              <span className="pill-label">
                {state === "open"
                  ? "Registration"
                  : state === "scheduled"
                    ? "Not open yet"
                    : state === "full"
                      ? "Full"
                      : "Entries closed"}
              </span>

              <h1 className="headline mt-4 text-[clamp(1.9rem,4.5vw,3.2rem)]">
                {form.intro_title || form.name}
              </h1>

              {form.intro_body ? (
                <p className="body-copy mt-5 whitespace-pre-line">{form.intro_body}</p>
              ) : null}
            </Reveal>

            {/* Said before the questions rather than after them: somebody
                looking at the last few places should know that before they
                start filling it in, not when they press send. */}
            {state === "open" && left !== null ? (
              <Reveal delay={0.05} className="mx-auto mt-6 max-w-2xl">
                <p className="text-[13px] text-fg-muted">
                  {left === 0
                    ? "No places left."
                    : left === 1
                      ? "One place left."
                      : `${left} places left of ${form.max_entries}.`}
                </p>
              </Reveal>
            ) : null}

            <Reveal delay={0.08} className="mx-auto mt-10 max-w-2xl">
              {state === "open" ? (
                <RegisterForm form={form} site={site.slug} nonce={nonce} issuedAt={issuedAt} />
              ) : (
                <ClosedNote message={stateMessage(form, state)} />
              )}
            </Reveal>
          </section>
    </SiteShell>
  );
}

function ClosedNote({ message }: { message: string }) {
  return (
    <div className="panel-card p-8 text-center sm:p-10">
      <p className="body-copy">{message}</p>
    </div>
  );
}
