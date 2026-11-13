import "server-only";
import type { Section } from "@runtime/schema/portfolio";
import { providerFetch } from "../http";
import { ProviderError, type FetchCtx, type Provider, type ProviderData } from "../types";

/**
 * Stack Overflow (official): Stack Exchange API 2.3. Works without a key;
 * STACKEXCHANGE_KEY only raises the daily quota.
 */

const API = "https://api.stackexchange.com/2.3";
const MAX_TAGS = 8;
const MAX_BADGES = 8;

type Envelope<T> = { items?: T[]; error_id?: number; error_name?: string; error_message?: string; backoff?: number };
type SeUser = { user_id: number; display_name: string; reputation: number; badge_counts: { gold: number; silver: number; bronze: number }; link: string; about_me?: string };
type SeBadge = { badge_id: number; name: string; rank: "gold" | "silver" | "bronze"; award_count: number; link: string };
type SeTag = { tag_name: string; answer_score: number; answer_count: number };

export type StackoverflowData = {
  id: number;
  name: string;
  link: string;
  reputation: number;
  badges: { gold: number; silver: number; bronze: number };
  named: { id: number; name: string; rank: "gold" | "silver"; count: number; link: string }[];
  tags: [string, number][];
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
/** The API returns HTML-escaped text. */
export const unescape = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => (e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENTITIES[e.toLowerCase()] ?? m)));

async function call<T>(path: string, params: Record<string, string>, ctx: FetchCtx): Promise<T[]> {
  const q = new URLSearchParams({ site: "stackoverflow", ...params, ...(ctx.token ? { key: ctx.token } : {}) });
  const res = await providerFetch(`${API}${path}?${q}`, { signal: ctx.signal });
  let body: Envelope<T>;
  try {
    body = JSON.parse(res.text) as Envelope<T>;
  } catch {
    throw new ProviderError("upstream", "Stack Exchange answered with something that is not JSON.");
  }
  if (body.error_id !== undefined) {
    if (body.error_name === "throttle_violation" || body.error_id === 502) throw new ProviderError("rate_limited", "Stack Exchange is rate limiting requests. Try again later.");
    if (body.error_name === "no_method" || body.error_id === 404) throw new ProviderError("not_found", "No Stack Overflow user with that ID.");
    throw new ProviderError("upstream", `Stack Exchange refused the request (${body.error_name ?? body.error_id}).`);
  }
  if (res.status >= 400) throw new ProviderError("upstream", `Stack Exchange answered HTTP ${res.status}.`);
  return body.items ?? [];
}

async function user(id: string, ctx: FetchCtx, filter?: string): Promise<SeUser> {
  const [u] = await call<SeUser>(`/users/${id}`, filter ? { filter } : {}, ctx);
  if (!u) throw new ProviderError("not_found", "No Stack Overflow user with that ID.");
  return u;
}

export function toStackoverflowData(u: SeUser, badges: SeBadge[], tags: SeTag[]): StackoverflowData {
  return {
    id: u.user_id,
    name: unescape(u.display_name),
    link: u.link,
    reputation: u.reputation,
    badges: u.badge_counts,
    named: badges
      .filter((b): b is SeBadge & { rank: "gold" | "silver" } => b.rank === "gold" || b.rank === "silver")
      .slice(0, MAX_BADGES)
      .map((b) => ({ id: b.badge_id, name: unescape(b.name), rank: b.rank, count: b.award_count, link: b.link })),
    tags: tags
      .filter((t) => t.answer_score > 0)
      .slice(0, MAX_TAGS)
      .map((t) => [unescape(t.tag_name), t.answer_score]),
  };
}

const n = (v: number) => v.toLocaleString("en-US");

export const stackoverflowProvider: Provider = {
  id: "stackoverflow",
  name: "Stack Overflow",
  homepage: "https://stackoverflow.com",
  official: true,
  accountLabel: "User ID",
  accountHint: "The number in stackoverflow.com/users/<id>/your-name.",
  accountPattern: /^[1-9]\d{0,9}$/,
  options: [{ key: "badges", label: "Show gold and silver badges", default: true }],

  async fetch(account, _opts, ctx) {
    const u = await user(account, ctx);
    const badges = await call<SeBadge>(`/users/${account}/badges`, { sort: "rank", order: "desc", pagesize: "30" }, ctx);
    const tags = await call<SeTag>(`/users/${account}/top-tags`, { pagesize: String(MAX_TAGS) }, ctx);
    return toStackoverflowData(u, badges, tags) as unknown as ProviderData;
  },

  toSections(raw, cfg): Section[] {
    const d = raw as unknown as StackoverflowData;
    const metric = (id: string, value: number, label: string) => ({ id, visible: true, values: { stat: { value: n(value), label } } });
    const fields: Section["fields"] = d.tags.length
      ? [
          {
            key: "tags",
            label: "Top tags",
            type: "chart",
            value: { variant: "bars", title: "Top tags by answer score", summary: `Top Stack Overflow tags by answer score: ${d.tags.slice(0, 3).map(([t, s]) => `${t} ${n(s)}`).join(", ")}`, points: d.tags.map(([x, y]) => ({ x, y })) },
          },
        ]
      : [];
    const sections: Section[] = [
      {
        id: `${cfg.id}_stats`,
        kind: "custom",
        title: "On Stack Overflow",
        visible: true,
        layout: "metrics",
        fields,
        itemSchema: [{ key: "stat", label: "Stat", type: "metric" }],
        items: [metric("reputation", d.reputation, "reputation"), metric("gold", d.badges.gold, "gold badges"), metric("silver", d.badges.silver, "silver badges"), metric("bronze", d.badges.bronze, "bronze badges")],
      },
    ];
    if (cfg.options.badges !== false && d.named.length) {
      sections.push({
        id: `${cfg.id}_badges`,
        kind: "awards",
        title: "Stack Overflow badges",
        visible: true,
        layout: "list",
        fields: [],
        itemSchema: [
          { key: "title", label: "Title", type: "text" },
          { key: "issuer", label: "Issuer", type: "text" },
          { key: "link", label: "Link", type: "link" },
        ],
        items: d.named.map((b) => ({ id: `b${b.id}`, visible: true, values: { title: `${b.name} (${b.rank}${b.count > 1 ? ` ×${b.count}` : ""})`, issuer: "Stack Overflow", link: { label: "Badge", href: b.link } } })),
      });
    }
    return sections;
  },

  highlights(raw) {
    const d = raw as unknown as StackoverflowData;
    return [
      ...(d.reputation > 0 ? [{ id: "reputation", value: n(d.reputation), label: "Stack Overflow reputation" }] : []),
      ...(d.badges.gold > 0 ? [{ id: "gold", value: n(d.badges.gold), label: d.badges.gold === 1 ? "Stack Overflow gold badge" : "Stack Overflow gold badges" }] : []),
    ];
  },

  verify: {
    method: "bio-code",
    instructions: "Add the code to the About me of your Stack Overflow profile (Edit profile), save, then press Verify. You can remove it afterwards.",
    async check(account, code, ctx) {
      // about_me is not in the default filter: ask for a filter that includes it.
      const [made] = await call<{ filter: string }>("/filters/create", { include: "user.about_me", unsafe: "false" }, ctx);
      if (!made?.filter) throw new ProviderError("upstream", "Stack Exchange did not create the profile filter.");
      const u = await user(account, ctx, made.filter);
      return typeof u.about_me === "string" && unescape(u.about_me).includes(code);
    },
  },
};
