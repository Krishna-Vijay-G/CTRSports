# CTR Sports

The CTR Unified landing page, plus a small admin dashboard for the sports list.

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
edit the sports list.

### Using it

The list is one compact strip per sport, so all of them fit on a screen. Click a
strip to open its editor; one is open at a time. A draft is kept while the row is
closed, so collapsing mid-edit loses nothing — but nothing is written until you
press **Save** (an unsaved row is badged).

Reordering saves on its own, immediately:

- **drag the handle** (the six dots) — the list rearranges as you pass over rows
- **↑ / ↓ buttons** — for touch, where HTML5 drag does not work
- **arrow keys** while the handle has focus — for keyboards

Order is stored as `sort_order`, spaced by ten, and rewritten from scratch on
every move. Saving a row deliberately does *not* write `sort_order`, so a form
opened before someone else dragged the list cannot put it back.

---

## What is editable, and where

Two halves, on purpose.

| Thing | Where it lives | How it changes |
| --- | --- | --- |
| Sport cards — logo, title, text, details, order, visibility | `ctr_sports` table | `/admin`, live immediately |
| Brand, hero, about copy, nav, CTA band, socials, SEO | `src/config/site.ts` | edit the file, redeploy |
| Photography | `src/config/images.ts` | edit the file, redeploy |

If a piece of copy starts changing weekly, move it into the database. Until
then, a code change and a deploy is the cheaper mechanism.

> **The photography is placeholder stock.** Every photo on the page is an
> Unsplash URL in `src/config/images.ts`, standing in until the real CTR shoot is
> uploaded to S3. Swapping one is a one-line change — replace the URL. The sport
> *crests* are already real and come from the database.
>
> Card photos are picked from the sport's **title**, not its position in the
> list (`sportPhoto`), so reordering in the admin cannot put a racing car on the
> cricket card. A title no rule matches still gets a photo, just an arbitrary one.

## Design

Dark theme. One large rounded card holds every section, with the page colour
showing around its edge. Depth comes from three surface steps, never from
shadows, which do not read on a dark background:

| Token | Use |
| --- | --- |
| `page` | behind the card |
| `surface` | the card itself |
| `panel` | anything nested inside it (sport cards, chips, the hero's programme card) |
| `line` | every border |
| `fg` / `fg-muted` / `fg-faint` | type, in descending emphasis |

`accent` is the one bright colour — CTR's racing yellow — and it carries every
primary button, badge and the call-to-action band. Changing the site's accent is
that one line in `tailwind.config.ts`.

**`accent-ink` is the only colour allowed on top of `accent`.** Yellow needs
near-black type over it; the light `fg` default is unreadable there. Anything
placed on an accent surface — the CTA band's headline, a pill's label, a button's
arrow knob — has to say so explicitly.

Logos are the one exception to the dark palette: sport crests keep a **white**
backing wherever they appear, because they carry their own dark ink and go muddy
on a near-black tile.

The admin is darker still (`bg-carbon-950`) so it never reads as part of the
public site.

Headlines use Plus Jakarta Sans, sentence case. The nav is laid over the hero
rather than pinned — the page lives inside a clipped, rounded card, and a sticky
child cannot escape that clipping.

---

## Layout

```
src/
  app/
    layout.tsx              root: fonts, metadata, JSON-LD
    (site)/                 the public site — one folder per page
      page.tsx              the landing page: the white card that holds it all
      _components/          Hero, AboutSection, SportsSection, CtaBand, SplashScreen
    admin/
      login/                signed-out; sits outside (protected) so it stays reachable
      (protected)/          everything behind the session check
    api/admin/              login, logout, sports CRUD, logo upload
  components/               reused across pages
    layout/                 SiteHeader, SiteFooter
    ui/                     ActionButton, Reveal, SectionHeading, SocialIcon
    admin/                  AdminShell, LogoField
  config/
    site.ts                 all hardcoded page copy
    images.ts               all photography (currently placeholders)
  lib/
    sports.ts               the Sport type, limits, input normalisation
    utils.ts                cn()
    client/toWebp.ts        browser-side image conversion
    server/                 db, auth, sportsRepo, s3 — never imported by the browser
  styles/globals.css        base styles + the handful of shared classes
```

### Adding a page

A new vertical is a folder under `src/app/(site)/`:

```
src/app/(site)/cricket/
  page.tsx
  _components/…            anything only this page uses
```

Wrap it in the same `bg-paper` → white rounded card the landing page uses, give
each section the `.shell` class for the shared horizontal rhythm, and render
`<SiteFooter />` from `src/components/layout/`. `<SiteHeader />` expects a dark
photo behind it — it is built to sit over a hero. Add the page's link to
`NAV_LINKS` and an entry to `src/app/sitemap.ts`.

The rule of thumb: a component used by one page lives in that page's
`_components/`. The moment a second page wants it, move it to
`src/components/`.

---

## Images

Every image is a plain `<img>` pointing at a pre-compressed `.webp`. Nothing is
resized at request time, so what is on disk is exactly what a visitor
downloads.

```bash
# drop PNG/JPEGs anywhere under public/images, then:
npm run webp
npm run webp -- --dry       # report only, write nothing
npm run webp -- --force     # redo files that already have a .webp
npm run webp -- --restore   # put the originals back
```

Caps live in `RULES` in `scripts/convert-webp.mjs`, one per folder, each set to
the largest size the asset is actually drawn at × 3 for retina. Change a layout,
recheck the cap. Originals are kept in `public/_originals/` (git-ignored).

Logos uploaded through the admin take the same path, just in the browser —
`src/lib/client/toWebp.ts` converts and resizes before upload, so the bytes in
S3 are already the bytes the page serves. Without S3 configured, the admin falls
back to pasting a URL.

---

## Database

Three tables, all prefixed `ctr_`:

- `ctr_admins` — username + scrypt hash
- `ctr_sessions` — hashed session tokens, 7-day expiry
- `ctr_sports` — the cards

The schema is `scripts/schema.mjs`, applied by `npm run migrate`. Every
statement is `IF NOT EXISTS`, so re-running it is a no-op. The seed only fires
when `ctr_sports` is empty, so it cannot resurrect a deleted card.

Saving in the admin calls `revalidatePath("/")`, so an edit is live at once; the
landing page otherwise revalidates every 60s.

### API shape

| | |
| --- | --- |
| `GET /api/admin/sports` | the list, hidden cards included |
| `POST /api/admin/sports` | add one |
| `PATCH /api/admin/sports` | set the order, from `{ ids: [...] }` |
| `PUT /api/admin/sports/:id` | save one (never touches `sort_order`) |
| `DELETE /api/admin/sports/:id` | remove one |

Reordering is `PATCH` on the collection rather than a `/sports/reorder` path
because a static sibling of `[id]` does **not** reliably win the route match
here — `/sports/reorder` lands in the `[id]` handler and tries to operate on a
sport called "reorder". Do not add child routes under `/api/admin/sports/`.
