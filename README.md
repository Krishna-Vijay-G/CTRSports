# CTR Sports

The CTR Unified landing page, plus an admin dashboard that edits all of it.

Next.js 15 (App Router) · Tailwind · Neon Postgres · S3 for uploads.

---

## Getting started

```bash
npm install
cp .env.example .env          # fill in DATABASE_URL and the S3 keys
npm run db:migrate            # creates the ctr schema and its ten tables
npm run db:seed               # the six sports and three circuits — new installs only
npm run create-admin -- <username> <password>
npm run dev                   # http://localhost:3000
```

### Accounts and roles

The first account the script makes is an **owner** — every screen, plus the
accounts themselves. After that, accounts are made in the admin under
**Accounts**, or from the same script:

```bash
npm run create-admin -- ravi <password> --role registrations
npm run create-admin -- kavin <password> --role pages --pages incrc
```

| Role | Page editors | Registration forms | Entries |
| --- | --- | --- | --- |
| `owner` | all | build, edit, delete | read, export, delete |
| `pages` | only the pages on the account | read-only, to link to one | — |
| `registrations` | none | build, edit, delete | read, export, delete |

That split is enforced in every API route, not only hidden in the navigation —
see `src/lib/server/access.ts`. A database that predates roles gave every
existing account `owner` when the column was added, so nobody was locked out by
the upgrade; new accounts default to the least privileged role instead.

Resetting a password with the script does **not** change an account's role or
pages unless `--role` or `--pages` is passed.

---

## What is editable, and where

**Every word and picture on the landing page comes from the database.** Nothing
a person would want to reword needs a deploy.

`/admin/landing` edits all of it — there is one admin screen, because there is
one page. What it writes goes to two places:

| Part | Edits | Stored in |
| --- | --- | --- |
| brand, splash, nav, banners, about, section headings, CTA band, socials — copy *and* photography | the page document | `ctr.content`, one JSONB row |
| the sport cards: crest, photo, title, text, details, order, visibility | a row per card | `ctr.sports` |

Two things stay in code, both in `src/config/site.ts`: the canonical URL
(`SITE`) and the search/social metadata (`SEO`). Metadata is generated per route
rather than per request, so editing it in the admin would not reliably take
effect until the next deploy — clearer as a code change.

Saving calls `revalidatePath("/")`, so an edit is live at once; the page
otherwise revalidates every 60s.

**`/incrc` works the same way**, from a second `ctr.content` document under the
key `incrc`, edited at `/incrc` in the admin. Its header, navigation and footer
come from the LANDING document, so the chrome around the two pages stays in
step. Two of its sections are not copy at all and are read from tables instead:
the venues and the calendar draw circuits from `ctr.sports`' neighbour
`ctr.tracks`, and the entry forms come from `ctr.forms`.

### Registration forms

Entry forms are pages on this site — `/register/<slug>` — built under
**Registrations** in the admin, with the answers stored in `ctr.form_entries`,
readable per form and exportable as CSV. A form is assigned to a page, which is
what decides who can link to it: the "Goes to" picker on a page's buttons lists
only that page's forms, and the INCRC **Entry forms** section lists every
published one automatically, so publishing a form is enough to put it on the
page.

Two environment settings matter here:

- `REGISTER_SECRET` — signs each rendered form so the submit route can tell a
  person filling one in from a script posting it back instantly. Unset, that one
  check is skipped and the server says so in its log; everything else still
  applies.
- Nothing is emailed yet. A form stores where its entries should go, and
  `src/lib/server/notify.ts` is the single function a transport would go into.

### Using the editor

Three columns: a **rail of sections** down the left, the **fields** for the one
that is open, and a **live preview of the real page** on the right.

Only one section's fields exist at a time. That is the whole reason for the rail —
the page has eight parts and a form containing all of them is a long scroll, so
the editor shows one and the rail says which. Opening a section also scrolls the
preview to the matching part of the page.

The preview is the same components the public route uses, not a mock, so it
cannot drift from the site. Two differences: the splash screen is left out
(it is `position: fixed` and would cover the admin), and `PreviewMode` disables
scroll-triggered reveals, which would otherwise never fire inside a pane that
does not scroll past the window. The preview is hidden below `lg`, where the rail
becomes a row of chips above the fields and shrinking the preview into what is
left would make it unreadable rather than useful.

Every keystroke re-renders the preview from the draft, unsaved sport cards
included, so nothing has to be written to see what it looks like.

**Two save models, on purpose**, because the two things are stored differently:

- the page document is written whole, by the one **Save** in the sticky bar
- each sport card is its own row, so each has its own **Save card**

An edited-but-unsaved draft is badged **Unsaved**, in the bar for the document
and on the strip for a card. **Load defaults** fills the form from
`DEFAULT_LANDING_CONTENT` without writing anything — you still have to Save.

Blank is allowed and meaningful: clearing a button label removes that button,
clearing the nav links removes the nav. Images are the exception — a blank or
unusable image URL falls back to the default rather than rendering broken.

Adding a section to the page means a line in `_components/sections.tsx`, a
`case` in `LandingEditor`'s switch, and a panel file. Nothing else knows sections
exist.

#### Banners

The top of the page is a rotating set of banners, not one fixed hero. A banner
is a photo, a title, a line of subtext, one link — and a **template**, which
decides how those are arranged:

| Template | Arrangement |
| --- | --- |
| Spotlight | Full-bleed photo, copy along the bottom-left |
| Centre | Copy centred over a darkened photo |
| Split | Copy in a panel on the left, photo on the right |

Templates rather than settings, deliberately. One layout with toggles for
alignment, overlay strength and button position has combinations that look
broken; a few named arrangements each look right, and picking one is a single
decision. Every template fills exactly the same box, so switching between them —
or rotating to a banner with more copy in it — never moves the page.

Banners rotate every 6.5s and pause while the pointer rests on them. A single
banner does not rotate and shows no dots. Opening a banner in the admin holds
the preview on that one, so what you are editing is what you are looking at.

Adding a template is a component in
`src/app/(site)/_components/banner/templates.tsx`, its id in `BANNER_TEMPLATES`
and a line in `BANNER_TEMPLATE_META` (`src/lib/banners.ts`), plus a diagram in
`TemplatePicker`. The admin's picker is generated from that metadata.

> Banners replaced a single `hero` object in the document. `normaliseLandingContent`
> folds an old stored hero into one Spotlight banner rather than falling back to
> the defaults and throwing the copy away — the old hero's floating card of
> sports had no equivalent to fold into, so that part of the copy is dropped.
> That path can go once no document has a hero:
> `select key from ctr.content where content ? 'hero';`

#### The sport cards

One compact strip per sport; click to open its editor, one at a time. The draft
lives in the editor, not the row, so collapsing mid-edit loses nothing and the
preview shows the card as it is being typed — but nothing is written until
**Save card**.

Reordering is the exception and saves on its own, immediately:

- **drag the handle** (the six dots) — the list rearranges as you pass over rows
- **↑ / ↓ buttons** — for touch, where HTML5 drag does not work
- **arrow keys** while the handle has focus — for keyboards

Order is stored as `sort_order`, spaced by ten, and rewritten from scratch on
every move. Saving a card deliberately does *not* write `sort_order`, so a form
opened before someone else dragged the list cannot put it back.

`/admin/sports` used to be a screen of its own and is now a redirect to
`/admin/landing`, so old bookmarks still land somewhere useful.

---

## Layout

```
src/
  app/
    layout.tsx              root: fonts, metadata, preconnect
    (site)/                 the public site — one folder per page
      page.tsx              the landing page: loads content + sports, JSON-LD
      _components/
        banner/             the carousel and the banner templates
        sections/           AboutSection, SportsSection, CtaBand
        SplashScreen.tsx
      incrc/                the Indian National Car Racing Championship
        page.tsx            metadata, SportsEvent JSON-LD, the section order
        _data/incrc.ts      the championship's copy — the one page not in the DB
        _components/        one file per section of that page
    admin/
      login/                signed-out; outside (protected) so it stays reachable
      (protected)/          everything behind the session check
        landing/            the one editor — the whole page, cards included
          _components/
            LandingEditor   the three columns, the draft, the Save
            sections.tsx    the table of contents: one entry per part of the page
            SectionNav      the rail
            panels/         one file per section's fields
            sports/         the card list and its rows
        sports/             a redirect to landing, for old bookmarks
    api/admin/              login, logout, content, sports CRUD, image upload
  components/               reused across pages
    layout/                 SiteHeader, SiteFooter
    ui/                     ActionButton, Reveal, SectionHeading, SocialIcon
    admin/
      ui/                   the admin's design system: Button, Card, Input,
                            Badge, Dialog, icons — nothing app-specific
      Fields, ImageField, MediaPicker, LandingPreview, AdminShell
  config/
    site.ts                 SITE + SEO — the deployment constants
    images.ts               placeholder photo URLs, used as seeds/defaults only
  lib/
    banners.ts              the Banner type, the templates, normalisation
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
`<SiteFooter content={…} />`. `<SiteHeader />` is laid over the top of whatever
the page opens with, so that opening panel owns the top padding the header needs.

Two things a sub-page has to do that the landing page does not:

- **Fix the navigation.** The stored nav links are bare anchors written for the
  landing page (`#about`, `#sports`), and they scroll nowhere on another route.
  `/incrc` rewrites the ones it does not have to `/#about` and leaves the ones it
  does (`#top`, `#footer`) alone — see `sendHome` in its `page.tsx`.
- **Add a line to `src/app/sitemap.ts`.**

A component used by one page lives in that page's `_components/`. The moment a
second page wants it, move it to `src/components/`.

### Adding an admin screen

Add a folder under `src/app/admin/(protected)/` and a line to `NAV` in
`src/components/admin/AdminShell.tsx`. Build the form out of `Panel` / `Row` /
`Field` / `TextArea` / `ButtonFields` / `Note` from
`src/components/admin/Fields.tsx`, and anything else out of
`src/components/admin/ui/`, so it matches the existing screens without restating
any classes.

`NAV` has one entry today. The column stays because the next site will add to
it — a section of the landing page is *not* one of these; that is a line in
`sections.tsx`.

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

Headlines use Plus Jakarta Sans, sentence case. The nav is laid over the banners
rather than pinned — the page lives inside a clipped, rounded card, and a sticky
child cannot escape that clipping.

### The admin is a different design

Not a darker version of the site — a **monochrome tool UI**, after Reactive
Resume. Warm achromatic greys one step apart, hairline borders, tight radii,
IBM Plex Sans, and no shadows at all: elevation is a lighter grey and a
10%-white edge, which sits on any surface without the banding a solid grey
would give.

| Token | Use |
| --- | --- |
| `background` | the workspace |
| `card` | sidebar, panels, the editor column |
| `muted` | hover states and anything receding; `muted-fg` for secondary type |
| `border` / `input` | 10% and 16% white — hairlines and field edges |
| `primary` | CTR yellow, `primary-fg` near-black |
| `destructive` | delete only |

**Colour is the exception, not the theme.** `primary` carries the action that
writes to the database and nothing else; `destructive` carries delete. Every
other control is `outline`, `secondary` or `ghost` — grey. That is what makes
the one yellow button findable on a screen full of fields.

The two palettes never mix. Site components use `page` / `surface` / `panel` /
`accent`; admin components use `background` / `card` / `muted` / `primary`.
Anything using both would look like neither, and a different typeface on each
means the editor is never mistaken for the page it edits.

Everything in `src/components/admin/ui/` is generic — `Button`, `Card`, `Input`,
`Badge`, `Dialog`, `icons`. Nothing in there knows about landing pages or
sports. Build new admin screens out of them rather than restating classes.

---

## Images

Every image is a plain `<img>`. Nothing is resized at request time, so what is
stored is what a visitor downloads.

**Every image on the site is uploadable.** Each image field offers four routes:

- **drop a file on the tile**, or **click the tile** to browse — the tile is the
  biggest thing in the field because uploading is the commonest thing done to it
- **Upload** — the same thing as a labelled button. Either way the file is
  converted to WebP and capped in the browser by `src/lib/client/toWebp.ts`
  *before* it is sent, so the bytes in S3 are already the bytes the page serves,
  and the upload route needs no image library
- **Library** — browse everything already uploaded and pick one
- **paste a URL** — the only route when S3 is not configured

**Clear** empties the field, which falls the image back to its built-in default
rather than leaving a broken `<img>`.

Crests are shown on a **white** tile (`variant="logo"`), the same backing they
get on the site: they carry their own dark ink and vanish against a near-black
one.

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
> `src/config/images.ts` are Unsplash URLs — `BANNER_PHOTOS` for the banners,
> `ABOUT_PHOTOS` and `SPORT_PHOTOS` seeded into the database on first migrate.
> Replace them through the admin — no code change needed.

---

## Database

Ten tables, all in the **`ctr` schema**:

| | |
| --- | --- |
| `ctr.admins` · `ctr.sessions` | username + scrypt hash; hashed session tokens, 7-day expiry |
| `ctr.sports` · `ctr.tracks` | the cards, and the circuits |
| `ctr.content` | one JSONB document per page — `landing` and `incrc` |
| `ctr.forms` · `ctr.form_entries` · `ctr.form_nonces` | registration forms, their submissions, and spent nonces |
| `ctr.decks` | image decks published at `/deck/<slug>` |
| `ctr.enquiries` | messages from the footer |

Queries name them **unqualified** — `FROM sports` — which works because
`search_path = ctr, public` is set on the database by the baseline migration.
`ctr.sports` works too, wherever being explicit reads better. The schema replaced
a `ctr_` prefix on every table: same goal, which was letting this database be
shared with another CTR site, but the isolation is real rather than a naming
convention.

### Migrations

```bash
npm run db:status             # what has been applied here, and what has not
npm run db:migrate            # apply everything pending
npm run db:seed               # the starting sports and circuits, empty tables only
```

Migrations are `migrations/NNNN_name.sql`, applied in order, each inside one
transaction, each recorded in `ctr.schema_migrations` with a checksum. Editing a
migration that has already run is refused rather than re-applied — the answer is
always a new file. `db:status` reads and writes nothing, so it is safe to point
at production.

This replaced `scripts/schema.mjs`, which was the whole schema re-run on every
deploy with no version anywhere. It could not add a `CHECK` constraint at all,
because Postgres has no `ADD CONSTRAINT IF NOT EXISTS` and the file had no way to
know whether it had run before; `role`, `status` and `page_key` are constrained
in the database now, not only in TypeScript.

`ctr.content` needs no seeding: with no row the page renders
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
