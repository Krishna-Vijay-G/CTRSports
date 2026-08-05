import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { RegistrationForm } from "./_components/RegistrationForm";

export const metadata: Metadata = {
  title: "Race Registration | Chennai Turbo Riders",
  description:
    "Register for the Indian National Car Racing Championship — eight categories across national rounds on India's best circuits.",
  alternates: { canonical: "/academy/registration" },
  openGraph: {
    title: "Race Registration | Chennai Turbo Riders",
    description:
      "Register for the Indian National Car Racing Championship — eight categories across national rounds on India's best circuits.",
    url: `${SITE_URL}/academy/registration`,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_IN",
  },
};

export default function RegistrationPage() {
  // Computed on the server and handed to the client form, so the date input's
  // "no future dates" bound agrees with hydration instead of drifting from a
  // client-side `new Date()`.
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-ctr-paper text-ctr-body">
      <header className="border-b border-ctr-navy/10">
        <div className="section-container flex items-center justify-between py-4">
          <Link href="/academy" className="flex items-center gap-3">
            <img
              src="/images/journey/CTR_yellow.png"
              alt="Chennai Turbo Riders"
              className="h-9 w-auto"
              fetchPriority="high"
              decoding="async"
            />
            <span className="font-display text-sm font-bold uppercase tracking-wide text-ctr-navy">
              CTR · Registration
            </span>
          </Link>
          <Link
            href="/academy"
            className="font-display text-xs font-semibold uppercase tracking-widest text-ctr-navy/60 transition hover:text-ctr-navy"
          >
            ← Back
          </Link>
        </div>
      </header>

      <main>
        <RegistrationForm maxDob={todayIso} />
      </main>
    </div>
  );
}
