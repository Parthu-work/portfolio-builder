import "server-only";
import type { Section } from "@runtime/schema/portfolio";
import { providerJson } from "../http";
import { ProviderError, type FetchCtx, type Provider, type ProviderData } from "../types";

/**
 * LeetCode (experimental): the unofficial public GraphQL endpoint the
 * leetcode.com site itself uses. Server-side only; when it changes or
 * refuses us, the framework keeps showing the last good snapshot.
 */

const ENDPOINT = "https://leetcode.com/graphql";
const DAY = 86_400_000;
const DAYS = 371;
const MAX_TAGS = 8;
const MAX_BADGES = 12;

const QUERY = `query($username: String!) {
  matchedUser(username: $username) {
    username
    profile { ranking }
    submitStatsGlobal { acSubmissionNum { difficulty count } }
    badges { id displayName creationDate }
    userCalendar { streak totalActiveDays submissionCalendar }
    tagProblemCounts { advanced { tagName problemsSolved } intermediate { tagName problemsSolved } fundamental { tagName problemsSolved } }
  }
  userContestRanking(username: $username) { attendedContestsCount rating globalRanking topPercentage badge { name } }
}`;

const ABOUT = `query($username: String!) { matchedUser(username: $username) { profile { aboutMe } } }`;

type Tag = { tagName: string; problemsSolved: number };
type Gql = {
  data?: {
    matchedUser: {
      username: string;
      profile: { ranking: number | null; aboutMe?: string | null };
      submitStatsGlobal: { acSubmissionNum: { difficulty: string; count: number }[] };
      badges: { id: string; displayName: string; creationDate: string | null }[];
      userCalendar: { streak: number; totalActiveDays: number; submissionCalendar: string } | null;
      tagProblemCounts: { advanced: Tag[]; intermediate: Tag[]; fundamental: Tag[] } | null;
    } | null;
    userContestRanking: { attendedContestsCount: number; rating: number; globalRanking: number; topPercentage: number | null; badge: { name: string } | null } | null;
  } | null;
  errors?: { message?: string }[];
};

export type LeetcodeData = {
  username: string;
  ranking: number | null;
  solved: { easy: number; medium: number; hard: number; all: number };
  /** One entry per day, oldest first, ending on the day of the fetch (UTC). */
  days: [string, number][];
  streak: number;
  activeDays: number;
  contest: { attended: number; rating: number; globalRanking: number; topPercentage: number | null; badge: string | null } | null;
  badges: { id: string; name: string; date: string | null }[];
  tags: [string, number][];
};

async function query(body: { query: string; variables: Record<string, string> }, ctx: FetchCtx): Promise<Gql> {
  return providerJson<Gql>(ENDPOINT, { method: "POST", headers: { "content-type": "application/json", referer: "https://leetcode.com" }, body: JSON.stringify(body), signal: ctx.signal });
}

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** LeetCode's calendar is a JSON string of `{ "<unix seconds>": count }`. */
export function calendarDays(raw: string | undefined, now: number): [string, number][] {
  const counts = new Map<string, number>();
  try {
    for (const [ts, n] of Object.entries(JSON.parse(raw || "{}") as Record<string, unknown>)) {
      const sec = Number(ts);
      if (Number.isFinite(sec) && typeof n === "number" && n > 0) counts.set(iso(sec * 1000), (counts.get(iso(sec * 1000)) ?? 0) + n);
    }
  } catch {
    /* an unreadable calendar just means no heatmap */
  }
  if (!counts.size) return [];
  const today = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate());
  return Array.from({ length: DAYS }, (_, i) => {
    const d = iso(today - (DAYS - 1 - i) * DAY);
    return [d, counts.get(d) ?? 0];
  });
}

export function toLeetcodeData(body: Gql, now = Date.now()): LeetcodeData {
  const u = body.data?.matchedUser;
  if (!u) {
    if (body.data && body.data.matchedUser === null) throw new ProviderError("not_found", "No LeetCode user with that username.");
    throw new ProviderError("upstream", "LeetCode answered with something unexpected.");
  }
  const count = (d: string) => u.submitStatsGlobal.acSubmissionNum.find((x) => x.difficulty === d)?.count ?? 0;
  const tags = new Map<string, number>();
  for (const t of [...(u.tagProblemCounts?.advanced ?? []), ...(u.tagProblemCounts?.intermediate ?? []), ...(u.tagProblemCounts?.fundamental ?? [])]) tags.set(t.tagName, (tags.get(t.tagName) ?? 0) + t.problemsSolved);
  const c = body.data?.userContestRanking;
  return {
    username: u.username,
    ranking: u.profile.ranking ?? null,
    solved: { easy: count("Easy"), medium: count("Medium"), hard: count("Hard"), all: count("All") },
    days: calendarDays(u.userCalendar?.submissionCalendar, now),
    streak: u.userCalendar?.streak ?? 0,
    activeDays: u.userCalendar?.totalActiveDays ?? 0,
    contest: c && c.attendedContestsCount > 0 ? { attended: c.attendedContestsCount, rating: Math.round(c.rating), globalRanking: c.globalRanking, topPercentage: c.topPercentage, badge: c.badge?.name ?? null } : null,
    badges: u.badges.slice(0, MAX_BADGES).map((b) => ({ id: b.id, name: b.displayName, date: b.creationDate })),
    tags: [...tags].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, MAX_TAGS),
  };
}

const n = (v: number) => v.toLocaleString("en-US");
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "badge";

export const leetcodeProvider: Provider = {
  id: "leetcode",
  name: "LeetCode",
  homepage: "https://leetcode.com",
  official: false,
  accountLabel: "Username",
  accountHint: "As in leetcode.com/u/<username>.",
  accountPattern: /^[A-Za-z0-9_-]{3,30}$/,
  options: [
    { key: "badges", label: "Show badges as achievements", default: true },
    { key: "tags", label: "Show top topics", default: true },
  ],

  async fetch(account, _opts, ctx) {
    return toLeetcodeData(await query({ query: QUERY, variables: { username: account } }, ctx)) as unknown as ProviderData;
  },

  toSections(raw, cfg): Section[] {
    const d = raw as unknown as LeetcodeData;
    const { solved } = d;
    const fields: Section["fields"] = [];
    if (solved.all > 0) {
      fields.push({
        key: "solved",
        label: "Solved by difficulty",
        type: "chart",
        value: {
          variant: "rings",
          title: "Solved by difficulty",
          summary: `${n(solved.all)} LeetCode problems solved: ${n(solved.easy)} easy, ${n(solved.medium)} medium, ${n(solved.hard)} hard`,
          points: [
            { x: "Easy", y: solved.easy },
            { x: "Medium", y: solved.medium },
            { x: "Hard", y: solved.hard },
          ],
        },
      });
    }
    if (d.days.length) {
      const total = d.days.reduce((a, [, c]) => a + c, 0);
      fields.push({ key: "submissions", label: "Submissions", type: "chart", value: { variant: "heatmap", title: "Submissions", summary: `${n(total)} LeetCode submissions in the last year`, points: d.days.map(([x, y]) => ({ x, y })), unit: "submissions" } });
    }
    const metric = (id: string, value: string, label: string) => ({ id, visible: true, values: { stat: { value, label } } });
    const items = [metric("solved", n(solved.all), "problems solved")];
    if (d.contest) {
      items.push(metric("rating", n(d.contest.rating), "contest rating"));
      if (d.contest.topPercentage !== null) items.push(metric("top", `${d.contest.topPercentage}%`, "top contest percentile"));
      items.push(metric("contests", n(d.contest.attended), d.contest.attended === 1 ? "contest attended" : "contests attended"));
    }
    if (d.streak > 0) items.push(metric("streak", n(d.streak), "day max streak"));
    if (d.activeDays > 0) items.push(metric("active", n(d.activeDays), "active days"));
    const sections: Section[] = [{ id: `${cfg.id}_stats`, kind: "custom", title: "On LeetCode", visible: true, layout: "metrics", fields, itemSchema: [{ key: "stat", label: "Stat", type: "metric" }], items }];

    const badges = [
      ...(d.contest?.badge ? [{ id: `contest-${slug(d.contest.badge)}`, title: `${d.contest.badge} (contest rank)`, date: "" }] : []),
      ...d.badges.map((b) => ({ id: slug(`${b.name}-${b.id}`), title: b.name, date: /^\d{4}-\d{2}-\d{2}$/.test(b.date ?? "") ? b.date! : "" })),
    ];
    if (cfg.options.badges !== false && badges.length) {
      sections.push({
        id: `${cfg.id}_badges`,
        kind: "awards",
        title: "LeetCode badges",
        visible: true,
        layout: "list",
        fields: [],
        itemSchema: [
          { key: "title", label: "Title", type: "text" },
          { key: "issuer", label: "Issuer", type: "text" },
          { key: "date", label: "Date", type: "date" },
        ],
        items: badges.map((b) => ({ id: b.id, visible: true, values: { title: b.title, issuer: "LeetCode", date: b.date } })),
      });
    }
    if (cfg.options.tags !== false && d.tags.length) {
      sections.push({
        id: `${cfg.id}_topics`,
        kind: "skills",
        title: "LeetCode topics",
        visible: true,
        layout: "tags",
        fields: [],
        itemSchema: [
          { key: "group", label: "Group", type: "text" },
          { key: "skills", label: "Skills", type: "tags" },
        ],
        items: [{ id: "top", visible: true, values: { group: "Most solved topics", skills: d.tags.map(([t, c]) => `${t} · ${n(c)}`) } }],
      });
    }
    return sections;
  },

  verify: {
    method: "bio-code",
    instructions: "Add the code to the Summary (About me) on your LeetCode profile (leetcode.com/profile), save, then press Verify. You can remove it afterwards.",
    async check(account, code, ctx) {
      const body = await query({ query: ABOUT, variables: { username: account } }, ctx);
      const about = body.data?.matchedUser?.profile.aboutMe;
      return typeof about === "string" && about.includes(code);
    },
  },
};
