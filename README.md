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

---

## What is editable, and where

Two halves, on purpose.

| Thing | Where it lives | How it changes |
| --- | --- | --- |
| Sport cards — logo, title, text, details, order, visibility | `ctr_sports` table | `/admin`, live immediately |
| Everything else — brand, hero, about copy, nav, socials, SEO | `src/config/site.ts` | edit the file, redeploy |

If a piece of copy starts changing weekly, move it into the database. Until
then, a code change and a deploy is the cheaper mechanism.

---

## Layout

```
src/
  app/
    layout.tsx              root: fonts, metadata, JSON-LD
    (site)/                 the public site — one folder per page
      page.tsx              the landing page
      _components/          sections used by that page only
    admin/
      login/                signed-out; sits outside (protected) so it stays reachable
      (protected)/          everything behind the session check
    api/admin/              login, logout, sports CRUD, logo upload
  components/               reused across pages
    layout/                 SiteHeader, SiteFooter
    ui/                     Reveal, SectionHeading, SocialIcon
    admin/                  AdminShell, LogoField
  config/site.ts            all hardcoded page content
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

Render `<SiteHeader />` and `<SiteFooter />` from `src/components/layout/` and it
matches the rest of the site for free. Add its link to `NAV_LINKS` and an entry
to `src/app/sitemap.ts`.

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
