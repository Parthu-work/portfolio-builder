import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SectionSchema } from "@runtime/schema/portfolio";
import { codechefProvider, parseProfile } from "./codechef";

const html = (name: string) => readFileSync(join(__dirname, "../__fixtures__/codechef", name), "utf8");
const cfg = { id: "c1", provider: "codechef", account: "maya_o", options: {}, hidden: [] };
const ctx = () => ({ signal: new AbortController().signal });

beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("codechef provider", () => {
  it("reads rating, stars, highest rating, ranks and problems solved from the profile page", () => {
    expect(parseProfile(html("profile.html"), "maya_o")).toEqual({ handle: "maya_o", rating: 1876, highest: 1932, stars: 4, globalRank: 4521, countryRank: 3210, country: "India", solved: 412 });
  });

  it("maps into one metrics section with only what the page showed", () => {
    const [section] = codechefProvider.toSections(parseProfile(html("profile.html"), "maya_o") as never, cfg);
    expect(SectionSchema.safeParse(section).success).toBe(true);
    expect(section!.items!.map((i) => i.values.stat)).toEqual([
      { value: "1,876", label: "rating · 4★" },
      { value: "1,932", label: "highest rating" },
      { value: "4,521", label: "global rank" },
      { value: "3,210", label: "rank in India" },
      { value: "412", label: "problems solved" },
    ]);
    const bare = codechefProvider.toSections({ handle: "x", rating: 1500, highest: null, stars: null, globalRank: null, countryRank: null, country: null, solved: null } as never, cfg);
    expect(bare[0]!.items!.map((i) => i.values.stat)).toEqual([{ value: "1,500", label: "rating" }]);
  });

  it("refuses to guess when the layout changed, and spots unknown handles", () => {
    expect(() => parseProfile(html("redesigned.html"), "maya_o")).toThrow(/layout may have changed/);
    expect(() => parseProfile(html("home.html"), "maya_o")).toThrow(/No CodeChef user/);
  });

  it("fetches the public profile page server-side", async () => {
    const fetch = vi.fn(async () => new Response(html("profile.html"), { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    await codechefProvider.fetch("maya_o", {}, ctx());
    expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe("https://www.codechef.com/users/maya_o");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 403 })));
    await expect(codechefProvider.fetch("maya_o", {}, ctx())).rejects.toMatchObject({ kind: "upstream" });
  });
});
