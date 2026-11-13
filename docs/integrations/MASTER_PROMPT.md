# Persona — Integrations Factory (master prompt)

You are working in **`Parthu-work/portfolio-builder`** (product: **Persona**). It's a pnpm monorepo:
- `apps/builder` — the Next.js 15 editor and API, deployed on Vercel, backed by Supabase.
- `apps/runtime` — the deployable portfolio site. It holds the 23 templates and the generic renderer.

**Goal:** let people connect their GitHub, LeetCode, Codeforces and other accounts, so their portfolio shows **live, provably real achievements**: contribution heatmaps, ratings, solved counts, badges and certificates. This works in **all 23 templates** without editing any template.

Work **one item at a time** from the QUEUE (§9). Each item is built, checked, committed and **pushed to `main` before the next starts**, so finished work survives if the session ends. A new session resumes by reading this file and the progress file.

Everything stays **free**. Don't add paywalls, pricing or Stripe.

---

## 0. Ground rules (never break these)

1. **`main` is always green.** Push only after every check in §4 passes on the exact tree you're pushing.
2. **One queue item = one squash commit on `main`.**
3. **Never force-push.** Never rewrite `main`'s history. Never delete other people's work.
4. **Push work in progress to `int/<id>` after every milestone**, so a crash loses at most one step.
5. **Production must never break.** Production may not yet have new database tables, because migrations are applied by a human (§3.4). All integration code is off behind `FEATURE_INTEGRATIONS=1`. When the flag is off or a table is missing, the app behaves exactly as it does today. Every provider also has its own off-switch: `INTEGRATION_<PROVIDER>_DISABLED=1`.
6. **Don't edit any template** under `apps/runtime/src/templates/*`. Integrations reach templates only through the generic renderer (`src/render/view.ts`, `src/render/FieldValue.tsx`) and the schema.
7. **Public data only, and the user is in control.**
   - Read only what the platform shows publicly, or what a user explicitly authorizes through OAuth.
   - Never store third-party passwords or user API keys.
   - Every metric can be hidden.
   - Disconnecting deletes the snapshot.
8. **Be a good API citizen.**
   - Cache: no provider is called more than once every 6 hours per account (stale-while-revalidate, §3.3).
   - Set a `User-Agent: Persona/1.0 (+<site url>)` header.
   - Use timeouts of 8 seconds or less, back off on 429/5xx, and never retry in a loop.
   - **Unofficial endpoints** (LeetCode GraphQL, CodeChef, GeeksforGeeks, HackerRank, the Credly public JSON) are **experimental**:
     - label them "Experimental" in the UI
     - when they fail, keep showing the last good snapshot
     - never call them from the browser
9. **Never invent data.** Show what the provider returned, with its "as of" time. Don't create scores, levels or rankings that the platform didn't give.
10. **Budget:** at most **3 fix-and-recheck rounds** per failing check. Still failing → mark the item BLOCKED (§6) and move on.
11. **Keep state in files.** Be terse in chat.

---

## 1. Resume protocol (start of EVERY session)

```bash
git fetch origin && git checkout main && git pull --ff-only origin main
pnpm install --frozen-lockfile
```

1. If `docs/integrations/PROGRESS.md` is missing, do the setup in §2.
2. Take the first row that is `in-progress` or `todo`.
   - **`in-progress` with an `origin/int/<id>` branch:** `git checkout -B int/<id> origin/int/<id>` and continue after the last `wip(<id>): M<n>` commit.
3. When the queue is empty, run the final pass (§7) and stop.

---

## 2. One-time setup

1. Save this prompt verbatim as `docs/integrations/MASTER_PROMPT.md`.
2. Create `docs/integrations/PROGRESS.md` with:
   - a table `| # | id | name | status | commit | notes |`, one row per QUEUE item, all set to `todo`
   - a section **"Ops for a human"**: a list where you add every manual step (migrations to apply, environment variables to set, OAuth apps to register)
3. Commit `chore(integrations): add integrations factory and progress tracking` and push to `main`.

---

## 3. Architecture (build this in queue items F1–F3, then providers plug in)

### 3.1 Data model (runtime schema: `apps/runtime/src/schema/portfolio.ts`, with `migrate.ts`)

- **`chart` field type.** Add it to `FIELD_TYPES`, with value:

  ```ts
  { variant: "heatmap" | "line" | "bars" | "rings", title: string, summary: string,
    points: { x: string; y: number; label?: string }[],  // ≤ 400 points
    max?: number, unit?: string }
  ```

  - **Render it once**, in `FieldValue.tsx`, as **inline SVG** coloured with theme tokens (`var(--sig)`, `var(--line)` and so on, via the same token approach the renderer already uses). That way it matches every template's palette in light and dark mode.
  - It needs `role="img"`, an `aria-label` taken from `summary`, and a visually hidden data table fallback.
  - Under reduced motion, no animation.
  - It has a fixed aspect box, so there's no layout shift.
  - This automatically appears in every template through `<Tail>` and the generic renderer.
- **`sync` metadata on sections.** Add optional `sync?: { provider: string; account: string; syncedAt: string; verified: boolean; experimental?: boolean }` to `SectionSchema`.
  - The renderer adds a small, neutral provenance line to synced entries, for example "Live from leetcode.com · updated 13 Nov 2026 · Verified owner". It goes through the shared `Tail`, never through template code.
- **`integrations` config on the portfolio.** Add `integrations?: { id: string; provider: string; account: string; options: Record<string, boolean | string>; hidden: string[] }[]`. It is the user's choices only: no tokens and no fetched data.
- **Schema version.** Bump `SCHEMA_VERSION` only if needed. `migrate()` must accept old documents unchanged.
- **Tests and fixture.**
  - Add a `chart` field (every variant) to the **"Field lab"** section in `schema/seeds/fixture.ts`.
  - Add its summary text to `LAB_VALUES` in `e2e/templates.spec.ts`, so all 23 templates are proven to render it.
  - Extend `render.test.tsx`.

### 3.2 Storage (builder)

- **New migration `supabase/migrations/<timestamp>_integrations.sql`:**
  - **Table `integration_snapshots`** with columns `id`, `portfolio_id` (references portfolios, cascade delete), `provider`, `account`, `data jsonb`, `fetched_at`, `status` (`ok | error | stale`), `error text`, `verified bool`, `verify_code text null`. Unique on `(portfolio_id, provider, account)`.
  - **RLS:** owners can select their own rows; all writes go through `service_role` only.
- **Store support.** Add the table to the store abstraction (`apps/builder/src/lib/store/types.ts`, `local.ts`, `supabase.ts`). The local file store must work, because e2e runs in LOCAL_MODE.
- **Missing table in production.** If the table is missing, the Supabase store must catch the error (`42P01` / relation does not exist), log it once, and act as if integrations are disabled.

### 3.3 Provider framework (builder: `apps/builder/src/lib/integrations/`)

- **The interface every provider implements:**

  ```ts
  interface Provider {
    id: string; name: string; homepage: string; official: boolean;
    accountLabel: string; accountPattern: RegExp;   // validate handles before any network call
    fetch(account: string, opts: Record<string, unknown>, ctx: { token?: string; signal: AbortSignal }): Promise<ProviderData>;
    toSections(data: ProviderData, cfg: IntegrationConfig): Section[];   // map into normal sections/fields (metrics, tags, links, chart…)
    verify?: { method: "oauth" | "bio-code"; instructions: string; check(account: string, code: string): Promise<boolean> };
  }
  ```

- **Each provider lives in its own file,** with a unit test that uses **recorded fixture responses**, stored in `__fixtures__/<provider>/*.json`. Tests never hit the network. Also test the mapping into sections and how errors are handled.
- **API routes** (owner-only, rate-limited with the existing `takeToken`, CSRF-protected like the other routes):
  - `POST /api/portfolios/[id]/integrations`: connect. Validates the account format, fetches once, stores the snapshot, and returns a preview of the sections.
  - `POST …/integrations/[integrationId]/refresh`: manual refresh, at most once per 10 minutes.
  - `DELETE …/integrations/[integrationId]`: disconnect. Deletes the snapshot.
  - `POST …/integrations/[integrationId]/verify`: runs the provider's verify check.
- **Merging on read.**
  - The public portfolio endpoint `GET /api/public/portfolios/[id]`, which deployed runtimes read hourly via ISR, merges the latest snapshots into the published document as synced sections, placed where the user put them.
  - **Stale-while-revalidate:** if a snapshot is older than 12 hours, serve it anyway and refresh it in the background with Next's `after()`.
  - So every deployed site updates itself with **no cron and no redeploy**.
- **Zip export:** bakes in the latest snapshot, so self-hosted sites still show data. They just stop updating.
- **Server secrets** (add to `.env.example` and "Ops for a human"):
  - `GITHUB_API_TOKEN`: a fine-grained token with no scopes, used for public reads and the GraphQL contribution calendar.
  - `STACKEXCHANGE_KEY`: optional; raises the quota.
  - **Never sent to the browser.**

### 3.4 Editor UI (builder)

- **"Connected accounts" panel** in the editor sidebar (`apps/builder/src/components/editor/`):
  - a provider grid showing each provider's logo as a simple text badge (no brand-logo assets), name, and an "Official API" or "Experimental" tag
  - connect with a handle input and an inline preview of what will appear
  - toggles for each metric and chart, and a choice of where it appears (its own section, or merged into Skills/Achievements)
  - "Verify you own this" flow
  - last-synced time, plus refresh and disconnect buttons
- **Synced sections** show in the section list with a lock icon. Their fields are read-only, but the user can still reorder, hide and rename them.
- **Accessibility:** fully keyboard-operable, with labelled controls, matching the existing editor style.
- **Hidden when the feature flag is off.**

### 3.5 Ownership verification (what "Verified owner" means)

- **GitHub:** verified automatically when the logged-in user signed in with GitHub (via Supabase Auth) and their identity's login matches. Otherwise use the bio-code check.
- **Bio-code** (for any platform that shows a profile bio publicly):
  1. Generate a short code such as `persona-7KQ2`.
  2. The user pastes it into their public bio, about-me or organization field.
  3. Click Verify; the server fetches the public profile and looks for the code.
  4. Mark the account verified. The user can then remove the code.
- **Unverified accounts** still display, with a "Public profile" label instead of "Verified owner".
- **Trust:** never call anything "verified" that wasn't.

---

## 4. Checks

### 4.1 Automated (all must pass before landing)

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm contrast
ENABLE_TEMPLATE_PREVIEW=1 pnpm build
pnpm exec playwright install --with-deps chromium   # once
pnpm e2e
```

- **Template coverage:** the template e2e must still pass for **all 23 templates**, light and dark. It now includes the `chart` field.
- **New e2e for the connect flow:** add `e2e/integrations.spec.ts`. It runs in LOCAL_MODE with a mocked provider (a `mock` provider that is only registered when `NODE_ENV !== "production"`) and covers connect, preview, toggle, publish, the public page showing the data, and disconnect.

### 4.2 Visual review

After the build, screenshot the runtime preview for **at least 6 different templates** (Swiss, Signal, Paper, Kinetic, Vision, Thread), in light and dark mode at 360 and 1440 px, using a fixture that has synced GitHub, LeetCode and Codeforces sections:

```bash
pnpm exec playwright screenshot --full-page --viewport-size="1440,900" http://localhost:3200/preview/<template>/<mode> .qa/int/<template>-<mode>.png
```

Open each image and check:
- charts are legible and use the template's colours in both modes
- there's no overflow at 360 px
- provenance lines are present but unobtrusive
- the page doesn't look busier than the rest of the template

Fix and re-shoot.

---

## 5. Land on `main`

```bash
git checkout main && git pull --ff-only origin main && git merge --squash int/<id>
```

1. Update `PROGRESS.md`: status `done`, a one-line note, and any new "Ops for a human" steps.
2. Update the README's "Integrations" section: provider, official or experimental, and what it shows.
3. Commit:

   ```bash
   git add -A && git commit -m "feat(integrations): <what> — <one-line value>"
   ```

4. Run the quick gate: `pnpm typecheck && pnpm test && ENABLE_TEMPLATE_PREVIEW=1 pnpm build && pnpm exec playwright test e2e/templates.spec.ts e2e/integrations.spec.ts`.
5. Push with `git push origin main`.
   - **Rejected:** `git pull --rebase origin main`, re-run the quick gate, push again.
   - **Never force.**
6. Clean up: `git push origin --delete int/<id>`. If the remote refuses, note it and move on.

## 6. Blocked items

1. Push the branch.
2. On `main`, mark the row `blocked` with the reason.
3. Commit `docs(integrations): mark <id> blocked` and push.
4. Continue with the next item.

A provider that is blocked because the upstream changed or refuses requests is normal for experimental providers. Note it and move on.

## 7. Final pass

1. Run all checks.
2. Update the README.
3. Make sure "Ops for a human" is complete and in order.
4. Push.
5. Post a chat summary: done, blocked, and the ops steps the human must do to switch on `FEATURE_INTEGRATIONS=1` in production.

---

## 9. QUEUE (in order)

### Foundation (must land first, in order)

| # | id | What it delivers |
| --- | --- | --- |
| F1 | `schema-chart` | §3.1: the `chart` field type rendered in `FieldValue.tsx` (heatmap, line, bars, rings), `sync` metadata and the provenance line, the `integrations` config, `migrate()`, plus fixture, Field lab, `LAB_VALUES` and render tests. Proven in all 23 templates. No network code. |
| F2 | `framework` | §3.2 + §3.3: migration, store support (local + Supabase, missing-table safe), the provider interface and registry, the `mock` provider, API routes, stale-while-revalidate merge into the public endpoint, zip-export bake-in, feature flags. |
| F3 | `editor-ui` | §3.4 + §3.5: the Connected accounts panel, read-only synced sections, the verification flow, and `e2e/integrations.spec.ts`. |

### Providers (each one = its own queue item)

1. **`github` · GitHub** (official)
   - **Data:** REST (`/users/{u}`, `/users/{u}/repos`, which needs no auth but is limited to 60 requests an hour, so always send `GITHUB_API_TOKEN` server-side). GraphQL `user(login){ contributionsCollection{ contributionCalendar{ totalContributions weeks{ contributionDays{ date contributionCount }}}} pinnedItems(first:6) … }`; the GraphQL API always requires a token.
   - **Shows:**
     - a year-long contribution **heatmap** (chart `heatmap`)
     - total contributions
     - pinned repos as project entries (name, description, stars, language, link)
     - top languages by repo bytes (chart `bars`)
     - total stars and followers as metrics
   - **Option:** import pinned repos into the user's Projects section.
   - **Verify:** OAuth identity match, otherwise a bio-code in the GitHub bio.
2. **`leetcode` · LeetCode** (experimental)
   - **Data:** the unofficial public GraphQL at `https://leetcode.com/graphql` (server-side only).
     - `matchedUser(username){ profile{ ranking aboutMe } submitStatsGlobal{ acSubmissionNum{ difficulty count } } badges{ name icon } userCalendar{ submissionCalendar streak totalActiveDays } }`
     - `userContestRanking(username){ attendedContestsCount rating globalRanking topPercentage badge{ name } }`
     - `languageProblemCount`, `tagProblemCounts`
   - **Shows:**
     - solved Easy/Medium/Hard (chart `rings`)
     - contest rating, top %, contests attended
     - the submission heatmap
     - streak and active days
     - badges (Knight/Guardian, annual badges) as achievement entries
     - top skill tags
   - **Verify:** bio-code in `aboutMe`.
3. **`codeforces` · Codeforces** (official)
   - **Data:** `https://codeforces.com/api/user.info?handles=` and `user.rating?handle=` (public, no key).
   - **Shows:** current and max rating with rank title, contests count, and a rating history line chart (chart `line`).
   - **Verify:** bio-code in the profile's first name or organization field (both are returned by `user.info`).
4. **`achievements` · Achievement wall** (aggregator; no network)
   - **Builds:** an optional section that picks the strongest real signals across connected providers. For example: LeetCode Knight badge, Codeforces max rank, GitHub stars, Credly certifications.
   - **Layout:** a `metrics` layout of verified items, each with its provenance.
   - **Rule:** no invented scores.
5. **`stackoverflow` · Stack Overflow** (official, Stack Exchange API 2.3)
   - **Data:** `/users/{ids}?site=stackoverflow`, `/users/{id}/badges`, `/users/{id}/top-tags`.
   - **Shows:** reputation, gold/silver/bronze counts, top tags (chart `bars`).
   - **Verify:** bio-code in `about_me`.
6. **`credly` · Credly certifications** (experimental)
   - **Data:** the public `https://www.credly.com/users/<username>/badges.json`.
   - **Shows:** certifications (AWS, Google Cloud, Microsoft, IBM and so on) as certification entries: name, issuer, issued date, and a link to the public badge page. The badge page itself is the issuer-backed proof.
   - **Images:** shown only if the badge-image URL is HTTPS.
   - **Verify:** not available. The link to Credly is the proof; label it "Issuer-verified on Credly".
7. **`writing` · Writing feeds** (official RSS and APIs)
   - **Sources:** dev.to (`/api/articles?username=`), Hashnode (public GraphQL), Medium (`https://medium.com/feed/@user`), Substack (`https://<name>.substack.com/feed`). Parse RSS with a tiny safe XML parser, no new heavy dependency.
   - **Shows:** latest posts with dates and links in the Writing section, plus total post count.
8. **`packages` · npm and PyPI** (official)
   - **Data:** the npm registry search by maintainer, plus `api.npmjs.org/downloads/point/last-month/<pkg>`; the PyPI JSON API plus pypistats.
   - **Shows:** packages with monthly downloads and a downloads trend (chart `line`).
9. **`huggingface` · Hugging Face** (official Hub API)
   - **Data:** `/api/models?author=`, `/api/spaces?author=`, `/api/datasets?author=`.
   - **Shows:** models, spaces and datasets with likes and downloads.
10. **`gitlab` · GitLab** (official)
    - **Data:** `/api/v4/users?username=`, plus the user's projects.
    - **Shows:** projects and stars.
    - **Verify:** bio-code in the bio.
11. **`orcid` · ORCID** (official public API; for researchers)
    - **Data:** `pub.orcid.org/v3.0/<id>/works`.
    - **Shows:** publications as a reference list in the existing publications kind, with DOIs as links.
    - **Verify:** the ORCID iD is itself the identifier; offer ORCID OAuth sign-in later (note it in Ops).
12. **`wakatime` · WakaTime** (official; only if the user has made their stats public)
    - **Shows:** coding time over the last 7 or 30 days, and languages and editors (chart `bars`).
    - **If stats are private:** show a clear message telling the user how to make them public.
13. **`codechef` · CodeChef** (experimental; no public API, so the public profile page is parsed server-side)
    - **Shows:** stars, current and highest rating, global and country rank, problems solved.
    - **Robustness:** parse defensively; if the expected markup isn't found, mark the snapshot `error` and keep the last good one.
    - **Verify:** none; label it "Public profile".
14. **`gfg-hackerrank` · GeeksforGeeks and HackerRank** (experimental, public profile pages only)
    - **Shows:** problems solved, coding score and institute rank for GfG; badges and certificates for HackerRank.
    - **If the markup isn't stable or the pages need a sign-in:** mark the item BLOCKED with the reason. Don't fight anti-bot measures.
15. **`proof-links` · Proof links** (no third-party API)
    - **What it does:** for any certificate, award or hackathon entry, the user can attach a proof URL, such as an NPTEL, Coursera or Devpost link.
    - **Check:** the server fetches it once (8 s timeout, max 1 MB, follows ≤ 3 redirects, HTTPS only, SSRF-safe, so it blocks private and loopback IPs). If the page is reachable and contains the portfolio owner's name, it shows "Link checked · contains your name · <date>".
    - **Reuse:** the existing `/api/check-links` code where it fits.

---

### Resuming in a new session

> Read `docs/integrations/MASTER_PROMPT.md` and follow it exactly: run the resume protocol (§1) and continue the queue from `docs/integrations/PROGRESS.md`.
