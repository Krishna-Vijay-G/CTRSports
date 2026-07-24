import type { Metadata } from "next";
import { biography } from "@/data/biographyData";
import ScrollProgressBar from "@/components/journey/ScrollProgressBar";
import JourneyMarquee from "@/components/journey/JourneyMarquee";
import JourneyNav from "@/components/journey/JourneyNav";
import ProgressRail from "@/components/journey/ProgressRail";
import ChapterRenderer from "@/components/journey/ChapterRenderer";
import StatsBand from "@/components/journey/StatsBand";
import JourneyFooter from "@/components/journey/JourneyFooter";

const SITE_URL = "https://ctrsports.in";

export const metadata: Metadata = {
  title: "Our Story | Chennai Turbo Riders — From Passion to Purpose",
  description:
    "The journey of Chennai Turbo Riders — India's Formula 4 champions building a complete national motorsport ecosystem from grassroots karting to international racing.",
  keywords: [
    "Chennai Turbo Riders",
    "CTR",
    "Our Story",
    "Formula 4",
    "F4 Indian Championship",
    "Indian Racing League",
    "JK Tyre",
    "FMSCI",
    "Motorsport India",
    "Karting League",
  ],
  authors: [{ name: "Chennai Turbo Riders" }],
  alternates: { canonical: "/academy" },
  openGraph: {
    title: "Our Story | Chennai Turbo Riders — From Passion to Purpose",
    description:
      "From passion to purpose, from track to legacy — the story of India's Turbo Riders and the national motorsport ecosystem they are building.",
    url: `${SITE_URL}/academy`,
    siteName: "CTR Unified",
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "/images/journey/og-journey.jpg",
        width: 1200,
        height: 630,
        alt: "Chennai Turbo Riders — Engineering Speed. Delivering Dominance.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Story | Chennai Turbo Riders",
    description:
      "The story of India's Turbo Riders — from passion to purpose, from track to legacy.",
    images: ["/images/journey/og-journey.jpg"],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsTeam",
  name: "Chennai Turbo Riders",
  alternateName: "CTR",
  sport: "Motorsport",
  foundingDate: "2022",
  url: `${SITE_URL}/academy`,
  logo: `${SITE_URL}/images/logos/CTR_yellow.png`,
  email: "info@chennaiturboriders.in",
  telephone: "+91 95000 16999",
  address: {
    "@type": "PostalAddress",
    streetAddress: "#1, 1st Main Road, Kasthuri Bai Nagar, Adayar",
    addressLocality: "Chennai",
    addressRegion: "Tamil Nadu",
    postalCode: "600020",
    addressCountry: "IN",
  },
  sameAs: [
    "https://www.instagram.com/chennaiturboriders",
    "https://www.facebook.com/chennaiturboriders",
    "https://twitter.com/chennaiturbo",
    "https://www.youtube.com/@chennaiturboriders",
  ],
};

export default function AcademyPage() {
  const { chapters } = biography;
  const [hero, ...rest] = chapters;

  return (
    <div className="bg-ctr-paper text-ctr-body">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ScrollProgressBar />
      <JourneyMarquee text={biography.marquee} />
      <JourneyNav chapters={chapters} />
      <ProgressRail chapters={chapters} />

      <main>
        <ChapterRenderer chapter={hero} />
        <StatsBand />
        {rest.map((chapter) => (
          <ChapterRenderer key={chapter.id} chapter={chapter} />
        ))}
      </main>

      <JourneyFooter />
    </div>
  );
}
