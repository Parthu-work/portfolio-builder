# Integrations — progress

Queue and rules: [`MASTER_PROMPT.md`](./MASTER_PROMPT.md). Status is one of `todo`, `in-progress`, `done`, `blocked`.

| # | id | name | status | commit | notes |
| --- | --- | --- | --- | --- | --- |
| F1 | schema-chart | Chart field, sync metadata, integrations config | done | see `git log --grep schema-chart` | `chart` type (4 variants, inline SVG, theme tokens), `sync` + provenance line via `Rest`, `integrations` config; no schema version bump. Extra optional `sync.source` / `note` / `live`. Proven in all 23 templates. |
| F2 | framework | Storage, provider framework, API routes, merge on read | done | see `git log --grep framework` | `integration_snapshots` migration + store (local, Supabase, missing-table safe), `lib/integrations` (Provider interface, registry, HTTP helper, mock provider), connect / refresh / preview / verify / disconnect routes, merge on read with 12 h SWR via `after()` and a 6 h per-account floor, zip bake-in, `FEATURE_INTEGRATIONS` + per-provider kill switch. Mock provider is registered only when there is no real backend (dev, tests, `LOCAL_MODE` e2e) because e2e runs a production build. |
| F3 | editor-ui | Connected accounts panel, verification, e2e | done | see `git log --grep editor-ui` | "Accounts" editor tab (hidden when the flag is off): provider grid with Official/Experimental tags, handle validation before any request, placement ("Before Contact" or after a chosen section), per-option and per-metric/chart/entry toggles, bio-code verify with copy, last synced + error, refresh, confirmed disconnect. Synced sections are locked (rename/reorder/hide only). Editor resyncs the draft from the latest snapshots on open. Placement merges *next to* Skills/Achievements rather than *into* them, so a refresh never touches hand-written content. GitHub OAuth identity match is left to the `github` item. `e2e/integrations.spec.ts` covers the UI flow; the Accounts tab is in the axe suite. |
| 1 | github | GitHub | done | see `git log --grep "integrations): github"` | One GraphQL call (profile id, calendar, pinned, top-100 owned public non-fork repos). Shows heatmap, language bars, 4 metrics, pinned repos as a projects section (option). Offered only when `GITHUB_API_TOKEN` is set (`needsToken`). Verified automatically when the user signed in with the same GitHub account (matched by GitHub user id, not login, via Supabase identities), otherwise bio code (bio/company/name). Fixtures are hand-built from GitHub's documented GraphQL shapes, not live recordings (no token in CI). Stars are summed over the top 100 repos by stars. |
| 2 | leetcode | LeetCode | todo | | |
| 3 | codeforces | Codeforces | todo | | |
| 4 | achievements | Achievement wall | todo | | |
| 5 | stackoverflow | Stack Overflow | todo | | |
| 6 | credly | Credly certifications | todo | | |
| 7 | writing | Writing feeds | todo | | |
| 8 | packages | npm and PyPI | todo | | |
| 9 | huggingface | Hugging Face | todo | | |
| 10 | gitlab | GitLab | todo | | |
| 11 | orcid | ORCID | todo | | |
| 12 | wakatime | WakaTime | todo | | |
| 13 | codechef | CodeChef | todo | | |
| 14 | gfg-hackerrank | GeeksforGeeks and HackerRank | todo | | |
| 15 | proof-links | Proof links | todo | | |

## Ops for a human

Manual steps, in the order they must be done. Nothing here is needed while `FEATURE_INTEGRATIONS` is unset: the app behaves exactly as before.

1. **Apply the migration** `supabase/migrations/20261113000000_integrations.sql` to the production Supabase project (`supabase db push`, or paste it into the SQL editor). It only adds the `integration_snapshots` table. Until it is applied, the app logs one warning and behaves as if integrations were off.
2. **Set server secrets** on the builder's Vercel project (never `NEXT_PUBLIC_`):
   - `GITHUB_API_TOKEN` — a fine-grained personal access token with **no scopes / public repositories read-only**. Needed by the GitHub provider (REST quota + GraphQL contribution calendar).
   - `STACKEXCHANGE_KEY` — optional; raises the Stack Exchange quota.
3. **GitHub sign-in (optional, for automatic "Verified owner")**: keep the GitHub provider enabled in Supabase Auth. Users who signed in with GitHub are verified without a bio code.
4. **Switch the feature on**: set `FEATURE_INTEGRATIONS=1` on the builder and redeploy. Do this last.
5. **Kill switches** (no deploy of code needed): `INTEGRATION_<PROVIDER>_DISABLED=1`, e.g. `INTEGRATION_LEETCODE_DISABLED=1`, stops all calls to that provider; data already fetched keeps showing.

Notes:

- Deployed portfolio sites need no change: they already read `GET /api/public/portfolios/[id]`, which now merges the latest snapshots in.
- Housekeeping: the remote refused to delete the merged branch `int/schema-chart`; it can be deleted by hand.
