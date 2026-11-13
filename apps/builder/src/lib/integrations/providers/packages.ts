import "server-only";
import type { Section } from "@runtime/schema/portfolio";
import { providerFetch, providerJson } from "../http";
import { ProviderError, type FetchCtx, type Provider, type ProviderData } from "../types";

/**
 * Packages (official): npm (registry search by maintainer + the downloads
 * API) and PyPI (the user's projects via XML-RPC `user_packages`, the JSON
 * API, and pypistats). The account is "npm/<user>" or "pypi/<user>".
 */

const MAX_PACKAGES = 12;
/** Downloads are looked up for the first few packages only: a handful of calls, made in parallel. */
const MAX_STATS = 5;
const DAY = 86_400_000;

type Registry = "npm" | "pypi";
type Pkg = { name: string; description: string; version: string; url: string; monthly: number | null };
export type PackagesData = { registry: Registry; user: string; packages: Pkg[]; count: number; weeks: [string, number][] };

const https = (u: unknown): string => (typeof u === "string" && /^https:\/\/[^\s<>"']+$/.test(u) ? u : "");
const text = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");

export function parseAccount(account: string): { registry: Registry; user: string } | null {
  const m = /^(npm|pypi)\/([a-z0-9][a-z0-9._-]{0,63})$/i.exec(account.trim());
  return m ? { registry: m[1]!.toLowerCase() as Registry, user: m[2]! } : null;
}

/** Monday of the ISO week a YYYY-MM-DD day falls in. */
const weekOf = (day: string) => {
  const t = Date.parse(`${day}T00:00:00Z`);
  const dow = (new Date(t).getUTCDay() + 6) % 7;
  return new Date(t - dow * DAY).toISOString().slice(0, 10);
};

/** Daily series → weekly totals, keeping only weeks with all seven days present. */
export function weekly(days: { day: string; downloads: number }[]): [string, number][] {
  const sums = new Map<string, { total: number; days: Set<string> }>();
  for (const { day, downloads } of days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(downloads)) continue;
    const w = sums.get(weekOf(day)) ?? { total: 0, days: new Set<string>() };
    w.total += downloads;
    w.days.add(day);
    sums.set(weekOf(day), w);
  }
  return [...sums]
    .filter(([, w]) => w.days.size === 7)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-52)
    .map(([w, { total }]) => [w, total]);
}

const settle = async <T>(p: Promise<T>): Promise<T | null> => p.catch(() => null);

async function npm(user: string, ctx: FetchCtx): Promise<PackagesData> {
  type Search = { total?: number; objects?: { package: { name: string; description?: string; version?: string; links?: { npm?: string } } }[] };
  const found = await providerJson<Search>(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(`maintainer:${user}`)}&size=${MAX_PACKAGES}`, { signal: ctx.signal });
  const objects = found.objects ?? [];
  if (!objects.length) throw new ProviderError("not_found", "No npm packages maintained by that user.");
  const names = objects.map((o) => o.package.name);
  const top = names.slice(0, MAX_STATS);
  const enc = (n: string) => n.split("/").map(encodeURIComponent).join("/");
  const [points, ranges] = await Promise.all([
    Promise.all(top.map((n) => settle(providerJson<{ downloads?: number }>(`https://api.npmjs.org/downloads/point/last-month/${enc(n)}`, { signal: ctx.signal })))),
    Promise.all(top.map((n) => settle(providerJson<{ downloads?: { day: string; downloads: number }[] }>(`https://api.npmjs.org/downloads/range/last-year/${enc(n)}`, { signal: ctx.signal })))),
  ]);
  return {
    registry: "npm",
    user,
    count: found.total ?? objects.length,
    packages: objects.map(({ package: p }, i) => ({
      name: text(p.name, 214),
      description: text(p.description, 300),
      version: text(p.version, 40),
      url: https(p.links?.npm) || `https://www.npmjs.com/package/${enc(p.name)}`,
      monthly: typeof points[i]?.downloads === "number" ? points[i]!.downloads! : null,
    })),
    weeks: weekly(ranges.flatMap((r) => r?.downloads ?? [])),
  };
}

/** The pairs of a `user_packages` XML-RPC answer: [[role, name], …]. */
export function parseUserPackages(xml: string): string[] {
  if (/<fault>/i.test(xml)) throw new ProviderError("upstream", "PyPI refused the request.");
  const names: string[] = [];
  for (const m of xml.matchAll(/<array>\s*<data>((?:(?!<array>)[\s\S]){0,2000}?)<\/data>\s*<\/array>/gi)) {
    const values = [...m[1]!.matchAll(/<value>\s*(?:<string>)?([^<]{0,200})(?:<\/string>)?\s*<\/value>/gi)].map((v) => v[1]!.trim());
    const name = values[1];
    if (name && /^[A-Za-z0-9._-]{1,100}$/.test(name) && !names.includes(name)) names.push(name);
  }
  return names;
}

async function pypi(user: string, ctx: FetchCtx): Promise<PackagesData> {
  const body = `<?xml version="1.0"?><methodCall><methodName>user_packages</methodName><params><param><value><string>${user}</string></value></param></params></methodCall>`;
  const res = await providerFetch("https://pypi.org/pypi", { method: "POST", headers: { "content-type": "text/xml", accept: "text/xml" }, body, signal: ctx.signal });
  if (res.status >= 400) throw new ProviderError("upstream", `PyPI answered HTTP ${res.status}.`);
  const all = parseUserPackages(res.text);
  if (!all.length) throw new ProviderError("not_found", "No PyPI projects for that user.");
  const names = all.slice(0, MAX_PACKAGES);
  type Info = { info?: { summary?: string; version?: string; package_url?: string; project_url?: string } };
  const [infos, recents, overall] = await Promise.all([
    Promise.all(names.map((n) => settle(providerJson<Info>(`https://pypi.org/pypi/${encodeURIComponent(n)}/json`, { signal: ctx.signal })))),
    Promise.all(names.slice(0, MAX_STATS).map((n) => settle(providerJson<{ data?: { last_month?: number } }>(`https://pypistats.org/api/packages/${encodeURIComponent(n.toLowerCase())}/recent`, { signal: ctx.signal })))),
    Promise.all(names.slice(0, MAX_STATS).map((n) => settle(providerJson<{ data?: { date: string; downloads: number; category?: string }[] }>(`https://pypistats.org/api/packages/${encodeURIComponent(n.toLowerCase())}/overall?mirrors=false`, { signal: ctx.signal })))),
  ]);
  return {
    registry: "pypi",
    user,
    count: all.length,
    packages: names.map((name, i) => ({
      name,
      description: text(infos[i]?.info?.summary, 300),
      version: text(infos[i]?.info?.version, 40),
      url: https(infos[i]?.info?.package_url) || `https://pypi.org/project/${encodeURIComponent(name)}/`,
      monthly: typeof recents[i]?.data?.last_month === "number" ? recents[i]!.data!.last_month! : null,
    })),
    weeks: weekly(overall.flatMap((o) => (o?.data ?? []).filter((d) => !d.category || d.category === "without_mirrors").map((d) => ({ day: d.date, downloads: d.downloads })))),
  };
}

const n = (v: number) => v.toLocaleString("en-US");
const NAME: Record<Registry, string> = { npm: "npm", pypi: "PyPI" };

export const packagesProvider: Provider = {
  id: "packages",
  name: "npm / PyPI",
  homepage: "https://www.npmjs.com",
  official: true,
  accountLabel: "Account",
  accountHint: "npm/<username> or pypi/<username>.",
  accountPattern: /^(?:npm|pypi)\/[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/,

  async fetch(account, _opts, ctx) {
    const parsed = parseAccount(account);
    if (!parsed) throw new ProviderError("not_found", "Use npm/<username> or pypi/<username>.");
    const data = parsed.registry === "npm" ? await npm(parsed.user, ctx) : await pypi(parsed.user, ctx);
    return data as unknown as ProviderData;
  },

  sourceOf: (raw) => ((raw as unknown as PackagesData).registry === "pypi" ? "pypi.org" : "npmjs.com"),

  toSections(raw, cfg): Section[] {
    const d = raw as unknown as PackagesData;
    if (!d.packages.length) return [];
    const reg = NAME[d.registry];
    const counted = d.packages.filter((p) => p.monthly !== null);
    const monthly = counted.reduce((a, p) => a + p.monthly!, 0);
    const metric = (id: string, value: string, label: string) => ({ id, visible: true, values: { stat: { value, label } } });
    const fields: Section["fields"] =
      d.weeks.length > 1
        ? [
            {
              key: "trend",
              label: "Weekly downloads",
              type: "chart",
              value: {
                variant: "line",
                title: "Weekly downloads",
                summary: `Weekly ${reg} downloads of ${counted.length === 1 ? counted[0]!.name : `the top ${Math.min(MAX_STATS, d.packages.length)} packages`} over ${d.weeks.length} weeks, latest ${n(d.weeks.at(-1)![1])}`,
                points: d.weeks.map(([x, y]) => ({ x, y })),
                unit: "downloads",
              },
            },
          ]
        : [];
    const taken = new Set<string>();
    return [
      {
        id: `${cfg.id}_stats`,
        kind: "custom",
        title: `Packages on ${reg}`,
        visible: true,
        layout: "metrics",
        fields,
        itemSchema: [{ key: "stat", label: "Stat", type: "metric" }],
        items: [
          metric("count", n(d.count), d.count === 1 ? `package on ${reg}` : `packages on ${reg}`),
          ...(counted.length ? [metric("monthly", n(monthly), counted.length < d.packages.length ? `downloads last month (top ${counted.length})` : "downloads last month")] : []),
        ],
      },
      {
        id: `${cfg.id}_list`,
        kind: "projects",
        title: `${reg} packages`,
        visible: true,
        layout: "list",
        fields: [],
        itemSchema: [
          { key: "title", label: "Title", type: "text" },
          { key: "summary", label: "Summary", type: "longtext" },
          { key: "tags", label: "Tags", type: "tags" },
          { key: "impact", label: "Downloads", type: "metric" },
          { key: "link", label: "Link", type: "link" },
        ],
        items: d.packages.map((p) => {
          let id = `pkg-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "x"}`;
          for (let k = 2; taken.has(id); k++) id = `${id}-${k}`;
          taken.add(id);
          return {
            id,
            visible: true,
            values: { title: p.name, summary: p.description, tags: p.version ? [`v${p.version}`] : [], ...(p.monthly !== null ? { impact: { value: n(p.monthly), label: "downloads last month" } } : {}), link: { label: reg, href: p.url } },
          };
        }),
      },
    ];
  },

  highlights(raw) {
    const d = raw as unknown as PackagesData;
    const monthly = d.packages.reduce((a, p) => a + (p.monthly ?? 0), 0);
    return monthly > 0 ? [{ id: "monthly", value: n(monthly), label: `${NAME[d.registry]} downloads last month` }] : [];
  },
};
