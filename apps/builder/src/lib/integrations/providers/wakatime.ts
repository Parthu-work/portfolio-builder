import "server-only";
import type { Section } from "@runtime/schema/portfolio";
import { providerFetch } from "../http";
import { ProviderError, type FetchCtx, type Provider, type ProviderData } from "../types";

/** WakaTime (official): public coding stats, only when the user has made them public. */

const API = "https://wakatime.com/api/v1";
const MAX_BARS = 6;

export const PRIVATE_HELP =
  "Your WakaTime stats are private. On wakatime.com open Settings → Profile, turn on “Display code time publicly” and “Display languages, editors, operating systems publicly”, then try again.";

type Item = { name: string; percent: number; total_seconds: number };
type Stats = {
  data?: {
    status?: string;
    is_up_to_date?: boolean;
    is_coding_activity_visible?: boolean;
    is_other_usage_visible?: boolean;
    total_seconds?: number;
    daily_average?: number;
    human_readable_total?: string;
    human_readable_daily_average?: string;
    languages?: Item[];
    editors?: Item[];
  };
  error?: string;
};

type Range = { total: number; totalText: string; dailyText: string; languages: [string, number][]; editors: [string, number][] };
export type WakatimeData = { week: Range | null; month: Range | null };

const top = (items: Item[] | undefined): [string, number][] =>
  (items ?? [])
    .filter((i) => typeof i.name === "string" && i.percent > 0)
    .slice(0, MAX_BARS)
    .map((i) => [i.name.slice(0, 40), Math.round(i.percent * 10) / 10]);

async function stats(user: string, range: "last_7_days" | "last_30_days", ctx: FetchCtx): Promise<Range | null> {
  const res = await providerFetch(`${API}/users/${encodeURIComponent(user)}/stats/${range}`, { signal: ctx.signal });
  if (res.status === 401 || res.status === 403) throw new ProviderError("private", PRIVATE_HELP);
  let body: Stats;
  try {
    body = JSON.parse(res.text) as Stats;
  } catch {
    throw new ProviderError("upstream", "WakaTime answered with something that is not JSON.");
  }
  if (res.status >= 400) throw new ProviderError("upstream", `WakaTime answered HTTP ${res.status}.`);
  const d = body.data;
  if (!d) throw new ProviderError("upstream", "WakaTime answered with something unexpected.");
  if (d.is_coding_activity_visible === false) throw new ProviderError("private", PRIVATE_HELP);
  if (d.status && d.status !== "ok") return null; // still being calculated by WakaTime
  return {
    total: Math.max(0, d.total_seconds ?? 0),
    totalText: (d.human_readable_total ?? "").slice(0, 40),
    dailyText: (d.human_readable_daily_average ?? "").slice(0, 40),
    languages: d.is_other_usage_visible === false ? [] : top(d.languages),
    editors: d.is_other_usage_visible === false ? [] : top(d.editors),
  };
}

export const wakatimeProvider: Provider = {
  id: "wakatime",
  name: "WakaTime",
  homepage: "https://wakatime.com",
  official: true,
  accountLabel: "Username",
  accountHint: "As in wakatime.com/@<username>. Your stats must be public.",
  accountPattern: /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,49}$/,
  options: [{ key: "month", label: "Show the last 30 days instead of the last 7", default: false }],

  async fetch(account, _opts, ctx) {
    const [week, month] = await Promise.all([stats(account, "last_7_days", ctx), stats(account, "last_30_days", ctx)]);
    if (!week && !month) throw new ProviderError("upstream", "WakaTime is still calculating these stats. Try again in a few minutes.");
    return { week, month } as unknown as ProviderData;
  },

  toSections(raw, cfg): Section[] {
    const d = raw as unknown as WakatimeData;
    const wantMonth = cfg.options.month === true;
    const r = (wantMonth ? d.month : d.week) ?? d.week ?? d.month;
    if (!r || r.total <= 0) return [];
    const span = r === d.month ? "last 30 days" : "last 7 days";
    const bars = (key: string, title: string, items: [string, number][]) =>
      items.length ? [{ key, label: title, type: "chart" as const, value: { variant: "bars" as const, title, summary: `${title} in the ${span} on WakaTime: ${items.slice(0, 3).map(([x, y]) => `${x} ${y}%`).join(", ")}`, points: items.map(([x, y]) => ({ x, y })), unit: "%" } }] : [];
    return [
      {
        id: `${cfg.id}_time`,
        kind: "custom",
        title: "Coding time",
        visible: true,
        layout: "metrics",
        fields: [...bars("languages", "Languages", r.languages), ...bars("editors", "Editors", r.editors)],
        itemSchema: [{ key: "stat", label: "Stat", type: "metric" }],
        items: [
          ...(r.totalText ? [{ id: "total", visible: true, values: { stat: { value: r.totalText, label: `coding, ${span}` } } }] : []),
          ...(r.dailyText ? [{ id: "daily", visible: true, values: { stat: { value: r.dailyText, label: "daily average" } } }] : []),
        ],
      },
    ];
  },

  highlights(raw) {
    const d = raw as unknown as WakatimeData;
    const r = d.month ?? d.week;
    return r?.totalText && r.total > 0 ? [{ id: "time", value: r.totalText, label: `coding time, ${r === d.month ? "last 30 days" : "last 7 days"} (WakaTime)` }] : [];
  },
};
