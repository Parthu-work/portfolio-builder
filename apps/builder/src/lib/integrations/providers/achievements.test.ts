import { afterEach, describe, expect, it, vi } from "vitest";
import { SectionSchema } from "@runtime/schema/portfolio";
import { LocalStore } from "../../store/local";
import { connect, connectionInfo, defaultConfig, highlightSources, mergeLive, sectionsFor } from "../service";
import type { HighlightSource, Provider } from "../types";
import { achievementsProvider } from "./achievements";
import { mockProvider } from "./mock";

const PID = "3f2b1c9e-0000-4000-8000-000000000002";
const cfg = { id: "w1", provider: "achievements", account: "wall", options: { unverified: false }, hidden: [] };
const source = (over: Partial<HighlightSource> = {}): HighlightSource => ({ provider: "leetcode", name: "LeetCode", source: "leetcode.com", account: "ana", verified: true, fetchedAt: "2026-11-13T08:00:00.000Z", highlights: [{ id: "badge", value: "Knight", label: "LeetCode contest rank" }], ...over });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("achievement wall", () => {
  it("lists providers' own highlights with their provenance, verified accounts only by default", () => {
    const sections = achievementsProvider.aggregate!([source(), source({ provider: "codeforces", source: "codeforces.com", account: "zed", verified: false, highlights: [{ id: "max", value: "2,330", label: "Codeforces max rating" }] }), source({ provider: "credly", source: "credly.com", verified: false, note: "Issuer-verified on Credly", highlights: [{ id: "aws", value: "AWS SAA", label: "Certification" }] })], cfg);
    expect(sections).toHaveLength(1);
    expect(SectionSchema.safeParse(sections[0]).success).toBe(true);
    expect(sections[0]!.items!.map((i) => [i.id, i.values.stat, i.values.context])).toEqual([
      ["leetcode-ana-badge", { value: "Knight", label: "LeetCode contest rank" }, "leetcode.com · Verified owner"],
      ["credly-ana-aws", { value: "AWS SAA", label: "Certification" }, "credly.com · Issuer-verified on Credly"],
    ]);
    const all = achievementsProvider.aggregate!([source({ verified: false })], { ...cfg, options: { unverified: true } });
    expect(all[0]!.items![0]!.values.context).toBe("leetcode.com · Public profile");
  });

  it("shows nothing until another account has something to show", () => {
    expect(achievementsProvider.aggregate!([], cfg)).toEqual([]);
    expect(achievementsProvider.aggregate!([source({ verified: false })], cfg)).toEqual([]);
  });

  it("follows the other snapshots on read, and is stamped with the newest of them", async () => {
    vi.stubEnv("FEATURE_INTEGRATIONS", "1");
    const store = new LocalStore(null);
    const find = (id: string): Provider | null => ({ mock: mockProvider, achievements: achievementsProvider })[id] ?? null;
    const judge = (await connect(store, PID, mockProvider, "owner-ana", {}, Date.parse("2026-11-13T07:00:00Z")))!;
    await store.updateSnapshot(judge.id, { verified: true });
    const wall = (await connect(store, PID, achievementsProvider, "wall", {}, Date.parse("2026-11-01T07:00:00Z")))!;
    const rows = (await store.listSnapshots(PID))!;
    expect(highlightSources({ rows, find }).map((s) => s.provider)).toEqual(["mock"]);
    const wallCfg = defaultConfig(achievementsProvider, wall);
    const sections = sectionsFor(achievementsProvider, wall, wallCfg, true, { rows, find });
    expect(sections[0]!.sync).toMatchObject({ provider: "achievements", source: "your connected accounts", syncedAt: "2026-11-13T07:00:00.000Z", note: "Each entry names its source" });
    expect(sections[0]!.items![0]!.values.context).toBe("mock.example.com · Verified owner");
    expect(connectionInfo(achievementsProvider, wall, wallCfg).available).toEqual([]);

    const doc = { ...structuredClone((await import("@runtime/schema/seeds")).SEEDS.developer.portfolio), integrations: [wallCfg] };
    doc.sections.push(sections[0]!);
    const now = () => Date.parse("2026-11-13T08:00:00Z");
    const merged = (await mergeLive(store, PID, doc, {}, { find, now })).portfolio.sections.at(-1)!;
    expect(merged.id).toBe(`${wall.id}_wall`);
    expect(merged.items).toHaveLength(1);
    await store.deleteSnapshot(PID, judge.id);
    expect((await mergeLive(store, PID, doc, {}, { find, now })).portfolio.sections.some((s) => s.sync)).toBe(false);
  });
});
