import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pages = vi.hoisted(() => ({ map: new Map<string, { ok: true; status: number; url: string; text: string } | { ok: false; reason: string }>() }));
vi.mock("../safe-fetch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../safe-fetch")>()),
  fetchPage: vi.fn(async (url: string) => pages.map.get(url) ?? { ok: false, reason: "Unreachable" }),
}));

import { PortfolioSchema, type Portfolio } from "@runtime/schema/portfolio";
import { SEEDS } from "@runtime/schema/seeds";
import { viewPortfolio } from "@runtime/render/view";
import { LocalStore } from "../../store/local";
import { annotateProofs, stripProofs } from "../sections";
import { connect, connectionInfo, mergeLive } from "../service";
import type { Provider } from "../types";
import { pageHasName, proofCandidates, proofLinksProvider, type ProofData } from "./proof-links";

const PID = "3f2b1c9e-0000-4000-8000-000000000003";
const ctx = (portfolio?: Portfolio) => ({ signal: new AbortController().signal, ...(portfolio ? { portfolio } : {}) });
const CERT = "https://www.coursera.org/account/accomplishments/verify/ABC123";
const AWARD = "https://devpost.com/software/queue-lens";

/** A portfolio whose certificate and award carry proof links. */
function doc(name = "Zoë Okafor"): Portfolio {
  const p = structuredClone(SEEDS.developer.portfolio);
  p.profile.name = name;
  p.sections.push(
    { id: "certs", kind: "certifications", title: "Certifications", visible: true, fields: [], itemSchema: [{ key: "name", label: "Name", type: "text" }, { key: "link", label: "Credential URL", type: "url" }], items: [{ id: "c1", visible: true, values: { name: "Cloud Architecture", link: CERT } }, { id: "c2", visible: true, values: { name: "Plain http", link: "http://old.example/cert" } }] },
    { id: "awards", kind: "awards", title: "Awards", visible: true, fields: [], itemSchema: [{ key: "title", label: "Title", type: "text" }, { key: "link", label: "Link", type: "link" }], items: [{ id: "a1", visible: true, values: { title: "Hackathon winner", link: { label: "Devpost", href: AWARD } } }] },
  );
  return p;
}

beforeEach(() => {
  pages.map.clear();
  vi.stubEnv("FEATURE_INTEGRATIONS", "1");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proof links", () => {
  it("collects https links from the user's own credential entries", () => {
    expect(proofCandidates(doc())).toEqual(expect.arrayContaining([CERT, AWARD]));
    expect(proofCandidates(doc())).not.toContain("http://old.example/cert");
  });

  it("matches the name in the page's text, ignoring accents, case, tags and spacing", () => {
    expect(pageHasName("<p>Awarded to <b>ZOE</b>\n  OKAFOR</p>", "Zoë Okafor")).toBe(true);
    expect(pageHasName("<p>Awarded to Zoe Smith</p>", "Zoë Okafor")).toBe(false);
    expect(pageHasName('<meta content="Zoë Okafor">', "Zoë Okafor")).toBe(false);
  });

  it("checks each link once and describes the outcome", async () => {
    pages.map.set(CERT, { ok: true, status: 200, url: CERT, text: "<h1>Zoë Okafor</h1> completed Cloud Architecture" });
    pages.map.set(AWARD, { ok: true, status: 200, url: AWARD, text: "<h1>Queue Lens</h1> by someone else" });
    const data = (await proofLinksProvider.fetch("links", {}, ctx(doc()))) as unknown as ProofData;
    expect(data.checks.find((c) => c.url === CERT)).toEqual({ url: CERT, ok: true, nameFound: true });
    expect(data.checks.find((c) => c.url === AWARD)).toEqual({ url: AWARD, ok: true, nameFound: false });
    expect(proofLinksProvider.describe!(data as never).map((d) => [d.ok, d.detail])).toEqual(expect.arrayContaining([[true, "Contains your name"], [false, "“Zoë Okafor” not found on the page"]]));
  });

  it("asks for a name and some links before checking anything", async () => {
    await expect(proofLinksProvider.fetch("links", {}, ctx(doc("  ")))).rejects.toMatchObject({ kind: "private" });
    const bare = structuredClone(SEEDS.developer.portfolio);
    bare.sections = bare.sections.filter((s) => !["certifications", "awards", "projects", "education", "custom"].includes(s.kind));
    await expect(proofLinksProvider.fetch("links", {}, ctx(bare))).rejects.toMatchObject({ kind: "not_found" });
  });

  it("marks only checked entries, only for the checked name, and strips forged marks", () => {
    const checks: ProofData = { name: "Zoe okafor", checkedAt: "2026-11-13T08:00:00.000Z", checks: [{ url: CERT, ok: true, nameFound: true }] };
    const marked = annotateProofs(doc(), checks);
    expect(marked.sections.find((s) => s.id === "certs")!.items![0]!.values._proof).toEqual({ checkedAt: "2026-11-13T08:00:00.000Z" });
    expect(marked.sections.find((s) => s.id === "awards")!.items![0]!.values).not.toHaveProperty("_proof");
    expect(PortfolioSchema.safeParse(marked).success).toBe(true);
    expect(JSON.stringify(viewPortfolio(marked))).toContain("Link checked · contains your name · Nov 13, 2026");
    expect(annotateProofs(doc("Someone Else"), checks)).toEqual(doc("Someone Else"));
    expect(stripProofs(marked)).toEqual(doc());
    const plain = doc();
    expect(stripProofs(plain)).toBe(plain);
  });

  it("on read: forged marks disappear, real checks appear, with the feature on", async () => {
    pages.map.set(CERT, { ok: true, status: 200, url: CERT, text: "Zoë Okafor" });
    const store = new LocalStore(null);
    const find = (id: string): Provider | null => (id === "proof-links" ? proofLinksProvider : null);
    const now = () => Date.parse("2026-11-13T09:00:00Z");
    const forged = doc();
    forged.sections.find((s) => s.id === "awards")!.items![0]!.values._proof = { checkedAt: "2026-11-01" };
    expect((await mergeLive(store, PID, forged, {}, { find, now })).portfolio.sections.find((s) => s.id === "awards")!.items![0]!.values).not.toHaveProperty("_proof");

    const row = (await connect(store, PID, proofLinksProvider, "links", {}, Date.now(), [], doc()))!;
    expect(connectionInfo(proofLinksProvider, row).details.filter((d) => d.ok)).toHaveLength(1);
    expect(connectionInfo(proofLinksProvider, row).proofs?.checks.find((c) => c.nameFound)?.url).toBe(CERT);
    const withConfig = { ...forged, integrations: [{ id: row.id, provider: "proof-links", account: "links", options: {}, hidden: [] }] };
    const merged = (await mergeLive(store, PID, withConfig, {}, { find, now })).portfolio;
    expect(merged.sections.find((s) => s.id === "certs")!.items![0]!.values._proof).toMatchObject({ checkedAt: expect.any(String) });
    expect(merged.sections.find((s) => s.id === "awards")!.items![0]!.values).not.toHaveProperty("_proof");

    vi.stubEnv("FEATURE_INTEGRATIONS", "");
    const off = (await mergeLive(store, PID, withConfig, {}, { find, now })).portfolio;
    expect(JSON.stringify(off)).not.toContain("_proof");
  });
});
