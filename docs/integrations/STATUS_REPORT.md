# Persona Integrations Factory — Implementation Status Report

As of 13 Nov 2026 · `main` at `ad697f7`

All 18 items in the original specification are implemented and merged to `main` (3 foundation milestones and 15 provider items), and CI passes on the latest commit. The feature is still off in production: the database migration, server secrets, a live smoke test and the feature flag are manual steps that remain. Only GitLab and npm/PyPI listing have been checked against live APIs so far.

## Status by item

18 of 18 items are done; the previous audit counted 2 of 18. Each item landed as one squash commit on `main`.

| # | Item | Status | Commit |
| --- | --- | --- | --- |
| F1 | Schema and chart rendering | Done | `d43c24e` |
| F2 | Integration backend framework | Done | `b5c1ff0` |
| F3 | Connected Accounts editor UI | Done | `dad377f` |
| 1 | GitHub | Done | `6bc2667` |
| 2 | LeetCode (experimental) | Done | `d6fedfb` |
| 3 | Codeforces | Done | `b300477` |
| 4 | Achievement wall | Done | `abab424` |
| 5 | Stack Overflow | Done | `4a9d902` |
| 6 | Credly (experimental) | Done | `6e580df` |
| 7 | Writing (DEV, Hashnode, Medium, Substack) | Done | `dfab427` |
| 8 | npm / PyPI | Done | `236f8a2`, ranking fix `a35837e` |
| 9 | Hugging Face | Done | `fe7209f` |
| 10 | GitLab | Done | `fbc75c2` |
| 11 | ORCID | Done | `bca7fca`, verification `a35837e` |
| 12 | WakaTime | Done | `0749942` |
| 13 | CodeChef (experimental) | Done | `f3f4033` |
| 14 | GeeksforGeeks and HackerRank (experimental) | Done | `ad697f7` |
| 15 | Proof links | Done | `79e5fa3`, preview `a35837e` |

Item 14 was first marked blocked (`6013615`) and then built as two separate experimental providers.

## Foundation (F1–F3)

All three foundation milestones are complete, including F3, which the previous audit listed as not implemented.

- **F1 — Schema and charts.** A `chart` field (heatmap, line, bars, rings) drawn once as inline SVG in theme colours, with an accessible summary and hidden data table. Sections carry `sync` provenance ("Live from … · updated … · Verified owner"). Proven in all 23 templates, light and dark, with no template edited.
- **F2 — Backend framework.** Snapshot table and storage (local and Supabase, safe when the table is missing), provider interface and registry, connect / refresh / preview / verify / disconnect routes, and merge on read: deployed sites update themselves with no cron and no redeploy. Snapshots older than 12 hours refresh in the background, at most once per 6 hours per account.
- **F3 — Connected Accounts editor.** An Accounts tab, shown only when the feature flag is on: provider grid labelled Official API, Experimental or Built in; handle validation before any request; placement; per-metric, chart and entry toggles; bio-code verification with copy; last-synced time and errors; refresh; disconnect with confirmation. Synced sections show a lock: they can be renamed, reordered and hidden, but not edited. The preview shows the same data and marks as the live site.

Framework additions made while building providers: GitHub ownership by sign-in identity (`ownerId`), providers offered only when their token is set (`needsToken`), highlights and aggregation for the Achievement wall, per-account source names (`sourceOf`), and server-side annotations for proof links.

## Provider integrations

16 providers serve the 15 provider items (item 14 is two providers). Three were checked against live APIs; the rest are tested on hand-built data in each API's documented shape, because the build environment could not reach them.

| Provider | Source | Shows | Ownership | Checked live |
| --- | --- | --- | --- | --- |
| GitHub | Official GraphQL (server token) | Contribution heatmap, top languages, stars, followers, repos, pinned repos as projects | GitHub sign-in match, or bio code | No |
| LeetCode | Experimental (unofficial GraphQL) | Solved by difficulty, submission heatmap, contest rating and percentile, streak, badges, top topics | Bio code in About me | No |
| Codeforces | Official API | Current and max rating with rank, contests, rating history | Bio code in name or organization | No |
| Achievement wall | Built in (no network) | Each connected provider's own strongest numbers, with source and verification | Verified accounts only, by default | n/a |
| Stack Overflow | Official API 2.3 | Reputation, badge counts, top tags, gold and silver badges | Bio code in About me | No |
| Credly | Experimental (public badges JSON) | Certifications linked to issuer-backed badge pages | "Issuer-verified on Credly" | No |
| Writing | Official APIs and RSS | Latest posts from DEV, Hashnode, Medium or Substack; totals where reported | None | No |
| npm / PyPI | Official registries | Packages, monthly downloads, weekly trend | None | Listing yes; downloads blocked here |
| Hugging Face | Official Hub API | Models, Spaces, datasets, likes, 30-day downloads | None | No |
| GitLab | Official REST v4 | Public projects and stars | Bio code | Yes |
| ORCID | Official public API | Publications with DOI links | Bio code in biography or keywords | No |
| WakaTime | Official API (public stats) | Coding time, daily average, languages, editors | None | No |
| CodeChef | Experimental (profile page) | Rating, stars, highest rating, ranks, problems solved | None | No |
| GeeksforGeeks | Experimental (profile JSON) | Coding score, problems solved, institute rank, streak | None | No |
| HackerRank | Experimental (badges and certificates JSON) | Starred badges, passed certificates | None | No |
| Proof links | Built in (safe page fetch) | "Link checked · contains your name" on entries whose proof page shows the owner's name | Name match on the page | Fetch path yes |

Accounts without an ownership check show "Public profile", never "Verified owner".

## Testing and CI

CI run #41 on the latest commit (`ad697f7`) passed, and every item passed the full local suite before it landed. Earlier runs marked "cancelled" were superseded by newer pushes, not failures.

| Check | Result |
| --- | --- |
| Lint and typecheck | Pass |
| Builder unit tests | 155 passed |
| Runtime unit tests | 84 passed |
| Palette contrast | Pass |
| Production builds | Pass |
| Playwright e2e and accessibility | 80 passed |
| GitHub Actions CI #41 | Success |

What the tests cover:

- Every provider: data mapping, schema validity of its sections, error handling (not found, private, rate limited, upstream), and verification.
- Real recorded answers from gitlab.com and PyPI XML-RPC, alongside hand-built fixtures.
- An editor e2e of the full journey: connect, live preview, toggle, verify, Achievement wall, publish, public page, disconnect. The Accounts tab is in the axe accessibility suite, light and dark.
- Safety: private-IP blocking, redirects, size limits, forged proof marks stripped, the feature flag off.

Screenshots of synced GitHub, LeetCode, Codeforces and Credly sections were reviewed in six templates (Swiss, Signal, Paper, Kinetic, Vision, Thread), light and dark, at 360 and 1440 px, with no overflow.

## Safety and trust

With `FEATURE_INTEGRATIONS` unset, or before the migration is applied, the app behaves exactly as it did before this work.

- **Kill switch per provider:** `INTEGRATION_<ID>_DISABLED=1` stops all calls to that provider; data already fetched keeps showing.
- **Good API citizen:** 8-second timeouts, a `Persona/1.0` User-Agent, no retry loops, at most one automatic call per account every 6 hours, and manual refresh at most once per 10 minutes. Unofficial sources run server-side only, and on failure the last good snapshot stays.
- **Public data only:** no third-party passwords or user API keys are stored. Server tokens never reach the browser, and disconnecting deletes the snapshot.
- **No invented data:** every value is exactly what the provider returned, with its "as of" time. Counts that hit a page limit show as "100+", and totals appear only where the platform reports one.
- **Honest verification:** "Verified owner" appears only after a real check (GitHub sign-in by stable user id, or a code found on the public profile). Provenance stored in a document is never trusted; it is rebuilt from snapshots on every read.
- **Proof links:** pages are fetched over HTTPS on port 443 only, with every resolved IP checked at connect time (this defeats DNS rebinding), at most 3 redirects, 8 seconds and 1 MB. Proof marks live only in server snapshots; any mark found in a stored document is removed before display, even with the feature off.
- **Bot protection:** a refusal from GeeksforGeeks or HackerRank is reported as such and never worked around.

## Known limitations and open risks

The main risk is untested contact with real APIs: 13 of 16 providers have never been called live.

- **Experimental sources may break.** LeetCode, Credly, CodeChef, GeeksforGeeks and HackerRank use unofficial endpoints or pages; GeeksforGeeks and HackerRank are the least certain. Any of them can fail or be refused at any time; when that happens, the last good data keeps showing.
- **Production is untouched.** Whether the migration has been applied or the flag set in the deployed environment was not checked; no production access was used.
- **Placement differs from the specification.** It asked for synced data to merge "into" Skills or Achievements; the editor places synced sections next to a chosen section instead, so a refresh never overwrites hand-written content.
- **Narrower scope in places.** GitLab covers gitlab.com only, not self-managed instances. Writing reads one blog per connection. PyPI ranks at most 20 of a user's projects by downloads.
- **ORCID sign-in is optional and not built.** Researchers verify with a bio code instead; Supabase has no built-in ORCID login.
- **Housekeeping.** The remote refused to delete the merged `int/*` work branches; they can be removed by hand.

## Steps to switch it on in production

Six manual steps remain, in this order; nothing changes for users until step 5. The same steps, with more detail, are in [PROGRESS.md](./PROGRESS.md) under "Ops for a human".

1. **Apply the migration** `supabase/migrations/20261113000000_integrations.sql` to the production Supabase project. It only adds the `integration_snapshots` table.
2. **Set server secrets** on the builder's Vercel project (never `NEXT_PUBLIC_`): `GITHUB_API_TOKEN`, a fine-grained token with no scopes (GitHub is not offered without it), and optionally `STACKEXCHANGE_KEY`.
3. **Keep GitHub sign-in enabled** in Supabase Auth, so GitHub users are verified without a code.
4. **Smoke-test on a preview deployment** with the flag set there only: connect one real account per provider and compare the numbers with the profile. Start with the experimental ones.
5. **Set `FEATURE_INTEGRATIONS=1`** on the builder and redeploy.
6. **Switch off any provider that fails** with `INTEGRATION_<ID>_DISABLED=1` (ids: github, leetcode, codeforces, stackoverflow, credly, writing, packages, huggingface, gitlab, orcid, wakatime, codechef, gfg, hackerrank, achievements, proof-links; `-` becomes `_`).

Optional later: add ORCID as a custom OAuth sign-in so researchers are verified automatically.

## Sources

- [Progress file and ops steps](./PROGRESS.md) and [the original specification](./MASTER_PROMPT.md)
- [CI run #41 (success)](https://github.com/Parthu-work/portfolio-builder/actions/runs/43494774825)
- Local runs of lint, typecheck, unit tests, contrast, builds and Playwright e2e on each landed commit, and live calls to gitlab.com, the npm registry and PyPI on 13 Nov 2026.
