import type { EventRow } from "./store/types";

export const RANGES = ["24h", "7d", "30d", "all"] as const;
export type Range = (typeof RANGES)[number];

const HOUR = 3600_000;
const DAY = 24 * HOUR;

export function rangeStart(range: Range, now = Date.now()): string | null {
  if (range === "24h") return new Date(now - DAY).toISOString();
  if (range === "7d") return new Date(now - 7 * DAY).toISOString();
  if (range === "30d") return new Date(now - 30 * DAY).toISOString();
  return null;
}

export type Kpi = { key: string; label: string; value: number; format: "number" | "percent"; spark: number[] };
export type Stats = {
  range: Range;
  generatedAt: string;
  truncated: boolean;
  kpis: Kpi[];
  funnel: { step: string; value: number }[];
  series: { t: string; label: string; visitors: number; pageViews: number; deployClicks: number; deployConfirmed: number }[];
  templates: { templateId: string; selected: number; deployed: number }[];
  customSections: { name: string; count: number }[];
  referrers: { name: string; count: number }[];
  devices: { name: string; count: number }[];
  countries: { name: string; count: number }[];
};

const top = (m: Map<string, number>, n: number) =>
  [...m.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
const bump = (m: Map<string, number>, k: string, by = 1) => m.set(k, (m.get(k) ?? 0) + by);

/** Pure aggregation of raw events into everything the admin dashboard shows. */
export function computeStats(events: EventRow[], range: Range, now = Date.now(), truncated = false): Stats {
  const startIso = rangeStart(range, now);
  const inRange = startIso ? events.filter((e) => e.ts >= startIso) : events;
  const first = inRange.length ? Math.min(...inRange.map((e) => Date.parse(e.ts))) : now - 7 * DAY;
  const start = startIso ? Date.parse(startIso) : first;
  const span = Math.max(now - start, HOUR);
  const step = range === "24h" ? HOUR : span > 120 * DAY ? 7 * DAY : DAY;
  const n = Math.max(1, Math.min(200, Math.ceil(span / step)));
  const origin = now - n * step;
  const bucketOf = (ts: string) => Math.min(n - 1, Math.max(0, Math.floor((Date.parse(ts) - origin) / step)));

  const visitorsBy = Array.from({ length: n }, () => new Set<string>());
  const counts: Record<string, number[]> = {};
  const series = (k: string) => (counts[k] ??= Array.from({ length: n }, () => 0));
  const sessions = new Set<string>();
  const distinct: Record<string, Set<string>> = { published: new Set(), deploy_clicked: new Set(), deploy_confirmed: new Set() };
  const tplSelected = new Map<string, number>();
  const tplDeployed = new Map<string, number>();
  const customSections = new Map<string, number>();
  const referrers = new Map<string, number>();
  const devices = new Map<string, number>();
  const countries = new Map<string, number>();
  const seenSessionMeta = new Set<string>();

  for (const e of inRange) {
    const b = bucketOf(e.ts);
    series(e.type)[b]! += 1;
    if (e.type === "page_view") {
      sessions.add(e.sessionHash);
      visitorsBy[b]!.add(e.sessionHash);
      if (!seenSessionMeta.has(e.sessionHash)) {
        seenSessionMeta.add(e.sessionHash);
        bump(devices, e.device || "unknown");
        bump(countries, e.country || "Unknown");
      }
      if (e.referrerDomain) bump(referrers, e.referrerDomain);
    }
    const key = e.portfolioId ?? e.sessionHash;
    if (e.type in distinct) distinct[e.type]!.add(key);
    const tpl = typeof e.props.templateId === "string" ? e.props.templateId : null;
    if (tpl && (e.type === "template_selected" || e.type === "template_switched" || e.type === "portfolio_created")) bump(tplSelected, tpl);
    if (tpl && e.type === "deploy_confirmed") bump(tplDeployed, tpl);
    if (e.type === "custom_section_added" && typeof e.props.name === "string" && e.props.name.trim()) bump(customSections, e.props.name.trim().toLowerCase().slice(0, 60));
  }

  const sum = (k: string) => (counts[k] ?? []).reduce((a, c) => a + c, 0);
  const clicks = sum("deploy_clicked");
  const confirmed = sum("deploy_confirmed");
  const visitorSpark = visitorsBy.map((s) => s.size);
  const kpi = (key: string, label: string, type: string): Kpi => ({ key, label, value: sum(type), format: "number", spark: [...series(type)] });
  const fmtLabel = (t: number) =>
    new Intl.DateTimeFormat("en", step === HOUR ? { hour: "numeric", timeZone: "UTC" } : { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(t));

  const templateIds = new Set([...tplSelected.keys(), ...tplDeployed.keys()]);
  return {
    range,
    generatedAt: new Date(now).toISOString(),
    truncated,
    kpis: [
      { key: "visitors", label: "Unique visitors", value: sessions.size, format: "number", spark: visitorSpark },
      kpi("pageViews", "Page views", "page_view"),
      kpi("signups", "Signups", "signup"),
      kpi("created", "Portfolios created", "portfolio_created"),
      kpi("published", "Published", "published"),
      kpi("deployClicks", "Deploy clicks", "deploy_clicked"),
      kpi("deployConfirmed", "Confirmed deployments", "deploy_confirmed"),
      {
        key: "conversion",
        label: "Click → confirmed",
        value: clicks ? Math.round((confirmed / clicks) * 1000) / 10 : 0,
        format: "percent",
        spark: series("deploy_clicked").map((c, i) => (c ? Math.round(((counts.deploy_confirmed?.[i] ?? 0) / c) * 100) : 0)),
      },
    ],
    funnel: [
      { step: "Visited", value: sessions.size },
      { step: "Signed up", value: sum("signup") },
      { step: "Created a portfolio", value: sum("portfolio_created") },
      { step: "Published", value: distinct.published!.size },
      { step: "Clicked deploy", value: distinct.deploy_clicked!.size },
      { step: "Deploy confirmed", value: distinct.deploy_confirmed!.size },
    ],
    series: visitorSpark.map((visitors, i) => ({
      t: new Date(origin + i * step).toISOString(),
      label: fmtLabel(origin + i * step),
      visitors,
      pageViews: counts.page_view?.[i] ?? 0,
      deployClicks: counts.deploy_clicked?.[i] ?? 0,
      deployConfirmed: counts.deploy_confirmed?.[i] ?? 0,
    })),
    templates: [...templateIds]
      .map((templateId) => ({ templateId, selected: tplSelected.get(templateId) ?? 0, deployed: tplDeployed.get(templateId) ?? 0 }))
      .sort((a, b) => b.selected + b.deployed - (a.selected + a.deployed)),
    customSections: top(customSections, 10),
    referrers: top(referrers, 10),
    devices: top(devices, 6),
    countries: top(countries, 10),
  };
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const cell = (v: unknown) => {
    let s = v === null || v === undefined ? "" : typeof v === "string" ? v : JSON.stringify(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formulas
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(","), ...rows.map((r) => columns.map((c) => cell(r[c])).join(","))].join("\r\n");
}
