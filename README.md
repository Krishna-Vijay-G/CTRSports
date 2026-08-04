# CTR Unified — Sports Collective

The site for **CTR Unified**, a multi-sport organisation: a landing page, one posts page per
sport, a cinematic scroll-driven biography of **Chennai Turbo Riders** at `/academy`, and a
media admin behind a login. Copy for the biography is transcribed verbatim from
*World CTR Deck V4*.

**Live:** <https://ctrsports.in>

| URL | What it is |
| --- | --- |
| `/` | Landing page — hero, latest `main` posts, the sports rail, the media grid |
| `/academy` | "Our Story" — the CTR biography microsite |
| `/academy/post`, `/cricket/post`, `/karting/post`, `/volleyball/post` | One posts page per sport |
| `/media/admin` | Posts, site copy, login — `noindex` |
| `/api/admin/*` | Session-checked JSON routes behind the admin |

## Stack

- **Next.js 16** (App Router) · **React 18** · **TypeScript**
- **Tailwind CSS 3.4** + `tailwindcss-animate`
- **Framer Motion 11** (scroll reveals, parallax, draw-in timelines/ladder/track)
- `clsx` + `tailwind-merge` (`cn()` helper)
- **Neon Postgres** + **AWS S3** for the media-post system (see below)

> The site is a **server-rendered** Next.js app on Vercel — the media admin needs API routes,
> a database and file uploads, so a static export is not an option.

## Run

```bash
npm install
cp .env.example .env   # then fill in the real values
npm run dev            # http://localhost:3000
npm run build
npm start
```

## Media posts & admin

Posts are stored in Neon Postgres; their images and videos live in S3. The long-form reference
— upload paths, CORS, template internals, the schema and its migration history — is in
[`docs/media-and-templates.txt`](./docs/media-and-templates.txt).

- **Sport** — every post is tagged with one vertical, and that tag decides which page renders
  it: `main` → `/`, `volleyball` → `/volleyball/post`, and so on. See
  [`src/lib/sports.ts`](./src/lib/sports.ts) for the nine ids.
- **Landing page** — the 3 most recent published `main` posts render as rotating full-bleed
  banners under the hero (`#latest`). Every published `main` post also appears in the grid at
  the bottom of the page (`#media`).
- **Sport pages** — the crest up top with a tilt/zoom parallax effect, the 3 most recent posts
  for that sport as banners, everything older in the grid below.
- **Admin** — <https://ctrsports.in/media/admin/login>. Create, edit and delete posts with a
  sport, a template, date & time (IST, defaults to now), a draft toggle, and then four
  **optional** pieces: title, subtext, drag-and-drop / browse / paste-URL **image or video**,
  and a link. At least one of title / subtext / media is required — everything else can be
  left blank. The post list can be filtered by sport.

### Links

The call-to-action is optional and typed: `instagram`, `facebook`, `website` or `custom`. The
type picks the glyph and the default wording ("View on Instagram", "Visit website", …);
`custom` carries its own name. Defined in [`src/lib/links.ts`](./src/lib/links.ts).

### Optional fields

A post with no media renders as a **copy-only banner** — a centred typographic slide — whatever
template it was saved with, because `split` and `spotlight` are built around a media half and
would otherwise leave a hole. The saved template comes back if media is added later. A post
with no title lets its subtext step up a size; a grid card with no media skips the media stage
entirely rather than showing an empty box.

## Landing page content

Everything on the landing page that is not a post — splash, brand, hero, the sports section
heading, the sport cards, the footer links — is stored in the `site_content` table as one JSONB
document and edited at **/media/admin/content**. Nothing on that page is hardcoded any more.

- **The table is the only copy.** There is no JSON snapshot in the repo and no import step — with
  no row, the page renders `DEFAULT_LANDING_CONTENT` from
  [`src/lib/landingContent.ts`](./src/lib/landingContent.ts) and the editor opens on it, so
  saving once creates the row.
- Those defaults are a **fallback, not a mirror**. Once the row exists, editing them changes
  nothing live. If you change something in the admin that should survive a database outage,
  change it in both places.
- [`normaliseContent.ts`](./src/lib/normaliseContent.ts) merges the stored document over those
  defaults **on every read as well as every write**, field by field. A partial, stale or corrupt
  document degrades one field at a time instead of taking the page down: missing fields fall
  back, `javascript:` and protocol-relative URLs are replaced, splash timings are clamped,
  duplicate card ids are renumbered, footer links with no valid `https://` address are dropped,
  and unknown keys are discarded. A field deliberately set to `""` stays empty — only a
  *missing* field falls back.
- If the database is unreachable the page renders the defaults rather than failing.

### Sport pages

Built: **`/volleyball/post`**, **`/cricket/post`**, **`/academy/post`**, **`/karting/post`**.
Not built: pickleball, hockey, f4, incrc — those ids are still selectable in the admin, the
posts just have nowhere to show yet. `BUILT_SPORT_PAGES` in
[`src/lib/sports.ts`](./src/lib/sports.ts) is the authoritative list, and the sitemap is
generated from it. `/academy/post` is a child route of the pre-existing `/academy` microsite;
the two don't collide.

Each page's header carries the CTR logo, the wordmark and the sport's own crest.

To add another: copy [`src/app/volleyball/post/page.tsx`](./src/app/volleyball/post/page.tsx) to
`src/app/<slug>/post/page.tsx` and swap the sport id in the three places it appears, add the id
to `BUILT_SPORT_PAGES`, then point its landing card at the new page **in the admin** — the card's
link is content, so editing `DEFAULT_LANDING_CONTENT` only moves the fallback. Crest, hero,
banners, grid, metadata and empty state all come from the shared `SportPostsPage`.

### Templates

Every post is saved with one of five templates, chosen from a visual picker with a live
preview that renders the real banner components at reduced scale. **Templates apply to the
banners only** — the post cards in the grid at the bottom of the page all share one format
(4:3 stage, `object-contain`, copy below). Defined in
[`src/lib/templates.ts`](./src/lib/templates.ts), rendered by
[`BannerTemplates.tsx`](./src/components/post/BannerTemplates.tsx).

| id | Layout |
| --- | --- |
| `wedge` | Diagonal cut, media filling the right. The default and house style. |
| `cinematic` | Edge-to-edge media, copy low-left over a deep scrim. |
| `split` | Clean 50/50 — solid panel left, media right, gold seam. |
| `spotlight` | Framed media with a gold glow; the frame hugs the media so nothing crops. |
| `marquee` | Dimmed full-bleed media, oversized centred headline. |

To add a sixth, append its id to `TEMPLATE_IDS`, add an entry to `TEMPLATES`, write the
component and register it in `COMPONENTS`, then add a wireframe case in `TemplatePicker`.

### Video

- Accepted: MP4, WebM, MOV, M4V — up to 200 MB.
- Banner videos autoplay muted, with a mute toggle beside the carousel arrows. **A video slide
  is never cut off**: it does not loop and the carousel waits for the clip to finish before
  advancing, where an image slide advances on a 7s timer. The progress rail tracks whichever
  applies. A stalled clip still hands over via a duration-derived fallback timer, so the
  carousel cannot park on one slide forever. A lone video post loops, since there is nothing
  to advance to.
- Grid videos show a poster with a play badge and preview on hover.
- A poster frame is captured from the clip in the browser at upload time and stored alongside
  it, so there is something to show before playback starts.
- Videos are **too large for Vercel's ~4.5 MB request-body limit**, so they upload straight
  from the browser to S3 with a presigned PUT. That requires this CORS rule on the bucket
  (already applied):

  ```json
  [{ "AllowedOrigins": ["https://ctrsports.in", "https://www.ctrsports.in",
                        "https://*.vercel.app", "http://localhost:3000"],
     "AllowedMethods": ["PUT", "GET", "HEAD"], "AllowedHeaders": ["*"],
     "ExposeHeaders": ["ETag"], "MaxAgeSeconds": 3000 }]
  ```

  Images still go through the API route, which needs no CORS at all.

### One-time setup

1. Put `DATABASE_URL` and the four `S3_*` values in `.env` (and in the Vercel project's
   environment variables). See [`.env.example`](./.env.example).
2. Create the tables and your admin account:

   ```bash
   npm run create-admin -- <username> <password>
   npm run migrate                 # schema only, safe to re-run
   ```

   Re-running `create-admin` for an existing username resets that password and signs out its
   sessions.

   That is the whole setup. There is no seed step: posts are created at `/media/admin`, and the
   landing copy renders from its built-in defaults until you save it once at
   `/media/admin/content`.

> **The database is the only copy of the content.** Nothing is snapshotted into the repo, so
> deleting a post in the admin is final — the row goes and its S3 objects go with it. If you
> want a safety net, take a database snapshot in the Neon console; point-in-time restore is the
> right tool for that, not a JSON file in git.

### How it fits together

- `scripts/schema.mjs` — the schema, idempotent. Used by both `migrate` and `create-admin`.
- `src/lib/server/db.ts` — Neon HTTP client + `ensureSchema()`.
- `src/lib/server/postsRepo.ts` — post queries (`listPublishedPosts(sport)` for the site,
  `listAllPosts` for admin). The `MediaPost` type itself lives in `src/lib/posts.ts`.
- `src/lib/sports.ts` — the nine verticals: ids, page slugs, crests, taglines.
- `src/lib/links.ts` — the four link types and how a button label is resolved.
- `src/lib/server/siteContent.ts` — read/write the landing document; `normaliseContent.ts`
  repairs it.
- `src/lib/templates.ts` — the five templates and their grid-card treatments.
- `src/lib/server/auth.ts` — scrypt password hashing, DB-backed sessions in an HttpOnly cookie
  (7 days). Only the SHA-256 of the session token is stored.
- `src/lib/server/s3.ts` — proxied upload, presigned upload, delete. Set `S3_PUBLIC_BASE_URL`
  if you put CloudFront or a custom domain in front of the bucket.
- `src/lib/client/uploadMedia.ts` — the browser side: picks the proxy or presigned path,
  reports progress, captures the video poster.
- `src/app/api/admin/*` — login, logout, posts CRUD, upload, upload-url. Every write checks
  the session.
- Images over ~3.5 MB are downscaled to WebP in the browser first
  (`src/lib/client/imageCompress.ts`) to stay under the request-body limit.
- Replacing or deleting a post's media also deletes the orphaned S3 objects.
- Pages use ISR (`revalidate = 60`) and every write revalidates the affected sport's path, so
  changes appear immediately. Re-tagging a post revalidates both the page it left and the page
  it joined. If the database is unreachable the pages still render, just without posts.

## How it's organised

**The folder tree mirrors the URL tree.** To find the code behind a page, walk to its URL:

```
src/
├── app/                                 routing — a folder here is a URL segment
│   ├── layout.tsx                       root shell, site metadata, Organization JSON-LD
│   ├── robots.ts  sitemap.ts
│   │
│   ├── (home)/                          "/"   — route group, does not affect the URL
│   │   ├── page.tsx                     loads the content document + the main posts
│   │   └── _components/                 SplashScreen · LandingHeader · LandingHero
│   │                                    SportsSection · LandingFooter · LandingPage
│   ├── academy/
│   │   ├── page.tsx                     "/academy" — the biography microsite
│   │   ├── _data/biography.ts           every chapter, as data
│   │   ├── _components/                 the journey shell, motifs and chapters/
│   │   └── post/page.tsx                "/academy/post"
│   ├── cricket/post/page.tsx            "/cricket/post"
│   ├── karting/post/page.tsx            "/karting/post"
│   ├── volleyball/post/page.tsx         "/volleyball/post"
│   │
│   ├── media/admin/                     "/media/admin" — login, posts, site copy
│   │   └── _components/                 AdminDashboard · ContentEditor · MediaPicker …
│   └── api/admin/                       "/api/admin/*"
│
├── components/                          UI reached by more than one route
│   ├── post/                            BannerTemplates · PostBanners · PostGrid · PostMedia
│   ├── sport/                           SportPostsPage · SportHero
│   └── ui/                              Reveal · CopyrightBar
│
├── lib/
│   ├── server/                          never reachable from a client component
│   │                                    db · auth · s3 · postsRepo · siteContent · sportPages
│   ├── client/                          browser-only: uploadMedia · imageCompress
│   └── *.ts                             safe anywhere: sports · templates · links · posts (types)
│                                        landingContent · normaliseContent · validatePost
│                                        mediaTypes · formatDate · site · utils
└── styles/globals.css
```

Two conventions hold everywhere:

- **`_components` / `_data` folders belong to the route they sit in.** Next.js treats a leading
  underscore as private, so they never become URLs. If something is needed by a second route it
  moves up to `src/components/`.
- **Imports use `@/…` for anything shared and a relative path for siblings inside the same
  route folder.** So an import that starts with `.` is always route-local.

### The biography

[`src/app/academy/_data/biography.ts`](./src/app/academy/_data/biography.ts) is the **single
source of truth** for `/academy`. Every chapter — order, copy, images, timelines, partners,
ladder, stages, CTAs — is data; the page, the sticky rail and the nav all derive from that
array, and `ChapterRenderer` maps each chapter's `variant` to a component in `_components/chapters/`.

Chapter 04 (**National Grid**, `NationalGridChapter.tsx`) is the flagship: it expands the deck
copy into a full **Indian National Car Racing Championship (INCRC)** feature — "One Nation, One
Championship" branding, an INCRC stat strip, the multi-category grid, the real **2026 four-round
calendar**, the CTR × JK Tyre × FMSCI signing gallery, and a cinematic "motorsport family" banner —
with `Follow the Championship @incrc_` links to <https://www.instagram.com/incrc_>.

## Assets

- `public/media/*` — the crests and logos the landing page and sport pages point at. These are
  referenced by URL from the content document, so renaming one means editing it in the admin.
- `public/images/journey/*` — the biography's photography, derived from the source deck:
  `panels/*` (chapter photography), `origin/*` (three origin cards), `academy/*` (image trio),
  `teams/*` (associated-team emblems), `incrc/*` (the INCRC feature), `logos/{jktyre,irl}.png`
  (partner marks), and `og-journey.jpg` (1200×630 OG card).
- `public/images/{logos,sponsors,car,team}/*`, `public/video/background.mp4` — shared brand assets.

## Accessibility & SEO

- Semantic landmarks, one `<h1>` (hero) + `<h2>` per chapter, skip-to-content link, visible
  gold focus rings, `alt` text on meaningful images, decorative motifs `aria-hidden`.
- Navy `#1B2A63` on paper `#F5F6F8` passes WCAG AA; gold is used only for accents/bars.
- `prefers-reduced-motion` disables looping motifs and eases transforms.
- `sitemap.xml`, `robots.txt`, canonical + OG absolute URLs for the `.in` domain.
