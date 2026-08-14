# Registration forms — what changed

August 2026. Everything below is in `main`, across four commits:

| Commit | Subject |
| --- | --- |
| `0bef4d1` | feat: range limit for options in the form |
| `f61b678` | fix: fixed the mobile number defect in form |
| `700b3bb` | fix: fixed an annoying row div |
| `a6ca247` | fix: refined the registration page a bit |

The through-line: the builder now describes a form the way somebody thinks about
one, the rules can talk about numbers as well as words, and the public form
looks like it was designed rather than assembled.

---

## 1. Questions are nested under pages

**Before.** Two unrelated repeaters — a list of pages, a list of questions — tied
together by a per-question **"On which page"** dropdown. Building a multi-page
form meant thinking in two flat lists and a dropdown.

**Now.** One outline. Each page is a group, its questions listed underneath in
the order they will actually be asked, with `+ Add question` *inside* each page.
The dropdown is gone: where a question sits **is** the answer.

- **Drag across pages.** Hold a handle ~350 ms, then drop onto a question, onto
  a page's header (it lands first), or onto an empty page's placeholder. The
  column auto-scrolls near its edges so page 1 → page 4 works without letting
  go. Escape puts it back.
- **Keyboard.** Arrow keys on a handle do the same one step at a time and walk
  off the bottom of one page onto the top of the next.
- **No more re-sort on save.** Every mutation runs the server's own
  `orderedFields`, so the array the builder holds is byte-identical to what the
  server would store. The old hint apologising that a move "takes effect on
  save" is deleted because it is no longer true.
- **Deleting a page keeps its questions** — they join the page above, and the
  flat order is unchanged, so a deletion can never invalidate a rule.

The listeners are on `document`, not on the handle: a question dragged to
another page is re-keyed into a different list, React unmounts its handle, and
pointer capture would die mid-drag.

New: `src/admin/screens/forms/FormOutline.tsx`. Outline helpers (`addSection`,
`placeField`, `nudgeField`, `removeSection`, …) live in `src/lib/forms.ts`
because they are the inverse of `normaliseFormFields` and must agree with it
exactly.

## 2. Options can depend on a number

`optionsWhen` used to match the **exact words** of an earlier answer. It now has
a second half for parents that answer with a **number** — a Number question, or
the age worked out from a date.

```
Which options to offer   [ Depends on: Date of birth — age (a number) ]

  From [  ] to [15]   →  Micro Max
  From [16] to [  ]   →  Senior Max, Formula 4
  Unticked everywhere, so always offered: Other.
```

- Both ends count. `12–16` includes 12 and 16, so "under 18" is a highest of 17
  and the next range starts at 18. Blank means no bound.
- Ranges may overlap; anything two of them offer is offered once.
- An answer that is not a number matches no range, so only the always-offered
  options show until it is one.
- A half-written range (no numbers in it) is **inert** — it neither offers nor
  hides — and is dropped on save.

Only one half ever applies: `keepRulesHonest` clears groups against a numeric
parent and ranges against a choice parent, and reports both, so changing a
question's type leaves no invisible leftover.

Enforced on the server too, in `offeredOptions`: an option that was not on offer
is not an answer.

## 3. Conditions can compare numbers properly

`CONDITION_OPS` gained **`between`**, **`lessThan`** and **`moreThan`**, beside
the existing `atLeast` / `atMost`. So a question or a page can be shown when the
age is *under 18* without translating that into "at most 17".

A range is a **pair held by position**, not a list — through the normal value
gate, "between 12 and 12" would lose its second end to the repeat check and
"between blank and 16" would slide into "at least 16".

**Bug found and fixed on the way:** `Number("")` is `0`, so every numeric
comparison read a blank bound as a bound of zero — "at least [blank]" was true
of every positive answer. All of them now go through `numberOf`, which says a
blank is not a number.

## 4. A date question can refuse an age

New rule kind, on any date question: **"How old it makes them."**

```
No younger than [18]     No older than [any]
```

Someone entering a date that makes them too young is told while the keyboard is
still up — *"You have to be 12 or older on the day you enter — that date works
out to 11."* — and told again by the server when they send.

- Worked out **on the day they enter**, not against a fixed cut-off you would
  have to edit each season.
- Same function, same `now`, same UTC arithmetic as the stored age, so the rule
  and the column can never disagree by a day about a birthday.
- Works **whether or not** "Work out their age too" is on. That toggle stores a
  column; this decides what is accepted. Tying them together would mean turning
  the column off silently dropped the age limit.

## 5. Digits are counted; a value is measured

**The defect.** `Mobile Number` was a Number question with *"How big it is → at
least 10"*. That bounds the **value**, and `987654321` is nine digits but ~987
million, so it was accepted. The rule was right; the reading of it was not, and
nothing in the product could say "ten digits".

**Now:** a **"How many digits it has"** rule, on Phone and Number questions.
Only digits count, so `98765 43210`, `(98765)-43210` and `98765-43210` are all
ten — but a country code is digits too, so `+91 98765 43210` is twelve.

"How big it is" now carries a note saying it is the value, not the digit count,
and that a mobile number belongs on a Phone question.

## 6. A rule no longer vanishes when a question changes type

Switch a text question with a length rule to a Number question and the rule used
to be dropped **silently** — the question came back accepting anything, with
nothing anywhere saying when it stopped being checked. It is now reported in
"Changed on save".

## 7. Phone questions carry their country

```
Mobile Number *
┌──────────────────────────────────────────┐
│ 🇮🇳 +91 ▾ │ 98765 43210               ✓  │
└──────────────────────────────────────────┘
```

- **A native `<select>`**, laid transparently under the flag and code. On a
  phone that is the wheel or full-screen list the OS draws itself — scrollable
  with a thumb, searchable by typing, taller than the keyboard. It still takes
  focus and still announces as "Country dialling code".
- 52 countries, alphabetical, defaulting to **India**.
- The placeholder is the chosen country's own format.
- Only digits are kept as you type, capped at that country's length. Pasting
  `+91 98765 43210` or `(555) 123-4567` sorts itself out; a pasted dialling code
  switches the picker rather than landing in the box.
- The tick appears when the length is right. No red cross while you are still
  typing.
- Changing country keeps the digits — that is how a wrong guess gets fixed.

**Stored as `+91 9876543210`** — one string, as the answer always was.

**The server agrees.** `validateSubmission` runs the same country list on what
arrives, so a nine-digit `+91` number posted around the control is refused with
*"A number in India is 10 digits after +91 — that has 9."* A number with **no**
dialling code is deliberately left alone: a form that starts rejecting answers
it already holds is a form that broke.

New: `src/lib/dialling.ts` (shared by both sides, no `server-only`),
`src/components/ui/PhoneField.tsx`.

## 8. The public form was redesigned

Site palette unchanged; the shapes come from the admin.

```
┌ ENTRY FORM ─────────────────────── STEP 1 OF 3 ┐
├━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┤ ← progress fills the seam
│  Name *                                        │
│  ┌──────────────────────────────────────────┐  │
│  └──────────────────────────────────────────┘  │
├────────────────────────────────────────────────┤ ← hairline, not a gap
│  Date of Birth *                               │
├────────────────────────────────────────────────┤
│ [ BACK ]           * is required   [ SUBMIT ]  │
└────────────────────────────────────────────────┘
```

The decision the rest follows from: **fields are transparent outlines, not
filled boxes.** A field then reads as an outline drawn on the card it sits on,
so an input, a select and the phone control in a row are flush. A filled box on
a filled card is two surfaces where one will do, and it made every question look
like a separate object.

**Not copied from the admin:** its density. Admin controls are 36px with 11px
labels — right under a mouse, wrong under a thumb. These are 44px with 15px
text.

**The button** is a hazard board: a yellow plate, a 1.5px near-black edge,
rounded corners, and a band of 45° stripes along the bottom. The stripes are a
band rather than a fill so the label sits on plain yellow — type over stripes is
how a warning sign becomes unreadable. It lifts on hover and goes flat when
pressed, like every other button on the site.

`.hazard-bars` in `globals.css` is shared by the button and by the strip across
the top of the "Thank you" panel, so they cannot drift into two patterns.

**The column is centred.** Heading, places-left line and form share one 672px
axis instead of being pinned to the left of a 1560px card. Text inside stays
left-aligned — a centred paragraph starts every line in a different place.

**One behaviour fix.** The Send button used `hidden={!last}` while also carrying
`inline-flex`; an author class beats the browser's `[hidden]` rule, so a greyed
Send sat beside Next on every middle page. Hidden by class now. It stays in the
DOM disabled on purpose: implicit submission looks for the first *non-disabled*
submit button, which is what stops Return sending a half-finished form.

## 9. The admin preview had drifted

`FormPreview` mounts the real `RegisterForm` — so a question always draws the
same in both places — but the **column around it** is written out a second time,
because the real route also carries the entry state, the places-left line and
the closed note. The route was centred and the preview was not.

Fixed, with a note in both files saying the block has to be kept in step.

---

## Changed in the live database

`Race with CTR` → `Mobile Number` was switched from a **Number** question with
`rule=number min=10` to a **Phone** question with no rule — the picker now
enforces the length for the country chosen. One dropdown in the builder to put
back.

The one existing entry (`1234567890`) is untouched and still valid: it carries
no dialling code, so no country claims it. New entries arrive as `+91 …`.

## How to check it

```bash
npm run check:forms     # 231 assertions, no database, ~1s
npm run check:decks
npm run check:source    # no raw control characters in src/ or scripts/
npx tsc --noEmit
npm run build
```

`check:forms` is the one that matters. `src/lib/forms.ts` decides which
questions are asked, which options are offered and what is stored, and both the
browser and the submit route run it — every case in the harness is a bug that
actually shipped once.

**Build note:** `npm run build` and `next dev` share `.next`, so building while
the dev server is running breaks it (`Cannot find module './1331.js'`). Restart
the dev server, or build with `NEXT_DIST_DIR=.next-verify`.

## Not done

- **Verified by hand in a browser: nothing.** Everything above was checked by
  the harness, by `tsc`, by a production build, and by fetching the rendered
  markup and stylesheet from an isolated server. The *look* — the stripe band's
  weight, the hover lift, the footer strip at phone width, long-press drag on a
  real phone — has not been eyeballed.
- **No admin screen reads `ctr_enquiries`.** Footer messages are stored; only a
  log line signals arrival.
- **Uploads are untested against a real S3 bucket** (deck images, entry
  attachments).
- **Phase 6 of the registration programme** is untouched: save-and-resume
  drafts, confirmation email and `notify_to` notification, duplicate
  prevention, a response summary tab, a per-entry print view.
