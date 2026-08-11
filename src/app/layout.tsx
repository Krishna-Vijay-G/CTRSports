import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { BRAND, SITE, SOCIALS } from "@/config/site";
import "@/styles/globals.css";

/*
 * Self-hosted through next/font rather than a CSS @import, which would cost two
 * extra host connections before the first paint. Both faces ship as variable
 * fonts, so one file each covers every weight the design uses.
 *
 * Plus Jakarta Sans replaced Oswald when the site moved to this layout: the
 * design's headlines are large, bold and sentence-case, which a condensed
 * all-caps face cannot do.
 */
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-body" });
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050506",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: "CTR Unified — One Nation. One Championship.",
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
    title: "CTR Unified — One Nation. One Championship.",
    description: "One Nation. One Championship.",
    url: SITE.url,
    siteName: SITE.name,
    type: "website",
    locale: SITE.locale,
  },
  twitter: {
    card: "summary_large_image",
    title: "CTR Unified — One Nation. One Championship.",
    description: "One Nation. One Championship.",
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
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="antialiased">
        {/*
          The hero photo is the LCP element and currently lives on a third-party
          host. Opening that connection during HTML parse saves the DNS + TLS
          round-trips it would otherwise cost. Drop this once the photography
          moves to S3 behind our own domain — see src/config/images.ts.
        */}
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
