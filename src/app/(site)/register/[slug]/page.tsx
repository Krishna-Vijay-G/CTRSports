import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { SITE } from "@/config/site";
import { formHref, formState, placesLeft, stateMessage } from "@/lib/forms";
import { getLandingContentSafe } from "@/lib/server/contentRepo";
import { countEntriesSafe } from "@/lib/server/entriesRepo";
import { getFormBySlug } from "@/lib/server/formsRepo";
import { issueToken } from "@/lib/server/registerToken";
import { sendAnchorsHome } from "@/lib/siteChrome";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Reveal } from "@/components/ui/Reveal";
import { RegisterForm } from "../_components/RegisterForm";

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
 * The chrome is the landing document, as everywhere else — a registration page
 * reached from a poster with no way back into the site is a dead end.
 *
 * It is `noindex` on purpose. A form has nothing to rank for, and a closed one
 * sitting in a search result is worse than nothing.
 */

export const dynamic = "force-dynamic";

/** Nothing on this page is an anchor — every nav link goes home. */
const LOCAL_ANCHORS: string[] = [];

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const form = await getFormBySlug(slug).catch(() => null);

  if (!form || form.status === "draft") return { title: "Form not found" };

  const title = form.name || "Registration";
  const description = form.blurb || `Enter ${form.name}.`;

  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: { canonical: formHref(form) },
    openGraph: {
      title,
      description,
      url: `${SITE.url}${formHref(form)}`,
      siteName: SITE.name,
      type: "website",
      locale: SITE.locale,
    },
  };
}

export default async function RegisterPage({ params }: Params) {
  const { slug } = await params;

  const [form, landing] = await Promise.all([
    // The throwing loader, for the reason /circuits/[slug] gives: a database
    // that is down must be a 500, not a 404 that a crawler will believe.
    getFormBySlug(slug),
    getLandingContentSafe(),
  ]);

  if (!form || form.status === "draft") notFound();
  if (form.slug !== slug) permanentRedirect(formHref(form));

  const chrome = sendAnchorsHome(landing, LOCAL_ANCHORS);
  const { nonce, issuedAt } = issueToken(form.slug);

  /*
   * Whether it is taking entries, decided the same way the submit route decides
   * it — status, opening and closing times, and the cap, weighed together.
   *
   * The count is only asked for when there IS a cap: without one it changes
   * nothing, and it is a query on every view of a public page.
   */
  const taken = form.max_entries > 0 ? await countEntriesSafe(form.id) : 0;
  const state = formState(form, taken);
  const left = placesLeft(form, taken);

  return (
    <div id="top" className="min-h-screen bg-page p-2 sm:p-3">
      {/* Same shell as every other route: the page colour showing around one
          rounded card, capped at 1920 so a full-HD window is filled. */}
      <div className="mx-auto max-w-[1920px] overflow-hidden rounded-card bg-surface">
        <main id="main-content">
          <SiteHeader
            content={chrome}
            home={false}
            className="relative z-20 border-b border-line bg-surface"
          />

          <section className="shell py-14 sm:py-20">
            <Reveal className="max-w-2xl">
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
              <Reveal delay={0.05} className="mt-6 max-w-2xl">
                <p className="text-[13px] text-fg-muted">
                  {left === 0
                    ? "No places left."
                    : left === 1
                      ? "One place left."
                      : `${left} places left of ${form.max_entries}.`}
                </p>
              </Reveal>
            ) : null}

            <Reveal delay={0.08} className="mt-10 max-w-2xl">
              {state === "open" ? (
                <RegisterForm form={form} nonce={nonce} issuedAt={issuedAt} />
              ) : (
                <ClosedNote message={stateMessage(form, state)} />
              )}
            </Reveal>
          </section>
        </main>

        <SiteFooter content={chrome} year={new Date().getFullYear()} />
      </div>
    </div>
  );
}

function ClosedNote({ message }: { message: string }) {
  return (
    <div className="panel-card p-8 text-center sm:p-10">
      <p className="body-copy">{message}</p>
    </div>
  );
}
