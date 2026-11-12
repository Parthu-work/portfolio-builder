Persona — Template Factory (master prompt)
You are working in the repository `Parthu-work/portfolio-builder-parth` (product name: Persona), a pnpm monorepo: `apps/builder` (Next.js 15 editor) and `apps/runtime` (the deployable portfolio site, where templates live).
Your job: add the new portfolio templates in the QUEUE (§9), one at a time. Each template is built, verified, committed and pushed to `main` before the next one starts. If this session ends at any point (credits run out, timeout, crash), finished templates are already on `main`, and the template in progress is safe on its own branch. A new session continues by reading this file and the progress file.
0. Ground rules (never break these)

1. `main` is always green. Never push to `main` unless every check in §4.1 has passed on the exact tree you are pushing.
2. One template = one squash commit on `main`. No half-finished templates on `main`.
3. Never force-push. Never rewrite `main`'s history. No `git push --force`, no `git reset --hard` on commits that aren't pushed yet, no deleting other people's branches or files.
4. Push work in progress to a branch named `tpl/<id>` after every milestone (§3), so a crash loses at most one milestone.
5. Leave existing templates alone. Only touch shared code (`src/render/*`, `src/schema/*`, `templates/base.css`, `theme.css`) when it is strictly necessary, and only if all existing templates still pass every check.
6. Original work only. No cloned layouts, copy, assets, logos, brand marks or copyrighted characters. No external CDNs, images or fonts at runtime. The only new dependencies allowed are fonts named in a template's spec. `framer-motion` already exists and may be used.
7. Budget: at most 3 fix-and-recheck rounds per failing check, per template. Still failing → mark it BLOCKED (§6) and move on.
8. Keep state in files, not in chat. Be terse in chat.

1. Resume protocol (run at the start of EVERY session)

```bash
git fetch origin
git checkout main && git pull --ff-only origin main
pnpm install --frozen-lockfile

```

1. If `docs/templates/PROGRESS.md` does not exist on `main`, do the one-time setup in §2 first.
2. Read `docs/templates/PROGRESS.md` and take the first row whose status is `in-progress` or `todo`.
   * `in-progress`: if `origin/tpl/<id>` exists, run `git checkout -B tpl/<id> origin/tpl/<id>`. Read `git log --oneline main..HEAD` to see the last `wip(<id>): M<n>` milestone, and continue from the next one. If there's no branch, start fresh.
   * Safety check: if `<id>` is already a key in `TEMPLATE_COMPONENTS` (`apps/runtime/src/templates/registry.tsx`) on `main`, the template is done. Mark it `done` (§5, progress-only commit) and take the next row.
3. If no `todo` or `in-progress` rows remain, run the final pass (§7) and stop.

2. One-time setup (only if `docs/templates/PROGRESS.md` is missing)

1. Save this entire prompt, verbatim, as `docs/templates/MASTER_PROMPT.md`.
2. Create `docs/templates/PROGRESS.md`:

```markdown
# Template factory progress
Statuses: todo · in-progress · done · blocked. Updated by the agent; one row per template in build order.

| # | id | name | status | commit | notes |
| --- | --- | --- | --- | --- | --- |
| 1 | paper | Paper | todo | | |
...one row per QUEUE entry in §9, in order...

```

3. Stop hard-coding the template count so the copy never goes stale.
   * Run `grep -rniw "eight" apps/builder/src` and `grep -rn "8 templates\|8 original\|Eight originals" README.md apps/builder/src`.
   * In TSX, derive the count from `TEMPLATES.length` (`@runtime/templates/meta`). Rephrase copy to use the digit ("15 original templates") rather than words.
   * In `README.md`, keep the count and the template-name list accurate; §5 updates them on every landing.
4. Add `.qa/` to the root `.gitignore`, since screenshots are never committed.
5. Run all checks (§4.1). Then commit `chore(templates): add template factory and progress tracking` and push to `main`.

3. Build loop for one template
After each milestone, save work to the branch:

```bash
git add -A && git commit -m "wip(<id>): M<n> <short description>" && git push -u origin tpl/<id>

```

* M1 — Scaffold. Run `git checkout -b tpl/<id>` from an up-to-date `main`.
   * Create `apps/runtime/src/templates/<id>/index.tsx` and `<id>.css`. Scope every selector under `[data-template="<id>"]`.
   * Add `@import "./<id>/<id>.css";` to `templates/index.css`.
   * Append a `TemplateMeta` entry to `TEMPLATES` in `templates/meta.ts`. Don't reorder existing entries.
   * Register the component in `TEMPLATE_COMPONENTS` in `templates/registry.tsx`.
   * Append the id to the `TEMPLATES` arrays in `e2e/templates.spec.ts` and `scripts/lighthouse.mjs`.
   * Set the template's row to `in-progress` in `PROGRESS.md`; this lands on `main` with the squash.
   * Get to a minimal render that passes `pnpm typecheck`.
* M2 — Structure. Render every section kind and all six layouts, the section `lead`, contact, and custom or unknown kinds. End every entry with `<Tail>` so leftover fields are never dropped. Get the template's e2e test passing.
* M3 — Visual design. Palettes, fonts, hero, layout system and the signature look. Responsive from 360 to 2560 px, with a real small-screen layout.
* M4 — Motion and interaction. Client code goes in `<id>/islands.tsx`. Anything heavy (framer-motion) goes in `<id>/impl.tsx`, loaded with `next/dynamic`. `prefers-reduced-motion` and `theme.motion === "none"` must both give a fully static, still beautiful page.
* M5 — QA. All checks (§4.1), then the visual review (§4.2), and fixes.
* M6 — Land on `main` (§5).

3.1 The template contract (from the README; mandatory)
Read `README.md` → "Adding a template — the template contract" and an existing template (`swiss/index.tsx` is the simplest; `bento/` shows islands and `impl.tsx`). Then follow these rules:

* Component: default-export `({ portfolio }: TemplateProps)`. Call `viewPortfolio(portfolio)` and wrap everything in `<TemplateRoot portfolio={portfolio}>`. Server components by default. Only relative imports (the builder compiles these files too, so `@/` aliases fail). No server-only APIs.
* Every section kind and layout renders: `timeline`, `grid`, `list`, `quotes`, `metrics`, `tags`, plus the section `lead` (single-value fields). Every entry ends with `<Tail>`.
* Headings: exactly one `<h1>` (the person's name), even when the hero section is hidden (`hero.present === false`). Each section is a `<section aria-labelledby>` with an `<h2>`. Entries use `<h3>`.
* Landmarks: `<main id="main" tabIndex={-1}>`, which the skip link from `TemplateRoot` targets. Focus states must be visible, and every interaction must work from the keyboard.
* Responsive: 360 px to 2560 px with no horizontal overflow.
* Colour: light and dark modes via tokens only. Use the token utilities (`bg-ground`, `bg-surface`, `text-ink`, `text-mute`, `border-line`, `border-edge`, `bg-sig`, `text-sigink`, `text-comp`, `rounded-pf`, `font-display`, `font-body`, `font-mono`; check `theme.css` and `base.css` for exact names). Never raw colours outside the palette definitions in `meta.ts`. For translucency use `color-mix()` or `oklch(var(--…) / a)` on tokens.
* Palettes: 3 palettes. Each is an OKLCH triple per token, in the order `ground, surface, ink, mute, line, edge, sig, sigink, comp`, for both `light` and `dark`. Follow 60-30-10 (ground / surface / sig), with one signal hue and a complementary `comp` used on less than 5% of the page. All palettes must pass `pnpm contrast`.
* Fonts and layouts: 2–3 font pairs; `layouts: LAYOUTS`.
* No layout shift: images go through `<Img>` (fixed aspect box). Reveals use transform and opacity only.
* Everything is in the HTML, with no clicks: content may be visually collapsed (`<details>`, CSS), but never conditionally rendered. Every section, entry and field value must be in the server HTML on first load. The shared e2e test clicks only for `bento`; don't add template-specific branches to `e2e/templates.spec.ts` beyond appending the id.
* Original design.

3.2 Quality bar for 2026

* Prefer native platform features to libraries:
   * CSS scroll-driven animations (`animation-timeline: view()` / `scroll()`), always inside `@supports (animation-timeline: view())` and `@media (prefers-reduced-motion: no-preference)`. With neither, the page shows its final state.
   * The View Transitions API (`document.startViewTransition`, feature-checked).
   * Container queries, `:has()`, `@starting-style`, `@property` for animatable custom properties, and `text-wrap: balance | pretty`.
   * CSS masonry only behind `@supports`, with a column fallback.
* No WebGL, three.js or canvas render loops. Pointer effects run only on `(pointer: fine)` and stop under reduced motion.
* Performance budget (first-load JS for the preview route, from `next build` output): ≤ 120 kB for templates without framer-motion, ≤ 170 kB with it. Compare with existing templates; the README lists about 115 kB and 165 kB. Lighthouse on the preview route should score performance ≥ 90 and accessibility 100.
* Readability first: body text equivalent to at least 16 px, lines no longer than 75ch, and real hierarchy. Glass or blur surfaces must keep text at AA contrast against the worst-case backdrop. Honour `prefers-reduced-transparency: reduce` with solid surfaces. Glow and texture are decorative and never carry meaning.
* Never invent content. Template chrome may only show words from the portfolio, or neutral UI labels such as "Save as PDF", "Next" or "Close". Don't write fake numbers, levels or quotes. Counts derived from content (for example, the number of projects) are fine.
* New fonts:
   1. Verify the package exists: `pnpm view @fontsource-variable/<name> version` (or `@fontsource/<name>` for static fonts).
   2. Add it to both `apps/runtime/package.json` and `apps/builder/package.json`.
   3. Import the right CSS in `templates/fonts.css`. Check the file names with `ls node_modules/@fontsource-variable/<name>/` to find the axes you need, such as `wght.css` or `full.css`.
   4. Add it to `F` in `meta.ts`, run `pnpm install`, and commit the lockfile.
   5. If the font doesn't exist or lacks the needed axis, use the fallback named in the spec.
* Accent fonts: a font used only for small accents (handwriting, pixel) may be referenced from the template's own CSS by a custom property defined in that CSS. Display, body and mono still come from the selected font pair.

4. Checks
4.1 Automated (all must pass before landing)

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm contrast
ENABLE_TEMPLATE_PREVIEW=1 pnpm build
pnpm exec playwright install --with-deps chromium   # once per machine
pnpm e2e

```

While iterating, run only your template:

```bash
pnpm exec playwright test e2e/templates.spec.ts -g "<id> "

```

Then run the full `pnpm e2e` once before landing. Playwright starts both servers itself, from the built apps.
4.2 Visual review (mandatory before landing)

```bash
ENABLE_TEMPLATE_PREVIEW=1 pnpm --filter persona-runtime start &   # after the build
mkdir -p .qa/<id>
for mode in light dark; do for w in 360 768 1440; do
  pnpm exec playwright screenshot --full-page --viewport-size="$w,900" \
    "http://localhost:3200/preview/<id>/$mode" ".qa/<id>/$mode-$w.png"
done; done

```

Also capture the builder's gallery frame. Start the builder with `LOCAL_MODE=1 pnpm --filter @persona/builder start`, then capture `http://localhost:3100/frame/<id>/developer` and `/frame/<id>/designer`.
Open every PNG and look at it. Check for:

* horizontal overflow
* overlapping, clipped or orphaned text
* any section that looks unstyled or generic
* weak hierarchy at a glance
* a dark mode that is less polished than light mode
* a mobile layout that is just a squeezed desktop layout
* a signature idea you can't see in the static screenshot

Fix, re-shoot and look again. Then score the template 1–10 against: "Would this earn an Awwwards Honorable Mention, while a recruiter can still scan it in 10 seconds?" Below 8 → one more design pass (counts toward the budget). Kill the background servers when done.
5. Land on `main`

```bash
git checkout main && git pull --ff-only origin main
git merge --squash tpl/<id>

```

1. Update `docs/templates/PROGRESS.md`: set the row to `done`, add a one-line note (the signature, plus any caveat), and put `(this commit)` in the commit column.
2. Update `README.md`: the count and the template-name list.
3. Commit: `git add -A && git commit -m "feat(templates): add <Name> template — <signature>"`.
4. Run the quick gate on the merged tree:

```bash
pnpm typecheck && pnpm test && pnpm contrast && ENABLE_TEMPLATE_PREVIEW=1 pnpm build \
  && pnpm exec playwright test e2e/templates.spec.ts

```

5. Push: `git push origin main`.
   * Rejected (non-fast-forward): `git pull --rebase origin main`, re-run the quick gate, push again. Never force.
   * Auth or network failure: stop. The commit stays local and the branch is on the remote. Report it in chat.
6. Clean up: `git push origin --delete tpl/<id>`. In the next commit you make, replace `(this commit)` with the short hash.

Then go back to §1, step 2, for the next row.
6. Blocked templates
When the budget is used up:

1. Push the branch as it is: `git push origin tpl/<id>`.
2. `git checkout main && git pull --ff-only origin main`.
3. In `PROGRESS.md`, set the row to `blocked`, with a one-line reason and the branch name.
4. Commit `docs(templates): mark <id> blocked`. Run `pnpm lint`, then push to `main`.
5. Continue with the next row. A human will look at blocked branches later.

7. Final pass (when the queue is empty)

1. Run all checks (§4.1).
2. If time allows, run `pnpm lighthouse` to regenerate `docs/lighthouse.md`.
3. Make sure `README.md` lists every template.
4. Commit and push.
5. Post one short summary in chat: the done list, the blocked list with reasons, and any follow-ups.

8. Design direction, 2026 (shared research; apply it with judgment)

* Reaction against AI sameness: quiet restraint on one side, raw texture and a visible human hand on the other. Avoid generic gradients and stock "AI" looks.
* Barely-there UI: a single typeface, two or three colours, low-opacity hairlines, content as the interface. → Quiet, Paper
* Archival Index: structured data turned into visual storytelling: catalogue numbers, indexes, classification. → Archive, Margin
* Kinetic typography and variable fonts: type that responds to scroll, weight or width axes animated with CSS scroll-driven animations; at most 2–3 animated headlines per page. → Kinetic
* Liquid glass and spatial UI: frosted, translucent layers with specular edges. On the web, frosted is the baseline; refraction is a Chromium-only extra. Text contrast is the known risk. → Vision
* Nature-inspired and tactile realism: earthy palettes, organic shapes, grain and paper textures. → Terra
* Creative process, imperfect by design: hand-drawn marks, sketchbook details. → Sketchbook
* Vivid glow: fluorescent accents on matte backgrounds, used with discipline. → Vivid
* Bento, case-study and outcome-first layouts, plus mobile-first link-in-bio for people who lost Bento.me (shut down Feb 2026). → Casefile, Card
* Conversational UI in the AI-chat era. → Thread
* Playful and retro, game-like portfolios. → Arcade
* Trust and quiet luxury for senior people. → Executive
* Image-first masonry and lightbox for visual work. → Lumen
* Fading, so avoid: scroll-jacking and generic AI imagery.
* Platform status (2026): scroll-driven animations and View Transitions are supported across major browsers, but always feature-check and keep a static fallback.

Existing templates — don't duplicate them: Signal (terminal/DevTools), Editorial (magazine serif), Bento (tile grid), Aurora (cursor mesh gradient + frosted cards), Brutal (neubrutalism, marquee, hard shadows), Cinematic (pinned chapters, horizontal reel), Swiss (12-column grid), Desktop OS (windows and dock).
9. QUEUE — build in this order (most valuable first)
Every spec below gives: id · name · who it's for · preferredMode · tags, then the concept, the `signature` line for `meta.ts`, how the layouts render, motion and interaction, palette directions (you choose the OKLCH values; all must pass contrast) and font pairs. Write a fitting `description` for `meta.ts` (one sentence, in the style of the existing ones).
1. `paper` · Paper

* For: anyone job-hunting, and recruiters (ATS-friendly) · preferredMode: light · tags: `["recruiter-safe","resume","print","minimal","light"]`
* Concept: the portfolio as an exquisitely typeset résumé sheet. On screen, an A4-proportioned sheet floats on a quiet "desk" ground. In print (`@media print`) it becomes a clean 1–2 page PDF: real text, no backgrounds, URLs printed after links, images and galleries reduced to captions or links, video and code shown as links.
* Signature: `Print-perfect sheet · one-click Save as PDF · page-break guides`
* Layouts:
   * timeline: two-column rows, title and subtitle left, dates right in tabular numerals
   * grid: compact two-column blocks without shadows
   * list: dense rows
   * quotes: single italic lines with attribution
   * metrics: an inline row of figures
   * tags: grouped inline runs separated by middots
* Interaction (island): a floating "Save as PDF" button that calls `window.print()`, hidden in print. A toggle shows dashed page-break guides at each A4 page height on screen.
* Print CSS: `@page { size: A4; margin: 14mm }`, `break-inside: avoid` on entries, and headings kept with their content.
* Mobile: the sheet goes full width, with no desk margin.
* Palettes: Ivory (warm paper, navy ink, oxblood signal) · Slate (cool grey, teal) · Graphite (dark desk with charcoal paper in dark mode).
* Fonts: Newsreader + Inter · Archivo + Inter · Fraunces + DM Sans.

2. `casefile` · Casefile

* For: PMs, solutions and sales engineers, consultants, analysts: people with outcomes but nothing visual to show · preferredMode: light · tags: `["product","consulting","case-study","outcomes","light"]`
* Concept: every project reads like a case file. The header holds the title, subtitle and dates. The entry's first metric becomes the outcome headline in huge numerals. The body is the narrative, and other fields form an "Evidence" list with their own labels. Use the label "Outcome" only when a metric exists, and never invent problem or approach text. A sticky side table of contents uses scroll-spy.
* Signature: `Case-file layout · sticky scroll-spy index · outcome metrics that count up`
* Layouts:
   * timeline: a career log, with role duration bars proportional to the date range when one exists
   * grid: two-up case cards with an outcome badge
   * list: an evidence table
   * quotes: large testimonial cards
   * metrics: a KPI tile row
   * tags: grouped skill chips
* Interaction: scroll-spy via IntersectionObserver. Count-up only when `metric.value` starts with a number; otherwise it stays static. Under reduced motion, the final value shows immediately.
* Palettes: Memo (white, near-black, cobalt) · Boardroom (deep green signal) · Night Brief (dark).
* Fonts: Bricolage Grotesque + Inter · Manrope + Inter · Space Grotesk + Inter.

3. `card` · Card

* For: link-in-bio users (people who lost Bento.me, Linktree users), creators, students on phones · preferredMode: light · tags: `["link-in-bio","mobile","compact","creator"]`
* Concept: one beautiful profile card that fits a phone screen. It shows the avatar, name and headline, then large tactile link buttons (socials and contact), then every section as a stacked mini-card. Mini-cards use `<details>`, so content is always in the DOM; they are `open` by default at ≥ 1024 px.
   * Desktop: the card is centred (420–480 px) on an ambient backdrop tinted from the palette.
   * ≥ 1280 px: the card becomes a sticky left column, with sections in a grid on the right.
* Signature: `One-screen profile card · tactile link buttons · sections fold into mini-cards`
* Interaction: buttons press down (scale and shadow). A Share button uses `navigator.share`, falling back to copying the URL, with a polite toast.
* Layouts: everything compact.
   * timeline: mini rows
   * grid: two-column thumbnails
   * list: rows
   * quotes: a stacked bubble list
   * metrics: three-up pills
   * tags: chips
* Palettes: Mint · Peach · Ink (dark).
* Fonts: Manrope + Inter · Sora + Inter · Bricolage Grotesque + DM Sans.

4. `quiet` · Quiet

* For: senior engineers, writers, minimalists, PMs · preferredMode: light · tags: `["minimal","typographic","barely-there","recruiter-safe"]`
* Concept: barely-there UI. One typeface, two colours, hairlines at low opacity and generous whitespace. A plain-text index of sections sits at the top, and entries are typographic rows. No cards, no shadows.
* Signature: `One typeface · hairline index · j/k keyboard navigation`
* Interaction: `j`/`k` move focus between entries, with a subtle left marker. `?` shows a small shortcut hint. Shortcuts never fire while focus is in a form field, and nothing is announced intrusively.
* Layouts:
   * timeline: a year column plus text
   * grid: two columns divided by hairlines
   * list: rows
   * quotes: indented italics
   * metrics: an inline number row
   * tags: a plain comma list
* Palettes: Paper · Fog · Midnight (dark).
* Fonts (display = body): Inter · Newsreader · Manrope.

5. `kinetic` · Kinetic

* For: designers, creative developers, motion designers · preferredMode: dark · tags: `["designer","bold","typographic","motion","dark"]`
* Concept: typography is the architecture.
   * The hero name is set at viewport scale (`clamp`, up to about 22vw) in a variable font. Its weight and width respond to scroll through a CSS scroll-driven animation on `font-variation-settings`.
   * Section titles stretch from condensed to wide as they enter (`view()`).
   * Split-word reveals are used on 2–3 headlines at most.
   * On `(pointer: fine)`, a proximity effect gives letters near the cursor more weight (island).
   * Don't use a marquee; Brutal already has one.
* Signature: `Scroll-driven variable type · words that stretch and gain weight · split-word reveals`
* Static state (reduced motion or no support): a striking fixed composition of mixed widths.
* Layouts:
   * timeline: giant outlined year numerals
   * grid: full-width rows with oversized titles whose weight shifts on hover or focus
   * list: rows
   * quotes: one huge quote
   * metrics: giant numerals
   * tags: a big inline word list with alternating widths
* Font: a variable font with a `wdth` axis. Try `@fontsource-variable/anybody`, then `@fontsource-variable/roboto-flex`; verify the axis files. Fallback: animate `wght` only, using Bricolage Grotesque.
* Palettes: Volt (black, lime) · Signal Orange · Paper Riot (light).
* Fonts: wdth font + Inter · Syne + Inter · Bricolage Grotesque + DM Sans.

6. `archive` · Archive

* For: designers, photographers, researchers, prolific makers · preferredMode: light · tags: `["designer","index","catalogue","archival","light"]`
* Concept: a museum catalogue. Every entry gets a catalogue number (`No. 001`, numbered in document order). A dense index table lists No., Title, Section, Year and Tags, with an image preview on hover or focus. Section filters and a year sort run client-side over the server-rendered rows (everything shows by default). Full "catalogue cards" follow below the index.
* Signature: `Catalogue numbers · sortable index with hover previews · archival cards`
* Interaction:
   * filter and sort buttons with `aria-pressed`, and live result counts
   * on `(pointer: fine)`, the preview follows the pointer
   * otherwise, and under reduced motion, a fixed preview pane
* Layouts:
   * timeline: index rows grouped by year
   * grid: catalogue cards with number, image and a metadata grid
   * list: index rows
   * quotes: archival "letters" cards
   * metrics: specimen labels
   * tags: a classification index
* Palettes: Museum (warm grey, black, red signal) · Blueprint (pale blue paper, navy) · Vault (dark).
* Fonts: Archivo + JetBrains Mono · Space Grotesk + JetBrains Mono · Newsreader + JetBrains Mono.

7. `vision` · Vision

* For: product designers, Apple-ecosystem developers, modern product people · preferredMode: dark · tags: `["glass","spatial","product","modern"]`
* Concept: spatial "liquid glass".
   * Content sits in floating glass panes over a slowly shifting, blurred colour field built from palette tokens (CSS only). If there's an avatar or cover, a heavily blurred copy can tint the field.
   * Panes have a specular edge highlight (an inner gradient border) and a gentle depth tilt on `(pointer: fine)` (≤ 4°).
   * A floating capsule tab bar (section nav) sits at the bottom centre on mobile and the top on desktop, and condenses as you scroll (scroll-driven).
   * Progressive refraction: a Chromium-only SVG `feDisplacementMap` on the capsule, behind a feature check. Frosted everywhere else.
   * Must look clearly different from Aurora (cursor mesh gradient and cards); confirm this in the screenshots.
* Signature: `Floating glass panes · condensing capsule nav · gentle spatial tilt`
* Accessibility: the glass tint must be strong enough for AA over the worst-case backdrop. `prefers-reduced-transparency: reduce` switches to solid surfaces.
* Layouts:
   * timeline: a vertical stack of panes on a light rail
   * grid: panes with depth
   * list: a pane list
   * quotes: a floating quote pane
   * metrics: glass KPI chips
   * tags: capsule chips
* Palettes: Daylight · Dusk · Deep Space.
* Fonts: Sora + Inter · Inter + Inter · Manrope + Inter.

8. `terra` · Terra

* For: designers, writers, architects, sustainability and wellness people · preferredMode: light · tags: `["organic","warm","nature","texture","light"]`
* Concept:
   * an earthy palette (moss, terracotta, sand) with soft organic blob shapes (SVG paths, slow morph when motion is allowed)
   * subtle paper grain from an SVG `feTurbulence` data URI at low opacity
   * an asymmetric layout, with images in organic masks (`clip-path` or blob border-radius)
   * hand-feel underline accents
* Signature: `Organic blob masks · paper grain · slow growing reveals`
* Layouts:
   * timeline: a winding SVG path linking entries (straight on mobile)
   * grid: a staggered masonry-like layout with organic masks
   * list: rows
   * quotes: leaf-shaped cards
   * metrics: pebble shapes
   * tags: pebble chips
* Palettes: Moss · Terracotta · Night Forest (dark).
* Fonts: Fraunces + Manrope · Newsreader + DM Sans · Playfair Display + Manrope.

9. `lumen` · Lumen

* For: photographers, illustrators, 3D and visual artists, architects · preferredMode: dark · tags: `["visual","gallery","photography","minimal","dark"]`
* Concept: image first.
   * A full-bleed hero (cover or avatar) with the name overlaid.
   * Projects as a masonry wall: `grid-template-rows: masonry` behind `@supports`, with a CSS columns fallback.
   * A keyboard-accessible lightbox for any image or gallery item: a `<dialog>`, ←/→ to move, Esc to close, focus returned to the trigger. The images are already in the DOM, so the lightbox only enlarges them.
   * Text is quiet and small; text-heavy sections use elegant narrow columns.
* Signature: `Masonry wall · keyboard lightbox · image-first quiet type`
* Layouts:
   * timeline: a minimal two-column list
   * grid: masonry
   * list: a caption list
   * quotes: a centred single quote
   * metrics: small caps figures
   * tags: an inline list
* Palettes: Darkroom · Gallery White (light) · Sepia.
* Fonts: DM Sans + DM Sans · Space Grotesk + Inter · Playfair Display + Inter.

10. `margin` · Margin

* For: researchers, PhDs, data scientists, academics, writers · preferredMode: light · tags: `["academic","research","writer","serif","light"]`
* Concept: Tufte style. A wide body column with sidenotes in the margin (subtitles, dates and tags as margin notes). Publications appear as a numbered reference list formatted from their fields. Metrics form a small-multiples row. Links are styled like footnotes.
* Signature: `Tufte sidenotes · reference-list publications · small-multiples metrics`
* Mobile: sidenotes become inline `<details>` toggles (still in the DOM).
* Interaction (optional): a "Copy reference" button that copies the entry's existing title, subtitle and date text.
* Layouts:
   * timeline: dated paragraphs with margin dates
   * grid: two-column abstracts
   * list: a reference list
   * quotes: an epigraph style
   * metrics: small multiples
   * tags: a keyword line
* Palettes: Journal · Lab Notebook (cream with a faint graph grid) · Night Reading (dark).
* Fonts: Newsreader + Newsreader · Fraunces + Inter · Playfair Display + Newsreader.

11. `thread` · Thread

* For: students, community builders, friendly developers, recruiters on phones · preferredMode: light · tags: `["playful","conversational","mobile","friendly"]`
* Concept: the portfolio as a chat conversation.
   * Each section starts with an outgoing "topic" bubble containing the section title verbatim (no invented sentences).
   * Answers follow as incoming bubbles that hold the entries, with the avatar, date separators drawn from entry dates, and reaction pills for metrics.
   * Quick-reply chips at the top link to the sections.
   * Everything is rendered statically. A typing indicator is decorative only, appears on the first bubble only, and is off under reduced motion.
* Signature: `Your portfolio as a chat · quick-reply section chips · a bubble for every entry`
* Layouts:
   * timeline: bubbles with date separators
   * grid: a horizontal scroll-snap row of card bubbles (all in the DOM, keyboard-scrollable)
   * list: stacked bubbles
   * quotes: a "forwarded message" style
   * metrics: reaction pills
   * tags: a chip bubble
* Palettes: Bubblegum · Mint Chat · Night Mode (dark).
* Fonts: DM Sans + DM Sans · Inter + Inter · Manrope + Manrope.

12. `sketch` · Sketchbook

* For: designers, illustrators, UX students, teachers · preferredMode: light · tags: `["playful","hand-drawn","creative","imperfect","light"]`
* Concept: imperfect by design.
   * Dot-grid paper.
   * Hand-drawn SVG scribble underlines and circles around key headings that draw themselves (`stroke-dashoffset` with `view()`).
   * Washi-tape corners on images, slightly rotated sticky-note testimonials, and doodle arrows in the margin.
   * The handwriting font is used only for small annotations; body text stays a clean sans.
* Signature: `Hand-drawn marks that draw themselves · tape and sticky notes · dot-grid paper`
* Font: `@fontsource-variable/caveat` (verify it exists) as an accent via a template CSS custom property. Fallback: italic Fraunces for annotations.
* Layouts:
   * timeline: a hand-drawn line with doodled dots
   * grid: taped polaroid cards
   * list: a checklist look
   * quotes: sticky notes
   * metrics: circled numbers
   * tags: highlighter-marked words
* Palettes: Graphite · Highlighter (yellow and pink accents) · Chalkboard (dark).
* Fonts: Bricolage Grotesque + Inter · Space Grotesk + DM Sans · Fraunces + Inter.

13. `vivid` · Vivid

* For: creative technologists, musicians, event and brand designers, Gen-Z students · preferredMode: dark · tags: `["bold","neon","colourful","energetic","dark"]`
* Concept: vivid glow, with discipline.
   * Fluorescent accents on matte backgrounds, at most two glow hues per palette.
   * Giant outlined display type that fills with colour on hover or focus.
   * Animated conic-gradient borders, using `@property` for the angle.
   * Poster-like section openers with oversized numerals.
   * No cyberpunk clutter.
* Signature: `Fluorescent glow on matte · outline type that fills on hover · animated conic borders`
* Accessibility: glow is decorative, and contrast is measured on the matte base. Borders stop animating under reduced motion.
* Layouts:
   * timeline: poster blocks
   * grid: glowing-edge cards
   * list: rows with a glow underline
   * quotes: a giant outlined quote
   * metrics: neon numerals
   * tags: outlined chips
* Palettes: Acid (lime and magenta on near-black) · Ultraviolet · Daylight Neon (light).
* Fonts: Syne + Inter · Bricolage Grotesque + DM Sans · Space Grotesk + Inter.

14. `arcade` · Arcade

* For: students, game developers, playful developers · preferredMode: dark · tags: `["playful","game","retro","developer","interactive"]`
* Concept: 2D game-menu UI, with no canvas game.
   * A level-select map of sections, with tiles that show the section title and its entry count.
   * Skills as XP-style bars. Only draw bars from real metric values or equal-length segments for tags; never invent levels.
   * Awards as "achievements unlocked" and experience as "quests".
   * A HUD header with name, headline and content-derived counts.
   * Pixel borders made with stepped `box-shadow`.
   * The pixel font is for headings only; body text is a readable sans.
   * Must differ clearly from Desktop OS (windows and dock).
* Signature: `Level-select section map · XP-bar skills · achievements for awards`
* Interaction: arrow keys move a selector between level tiles (a roving tabindex), and Enter jumps to the section.
* Font: `@fontsource/silkscreen` or `@fontsource/press-start-2p` (verify). Fallback: uppercase JetBrains Mono with wide tracking.
* Layouts:
   * timeline: a quest log
   * grid: level tiles
   * list: an inventory list
   * quotes: NPC dialogue boxes
   * metrics: score counters
   * tags: item chips
* Palettes: Cartridge · Handheld Green · Neon Arcade.
* Fonts: pixel + Inter · pixel + JetBrains Mono · JetBrains Mono + Inter.

15. `executive` · Executive

* For: senior leaders, sales, consultants, founders, finance · preferredMode: light · tags: `["executive","corporate","recruiter-safe","serif","light"]`
* Concept: quiet luxury and trust.
   * A navy and ivory palette, serif headlines and generous margins.
   * A hero with the portrait in a refined frame and the headline as a positioning statement.
   * A "selected outcomes" metric band.
   * Testimonials styled as signed letters.
   * Company names in small caps (no logos).
   * A boardroom-style experience timeline.
   * Motion limited to restrained fades.
* Signature: `Quiet-luxury layout · signed-letter testimonials · outcomes band`
* Layouts:
   * timeline: an elegant two-column timeline
   * grid: refined cards
   * list: a ruled list
   * quotes: signed letters
   * metrics: an outcomes band
   * tags: small-caps lists
* Palettes: Navy & Ivory · Bordeaux · Charcoal (dark).
* Fonts: Playfair Display + Inter · Fraunces + Manrope · Newsreader + Inter.

Resuming in a new session
Paste this short prompt:
Read `docs/templates/MASTER_PROMPT.md` and follow it exactly: run the resume protocol (§1) and continue the template queue from `docs/templates/PROGRESS.md`.
