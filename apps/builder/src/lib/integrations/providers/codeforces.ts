import "server-only";
import type { Section } from "@runtime/schema/portfolio";
import { providerFetch } from "../http";
import { ProviderError, type FetchCtx, type Provider, type ProviderData } from "../types";

/** Codeforces (official): the public API at codeforces.com/api, no key needed. */

const API = "https://codeforces.com/api";
const MAX_POINTS = 400;

type CfUser = { handle: string; rating?: number; maxRating?: number; rank?: string; maxRank?: string; firstName?: string; organization?: string };
type CfChange = { contestId: number; contestName: string; rank: number; ratingUpdateTimeSeconds: number; newRating: number };

export type CodeforcesData = {
  handle: string;
  rating: number | null;
  rank: string | null;
  maxRating: number | null;
  maxRank: string | null;
  history: { date: string; rating: number; contest: string }[];
  contests: number;
};

/** Codeforces answers 400 with `{ status: "FAILED", comment }` for unknown handles. */
async function call<T>(method: string, query: string, ctx: FetchCtx): Promise<T> {
  const res = await providerFetch(`${API}/${method}?${query}`, { signal: ctx.signal });
  let body: { status?: string; comment?: string; result?: T };
  try {
    body = JSON.parse(res.text);
  } catch {
    throw new ProviderError("upstream", "Codeforces answered with something that is not JSON.");
  }
  if (body.status === "OK" && body.result !== undefined) return body.result;
  if (/not found/i.test(body.comment ?? "")) throw new ProviderError("not_found", "No Codeforces user with that handle.");
  if (/limit exceeded/i.test(body.comment ?? "")) throw new ProviderError("rate_limited", "Codeforces is rate limiting requests. Try again later.");
  throw new ProviderError("upstream", `Codeforces refused the request${body.comment ? `: ${body.comment.slice(0, 120)}` : ""}.`);
}

const userInfo = async (handle: string, ctx: FetchCtx) => {
  const [user] = await call<CfUser[]>("user.info", `handles=${encodeURIComponent(handle)}`, ctx);
  if (!user) throw new ProviderError("not_found", "No Codeforces user with that handle.");
  return user;
};

export function toCodeforcesData(user: CfUser, changes: CfChange[]): CodeforcesData {
  return {
    handle: user.handle,
    rating: user.rating ?? null,
    rank: user.rank ?? null,
    maxRating: user.maxRating ?? null,
    maxRank: user.maxRank ?? null,
    contests: changes.length,
    history: changes.slice(-MAX_POINTS).map((c) => ({ date: new Date(c.ratingUpdateTimeSeconds * 1000).toISOString().slice(0, 10), rating: c.newRating, contest: c.contestName.slice(0, 80) })),
  };
}

const n = (v: number) => v.toLocaleString("en-US");
const title = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export const codeforcesProvider: Provider = {
  id: "codeforces",
  name: "Codeforces",
  homepage: "https://codeforces.com",
  official: true,
  accountLabel: "Handle",
  accountHint: "As in codeforces.com/profile/<handle>.",
  accountPattern: /^[A-Za-z0-9_.-]{3,24}$/,

  async fetch(account, _opts, ctx) {
    const user = await userInfo(account, ctx);
    const changes = await call<CfChange[]>("user.rating", `handle=${encodeURIComponent(user.handle)}`, ctx);
    return toCodeforcesData(user, changes) as unknown as ProviderData;
  },

  toSections(raw, cfg): Section[] {
    const d = raw as unknown as CodeforcesData;
    const metric = (id: string, value: string, label: string) => ({ id, visible: true, values: { stat: { value, label } } });
    const items = [];
    if (d.rating !== null) items.push(metric("rating", n(d.rating), d.rank ? `rating · ${title(d.rank)}` : "rating"));
    if (d.maxRating !== null) items.push(metric("max", n(d.maxRating), d.maxRank ? `max rating · ${title(d.maxRank)}` : "max rating"));
    items.push(metric("contests", n(d.contests), d.contests === 1 ? "rated contest" : "rated contests"));
    const fields: Section["fields"] = [];
    if (d.history.length > 1) {
      const last = d.history.at(-1)!;
      fields.push({
        key: "history",
        label: "Rating history",
        type: "chart",
        value: {
          variant: "line",
          title: "Rating history",
          summary: `Codeforces rating over ${n(d.history.length)} rated contests, from ${n(d.history[0]!.rating)} to ${n(last.rating)}${d.maxRating !== null ? `, peaking at ${n(d.maxRating)}` : ""}`,
          points: d.history.map((h) => ({ x: h.date, y: h.rating, label: h.contest })),
        },
      });
    }
    return [{ id: `${cfg.id}_rating`, kind: "custom", title: "On Codeforces", visible: true, layout: "metrics", fields, itemSchema: [{ key: "stat", label: "Stat", type: "metric" }], items }];
  },

  highlights(raw) {
    const d = raw as unknown as CodeforcesData;
    return d.maxRating !== null ? [{ id: "max", value: n(d.maxRating), label: d.maxRank ? `Codeforces max rating · ${title(d.maxRank)}` : "Codeforces max rating" }] : [];
  },

  verify: {
    method: "bio-code",
    instructions: "Put the code in the First name or Organization field of your Codeforces profile (codeforces.com/settings/social), save, then press Verify. You can change it back afterwards.",
    async check(account, code, ctx) {
      const user = await userInfo(account, ctx);
      return [user.firstName, user.organization].some((v) => typeof v === "string" && v.includes(code));
    },
  },
};
