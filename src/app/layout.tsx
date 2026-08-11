import type { Metadata, Viewport } from "next";
import { Inter, Oswald } from "next/font/google";
import { BRAND, SITE, SOCIALS } from "@/config/site";
import "@/styles/globals.css";

/*
 * Self-hosted through next/font rather than a CSS @import, which would cost two
 * extra host connections before the first paint. Both faces ship as variable
 * fonts, so one file each covers every weight the design uses.
 */
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-body" });
const oswald = Oswald({ subsets: ["latin"], display: "swap", variable: "--font-display" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0A0A",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
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
  authors: [{ name: SITE.name }],
  icons: { icon: BRAND.logo },
  alternates: { canonical: "/" },
  openGraph: {
    title: "CTR Unified — Sports Collective",
    description: "One Team. Multiple Sports. Unlimited Possibilities.",
    url: SITE.url,
    siteName: SITE.name,
    type: "website",
    locale: SITE.locale,
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
  name: SITE.name,
  alternateName: "CTR Sports Collective",
  url: SITE.url,
  logo: `${SITE.url}${BRAND.logo}`,
  sameAs: SOCIALS.map((social) => social.href),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${oswald.variable}`}>
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
