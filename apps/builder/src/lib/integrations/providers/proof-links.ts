import "server-only";
import type { Portfolio } from "@runtime/schema/portfolio";
import { plainText } from "../rss";
import { fetchPage, type Page } from "../safe-fetch";
import { annotateProofs, entryLinks, normalizeName, type ProofCheck } from "../sections";
import { ProviderError, type Provider, type ProviderData } from "../types";

/**
 * Proof links (no third-party API): fetches the links already on the user's
 * certificate, award, project and education entries once, safely, and notes
 * which pages show the owner's name. Those entries then carry "Link checked ·
 * contains your name · <date>" on the published site.
 */

const MAX_LINKS = 12;
const KINDS = new Set(["certifications", "awards", "projects", "education", "custom"]);

export type ProofData = { name: string; checkedAt: string; checks: ProofCheck[] };

export function proofCandidates(doc: Portfolio): string[] {
  const urls = new Set<string>();
  for (const s of doc.sections) {
    if (s.sync || !KINDS.has(s.kind)) continue;
    for (const it of s.items ?? []) {
      if (it.visible === false) continue;
      for (const u of entryLinks(s, it.values)) if (urls.size < MAX_LINKS) urls.add(u);
    }
  }
  return [...urls];
}

/** Whether a page's visible text contains the name (accents, case and spacing ignored). */
export const pageHasName = (html: string, name: string) => normalizeName(plainText(html, 2_000_000)).includes(normalizeName(name));

export async function checkProof(url: string, name: string, load: (url: string) => Promise<Page>): Promise<ProofCheck> {
  const page = await load(url);
  if (!page.ok) return { url, ok: false, nameFound: false, reason: page.reason };
  return { url, ok: true, nameFound: pageHasName(page.text, name) };
}

const short = (url: string) => url.replace(/^https:\/\//, "").replace(/\/$/, "").slice(0, 80);

export const proofLinksProvider: Provider = {
  id: "proof-links",
  name: "Proof links",
  homepage: "https://persona.local",
  official: true,
  accountLabel: "Links",
  accountPattern: /^links$/,
  fixedAccount: "links",
  accountHint: "Checks the certificate, award, project and education links already on your portfolio (Coursera, NPTEL, Devpost…). Entries whose page shows your name get “Link checked · contains your name” on your published site.",

  async fetch(_account, _opts, ctx) {
    const doc = ctx.portfolio;
    if (!doc) throw new ProviderError("upstream", "Nothing to check yet.");
    const name = doc.profile.name.trim();
    if (normalizeName(name).length < 3) throw new ProviderError("private", "Add your name under Profile first: it is what we look for on each page.");
    const urls = proofCandidates(doc);
    if (!urls.length) throw new ProviderError("not_found", "Add a link (Credential URL, Live link…) to a certificate, award, project or education entry first.");
    const checks = await Promise.all(urls.map((u) => checkProof(u, name, (url) => fetchPage(url, { signal: ctx.signal }))));
    const data: ProofData = { name, checkedAt: new Date().toISOString(), checks };
    return data as unknown as ProviderData;
  },

  toSections: () => [],

  annotate: (doc, raw) => annotateProofs(doc, raw as unknown as ProofData),

  describe(raw) {
    const d = raw as unknown as ProofData;
    return d.checks.map((c) => ({ label: short(c.url), ok: c.ok && c.nameFound, detail: !c.ok ? (c.reason ?? "Could not open") : c.nameFound ? "Contains your name" : `“${d.name}” not found on the page` }));
  },
};
