import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SectionSchema } from "@runtime/schema/portfolio";
import { packagesProvider, parseAccount, parseUserPackages, weekly, type PackagesData } from "./packages";

const fx = (name: string) => readFileSync(join(__dirname, "../__fixtures__/packages", name), "utf8");
const cfg = { id: "c1", provider: "packages", account: "npm/maya", options: {}, hidden: [] };
const ctx = () => ({ signal: new AbortController().signal });

/** Answers by URL, so parallel calls can come in any order. */
function route(table: [RegExp, number, string][]) {
  const fetch = vi.fn(async (url: string) => {
    const hit = table.find(([re]) => re.test(url));
    return hit ? new Response(hit[2], { status: hit[1] }) : new Response("{}", { status: 404 });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
const npmRoutes = (): [RegExp, number, string][] => [
  [/registry\.npmjs\.org\/-\/v1\/search\?text=maintainer%3Amaya&size=12$/, 200, fx("npm-search.json")],
  [/point\/last-month\/tracekit$/, 200, fx("npm-point-tracekit.json")],
  [/point\/last-month\/%40maya\/queue$/, 200, fx("npm-point-queue.json")],
  [/range\/last-year\/tracekit$/, 200, fx("npm-range-tracekit.json")],
  [/range\/last-year\/%40maya\/queue$/, 500, "{}"],
];

beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("packages provider", () => {
  it("accepts npm/<user> and pypi/<user> only", () => {
    expect(parseAccount("npm/maya")).toEqual({ registry: "npm", user: "maya" });
    expect(parseAccount("PyPI/Maya_O")).toEqual({ registry: "pypi", user: "Maya_O" });
    for (const bad of ["maya", "npm/", "cargo/maya", "npm/ma ya", "pypi/<x>"]) expect(packagesProvider.accountPattern.test(bad)).toBe(false);
  });

  it("reads npm packages with monthly downloads, tolerating a failed stats call", async () => {
    route(npmRoutes());
    const d = (await packagesProvider.fetch("npm/maya", {}, ctx())) as unknown as PackagesData;
    expect(d.packages.map((p) => [p.name, p.description, p.monthly])).toEqual([
      ["tracekit", "Zero-dependency tracing for Node.", 48210],
      ["@maya/queue", "Queues as logs.", 1290],
    ]);
    expect(d.weeks).toEqual([
      ["2026-10-12", 721],
      ["2026-10-19", 770],
    ]);
  });

  it("maps into counts, a weekly trend and a package list", async () => {
    route(npmRoutes());
    const sections = packagesProvider.toSections(await packagesProvider.fetch("npm/maya", {}, ctx()), cfg);
    for (const s of sections) expect(SectionSchema.safeParse(s).success).toBe(true);
    const [stats, list] = sections;
    expect(stats!.items!.map((i) => i.values.stat)).toEqual([
      { value: "2", label: "packages on npm" },
      { value: "49,500", label: "downloads last month" },
    ]);
    expect((stats!.fields[0]!.value as { variant: string; summary: string }).summary).toBe("Weekly npm downloads of the top 2 packages over 2 weeks, latest 770");
    expect(list!.items!.map((i) => i.id)).toEqual(["pkg-tracekit", "pkg-maya-queue"]);
    expect(list!.items![1]!.values).toMatchObject({ tags: ["v0.4.0"], impact: { value: "1,290", label: "downloads last month" }, link: { label: "npm", href: "https://www.npmjs.com/package/%40maya%2Fqueue" } });
    expect(packagesProvider.sourceOf!({ registry: "npm" } as never)).toBe("npmjs.com");
  });

  it("reports npm users without packages", async () => {
    route([[/search/, 200, fx("npm-empty.json")]]);
    await expect(packagesProvider.fetch("npm/nobody", {}, ctx())).rejects.toMatchObject({ kind: "not_found" });
  });

  it("finds a PyPI user's projects over XML-RPC and reads pypistats without mirrors", async () => {
    const fetch = route([
      [/^https:\/\/pypi\.org\/pypi$/, 200, fx("pypi-user-packages.xml")],
      [/pypi\.org\/pypi\/fastqueue\/json$/, 200, fx("pypi-fastqueue.json")],
      [/pypi\.org\/pypi\/tiny-utils\/json$/, 200, fx("pypi-tiny-utils.json")],
      [/pypistats\.org\/api\/packages\/fastqueue\/recent$/, 200, fx("pypistats-recent-fastqueue.json")],
      [/pypistats\.org\/api\/packages\/fastqueue\/overall\?mirrors=false$/, 200, fx("pypistats-overall-fastqueue.json")],
    ]);
    const d = (await packagesProvider.fetch("pypi/maya", {}, ctx())) as unknown as PackagesData;
    const rpc = fetch.mock.calls.find((c) => c[0] === "https://pypi.org/pypi") as unknown as [string, RequestInit];
    expect(String(rpc[1].body)).toContain("<methodName>user_packages</methodName>");
    expect(d.packages.map((p) => [p.name, p.version, p.monthly])).toEqual([
      ["fastqueue", "1.8.0", 3400],
      ["tiny-utils", "0.2.0", null],
    ]);
    expect(d.weeks).toEqual([
      ["2026-10-12", 350],
      ["2026-10-19", 350],
    ]);
    const [stats] = packagesProvider.toSections(d as never, cfg);
    expect(stats!.items![1]!.values.stat).toEqual({ value: "3,400", label: "downloads last month (top 1)" });
    expect(packagesProvider.highlights!(d as never)).toEqual([{ id: "monthly", value: "3,400", label: "PyPI downloads last month" }]);
  });

  it("handles empty and faulty XML-RPC answers", () => {
    expect(parseUserPackages(fx("pypi-empty.xml"))).toEqual([]);
    expect(() => parseUserPackages("<methodResponse><fault><value/></fault></methodResponse>")).toThrow();
  });

  it("keeps only complete weeks", () => {
    expect(weekly([{ day: "2026-11-09", downloads: 5 }])).toEqual([]);
  });

  it("ranks PyPI projects by last month's downloads, since PyPI lists them alphabetically", async () => {
    route([
      [/^https:\/\/pypi\.org\/pypi$/, 200, fx("pypi-user-packages.xml")],
      [/pypi\.org\/pypi\/(fastqueue|tiny-utils)\/json$/, 200, fx("pypi-tiny-utils.json")],
      [/pypistats\.org\/api\/packages\/fastqueue\/recent$/, 200, fx("pypistats-recent-fastqueue.json")],
      [/pypistats\.org\/api\/packages\/tiny-utils\/recent$/, 200, JSON.stringify({ data: { last_month: 9000 } })],
    ]);
    const d = (await packagesProvider.fetch("pypi/maya", {}, ctx())) as unknown as PackagesData;
    expect(d.packages.map((p) => [p.name, p.monthly])).toEqual([
      ["tiny-utils", 9000],
      ["fastqueue", 3400],
    ]);
  });

  it("reads a real PyPI XML-RPC answer (recorded 2026-11-13)", () => {
    const names = parseUserPackages(fx("recorded-pypi-user-packages-kennethreitz.xml"));
    expect(names.length).toBeGreaterThan(50);
    expect(names.slice(0, 2)).toEqual(["acat-player", "args"]);
    expect(names).toContain("records");
  });
});
