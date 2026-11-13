import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SectionSchema } from "@runtime/schema/portfolio";
import projects from "../__fixtures__/gitlab/projects.json";
import user from "../__fixtures__/gitlab/user.json";
import users from "../__fixtures__/gitlab/users.json";
import { gitlabProvider, type GitlabData } from "./gitlab";

const cfg = { id: "c1", provider: "gitlab", account: "maya.o", options: {}, hidden: [] };
const ctx = () => ({ signal: new AbortController().signal });
function route(table: [RegExp, unknown][]) {
  const fetch = vi.fn(async (url: string) => {
    const hit = table.find(([re]) => re.test(url));
    return hit ? new Response(JSON.stringify(hit[1]), { status: 200 }) : new Response("{}", { status: 404 });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
const full = (): [RegExp, unknown][] => [
  [/\/users\?username=maya\.o$/, users],
  [/\/users\/4242\/projects\?order_by=star_count&sort=desc&per_page=100&simple=true$/, projects],
  [/\/users\/4242$/, user],
];

beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gitlab provider", () => {
  it("finds the user and their public projects by stars, keeping gitlab.com links only", async () => {
    route(full());
    const d = (await gitlabProvider.fetch("maya.o", {}, ctx())) as unknown as GitlabData;
    expect(d.projects.map((p) => [p.name, p.description, p.stars])).toEqual([
      ["pipeline-kit", "CI templates for monorepos.", 210],
      ["dotfiles", "", 1],
    ]);
  });

  it("maps into project and star counts plus project entries", async () => {
    route(full());
    const sections = gitlabProvider.toSections(await gitlabProvider.fetch("maya.o", {}, ctx()), cfg);
    for (const s of sections) expect(SectionSchema.safeParse(s).success).toBe(true);
    expect(sections[0]!.items!.map((i) => i.values.stat)).toEqual([
      { value: "2", label: "public projects" },
      { value: "211", label: "stars" },
    ]);
    expect(sections[1]!.items![0]!.values).toEqual({ title: "pipeline-kit", summary: "CI templates for monorepos.", tags: ["ci", "gitlab"], impact: { value: "210", label: "stars" }, repo: "https://gitlab.com/maya.o/pipeline-kit" });
    expect(gitlabProvider.toSections({ id: 1, username: "x", projects: [], capped: false } as never, cfg)).toEqual([]);
  });

  it("reports unknown and blocked users", async () => {
    route([[/\/users\?username=/, []]]);
    await expect(gitlabProvider.fetch("nobody", {}, ctx())).rejects.toMatchObject({ kind: "not_found" });
    route([[/\/users\?username=/, [{ ...users[0], state: "blocked" }]]]);
    await expect(gitlabProvider.fetch("maya.o", {}, ctx())).rejects.toMatchObject({ kind: "not_found" });
  });

  it("verifies with the code in the bio", async () => {
    route(full());
    expect(await gitlabProvider.verify!.check("maya.o", "persona-GL8M2Q", ctx())).toBe(true);
    expect(await gitlabProvider.verify!.check("maya.o", "persona-NOPE11", ctx())).toBe(false);
  });
});
