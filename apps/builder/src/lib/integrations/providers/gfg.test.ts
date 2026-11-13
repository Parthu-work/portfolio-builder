import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SectionSchema } from "@runtime/schema/portfolio";
import notFound from "../__fixtures__/gfg/not-found.json";
import profile from "../__fixtures__/gfg/profile.json";
import { gfgProvider, toGfgData, type GfgData } from "./gfg";

const cfg = { id: "c1", provider: "gfg", account: "maya", options: {}, hidden: [] };
const ctx = () => ({ signal: new AbortController().signal });
const respond = (status: number, body: string) => {
  const fetch = vi.fn(async () => new Response(body, { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
};

beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gfg provider", () => {
  it("reads score, problems solved, institute rank and streak, numbers or strings", async () => {
    const fetch = respond(200, JSON.stringify(profile));
    const d = (await gfgProvider.fetch("maya", {}, ctx())) as unknown as GfgData;
    expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe("https://authapi.geeksforgeeks.org/api-get/user-profile-info/?handle=maya&article_count=false&redirect=true");
    expect(d).toEqual({ handle: "maya", score: 1430, solved: 612, instituteRank: 12, institute: "IIT Example", streak: 57 });
    const [section] = gfgProvider.toSections(d as never, cfg);
    expect(SectionSchema.safeParse(section).success).toBe(true);
    expect(section!.items!.map((i) => i.values.stat)).toEqual([
      { value: "1,430", label: "coding score" },
      { value: "612", label: "problems solved" },
      { value: "12", label: "rank at IIT Example" },
      { value: "57", label: "day longest POTD streak" },
    ]);
  });

  it("says when a handle does not exist, and refuses to guess when the answer changed shape", () => {
    expect(() => toGfgData(notFound as never, "x")).toThrow(/No GeeksforGeeks user/);
    expect(() => toGfgData({ message: "ok", data: { name: "x" } }, "x")).toThrow(/format may have changed/);
    expect(() => toGfgData({ message: "ok" }, "x")).toThrow(/format may have changed/);
  });

  it("reports sign-in walls and bot protection plainly", async () => {
    respond(403, "<html>blocked</html>");
    await expect(gfgProvider.fetch("maya", {}, ctx())).rejects.toMatchObject({ kind: "upstream", message: expect.stringMatching(/refused the request/) });
    respond(200, "<!DOCTYPE html><html>login</html>");
    await expect(gfgProvider.fetch("maya", {}, ctx())).rejects.toMatchObject({ message: expect.stringMatching(/refused the request/) });
  });
});
