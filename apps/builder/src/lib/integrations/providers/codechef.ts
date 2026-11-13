import "server-only";
import type { Section } from "@runtime/schema/portfolio";
import { providerFetch } from "../http";
import { ProviderError, type Provider, type ProviderData } from "../types";

/**
 * CodeChef (experimental): there is no public API, so the public profile
 * page is read server-side. Parsing is defensive: if the rating is not where
 * we expect it, the fetch fails (and the last good snapshot keeps showing)
 * rather than guessing. Every other number is optional.
 */

export type CodechefData = { handle: string; rating: number; highest: number | null; stars: number | null; globalRank: number | null; countryRank: number | null; country: string | null; solved: number | null };

const num = (s: string | undefined) => {
  const v = s ? Number(s.replace(/[,\s]/g, "")) : NaN;
  return Number.isFinite(v) && v >= 0 && v < 1e9 ? v : null;
};

export function parseProfile(html: string, handle: string): CodechefData {
  if (!html.toLowerCase().includes(`/users/${handle.toLowerCase()}`) && !html.toLowerCase().includes(`>${handle.toLowerCase()}<`)) {
    throw new ProviderError("not_found", "No CodeChef user with that handle.");
  }
  const rating = num(/class="rating-number"[^>]{0,100}>\s*(\d{1,2},?\d{3}|\d{1,5})\b/i.exec(html)?.[1]);
  if (rating === null) throw new ProviderError("upstream", "Could not read the CodeChef profile page (its layout may have changed).");
  const starBlock = /class="rating-star"[^>]{0,100}>([\s\S]{0,1200}?)<\/div>/i.exec(html)?.[1] ?? "";
  const starCount = (starBlock.match(/★|&#9733;/g) ?? []).length;
  const starDigit = num(/(\d)\s*(?:★|&#9733;)/.exec(/class="rating"[^>]{0,100}>([^<]{0,20})</i.exec(html)?.[1] ?? "")?.[1]);
  const ranks = /class="rating-ranks"[^>]{0,100}>([\s\S]{0,3000}?)<\/ul>/i.exec(html)?.[1] ?? "";
  const rankOf = (label: RegExp) => num(new RegExp(`<strong>\\s*([\\d,]{1,12})\\s*</strong>\\s*(?:</a>)?\\s*${label.source}`, "i").exec(ranks)?.[1]);
  const country = /filterBy=Country%3D([A-Za-z%20+]{2,60})/.exec(ranks)?.[1];
  return {
    handle,
    rating,
    highest: num(/Highest Rating\s*(\d{1,2},?\d{3}|\d{1,5})\b/i.exec(html)?.[1]),
    stars: starDigit ?? (starCount >= 1 && starCount <= 7 ? starCount : null),
    globalRank: rankOf(/Global Rank/),
    countryRank: rankOf(/Country Rank/),
    country: country ? decodeURIComponent(country.replace(/\+/g, " ")).slice(0, 60) : null,
    solved: num(/Total Problems Solved:\s*([\d,]{1,9})/i.exec(html)?.[1]),
  };
}

const n = (v: number) => v.toLocaleString("en-US");

export const codechefProvider: Provider = {
  id: "codechef",
  name: "CodeChef",
  homepage: "https://www.codechef.com",
  official: false,
  accountLabel: "Handle",
  accountHint: "As in codechef.com/users/<handle>.",
  accountPattern: /^[A-Za-z0-9_]{3,30}$/,

  async fetch(account, _opts, ctx) {
    const res = await providerFetch(`https://www.codechef.com/users/${encodeURIComponent(account)}`, { headers: { accept: "text/html" }, signal: ctx.signal });
    if (res.status >= 400) throw new ProviderError("upstream", `CodeChef answered HTTP ${res.status}.`);
    return parseProfile(res.text, account) as unknown as ProviderData;
  },

  toSections(raw, cfg): Section[] {
    const d = raw as unknown as CodechefData;
    const metric = (id: string, value: string, label: string) => ({ id, visible: true, values: { stat: { value, label } } });
    const items = [
      metric("rating", n(d.rating), d.stars ? `rating · ${d.stars}★` : "rating"),
      ...(d.highest !== null ? [metric("highest", n(d.highest), "highest rating")] : []),
      ...(d.globalRank !== null ? [metric("global", n(d.globalRank), "global rank")] : []),
      ...(d.countryRank !== null ? [metric("country", n(d.countryRank), d.country ? `rank in ${d.country}` : "country rank")] : []),
      ...(d.solved !== null ? [metric("solved", n(d.solved), "problems solved")] : []),
    ];
    return [{ id: `${cfg.id}_stats`, kind: "custom", title: "On CodeChef", visible: true, layout: "metrics", fields: [], itemSchema: [{ key: "stat", label: "Stat", type: "metric" }], items }];
  },

  highlights(raw) {
    const d = raw as unknown as CodechefData;
    const best = d.highest ?? d.rating;
    return [{ id: "rating", value: n(best), label: `CodeChef ${d.highest !== null ? "highest " : ""}rating${d.stars ? ` · ${d.stars}★` : ""}` }];
  },
};
