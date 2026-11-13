import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SectionSchema } from "@runtime/schema/portfolio";
import works from "../__fixtures__/orcid/works.json";
import { orcidProvider, validOrcid, type OrcidData } from "./orcid";

const ID = "0000-0002-1825-0097";
const cfg = { id: "c1", provider: "orcid", account: ID, options: {}, hidden: [] };
const ctx = () => ({ signal: new AbortController().signal });
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

describe("orcid provider", () => {
  it("checks the iD's check character before any request", async () => {
    expect(validOrcid(ID)).toBe(true);
    expect(validOrcid("0000-0002-9079-593X")).toBe(true);
    expect(validOrcid("0000-0002-1825-0098")).toBe(false);
    const fetch = respond(200, works);
    await expect(orcidProvider.fetch("0000-0002-1825-0098", {}, ctx())).rejects.toMatchObject({ kind: "not_found" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reads works newest first, one per group, with DOIs as links", async () => {
    const fetch = respond(200, works);
    const d = (await orcidProvider.fetch(ID, {}, ctx())) as unknown as OrcidData;
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toBe(`https://pub.orcid.org/v3.0/${ID}/works`);
    expect(init.headers.accept).toBe("application/json");
    expect(d.total).toBe(3);
    expect(d.works.map((w) => [w.title, w.date, w.link])).toEqual([
      ["Queues as logs", "2026-11", "https://example.org/paper.pdf"],
      ["Tail latency in shared caches", "2024-03-07", "https://doi.org/10.1145/3600006.3613139"],
      ["Untitled-less", "", ""],
    ]);
  });

  it("maps into the publications kind with a works count", async () => {
    respond(200, works);
    const [section] = orcidProvider.toSections(await orcidProvider.fetch(ID, {}, ctx()), cfg);
    expect(SectionSchema.safeParse(section).success).toBe(true);
    expect(section).toMatchObject({ kind: "publications", fields: [{ value: { value: "3", label: "works on ORCID" } }] });
    expect(section!.items![1]!.values).toEqual({ title: "Tail latency in shared caches", publisher: "Journal of Systems", date: "2024-03-07", summary: "Journal article", link: { label: "DOI", href: "https://doi.org/10.1145/3600006.3613139" } });
    expect(section!.items![2]!.values).not.toHaveProperty("link");
  });

  it("reports unknown iDs", async () => {
    respond(404, { "response-code": 404 });
    await expect(orcidProvider.fetch(ID, {}, ctx())).rejects.toMatchObject({ kind: "not_found" });
  });

  it("verifies with the code in the public biography or keywords", async () => {
    const fetch = respond(200, { biography: { content: "Systems researcher.", visibility: "public" }, keywords: { keyword: [{ content: "caches" }, { content: "persona-OR7C2D" }] } });
    expect(await orcidProvider.verify!.check(ID, "persona-OR7C2D", ctx())).toBe(true);
    expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe(`https://pub.orcid.org/v3.0/${ID}/person`);
    respond(200, { biography: null, keywords: null });
    expect(await orcidProvider.verify!.check(ID, "persona-OR7C2D", ctx())).toBe(false);
  });
});
