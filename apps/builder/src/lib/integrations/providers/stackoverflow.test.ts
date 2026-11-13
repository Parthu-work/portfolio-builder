import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SectionSchema } from "@runtime/schema/portfolio";
import about from "../__fixtures__/stackoverflow/about.json";
import badges from "../__fixtures__/stackoverflow/badges.json";
import filter from "../__fixtures__/stackoverflow/filter.json";
import notFound from "../__fixtures__/stackoverflow/not-found.json";
import throttled from "../__fixtures__/stackoverflow/throttled.json";
import tags from "../__fixtures__/stackoverflow/top-tags.json";
import user from "../__fixtures__/stackoverflow/user.json";
import { stackoverflowProvider, unescape, type StackoverflowData } from "./stackoverflow";

const cfg = { id: "c1", provider: "stackoverflow", account: "1144035", options: { badges: true }, hidden: [] };
const ctx = (token?: string) => ({ token, signal: new AbortController().signal });
const answer = (...bodies: [number, unknown][]) => {
  const fetch = vi.fn();
  for (const [status, body] of bodies) fetch.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
};
const full = () => answer([200, user], [200, badges], [200, tags]);

beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("stackoverflow provider", () => {
  it("reads profile, badges and top tags, adding the optional key", async () => {
    const fetch = full();
    const d = (await stackoverflowProvider.fetch("1144035", {}, ctx("k3y"))) as unknown as StackoverflowData;
    const urls = fetch.mock.calls.map((c) => new URL(c[0] as string));
    expect(urls.map((u) => u.pathname)).toEqual(["/2.3/users/1144035", "/2.3/users/1144035/badges", "/2.3/users/1144035/top-tags"]);
    expect(urls.every((u) => u.searchParams.get("site") === "stackoverflow" && u.searchParams.get("key") === "k3y")).toBe(true);
    expect(d).toMatchObject({ name: "Maya O'Neil", reputation: 48213, badges: { gold: 14, silver: 118, bronze: 212 } });
    expect(d.named.map((b) => b.name)).toEqual(["Famous Question", "python", "Necromancer"]);
    expect(d.tags).toEqual([
      ["python", 5410],
      ["c++", 1822],
    ]);
  });

  it("maps into reputation and badge counts with tag bars, and gold/silver badges as awards", async () => {
    full();
    const sections = stackoverflowProvider.toSections(await stackoverflowProvider.fetch("1144035", {}, ctx()), cfg);
    for (const s of sections) expect(SectionSchema.safeParse(s).success).toBe(true);
    const [stats, awards] = sections;
    expect(stats!.items!.map((i) => i.values.stat)).toEqual([
      { value: "48,213", label: "reputation" },
      { value: "14", label: "gold badges" },
      { value: "118", label: "silver badges" },
      { value: "212", label: "bronze badges" },
    ]);
    expect((stats!.fields[0]!.value as { summary: string }).summary).toBe("Top Stack Overflow tags by answer score: python 5,410, c++ 1,822");
    expect(awards!.items!.map((i) => i.values.title)).toEqual(["Famous Question (gold ×3)", "python (gold)", "Necromancer (silver ×2)"]);
    expect(stackoverflowProvider.toSections(await (full(), stackoverflowProvider.fetch("1144035", {}, ctx())), { ...cfg, options: { badges: false } })).toHaveLength(1);
  });

  it("explains unknown users and throttling", async () => {
    answer([200, notFound]);
    await expect(stackoverflowProvider.fetch("1", {}, ctx())).rejects.toMatchObject({ kind: "not_found" });
    answer([400, throttled]);
    await expect(stackoverflowProvider.fetch("1144035", {}, ctx())).rejects.toMatchObject({ kind: "rate_limited" });
  });

  it("verifies with the code in About me, through a filter that includes it", async () => {
    const fetch = answer([200, filter], [200, about]);
    expect(await stackoverflowProvider.verify!.check("1144035", "persona-SO4XK2", ctx())).toBe(true);
    expect(new URL(fetch.mock.calls[1]![0] as string).searchParams.get("filter")).toBe("!9_bDDx5MI");
    answer([200, filter], [200, about]);
    expect(await stackoverflowProvider.verify!.check("1144035", "persona-NOPE00", ctx())).toBe(false);
  });

  it("decodes the HTML entities the API returns", () => {
    expect(unescape("c&#43;&#43; &amp; &#x27;x&#x27; &lt;b&gt; &bogus;")).toBe("c++ & 'x' <b> &bogus;");
  });
});
