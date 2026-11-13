import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SectionSchema } from "@runtime/schema/portfolio";
import badges from "../__fixtures__/hackerrank/badges.json";
import certificates from "../__fixtures__/hackerrank/certificates.json";
import { BOT_REFUSAL, hackerrankProvider, type HackerrankData } from "./hackerrank";

const cfg = { id: "c1", provider: "hackerrank", account: "maya_o", options: {}, hidden: [] };
const ctx = () => ({ signal: new AbortController().signal });
function route(table: [RegExp, number, string][]) {
  const fetch = vi.fn(async (url: string) => {
    const hit = table.find(([re]) => re.test(url));
    return hit ? new Response(hit[2], { status: hit[1] }) : new Response("{}", { status: 404 });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
const ok = (): [RegExp, number, string][] => [
  [/\/rest\/hackers\/maya_o\/badges$/, 200, JSON.stringify(badges)],
  [/hacker_certificate\?username=maya_o$/, 200, JSON.stringify(certificates)],
];

beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("hackerrank provider", () => {
  it("reads starred badges and passed certificates only", async () => {
    route(ok());
    const d = (await hackerrankProvider.fetch("maya_o", {}, ctx())) as unknown as HackerrankData;
    expect(d.badges.map((b) => [b.name, b.stars, b.solved])).toEqual([
      ["Problem Solving", 5, 180],
      ["Python", 4, 90],
    ]);
    expect(d.certificates).toEqual([
      { id: "problem-solving-intermediate-a1b2c3d4e5f6", name: "Problem Solving (Intermediate)", date: "2025-06-02", link: "https://www.hackerrank.com/certificates/a1b2c3d4e5f6" },
      { id: "python-basic-91313", name: "Python (Basic)", date: "", link: "" },
    ]);
  });

  it("maps badges into awards and certificates into certifications", async () => {
    route(ok());
    const sections = hackerrankProvider.toSections(await hackerrankProvider.fetch("maya_o", {}, ctx()), cfg);
    for (const s of sections) expect(SectionSchema.safeParse(s).success).toBe(true);
    expect(sections.map((s) => s.kind)).toEqual(["awards", "certifications"]);
    expect(sections[0]!.items![0]!.values).toEqual({ title: "Problem Solving · 5★", issuer: "HackerRank", summary: "180 challenges solved" });
    expect(hackerrankProvider.highlights!({ badges: [], certificates: [] } as never)).toEqual([]);
  });

  it("reports bot protection plainly, and keeps badges when only certificates are refused", async () => {
    route([[/badges$/, 403, "<html>Just a moment...</html>"]]);
    await expect(hackerrankProvider.fetch("maya_o", {}, ctx())).rejects.toMatchObject({ kind: "upstream", message: BOT_REFUSAL });
    route([[/badges$/, 200, "<!DOCTYPE html><title>challenge</title>"]]);
    await expect(hackerrankProvider.fetch("maya_o", {}, ctx())).rejects.toMatchObject({ message: BOT_REFUSAL });
    route([ok()[0]!, [/hacker_certificate/, 403, "<html/>"]]);
    const d = (await hackerrankProvider.fetch("maya_o", {}, ctx())) as unknown as HackerrankData;
    expect(d.badges).toHaveLength(2);
    expect(d.certificates).toEqual([]);
    route([]);
    await expect(hackerrankProvider.fetch("nobody", {}, ctx())).rejects.toMatchObject({ kind: "not_found" });
  });
});
