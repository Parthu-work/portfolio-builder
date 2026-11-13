import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SectionSchema } from "@runtime/schema/portfolio";
import notFound from "../__fixtures__/github/not-found.json";
import restUser from "../__fixtures__/github/rest-user.json";
import user from "../__fixtures__/github/user.json";
import { ProviderError } from "../types";
import { githubProvider, type GithubData } from "./github";

const cfg = { id: "c1", provider: "github", account: "octo-maya", options: { pinned: true }, hidden: [] };
const ctx = (token: string | null = "t0ken") => ({ token: token ?? undefined, signal: new AbortController().signal });
const respond = (status: number, body: unknown) => {
  const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("github provider", () => {
  it("validates usernames the way GitHub does", () => {
    for (const ok of ["octo-maya", "a", "A1-b2"]) expect(githubProvider.accountPattern.test(ok)).toBe(true);
    for (const bad of ["-maya", "maya-", "ma--ya", "has space", "x".repeat(40), "o/ctocat"]) expect(githubProvider.accountPattern.test(bad)).toBe(false);
  });

  it("fetches with the server token in a single GraphQL call", async () => {
    const fetch = respond(200, user);
    const data = (await githubProvider.fetch("octo-maya", {}, ctx())) as unknown as GithubData;
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe("https://api.github.com/graphql");
    expect(init.headers.authorization).toBe("Bearer t0ken");
    expect(init.headers["user-agent"]).toMatch(/^Persona\/1\.0 \(\+/);
    expect(JSON.parse(String(init.body)).variables).toEqual({ login: "octo-maya" });
    expect(data).toMatchObject({ id: 5832317, login: "octo-maya", followers: 1287, repos: 42, stars: 2511, contributions: 1488 });
    expect(data.days).toHaveLength(371);
    expect(data.languages).toEqual([
      ["TypeScript", 824000],
      ["Go", 300000],
      ["Shell", 20400],
    ]);
    expect(data.pinned.map((p) => p.name)).toEqual(["tracekit", "pgshard"]);
  });

  it("maps into a metrics section with a heatmap and language bars, and pinned repos as projects", async () => {
    respond(200, user);
    const data = await githubProvider.fetch("octo-maya", {}, ctx());
    const sections = githubProvider.toSections(data, cfg);
    for (const s of sections) expect(SectionSchema.safeParse(s).success).toBe(true);
    const [activity, pinned] = sections;
    expect(activity!.fields.map((f) => [f.key, (f.value as { variant: string }).variant])).toEqual([
      ["contributions", "heatmap"],
      ["languages", "bars"],
    ]);
    expect((activity!.fields[0]!.value as { summary: string }).summary).toBe("1,488 contributions on GitHub in the last year");
    expect((activity!.fields[1]!.value as { summary: string }).summary).toBe("Top languages by code in public repositories: TypeScript 72%, Go 26%, Shell 2%");
    expect(activity!.items!.map((i) => i.values.stat)).toEqual([
      { value: "1,488", label: "contributions in the last year" },
      { value: "2,511", label: "stars on public repositories" },
      { value: "1,287", label: "followers" },
      { value: "42", label: "public repositories" },
    ]);
    expect(pinned).toMatchObject({ id: "c1_pinned", kind: "projects" });
    expect(pinned!.items![1]!.values).toEqual({ title: "pgshard", summary: "", tags: [], impact: { value: "1", label: "star" }, repo: "https://github.com/octo-maya/pgshard" });
    expect(githubProvider.toSections(data, { ...cfg, options: { pinned: false } }).map((s) => s.id)).toEqual(["c1_activity"]);
  });

  it("leaves out charts it has no data for", () => {
    const empty: GithubData = { id: 1, login: "new", followers: 0, repos: 0, stars: 0, contributions: 0, days: [], pinned: [], languages: [] };
    const sections = githubProvider.toSections(empty as never, cfg);
    expect(sections).toHaveLength(1);
    expect(sections[0]!.fields).toEqual([]);
  });

  it("turns failures into clear errors", async () => {
    respond(200, notFound);
    await expect(githubProvider.fetch("nobody-here", {}, ctx())).rejects.toMatchObject({ kind: "not_found" });
    respond(401, { message: "Bad credentials" });
    await expect(githubProvider.fetch("octo-maya", {}, ctx())).rejects.toMatchObject({ kind: "unconfigured" });
    respond(403, { message: "secondary rate limit" });
    await expect(githubProvider.fetch("octo-maya", {}, ctx())).rejects.toMatchObject({ kind: "rate_limited" });
    respond(200, { data: {} });
    await expect(githubProvider.fetch("octo-maya", {}, ctx())).rejects.toMatchObject({ kind: "upstream" });
    const fetch = respond(200, user);
    await expect(githubProvider.fetch("octo-maya", {}, ctx(null))).rejects.toBeInstanceOf(ProviderError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("knows its owner by GitHub's stable user id", async () => {
    respond(200, user);
    expect(githubProvider.ownerId!(await githubProvider.fetch("octo-maya", {}, ctx()))).toBe("5832317");
  });

  it("verifies by finding the code on the public profile", async () => {
    respond(200, restUser);
    expect(await githubProvider.verify!.check("octo-maya", "persona-7KQ2XY", ctx())).toBe(true);
    respond(200, restUser);
    expect(await githubProvider.verify!.check("octo-maya", "persona-AAAAAA", ctx())).toBe(false);
  });
});
