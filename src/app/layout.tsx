import type { Metadata, Viewport } from "next";
import { SITE_NAME, SITE_URL, SOCIAL_PROFILES } from "@/lib/site";
import "@/styles/globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#090909",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "CTR Unified — Sports Collective | One Team. Multiple Sports.",
  description:
    "CTR Unified is a multi-sport organization bringing athletes, teams, and sporting communities together under one platform — from cricket and volleyball to Formula 4 racing and emerging sports.",
  keywords: [
    "CTR Unified",
    "CTR Sports",
    "Chennai Turbo Riders",
    "multi-sport organization",
    "Formula 4",
    "cricket",
    "volleyball",
    "field hockey",
    "pickleball",
    "motorsport India",
  ],
  authors: [{ name: "CTR Unified" }],
  icons: { icon: "/images/logos/CTR_yellow.png" },
  alternates: { canonical: "/" },
  openGraph: {
    title: "CTR Unified — Sports Collective",
    description:
      "One Team. Multiple Sports. Unlimited Possibilities. CTR Unified brings athletes and teams together across every discipline.",
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "CTR Unified — Sports Collective",
    description: "One Team. Multiple Sports. Unlimited Possibilities.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SportsOrganization",
  name: SITE_NAME,
  alternateName: "CTR Sports Collective",
  url: SITE_URL,
  logo: `${SITE_URL}/media/ctr-logo.png`,
  sameAs: SOCIAL_PROFILES,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
