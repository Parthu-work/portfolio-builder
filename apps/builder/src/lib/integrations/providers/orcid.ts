import "server-only";
import type { Section } from "@runtime/schema/portfolio";
import { providerJson } from "../http";
import { ProviderError, type Provider, type ProviderData } from "../types";

/** ORCID (official public API v3.0): a researcher's works, with DOIs as links. */

const API = "https://pub.orcid.org/v3.0";
const SHOWN = 15;

/** ORCID iDs end in an ISO 7064 MOD 11-2 check character. */
export function validOrcid(id: string): boolean {
  if (!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(id)) return false;
  const digits = id.replace(/-/g, "");
  let total = 0;
  for (const c of digits.slice(0, -1)) total = (total + Number(c)) * 2;
  const check = (12 - (total % 11)) % 11;
  return digits.at(-1) === (check === 10 ? "X" : String(check));
}

type Value<T = string> = { value: T } | null | undefined;
type Summary = {
  "put-code"?: number;
  title?: { title?: Value } | null;
  "journal-title"?: Value;
  type?: string;
  url?: Value;
  "publication-date"?: { year?: Value; month?: Value; day?: Value } | null;
  "external-ids"?: { "external-id"?: { "external-id-type"?: string; "external-id-value"?: string; "external-id-url"?: Value }[] } | null;
};
type Works = { group?: { "work-summary"?: Summary[] }[] };

export type Work = { id: string; title: string; venue: string; date: string; link: string; type: string };
export type OrcidData = { orcid: string; total: number; works: Work[] };

const pad = (v: string | undefined) => (v && /^\d{1,2}$/.test(v) ? v.padStart(2, "0") : "");
const DOI = /^10\.\d{4,9}\/\S+$/;

export function toWork(s: Summary): Work | null {
  const title = s.title?.title?.value?.replace(/\s+/g, " ").trim();
  if (!title) return null;
  const d = s["publication-date"];
  const year = d?.year?.value && /^\d{4}$/.test(d.year.value) ? d.year.value : "";
  const month = year ? pad(d?.month?.value) : "";
  const day = month ? pad(d?.day?.value) : "";
  const ids = s["external-ids"]?.["external-id"] ?? [];
  const doi = ids.find((x) => x["external-id-type"] === "doi" && DOI.test((x["external-id-value"] ?? "").trim()))?.["external-id-value"]?.trim();
  const url = s.url?.value;
  const link = doi ? `https://doi.org/${encodeURI(doi)}` : typeof url === "string" && /^https:\/\/[^\s<>"']+$/.test(url) ? url : "";
  return {
    id: `w${s["put-code"] ?? title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`,
    title: title.slice(0, 300),
    venue: (s["journal-title"]?.value ?? "").trim().slice(0, 200),
    date: [year, month, day].filter(Boolean).join("-"),
    link,
    type: (s.type ?? "").replace(/-/g, " "),
  };
}

export const orcidProvider: Provider = {
  id: "orcid",
  name: "ORCID",
  homepage: "https://orcid.org",
  official: true,
  accountLabel: "ORCID iD",
  accountHint: "Your 16-digit iD, e.g. 0000-0002-1825-0097.",
  accountPattern: /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/,

  async fetch(account, _opts, ctx) {
    if (!validOrcid(account)) throw new ProviderError("not_found", "That ORCID iD's check digit does not match.");
    const body = await providerJson<Works>(`${API}/${account}/works`, { headers: { accept: "application/json" }, signal: ctx.signal });
    if (!Array.isArray(body.group)) throw new ProviderError("upstream", "ORCID answered with something unexpected.");
    // Each group is one work, possibly reported by several sources; the first summary is ORCID's preferred one.
    const works = body.group.flatMap((g) => {
      const w = g["work-summary"]?.[0];
      const work = w ? toWork(w) : null;
      return work ? [work] : [];
    });
    works.sort((a, b) => b.date.localeCompare(a.date));
    const data: OrcidData = { orcid: account, total: works.length, works: works.slice(0, SHOWN) };
    return data as unknown as ProviderData;
  },

  toSections(raw, cfg): Section[] {
    const d = raw as unknown as OrcidData;
    if (!d.works.length) return [];
    const seen = new Set<string>();
    return [
      {
        id: `${cfg.id}_works`,
        kind: "publications",
        title: "Publications",
        visible: true,
        layout: "list",
        fields: [{ key: "total", label: "Works", type: "metric", value: { value: d.total.toLocaleString("en-US"), label: d.total === 1 ? "work on ORCID" : "works on ORCID" } }],
        itemSchema: [
          { key: "title", label: "Title", type: "text" },
          { key: "publisher", label: "Publisher", type: "text" },
          { key: "date", label: "Date", type: "date" },
          { key: "summary", label: "Summary", type: "longtext" },
          { key: "link", label: "Link", type: "link" },
        ],
        items: d.works.flatMap((w) => {
          if (seen.has(w.id)) return [];
          seen.add(w.id);
          return [{ id: w.id, visible: true, values: { title: w.title, publisher: w.venue, date: w.date, summary: w.type ? w.type[0]!.toUpperCase() + w.type.slice(1) : "", ...(w.link ? { link: { label: w.link.startsWith("https://doi.org/") ? "DOI" : "Link", href: w.link } } : {}) } }];
        }),
      },
    ];
  },

  highlights(raw) {
    const d = raw as unknown as OrcidData;
    return d.total ? [{ id: "works", value: String(d.total), label: d.total === 1 ? "publication on ORCID" : "publications on ORCID" }] : [];
  },
};
