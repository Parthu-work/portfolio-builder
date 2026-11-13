import "server-only";
import type { Section } from "@runtime/schema/portfolio";
import { providerFetch, providerJson } from "../http";
import { ProviderError, type FetchCtx, type Provider, type ProviderData } from "../types";

/**
 * GitHub (official): one GraphQL call for the profile, the contribution
 * calendar, pinned repositories and owned repositories (stars, languages).
 * The GraphQL API always needs a token: GITHUB_API_TOKEN, a fine-grained
 * token with no scopes, used server-side only.
 */

const API = "https://api.github.com";
const MAX_LANGUAGES = 8;

const QUERY = `query($login: String!) {
  user(login: $login) {
    databaseId
    login
    followers { totalCount }
    contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } }
    pinnedItems(first: 6, types: REPOSITORY) { nodes { ... on Repository { name description url stargazerCount isPrivate primaryLanguage { name } } } }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, orderBy: { field: STARGAZERS, direction: DESC }) {
      totalCount
      nodes { stargazerCount languages(first: 10, orderBy: { field: SIZE, direction: DESC }) { edges { size node { name } } } }
    }
  }
}`;

type Gql = {
  data?: {
    user: {
      databaseId: number;
      login: string;
      followers: { totalCount: number };
      contributionsCollection: { contributionCalendar: { totalContributions: number; weeks: { contributionDays: { date: string; contributionCount: number }[] }[] } };
      pinnedItems: { nodes: ({ name: string; description: string | null; url: string; stargazerCount: number; isPrivate?: boolean; primaryLanguage: { name: string } | null } | Record<string, never>)[] };
      repositories: { totalCount: number; nodes: { stargazerCount: number; languages: { edges: { size: number; node: { name: string } }[] } }[] };
    } | null;
  };
  errors?: { type?: string; message?: string }[];
};

export type GithubData = {
  id: number;
  login: string;
  followers: number;
  repos: number;
  stars: number;
  contributions: number;
  days: [string, number][];
  pinned: { name: string; description: string; url: string; stars: number; language: string | null }[];
  languages: [string, number][];
};

const auth = (ctx: FetchCtx): Record<string, string> => {
  if (!ctx.token) throw new ProviderError("unconfigured", "GitHub is not set up on this server yet.");
  return { authorization: `Bearer ${ctx.token}` };
};

async function graphql(login: string, ctx: FetchCtx): Promise<Gql> {
  const res = await providerFetch(`${API}/graphql`, { method: "POST", headers: { ...auth(ctx), "content-type": "application/json" }, body: JSON.stringify({ query: QUERY, variables: { login } }), signal: ctx.signal });
  if (res.status === 401) throw new ProviderError("unconfigured", "The server's GitHub token was refused.");
  if (res.status === 403) throw new ProviderError("rate_limited", "GitHub is rate limiting requests. Try again later.");
  if (res.status >= 400) throw new ProviderError("upstream", `GitHub answered HTTP ${res.status}.`);
  try {
    return JSON.parse(res.text) as Gql;
  } catch {
    throw new ProviderError("upstream", "GitHub answered with something that is not JSON.");
  }
}

export function toGithubData(body: Gql): GithubData {
  const user = body.data?.user;
  if (!user) {
    if (body.errors?.some((e) => e.type === "NOT_FOUND") || body.data?.user === null) throw new ProviderError("not_found", "No GitHub user with that username.");
    throw new ProviderError("upstream", "GitHub answered with something unexpected.");
  }
  const calendar = user.contributionsCollection.contributionCalendar;
  const days = calendar.weeks.flatMap((w) => w.contributionDays.map((d): [string, number] => [d.date, d.contributionCount])).slice(-371);
  const bytes = new Map<string, number>();
  for (const repo of user.repositories.nodes) for (const e of repo.languages.edges) bytes.set(e.node.name, (bytes.get(e.node.name) ?? 0) + e.size);
  return {
    id: user.databaseId,
    login: user.login,
    followers: user.followers.totalCount,
    repos: user.repositories.totalCount,
    stars: user.repositories.nodes.reduce((n, r) => n + r.stargazerCount, 0),
    contributions: calendar.totalContributions,
    days,
    pinned: user.pinnedItems.nodes.flatMap((n) =>
      "name" in n && !n.isPrivate ? [{ name: n.name, description: (n.description ?? "").slice(0, 300), url: n.url, stars: n.stargazerCount, language: n.primaryLanguage?.name ?? null }] : [],
    ),
    languages: [...bytes].sort((a, b) => b[1] - a[1]).slice(0, MAX_LANGUAGES),
  };
}

const n = (v: number) => v.toLocaleString("en-US");
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "repo";

export const githubProvider: Provider = {
  id: "github",
  name: "GitHub",
  homepage: "https://github.com",
  official: true,
  needsToken: true,
  accountLabel: "Username",
  accountHint: "As in github.com/<username>.",
  accountPattern: /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/,
  options: [{ key: "pinned", label: "Import pinned repositories as projects", default: true }],

  async fetch(account, _opts, ctx) {
    return toGithubData(await graphql(account, ctx)) as unknown as ProviderData;
  },

  toSections(raw, cfg): Section[] {
    const d = raw as unknown as GithubData;
    const totalBytes = d.languages.reduce((a, [, b]) => a + b, 0);
    const fields: Section["fields"] = [];
    if (d.days.length) {
      fields.push({
        key: "contributions",
        label: "Contributions",
        type: "chart",
        value: { variant: "heatmap", title: "Contributions", summary: `${n(d.contributions)} contributions on GitHub in the last year`, points: d.days.map(([x, y]) => ({ x, y })), unit: "contributions" },
      });
    }
    if (totalBytes > 0) {
      fields.push({
        key: "languages",
        label: "Top languages",
        type: "chart",
        value: {
          variant: "bars",
          title: "Top languages",
          summary: `Top languages by code in public repositories: ${d.languages.slice(0, 3).map(([l, b]) => `${l} ${Math.round((b / totalBytes) * 100)}%`).join(", ")}`,
          points: d.languages.map(([x, b]) => ({ x, y: Math.round((b / totalBytes) * 100) })).filter((p) => p.y > 0),
          unit: "%",
        },
      });
    }
    const metric = (id: string, value: number, label: string) => ({ id, visible: true, values: { stat: { value: n(value), label } } });
    const sections: Section[] = [
      {
        id: `${cfg.id}_activity`,
        kind: "custom",
        title: "On GitHub",
        visible: true,
        layout: "metrics",
        fields,
        itemSchema: [{ key: "stat", label: "Stat", type: "metric" }],
        items: [metric("contributions", d.contributions, "contributions in the last year"), metric("stars", d.stars, "stars on public repositories"), metric("followers", d.followers, "followers"), metric("repos", d.repos, "public repositories")],
      },
    ];
    if (cfg.options.pinned !== false && d.pinned.length) {
      const seen = new Set<string>();
      sections.push({
        id: `${cfg.id}_pinned`,
        kind: "projects",
        title: "Pinned on GitHub",
        visible: true,
        layout: "grid",
        fields: [],
        itemSchema: [
          { key: "title", label: "Title", type: "text" },
          { key: "summary", label: "Summary", type: "longtext" },
          { key: "tags", label: "Tags", type: "tags" },
          { key: "impact", label: "Stars", type: "metric" },
          { key: "repo", label: "Source", type: "url" },
        ],
        items: d.pinned.flatMap((r) => {
          const id = slug(r.name);
          if (seen.has(id)) return [];
          seen.add(id);
          return [{ id, visible: true, values: { title: r.name, summary: r.description, tags: r.language ? [r.language] : [], impact: { value: n(r.stars), label: r.stars === 1 ? "star" : "stars" }, repo: r.url } }];
        }),
      });
    }
    return sections;
  },

  highlights(raw) {
    const d = raw as unknown as GithubData;
    return [
      ...(d.stars > 0 ? [{ id: "stars", value: n(d.stars), label: "GitHub stars on public repositories" }] : []),
      ...(d.contributions > 0 ? [{ id: "contributions", value: n(d.contributions), label: "GitHub contributions in the last year" }] : []),
    ];
  },

  ownerId: (data) => (typeof data.id === "number" ? String(data.id) : null),

  verify: {
    method: "bio-code",
    instructions: "If you signed in to Persona with this GitHub account, just press Verify. Otherwise add the code to the Bio of your GitHub profile (github.com/settings/profile), save, then press Verify. You can remove it afterwards.",
    async check(account, code, ctx) {
      const user = await providerJson<{ bio?: string | null; company?: string | null; name?: string | null }>(`${API}/users/${encodeURIComponent(account)}`, { headers: ctx.token ? { authorization: `Bearer ${ctx.token}` } : {}, signal: ctx.signal });
      return [user.bio, user.company, user.name].some((v) => typeof v === "string" && v.includes(code));
    },
  },
};
