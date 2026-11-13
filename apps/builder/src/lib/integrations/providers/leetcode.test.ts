import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SectionSchema } from "@runtime/schema/portfolio";
import about from "../__fixtures__/leetcode/about.json";
import notFound from "../__fixtures__/leetcode/not-found.json";
import user from "../__fixtures__/leetcode/user.json";
import { calendarDays, leetcodeProvider, toLeetcodeData, type LeetcodeData } from "./leetcode";

const NOW = Date.parse("2026-11-13T09:00:00Z");
const cfg = { id: "c1", provider: "leetcode", account: "algo-ana", options: { badges: true, tags: true }, hidden: [] };
const ctx = () => ({ signal: new AbortController().signal });
const respond = (status: number, body: unknown) => {
  const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
};
const data = () => toLeetcodeData(user as never, NOW);

beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("leetcode provider", () => {
  it("posts one GraphQL query server-side, without credentials", async () => {
    const fetch = respond(200, user);
    await leetcodeProvider.fetch("algo-ana", {}, ctx());
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe("https://leetcode.com/graphql");
    expect(init.method).toBe("POST");
    expect(init.headers.authorization).toBeUndefined();
    expect(init.headers.cookie).toBeUndefined();
    expect(JSON.parse(String(init.body)).variables).toEqual({ username: "algo-ana" });
  });

  it("reads solved counts, contest standing, streaks, badges and top topics", () => {
    const d = data();
    expect(d.solved).toEqual({ easy: 241, medium: 309, hard: 62, all: 612 });
    expect(d.contest).toEqual({ attended: 37, rating: 2011, globalRanking: 9876, topPercentage: 3.12, badge: "Knight" });
    expect(d.tags.map(([t]) => t)).toEqual(["Array", "String", "Hash Table", "Dynamic Programming", "Tree"]);
    expect(d.days).toHaveLength(371);
    expect(d.days.at(-1)![0]).toBe("2026-11-13");
    expect(d.days.reduce((a, [, c]) => a + c, 0)).toBe(397);
  });

  it("builds a full year of days from the calendar and ignores junk", () => {
    expect(calendarDays("not json", NOW)).toEqual([]);
    expect(calendarDays("{}", NOW)).toEqual([]);
    const days = calendarDays(JSON.stringify({ [String(Date.parse("2026-11-12T23:00:00Z") / 1000)]: 2, "1": -1 }), NOW);
    expect(days.at(-2)).toEqual(["2026-11-12", 2]);
    expect(days.filter(([, c]) => c > 0)).toHaveLength(1);
  });

  it("maps into stats with rings and a heatmap, badges as awards and topics as skills", () => {
    const sections = leetcodeProvider.toSections(data() as never, cfg);
    for (const s of sections) expect(SectionSchema.safeParse(s).success).toBe(true);
    expect(sections.map((s) => [s.id, s.kind])).toEqual([
      ["c1_stats", "custom"],
      ["c1_badges", "awards"],
      ["c1_topics", "skills"],
    ]);
    const [stats, badges] = sections;
    expect(stats!.fields.map((f) => (f.value as { variant: string }).variant)).toEqual(["rings", "heatmap"]);
    expect((stats!.fields[0]!.value as { summary: string }).summary).toBe("612 LeetCode problems solved: 241 easy, 309 medium, 62 hard");
    expect(stats!.items!.map((i) => (i.values.stat as { value: string }).value)).toEqual(["612", "2,011", "3.12%", "37", "41", "233"]);
    expect(badges!.items!.map((i) => [i.values.title, i.values.date])).toEqual([
      ["Knight (contest rank)", ""],
      ["365 Days Badge", "2025-12-31"],
      ["Feb LeetCoding Challenge", ""],
    ]);
    expect(leetcodeProvider.toSections(data() as never, { ...cfg, options: { badges: false, tags: false } }).map((s) => s.id)).toEqual(["c1_stats"]);
  });

  it("shows no contest numbers for someone who never competed", () => {
    const d: LeetcodeData = { ...data(), contest: null, streak: 0, activeDays: 0, days: [] };
    const [stats] = leetcodeProvider.toSections(d as never, cfg);
    expect(stats!.items!.map((i) => i.id)).toEqual(["solved"]);
    expect(stats!.fields.map((f) => f.key)).toEqual(["solved"]);
  });

  it("reports unknown users and odd answers", async () => {
    respond(200, notFound);
    await expect(leetcodeProvider.fetch("nobody", {}, ctx())).rejects.toMatchObject({ kind: "not_found" });
    respond(200, { errors: [{ message: "boom" }] });
    await expect(leetcodeProvider.fetch("algo-ana", {}, ctx())).rejects.toMatchObject({ kind: "upstream" });
    respond(403, {});
    await expect(leetcodeProvider.fetch("algo-ana", {}, ctx())).rejects.toMatchObject({ kind: "upstream" });
  });

  it("verifies with the code in About me", async () => {
    respond(200, about);
    expect(await leetcodeProvider.verify!.check("algo-ana", "persona-LC7Q2X", ctx())).toBe(true);
    respond(200, about);
    expect(await leetcodeProvider.verify!.check("algo-ana", "persona-ZZZZZZ", ctx())).toBe(false);
  });
});
