# CTR Sports

The CTR Unified landing page, plus an admin dashboard that edits all of it.

Next.js 15 (App Router) · Tailwind · Neon Postgres · S3 for uploads.

---

## Getting started

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL and the S3 keys
npm run migrate               # creates the tables, seeds the six sports
npm run create-admin -- <username> <password>
npm run dev                   # http://localhost:3000
```

The admin lives at `/admin`. There are no roles — anyone who can sign in can
edit everything.

---

## What is editable, and where

**Every word and picture on the landing page comes from the database.** Nothing
a person would want to reword needs a deploy.

| Screen | Edits | Stored in |
| --- | --- | --- |
| `/admin/landing` | brand, splash, hero, hero card, nav, about, section headings, CTA band, socials — copy *and* photography | `ctr_content`, one JSONB row |
| `/admin/sports` | the sport cards: crest, photo, title, text, details, order, visibility | `ctr_sports`, one row each |

Only two things stay in code, both in `src/config/site.ts`: the canonical URL
(`SITE`) and the search/social metadata (`SEO`). Metadata is generated per route
rather than per request, so editing it in the admin would not reliably take
effect until the next deploy — clearer as a code change.

Saving calls `revalidatePath("/")`, so an edit is live at once; the page
otherwise revalidates every 60s.

### Using the landing editor

Fields on the left, a **live preview of the real page** on the right. Every
keystroke re-renders the preview from the draft, so nothing has to be saved to
see what it looks like.

The preview is the same components the public route uses, not a mock, so it
cannot drift from the site. Two differences: the splash screen is left out
(it is `position: fixed` and would cover the admin), and `PreviewMode` disables
scroll-triggered reveals, which would otherwise never fire inside a pane that
does not scroll past the window. The preview is hidden below `lg`, where shrinking
it further would make it unreadable rather than useful.

One form, one **Save**; the Save bar is sticky. An edited-but-unsaved form is
badged **Unsaved**. **Load defaults** fills the form from
`DEFAULT_LANDING_CONTENT` without writing anything — you still have to Save.

Blank is allowed and meaningful: clearing a button label removes that button,
clearing the nav links removes the nav. Images are the exception — a blank or
unusable image URL falls back to the default rather than rendering broken.

### Using the sports editor

One compact strip per sport; click to open its editor, one at a time. A draft is
kept while the row is closed, so collapsing mid-edit loses nothing — but nothing
is written until **Save** (an unsaved row is badged).

Reordering saves on its own, immediately:

- **drag the handle** (the six dots) — the list rearranges as you pass over rows
- **↑ / ↓ buttons** — for touch, where HTML5 drag does not work
- **arrow keys** while the handle has focus — for keyboards

Order is stored as `sort_order`, spaced by ten, and rewritten from scratch on
every move. Saving a row deliberately does *not* write `sort_order`, so a form
opened before someone else dragged the list cannot put it back.

---

## Layout

```
src/
  app/
    layout.tsx              root: fonts, metadata, preconnect
    (site)/                 the public site — one folder per page
      page.tsx              the landing page: loads content + sports, JSON-LD
      _components/          Hero, AboutSection, SportsSection, CtaBand, SplashScreen
    admin/
      login/                signed-out; outside (protected) so it stays reachable
      (protected)/          everything behind the session check
        landing/            the page-content editor
        sports/             the sport cards
    api/admin/              login, logout, content, sports CRUD, image upload
  components/               reused across pages
    layout/                 SiteHeader, SiteFooter
    ui/                     ActionButton, Reveal, SectionHeading, SocialIcon
    admin/                  AdminShell, Fields, ImageField, MediaPicker, LandingPreview
  config/
    site.ts                 SITE + SEO — the only hardcoded content left
    images.ts               placeholder photo URLs, used as seeds/defaults only
  lib/
    landingContent.ts       the page document: type, defaults, normalisation
    sports.ts               the Sport type, limits, input normalisation
    client/toWebp.ts        browser-side image conversion
    server/                 db, auth, contentRepo, sportsRepo, s3
  styles/globals.css        base styles + the shared classes
```

Public components take their content as **props**, and are client components so
the admin's preview can render them — none of them import config or reach for
the database. `src/app/(site)/page.tsx` is the only place that
loads, so a section can be reused on another page against different content.

### Adding a page

A new vertical is a folder under `src/app/(site)/`:

```
src/app/(site)/cricket/
  page.tsx
  _components/…            anything only this page uses
```

Wrap it in the same `bg-page` → `bg-surface` rounded card the landing page uses,
give each section `.shell` for the shared horizontal rhythm, and render
`<SiteFooter content={…} />`. `<SiteHeader />` expects a dark photo behind it —
it is built to sit over a hero.

A component used by one page lives in that page's `_components/`. The moment a
second page wants it, move it to `src/components/`.

### Adding an admin screen

Add a folder under `src/app/admin/(protected)/` and a line to `NAV` in
`src/components/admin/AdminShell.tsx`. Build the form out of `Panel` / `Row` /
`Field` / `TextArea` from `src/components/admin/Fields.tsx` so it matches the
existing screens without restating any classes.

---

## Design

Dark theme. One large rounded card holds every section, with the page colour
showing around its edge. Depth comes from three surface steps, never from
shadows, which do not read on a dark background:

| Token | Use |
| --- | --- |
| `page` | behind the card — pure black |
| `surface` | the card itself |
| `panel` | anything nested inside it |
| `line` | every border |
| `fg` / `fg-muted` / `fg-faint` | type, in descending emphasis |

The steps between the surfaces are deliberately wide. On a dark page a 2–3%
difference reads as one flat expanse, so each level sits far enough from its
neighbour to be told apart at a glance, and `line` is bright enough to actually
draw a card's edge. `fg-muted` and `fg-faint` both clear the 4.5:1 contrast floor
against `panel`, the darkest surface they ever sit on.

`accent` is the one bright colour — CTR's racing yellow — and it carries every
primary button, badge and the call-to-action band. Changing the site's accent is
that one line in `tailwind.config.ts`.

**`accent-ink` is the only colour allowed on top of `accent`.** Yellow needs
near-black type over it; the light `fg` default is unreadable there. Anything on
an accent surface must say so explicitly.

Logos are the one exception to the dark palette: sport crests keep a **white**
backing wherever they appear, because they carry their own dark ink and go muddy
on a near-black tile.

The admin is darker still (`bg-carbon-950`) so it never reads as part of the
public site.

Headlines use Plus Jakarta Sans, sentence case. The nav is laid over the hero
rather than pinned — the page lives inside a clipped, rounded card, and a sticky
child cannot escape that clipping.

---

## Images

Every image is a plain `<img>`. Nothing is resized at request time, so what is
stored is what a visitor downloads.

**Every image on the site is uploadable.** Each image field offers three routes:

- **Upload** — converted to WebP and capped in the browser by
  `src/lib/client/toWebp.ts` *before* it is sent, so the bytes in S3 are already
  the bytes the page serves, and the upload route needs no image library
- **Library** — browse everything already uploaded and pick one
- **paste a URL** — the only route when S3 is not configured

Objects go to `ctr-unified/media/<uuid>.<ext>`. The prefix matters: the bucket is
shared with another CTR site, and it is what keeps the library from listing that
site's uploads. Each key is a fresh uuid and is never overwritten, which is what
makes the immutable cache header on them honest.

The library has no delete. An object may still be referenced by content the
picker cannot see, and a broken image on the live site is worse than an untidy
bucket — remove things in the S3 console if it matters.

**Files in `public/images`** are compressed by a script:

```bash
npm run webp                # convert anything not already converted
npm run webp -- --dry       # report only
npm run webp -- --force     # redo files that already have a .webp
npm run webp -- --restore   # put the originals back
```

Caps live in `RULES` in `scripts/convert-webp.mjs`, one per folder, each set to
the largest size the asset is drawn at × 3 for retina. Originals are kept in
`public/_originals/` (git-ignored).

> **The photography is still placeholder stock.** The defaults in
> `src/config/images.ts` are Unsplash URLs, seeded into the database on first
> migrate. Replace them through the admin — no code change needed.

---

## Database

Four tables, all prefixed `ctr_`:

- `ctr_admins` — username + scrypt hash
- `ctr_sessions` — hashed session tokens, 7-day expiry
- `ctr_content` — one JSONB document per page; `landing` is the only key so far
- `ctr_sports` — the cards

The schema is `scripts/schema.mjs`, applied by `npm run migrate`. Every statement
is `IF NOT EXISTS`, so re-running is a no-op. The sports seed only fires when
`ctr_sports` is empty, so it cannot resurrect a deleted card, and the photo
back-fill only ever fills a blank.

`ctr_content` needs no seeding: with no row the page renders
`DEFAULT_LANDING_CONTENT` and the editor opens on it. Saving once writes the row.

Stored content is **never trusted**. `normaliseLandingContent` runs on read as
well as on write and merges every field over the defaults independently, so a
partial, stale or malformed document degrades one field at a time instead of
taking the page down. It also strips anything that is not a `/path` or an
`http(s)` URL, which is what keeps a `javascript:` payload out of an `<img src>`.

### API shape

| | |
| --- | --- |
| `GET /api/admin/content` | the landing document |
| `PUT /api/admin/content` | replace it whole |
| `GET /api/admin/sports` | the list, hidden cards included |
| `POST /api/admin/sports` | add one |
| `PATCH /api/admin/sports` | set the order, from `{ ids: [...] }` |
| `PUT /api/admin/sports/:id` | save one (never touches `sort_order`) |
| `DELETE /api/admin/sports/:id` | remove one |
| `POST /api/admin/upload` | one image, multipart |
| `GET /api/admin/media` | everything in the bucket, newest first |

Reordering is `PATCH` on the collection rather than a `/sports/reorder` path
because a static sibling of `[id]` does **not** reliably win the route match
here — `/sports/reorder` lands in the `[id]` handler and tries to operate on a
sport called "reorder". Do not add child routes under `/api/admin/sports/`.
