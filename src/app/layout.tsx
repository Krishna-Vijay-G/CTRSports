import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { SEO, SITE } from "@/config/site";
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
  title: SEO.title,
  description: SEO.description,
  keywords: [...SEO.keywords],
  authors: [{ name: SITE.name }],
  icons: { icon: SEO.logo },
  alternates: { canonical: "/" },
  openGraph: {
    title: SEO.title,
    description: SEO.description,
    url: SITE.url,
    siteName: SITE.name,
    type: "website",
    locale: SITE.locale,
  },
  twitter: {
    card: "summary_large_image",
    title: SEO.title,
    description: SEO.description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`}>
      <body className="antialiased">
        {/*
          The hero photo is the LCP element and, until real photography is
          uploaded, lives on a third-party host. Opening that connection during
          HTML parse saves the DNS + TLS round-trips it would otherwise cost.
          Drop this once the photography is served from our own domain.
        */}
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="" />
        {children}
      </body>
    </html>
  );
}
