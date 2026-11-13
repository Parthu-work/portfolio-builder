# Integrations — progress

Queue and rules: [`MASTER_PROMPT.md`](./MASTER_PROMPT.md). Status is one of `todo`, `in-progress`, `done`, `blocked`.

| # | id | name | status | commit | notes |
| --- | --- | --- | --- | --- | --- |
| F1 | schema-chart | Chart field, sync metadata, integrations config | done | see `git log --grep schema-chart` | `chart` type (4 variants, inline SVG, theme tokens), `sync` + provenance line via `Rest`, `integrations` config; no schema version bump. Extra optional `sync.source` / `note` / `live`. Proven in all 23 templates. |
| F2 | framework | Storage, provider framework, API routes, merge on read | todo | | |
| F3 | editor-ui | Connected accounts panel, verification, e2e | todo | | |
| 1 | github | GitHub | todo | | |
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

_(none yet)_
