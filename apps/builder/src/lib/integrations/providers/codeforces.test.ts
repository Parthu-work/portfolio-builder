import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SectionSchema } from "@runtime/schema/portfolio";
import notFound from "../__fixtures__/codeforces/not-found.json";
import info from "../__fixtures__/codeforces/user-info.json";
import rating from "../__fixtures__/codeforces/user-rating.json";
import { codeforcesProvider, type CodeforcesData } from "./codeforces";

const cfg = { id: "c1", provider: "codeforces", account: "tourist_fan", options: {}, hidden: [] };
const ctx = () => ({ signal: new AbortController().signal });
const answer = (...bodies: [number, unknown][]) => {
  const fetch = vi.fn();
  for (const [status, body] of bodies) fetch.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("codeforces provider", () => {
  it("reads the profile and the rating history from the public API", async () => {
    const fetch = answer([200, info], [200, rating]);
    const d = (await codeforcesProvider.fetch("tourist_fan", {}, ctx())) as unknown as CodeforcesData;
    expect(fetch.mock.calls.map((c) => c[0])).toEqual(["https://codeforces.com/api/user.info?handles=tourist_fan", "https://codeforces.com/api/user.rating?handle=tourist_fan"]);
    expect(d).toMatchObject({ handle: "tourist_fan", rating: 2310, rank: "international master", maxRating: 2330, contests: 24 });
    expect(d.history[0]).toEqual({ date: "2022-01-01", rating: 1620, contest: "Codeforces Round 900 (Div. 2)" });
  });

  it("maps into rating metrics with a rank title and a rating line chart", async () => {
    answer([200, info], [200, rating]);
    const [section] = codeforcesProvider.toSections(await codeforcesProvider.fetch("tourist_fan", {}, ctx()), cfg);
    expect(SectionSchema.safeParse(section).success).toBe(true);
    expect(section!.items!.map((i) => i.values.stat)).toEqual([
      { value: "2,310", label: "rating · International Master" },
      { value: "2,330", label: "max rating · International Master" },
      { value: "24", label: "rated contests" },
    ]);
    const chart = section!.fields[0]!.value as { variant: string; summary: string; points: unknown[] };
    expect(chart.variant).toBe("line");
    expect(chart.points).toHaveLength(24);
    expect(chart.summary).toBe("Codeforces rating over 24 rated contests, from 1,620 to 2,310, peaking at 2,330");
  });

  it("shows only the contest count for an unrated account", () => {
    const d: CodeforcesData = { handle: "new", rating: null, rank: null, maxRating: null, maxRank: null, history: [], contests: 0 };
    const [section] = codeforcesProvider.toSections(d as never, cfg);
    expect(section!.fields).toEqual([]);
    expect(section!.items!.map((i) => i.id)).toEqual(["contests"]);
  });

  it("explains failures", async () => {
    answer([400, notFound]);
    await expect(codeforcesProvider.fetch("nobody_xyz", {}, ctx())).rejects.toMatchObject({ kind: "not_found" });
    answer([400, { status: "FAILED", comment: "Call limit exceeded" }]);
    await expect(codeforcesProvider.fetch("tourist_fan", {}, ctx())).rejects.toMatchObject({ kind: "rate_limited" });
    answer([200, info], [503, "down"]);
    await expect(codeforcesProvider.fetch("tourist_fan", {}, ctx())).rejects.toMatchObject({ kind: "upstream" });
  });

  it("verifies with the code in first name or organization", async () => {
    answer([200, info]);
    expect(await codeforcesProvider.verify!.check("tourist_fan", "persona-CF3K9M", ctx())).toBe(true);
    answer([200, info]);
    expect(await codeforcesProvider.verify!.check("tourist_fan", "persona-NOPE22", ctx())).toBe(false);
  });
});
