import "server-only";
import type { Section } from "@runtime/schema/portfolio";
import { providerJson } from "../http";
import { ProviderError, type FetchCtx, type Provider, type ProviderData } from "../types";

/** GitLab (official): the public REST API v4 on gitlab.com, no token. */

const API = "https://gitlab.com/api/v4";
const PER_PAGE = 100;
const SHOWN = 6;

type GlUser = { id: number; username: string; state?: string; bio?: string | null };
type GlProject = { id: number; name: string; description: string | null; star_count: number; forks_count?: number; web_url: string; topics?: string[] };

export type GitlabData = { id: number; username: string; projects: { id: number; name: string; description: string; stars: number; url: string; topics: string[] }[]; capped: boolean };

async function findUser(username: string, ctx: FetchCtx): Promise<GlUser> {
  const users = await providerJson<GlUser[]>(`${API}/users?username=${encodeURIComponent(username)}`, { signal: ctx.signal });
  const user = Array.isArray(users) ? users.find((u) => u.username.toLowerCase() === username.toLowerCase()) : undefined;
  if (!user || (user.state && user.state !== "active")) throw new ProviderError("not_found", "No GitLab user with that username.");
  return user;
}

const n = (v: number) => v.toLocaleString("en-US");

export const gitlabProvider: Provider = {
  id: "gitlab",
  name: "GitLab",
  homepage: "https://gitlab.com",
  official: true,
  accountLabel: "Username",
  accountHint: "As in gitlab.com/<username>.",
  accountPattern: /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,254}$/,

  async fetch(account, _opts, ctx) {
    const user = await findUser(account, ctx);
    const projects = await providerJson<GlProject[]>(`${API}/users/${user.id}/projects?order_by=star_count&sort=desc&per_page=${PER_PAGE}&simple=true`, { signal: ctx.signal });
    const list = Array.isArray(projects) ? projects : [];
    const data: GitlabData = {
      id: user.id,
      username: user.username,
      capped: list.length >= PER_PAGE,
      projects: list.flatMap((p) =>
        typeof p.web_url === "string" && p.web_url.startsWith("https://gitlab.com/")
          ? [{ id: p.id, name: String(p.name).slice(0, 120), description: (p.description ?? "").replace(/\s+/g, " ").trim().slice(0, 300), stars: Math.max(0, p.star_count ?? 0), url: p.web_url, topics: (p.topics ?? []).filter((t) => typeof t === "string").slice(0, 5).map((t) => t.slice(0, 40)) }]
          : [],
      ),
    };
    return data as unknown as ProviderData;
  },

  toSections(raw, cfg): Section[] {
    const d = raw as unknown as GitlabData;
    if (!d.projects.length) return [];
    const stars = d.projects.reduce((a, p) => a + p.stars, 0);
    const metric = (id: string, value: string, label: string) => ({ id, visible: true, values: { stat: { value, label } } });
    return [
      {
        id: `${cfg.id}_stats`,
        kind: "custom",
        title: "On GitLab",
        visible: true,
        layout: "metrics",
        fields: [],
        itemSchema: [{ key: "stat", label: "Stat", type: "metric" }],
        items: [metric("projects", `${n(d.projects.length)}${d.capped ? "+" : ""}`, d.projects.length === 1 ? "public project" : "public projects"), metric("stars", `${n(stars)}${d.capped ? "+" : ""}`, "stars")],
      },
      {
        id: `${cfg.id}_projects`,
        kind: "projects",
        title: "Projects on GitLab",
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
        items: d.projects.slice(0, SHOWN).map((p) => ({ id: `p${p.id}`, visible: true, values: { title: p.name, summary: p.description, tags: p.topics, impact: { value: n(p.stars), label: p.stars === 1 ? "star" : "stars" }, repo: p.url } })),
      },
    ];
  },

  highlights(raw) {
    const d = raw as unknown as GitlabData;
    const stars = d.projects.reduce((a, p) => a + p.stars, 0);
    return stars > 0 ? [{ id: "stars", value: `${n(stars)}${d.capped ? "+" : ""}`, label: "stars on GitLab projects" }] : [];
  },

  verify: {
    method: "bio-code",
    instructions: "Add the code to the Bio of your GitLab profile (gitlab.com/-/user_settings/profile), save, then press Verify. You can remove it afterwards.",
    async check(account, code, ctx) {
      const { id } = await findUser(account, ctx);
      const full = await providerJson<GlUser>(`${API}/users/${id}`, { signal: ctx.signal });
      return typeof full.bio === "string" && full.bio.includes(code);
    },
  },
};
