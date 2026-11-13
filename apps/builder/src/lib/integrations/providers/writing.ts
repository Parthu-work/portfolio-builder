import "server-only";
import type { Section } from "@runtime/schema/portfolio";
import { providerFetch, providerJson } from "../http";
import { isoDay, parseRss, plainText, type FeedItem } from "../rss";
import { ProviderError, type FetchCtx, type Provider, type ProviderData } from "../types";

/**
 * Writing: latest posts from DEV (API), Hashnode (public GraphQL), Medium
 * and Substack (RSS). The account names the blog, e.g. "dev.to/maya".
 * A total is shown only where the platform reports one (DEV, Hashnode).
 */

const MAX_POSTS = 10;

type Platform = "devto" | "hashnode" | "medium" | "substack";
const PLATFORM_NAME: Record<Platform, string> = { devto: "DEV", hashnode: "Hashnode", medium: "Medium", substack: "Substack" };
const PLATFORM_HOST: Record<Platform, string> = { devto: "dev.to", hashnode: "hashnode.com", medium: "medium.com", substack: "substack.com" };
const PATTERNS: [Platform, RegExp][] = [
  ["devto", /^dev\.to\/([a-z0-9_]{2,30})$/],
  ["hashnode", /^([a-z0-9][a-z0-9-]{0,62}\.hashnode\.dev)$/],
  ["medium", /^medium\.com\/@([a-z0-9._-]{1,50})$/],
  ["substack", /^([a-z0-9][a-z0-9-]{0,62})\.substack\.com$/],
];

/** "https://dev.to/Maya/" → "dev.to/maya". */
export const normalize = (account: string) =>
  account
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");

export function parseAccount(account: string): { platform: Platform; id: string } | null {
  const a = normalize(account);
  for (const [platform, re] of PATTERNS) {
    const m = re.exec(a);
    if (m) return { platform, id: m[1]! };
  }
  return null;
}

export type WritingData = { platform: Platform; total: number | null; posts: FeedItem[] };

const https = (u: unknown): string => (typeof u === "string" && /^https:\/\/[^\s<>"']+$/.test(u) ? u : "");

async function devto(user: string, ctx: FetchCtx): Promise<WritingData> {
  const list = await providerJson<{ title?: string; url?: string; published_at?: string; description?: string }[]>(`https://dev.to/api/articles?username=${encodeURIComponent(user)}&per_page=100`, { signal: ctx.signal });
  if (!Array.isArray(list)) throw new ProviderError("upstream", "DEV answered with something unexpected.");
  const posts = list.flatMap((a) => (a.title && https(a.url) ? [{ title: plainText(a.title, 200), link: https(a.url), date: isoDay(a.published_at ?? ""), summary: plainText(a.description ?? "") }] : []));
  // per_page=100 is the most DEV returns in one call: at the cap, the true total is unknown.
  return { platform: "devto", total: list.length < 100 ? list.length : null, posts: posts.slice(0, MAX_POSTS) };
}

const HASHNODE = `query($host: String!) { publication(host: $host) { posts(first: ${MAX_POSTS}) { totalDocuments edges { node { title url publishedAt brief } } } } }`;
async function hashnode(host: string, ctx: FetchCtx): Promise<WritingData> {
  type Body = { data?: { publication: { posts: { totalDocuments: number; edges: { node: { title: string; url: string; publishedAt: string; brief: string } }[] } } | null } };
  const body = await providerJson<Body>("https://gql.hashnode.com", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: HASHNODE, variables: { host } }), signal: ctx.signal });
  const pub = body.data?.publication;
  if (pub === null) throw new ProviderError("not_found", "No Hashnode blog at that address.");
  if (!pub) throw new ProviderError("upstream", "Hashnode answered with something unexpected.");
  return {
    platform: "hashnode",
    total: pub.posts.totalDocuments,
    posts: pub.posts.edges.flatMap(({ node: p }) => (p.title && https(p.url) ? [{ title: plainText(p.title, 200), link: https(p.url), date: isoDay(p.publishedAt), summary: plainText(p.brief ?? "") }] : [])),
  };
}

async function rss(platform: "medium" | "substack", url: string, ctx: FetchCtx): Promise<WritingData> {
  const res = await providerFetch(url, { headers: { accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8" }, signal: ctx.signal });
  if (res.status >= 400) throw new ProviderError("upstream", `${PLATFORM_NAME[platform]} answered HTTP ${res.status}.`);
  if (!/<rss[\s>]/i.test(res.text.slice(0, 2000))) throw new ProviderError("not_found", `No ${PLATFORM_NAME[platform]} feed at that address.`);
  return { platform, total: null, posts: parseRss(res.text, MAX_POSTS) };
}

const n = (v: number) => v.toLocaleString("en-US");

/** Stable per post (so hiding one survives refreshes), unique within the list. */
function postId(link: string, taken: Set<string>): string {
  const base = `p-${link.replace(/^https:\/\//, "").replace(/[?#].*$/, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/-+$/, "").slice(-50)}`;
  let id = base;
  for (let k = 2; taken.has(id); k++) id = `${base}-${k}`;
  taken.add(id);
  return id;
}

export const writingProvider: Provider = {
  id: "writing",
  name: "Writing",
  homepage: "https://dev.to",
  official: true,
  accountLabel: "Blog",
  accountHint: "One of: dev.to/<username>, <blog>.hashnode.dev, medium.com/@<username> or <name>.substack.com.",
  accountPattern: /^(?:https?:\/\/)?(?:www\.)?(?:dev\.to\/[A-Za-z0-9_]{2,30}|[A-Za-z0-9][A-Za-z0-9-]{0,62}\.hashnode\.dev|medium\.com\/@[A-Za-z0-9._-]{1,50}|[A-Za-z0-9][A-Za-z0-9-]{0,62}\.substack\.com)\/?$/,

  async fetch(account, _opts, ctx) {
    const parsed = parseAccount(account);
    if (!parsed) throw new ProviderError("not_found", "That is not a blog address we can read.");
    const { platform, id } = parsed;
    const data =
      platform === "devto" ? await devto(id, ctx) : platform === "hashnode" ? await hashnode(id, ctx) : platform === "medium" ? await rss("medium", `https://medium.com/feed/@${id}`, ctx) : await rss("substack", `https://${id}.substack.com/feed`, ctx);
    return data as unknown as ProviderData;
  },

  toSections(raw, cfg): Section[] {
    const d = raw as unknown as WritingData;
    if (!d.posts.length) return [];
    const where = PLATFORM_NAME[d.platform];
    const taken = new Set<string>();
    return [
      {
        id: `${cfg.id}_posts`,
        kind: "publications",
        title: `Writing on ${where}`,
        visible: true,
        layout: "list",
        fields: d.total !== null ? [{ key: "total", label: "Posts", type: "metric", value: { value: n(d.total), label: d.total === 1 ? `post on ${where}` : `posts on ${where}` } }] : [],
        itemSchema: [
          { key: "title", label: "Title", type: "text" },
          { key: "publisher", label: "Publisher", type: "text" },
          { key: "date", label: "Date", type: "date" },
          { key: "summary", label: "Summary", type: "longtext" },
          { key: "link", label: "Link", type: "link" },
        ],
        items: d.posts.map((p) => ({
          id: postId(p.link, taken),
          visible: true,
          values: { title: p.title, publisher: where, date: p.date, summary: p.summary, link: { label: "Read", href: p.link } },
        })),
      },
    ];
  },

  sourceOf: (raw) => PLATFORM_HOST[(raw as unknown as WritingData).platform] ?? null,

  highlights(raw) {
    const d = raw as unknown as WritingData;
    return d.total ? [{ id: "total", value: n(d.total), label: `posts on ${PLATFORM_NAME[d.platform]}` }] : [];
  },
};
