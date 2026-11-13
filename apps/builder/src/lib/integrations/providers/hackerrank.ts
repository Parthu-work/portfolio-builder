import "server-only";
import type { Section } from "@runtime/schema/portfolio";
import { providerFetch } from "../http";
import { ProviderError, type FetchCtx, type Provider, type ProviderData } from "../types";

/**
 * HackerRank (experimental): the public JSON its own profile page loads —
 * skill badges and passed certificates. Server-side only. If HackerRank's bot
 * protection refuses us we say so and keep the last good snapshot; we never
 * try to get around it.
 */

const SITE = "https://www.hackerrank.com";
const MAX = 20;

type HrBadge = { badge_name?: string; badge_type?: string; stars?: number; solved?: number; total_challenges?: number };
type HrCert = { id?: string; attributes?: { status?: string; completed_at?: string; unique_id?: string; certificate?: { label?: string; level?: string } | null; label?: string } };

export type HackerrankData = { badges: { id: string; name: string; stars: number; solved: number | null }[]; certificates: { id: string; name: string; date: string; link: string }[] };

export const BOT_REFUSAL = "HackerRank refused the request (bot protection). This is an experimental source; the last good data keeps showing.";

/** Parses a JSON answer, treating a refusal or an HTML challenge page as bot protection. */
export async function hrJson<T>(url: string, ctx: FetchCtx): Promise<T> {
  const res = await providerFetch(url, { signal: ctx.signal });
  if (res.status === 401 || res.status === 403 || /^\s*</.test(res.text)) throw new ProviderError("upstream", BOT_REFUSAL);
  if (res.status >= 400) throw new ProviderError("upstream", `HackerRank answered HTTP ${res.status}.`);
  try {
    return JSON.parse(res.text) as T;
  } catch {
    throw new ProviderError("upstream", "HackerRank answered with something that is not JSON.");
  }
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "x";

export function toHackerrankData(badges: { models?: HrBadge[] }, certs: { data?: HrCert[] } | null): HackerrankData {
  if (!Array.isArray(badges.models)) throw new ProviderError("upstream", "HackerRank answered with something unexpected.");
  return {
    badges: badges.models
      .filter((b) => typeof b.badge_name === "string" && (b.stars ?? 0) > 0)
      .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
      .slice(0, MAX)
      .map((b) => ({ id: slug(b.badge_name!), name: b.badge_name!.slice(0, 80), stars: Math.min(7, Math.max(0, Math.round(b.stars ?? 0))), solved: typeof b.solved === "number" ? b.solved : null })),
    certificates: (Array.isArray(certs?.data) ? certs!.data : [])
      .filter((c) => c.attributes?.status === "test_passed")
      .flatMap((c) => {
        const a = c.attributes!;
        const name = (a.certificate?.label ?? a.label ?? "").trim();
        if (!name) return [];
        const uid = /^[0-9a-f]{8,40}$/i.test(a.unique_id ?? "") ? a.unique_id! : null;
        return [{ id: slug(`${name}-${uid ?? c.id ?? ""}`), name: name.slice(0, 120), date: /^\d{4}-\d{2}-\d{2}/.exec(a.completed_at ?? "")?.[0] ?? "", link: uid ? `${SITE}/certificates/${uid}` : "" }];
      })
      .slice(0, MAX),
  };
}

export const hackerrankProvider: Provider = {
  id: "hackerrank",
  name: "HackerRank",
  homepage: SITE,
  official: false,
  accountLabel: "Username",
  accountHint: "As in hackerrank.com/profile/<username>.",
  accountPattern: /^[A-Za-z0-9_.-]{2,40}$/,

  async fetch(account, _opts, ctx) {
    const user = encodeURIComponent(account);
    const badges = await hrJson<{ models?: HrBadge[] }>(`${SITE}/rest/hackers/${user}/badges`, ctx);
    // Certificates are a bonus: if only that call is refused, the badges still show.
    const certs = await hrJson<{ data?: HrCert[] }>(`${SITE}/community/v1/test_results/hacker_certificate?username=${user}`, ctx).catch((e) => {
      if (e instanceof ProviderError && e.kind === "not_found") return { data: [] };
      return null;
    });
    return toHackerrankData(badges, certs) as unknown as ProviderData;
  },

  toSections(raw, cfg): Section[] {
    const d = raw as unknown as HackerrankData;
    const sections: Section[] = [];
    if (d.badges.length) {
      sections.push({
        id: `${cfg.id}_badges`,
        kind: "awards",
        title: "HackerRank badges",
        visible: true,
        layout: "list",
        fields: [],
        itemSchema: [
          { key: "title", label: "Title", type: "text" },
          { key: "issuer", label: "Issuer", type: "text" },
          { key: "summary", label: "Details", type: "longtext" },
        ],
        items: d.badges.map((b) => ({ id: b.id, visible: true, values: { title: `${b.name} · ${b.stars}★`, issuer: "HackerRank", summary: b.solved !== null ? `${b.solved.toLocaleString("en-US")} challenges solved` : "" } })),
      });
    }
    if (d.certificates.length) {
      sections.push({
        id: `${cfg.id}_certs`,
        kind: "certifications",
        title: "HackerRank certificates",
        visible: true,
        layout: "list",
        fields: [],
        itemSchema: [
          { key: "name", label: "Name", type: "text" },
          { key: "issuer", label: "Issuer", type: "text" },
          { key: "date", label: "Date", type: "date" },
          { key: "link", label: "Credential URL", type: "url" },
        ],
        items: d.certificates.map((c) => ({ id: c.id, visible: true, values: { name: c.name, issuer: "HackerRank", date: c.date, link: c.link } })),
      });
    }
    return sections;
  },

  highlights(raw) {
    const d = raw as unknown as HackerrankData;
    const best = d.badges[0];
    return [
      ...(best ? [{ id: "badge", value: `${best.stars}★`, label: `HackerRank ${best.name}` }] : []),
      ...(d.certificates.length ? [{ id: "certs", value: String(d.certificates.length), label: d.certificates.length === 1 ? "HackerRank certificate" : "HackerRank certificates" }] : []),
    ];
  },
};
