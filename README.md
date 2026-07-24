# Chennai Turbo Riders — "Our Story" (Journey Microsite)

A cinematic, scroll-driven biography site for **Chennai Turbo Riders (CTR)** — the team's
journey from grassroots passion to a national motorsport ecosystem. Built to the spec in
[`BUILD_PROMPT.md`](./BUILD_PROMPT.md), with copy transcribed verbatim from *World CTR Deck V4*.

**Live target:** `https://chennaiturboriders.in` (the biography lives at `/` here and is intended
to publish at `/journey`).

## Stack

- **Next.js 16** (App Router) · **React 18** · **TypeScript**
- **Tailwind CSS 3.4** + `tailwindcss-animate`
- **Framer Motion 11** (scroll reveals, parallax, draw-in timelines/ladder/track)
- `clsx` + `tailwind-merge` (`cn()` helper), static export (`output: "export"`)

Config, tokens, and reusable brand assets mirror the existing team site at
`../CTR` so this can live standalone or drop into that repo as a `/journey` route group.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static export -> ./out
```

Serve the export with any static host, e.g. `npx serve out`.

## How it's organised

- `src/data/biographyData.ts` — the **single source of truth**. Every chapter (order, copy,
  images, timelines, partners, ladder, stages, CTAs) is data; the page and the sticky rail
  derive from this array. Copy is verbatim from the deck.
- `src/app/page.tsx` — assembles marquee, nav, progress rail, chapters, stat band, footer.
- `src/app/layout.tsx` — metadata, OpenGraph/Twitter, and `SportsTeam` JSON-LD.
- `src/components/journey/`
  - `Motifs.tsx`, `Icons.tsx` — deck signatures: numbered chevron tab, gold title bar,
    animated chevron run, triple-chevron footer strip, diagonal wedges, gold dots, eagle
    watermark, yellow marker highlight.
  - shell: `JourneyMarquee`, `JourneyNav`, `ProgressRail`, `ScrollProgressBar`, `JourneyFooter`,
    `StatsBand`, `Reveal` (scroll-reveal helpers).
  - `chapters/` — one component per `variant` (`hero`, `cards`, `timeline`, `nationalGrid`,
    `highlights`, `ladder`, `academy`, `club`, `roadmap`, `unified`, `finalLap`), wired via
    `ChapterRenderer.tsx`.
  - `LadderChart.tsx`, `GoldTrackLine.tsx`, `PartnerLockup.tsx` — bespoke animated pieces.

Chapter 04 (**National Grid**, `NationalGridChapter.tsx`) is the flagship: it expands the deck
copy into a full **Indian National Car Racing Championship (INCRC)** feature — "One Nation, One
Championship" branding, an INCRC stat strip, the multi-category grid, the real **2026 four-round
calendar**, the CTR × JK Tyre × FMSCI signing gallery, and a cinematic "motorsport family" banner —
with `Follow the Championship @incrc_` links to <https://www.instagram.com/incrc_>.

## Assets

- **Reused from `../CTR`:** `public/images/logos/*`, `public/images/car/hero.jpg`,
  `public/video/background.mp4`, `public/images/sponsors/{fmsci_full,F4_logo,FiA}.png`.
- **Derived from the deck** (`input/*.png`, cropped with Pillow) into `public/images/journey/`:
  `logo-eagle-gold.png` (gold eagle watermark), `panels/*` (chapter photography),
  `origin/*` (three origin cards), `academy/*` (image trio), `teams/*` (five associated-team
  emblems), `logos/{jktyre,irl}.png` (partner marks), and `og-journey.jpg` (1200×630 OG card).

## Accessibility & SEO

- Semantic landmarks, one `<h1>` (hero) + `<h2>` per chapter, skip-to-content link, visible
  gold focus rings, `alt` text on meaningful images, decorative motifs `aria-hidden`.
- Navy `#1B2A63` on paper `#F5F6F8` passes WCAG AA; gold is used only for accents/bars.
- `prefers-reduced-motion` disables looping motifs and eases transforms.
- `sitemap.xml`, `robots.txt`, canonical + OG absolute URLs for the `.in` domain.
