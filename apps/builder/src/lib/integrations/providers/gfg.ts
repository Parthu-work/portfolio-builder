import "server-only";
import type { Section } from "@runtime/schema/portfolio";
import { providerFetch } from "../http";
import { ProviderError, type Provider, type ProviderData } from "../types";

/**
 * GeeksforGeeks (experimental): the public profile-info JSON its profile page
 * loads. Server-side only; a refusal or an unexpected answer keeps the last
 * good snapshot. Every number is optional and shown only if GfG returned it.
 */

const API = "https://authapi.geeksforgeeks.org/api-get/user-profile-info/";

type GfgInfo = { message?: string; data?: { name?: string; score?: number | string; total_problems_solved?: number | string; institute_rank?: number | string; institute_name?: string; pod_solved_longest_streak?: number | string } | null };

export type GfgData = { handle: string; score: number | null; solved: number | null; instituteRank: number | null; institute: string | null; streak: number | null };

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : typeof v === "string" && /^\d[\d,]{0,12}$/.test(v.trim()) ? Number(v.replace(/,/g, "")) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export function toGfgData(body: GfgInfo, handle: string): GfgData {
  const d = body.data;
  if (!d) {
    if (/not\s*found|does not exist|invalid/i.test(body.message ?? "")) throw new ProviderError("not_found", "No GeeksforGeeks user with that handle.");
    throw new ProviderError("upstream", "GeeksforGeeks answered with something unexpected (its profile format may have changed).");
  }
  const out: GfgData = { handle, score: num(d.score), solved: num(d.total_problems_solved), instituteRank: num(d.institute_rank), institute: typeof d.institute_name === "string" && d.institute_name.trim() ? d.institute_name.trim().slice(0, 120) : null, streak: num(d.pod_solved_longest_streak) };
  if (out.score === null && out.solved === null) throw new ProviderError("upstream", "GeeksforGeeks answered without a score or solved count (its profile format may have changed).");
  return out;
}

const n = (v: number) => v.toLocaleString("en-US");

export const gfgProvider: Provider = {
  id: "gfg",
  name: "GeeksforGeeks",
  homepage: "https://www.geeksforgeeks.org",
  official: false,
  accountLabel: "Handle",
  accountHint: "As in geeksforgeeks.org/user/<handle>.",
  accountPattern: /^[A-Za-z0-9_.-]{2,50}$/,

  async fetch(account, _opts, ctx) {
    const res = await providerFetch(`${API}?handle=${encodeURIComponent(account)}&article_count=false&redirect=true`, { signal: ctx.signal });
    if (res.status === 401 || res.status === 403 || /^\s*</.test(res.text)) throw new ProviderError("upstream", "GeeksforGeeks refused the request (bot protection or sign-in). This is an experimental source; the last good data keeps showing.");
    let body: GfgInfo;
    try {
      body = JSON.parse(res.text) as GfgInfo;
    } catch {
      throw new ProviderError("upstream", "GeeksforGeeks answered with something that is not JSON.");
    }
    if (res.status >= 400 && !body.message) throw new ProviderError("upstream", `GeeksforGeeks answered HTTP ${res.status}.`);
    return toGfgData(body, account) as unknown as ProviderData;
  },

  toSections(raw, cfg): Section[] {
    const d = raw as unknown as GfgData;
    const metric = (id: string, value: number, label: string) => ({ id, visible: true, values: { stat: { value: n(value), label } } });
    const items = [
      ...(d.score !== null ? [metric("score", d.score, "coding score")] : []),
      ...(d.solved !== null ? [metric("solved", d.solved, "problems solved")] : []),
      ...(d.instituteRank !== null && d.instituteRank > 0 ? [metric("institute", d.instituteRank, d.institute ? `rank at ${d.institute}` : "institute rank")] : []),
      ...(d.streak !== null && d.streak > 0 ? [metric("streak", d.streak, "day longest POTD streak")] : []),
    ];
    return items.length ? [{ id: `${cfg.id}_stats`, kind: "custom", title: "On GeeksforGeeks", visible: true, layout: "metrics", fields: [], itemSchema: [{ key: "stat", label: "Stat", type: "metric" }], items }] : [];
  },

  highlights(raw) {
    const d = raw as unknown as GfgData;
    return d.score ? [{ id: "score", value: n(d.score), label: "GeeksforGeeks coding score" }] : d.solved ? [{ id: "solved", value: n(d.solved), label: "GeeksforGeeks problems solved" }] : [];
  },
};
