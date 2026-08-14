import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { MEDIA_BASE_URL } from "@/config/media";
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

/*
 * The admin's face, and only the admin's. A humanist sans with a tall x-height
 * that stays legible at the 13-14px the tool is built at, and visibly not the
 * site's own type — the editor should never be mistaken for the page it edits.
 */
const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
  variable: "--font-ui",
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
    <html lang="en" className={`${inter.variable} ${jakarta.variable} ${plex.variable}`}>
      <body className="antialiased">
        {/*
          The first banner photo is the LCP element and lives on another host.
          Opening those connections during HTML parse saves the DNS + TLS
          round-trips they would otherwise cost.

          Two hosts, because the photography moved off stock and onto two of our
          own places at once: the media domain, which every uploaded picture is
          served from, and the artwork repository the banners still use. Unsplash
          was here and is not any more — nothing on either page points at it now.
          Drop whichever of these stops being the host of the first banner.

          NEITHER takes crossOrigin. A preconnect is only reused by a request
          whose CORS mode matches, and every image on this site is drawn with a
          plain <img> and no `crossorigin` attribute — so `crossOrigin=""` opened
          an anonymous-CORS connection the images could not use, and then paid
          for a second one. That is a preconnect doing nothing but cost. It goes
          back only if something here is ever drawn onto a canvas.

          The media host is not written down: it comes from MEDIA_BASE_URL, the
          same constant the default image URLs are built from, so this line
          cannot end up pointing at last month's host.
        */}
        <link rel="preconnect" href={MEDIA_BASE_URL} />
        <link rel="preconnect" href="https://raw.githubusercontent.com" />
        {children}
      </body>
    </html>
  );
}
