import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SectionSchema } from "@runtime/schema/portfolio";
import devto from "../__fixtures__/writing/devto.json";
import hashnodeMissing from "../__fixtures__/writing/hashnode-missing.json";
import hashnode from "../__fixtures__/writing/hashnode.json";
import { parseRss, plainText } from "../rss";
import { parseAccount, writingProvider, type WritingData } from "./writing";

const xml = (name: string) => readFileSync(join(__dirname, "../__fixtures__/writing", name), "utf8");
const cfg = { id: "c1", provider: "writing", account: "dev.to/maya", options: {}, hidden: [] };
const ctx = () => ({ signal: new AbortController().signal });
const respond = (status: number, body: string) => {
  const fetch = vi.fn(async () => new Response(body, { status }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
};
const read = async (account: string) => (await writingProvider.fetch(account, {}, ctx())) as unknown as WritingData;

beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("writing provider", () => {
  it("recognises each supported blog address, with or without https://", () => {
    expect(parseAccount("https://dev.to/Maya/")).toEqual({ platform: "devto", id: "maya" });
    expect(parseAccount("maya.hashnode.dev")).toEqual({ platform: "hashnode", id: "maya.hashnode.dev" });
    expect(parseAccount("medium.com/@maya.o")).toEqual({ platform: "medium", id: "maya.o" });
    expect(parseAccount("www.maya.substack.com")).toEqual({ platform: "substack", id: "maya" });
    for (const bad of ["maya", "evil.com/feed", "dev.to/../x", "x.substack.com.evil.com"]) {
      expect(parseAccount(bad)).toBeNull();
      expect(writingProvider.accountPattern.test(bad)).toBe(false);
    }
  });

  it("reads DEV posts with an exact total, skipping non-HTTPS links", async () => {
    const fetch = respond(200, JSON.stringify(devto));
    const d = await read("dev.to/maya");
    expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe("https://dev.to/api/articles?username=maya&per_page=100");
    expect(d.total).toBe(3);
    expect(d.posts.map((p) => [p.title, p.date, p.summary])).toEqual([
      ["Tracing Node services without the overhead", "2026-10-02", "How we cut tracing cost by 80% & kept the signal."],
      ["Queues are databases too", "2026-08-21", "A short essay."],
    ]);
  });

  it("reads Hashnode through its public GraphQL, and reports unknown blogs", async () => {
    respond(200, JSON.stringify(hashnode));
    expect(await read("maya.hashnode.dev")).toMatchObject({ platform: "hashnode", total: 27, posts: [{ title: "Designing for p99", date: "2026-09-30" }] });
    respond(200, JSON.stringify(hashnodeMissing));
    await expect(read("nobody.hashnode.dev")).rejects.toMatchObject({ kind: "not_found" });
  });

  it("reads Medium and Substack RSS without claiming a total", async () => {
    const fetch = respond(200, xml("medium.xml"));
    const medium = await read("medium.com/@maya");
    expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe("https://medium.com/feed/@maya");
    expect(medium.total).toBeNull();
    expect(medium.posts.map((p) => [p.title, p.date, p.summary])).toEqual([
      ["Why we deleted our cache", "2026-11-03", ""],
      ["Ops & on-call — a field guide", "", "A guide."],
    ]);
    respond(200, xml("substack.xml"));
    expect((await read("maya.substack.com")).posts[0]).toEqual({ title: "Issue #12: the boring parts", link: "https://maya.substack.com/p/issue-12", date: "2026-11-01", summary: "What changed this month." });
    respond(200, "<html>not a feed</html>");
    await expect(read("maya.substack.com")).rejects.toMatchObject({ kind: "not_found" });
  });

  it("maps posts into the Writing section with stable ids, the total where known, and the real source", async () => {
    respond(200, JSON.stringify(devto));
    const data = await writingProvider.fetch("dev.to/maya", {}, ctx());
    const [section] = writingProvider.toSections(data, cfg);
    expect(SectionSchema.safeParse(section).success).toBe(true);
    expect(section).toMatchObject({ kind: "publications", title: "Writing on DEV", fields: [{ value: { value: "3", label: "posts on DEV" } }] });
    expect(section!.items!.map((i) => i.id)).toEqual(["p-dev-to-maya-tracing-node-services-1a2b", "p-dev-to-maya-queues-are-databases-too-3c4d"]);
    expect(writingProvider.sourceOf!(data)).toBe("dev.to");
    respond(200, xml("medium.xml"));
    const medium = await writingProvider.fetch("medium.com/@maya", {}, ctx());
    expect(writingProvider.sourceOf!(medium)).toBe("medium.com");
    expect(writingProvider.toSections(medium, cfg)[0]!.fields).toEqual([]);
    expect(writingProvider.highlights!(medium)).toEqual([]);
  });
});

describe("rss reader", () => {
  it("never expands anything but XML entities and numeric references", () => {
    expect(plainText("<p>a &amp;amp; &unknown; &#0; &#x1F600;</p>")).toBe("a &amp; &unknown; &#0; 😀");
    expect(parseRss('<!DOCTYPE x [<!ENTITY e "boom">]><rss><item><title>&e;</title><link>https://x.example/1</link></item></rss>')).toEqual([{ title: "&e;", link: "https://x.example/1", date: "", summary: "" }]);
  });

  it("caps the number of items and the summary length", () => {
    const many = `<rss>${Array.from({ length: 30 }, (_, i) => `<item><title>t${i}</title><link>https://x.example/${i}</link><description>${"word ".repeat(200)}</description></item>`).join("")}</rss>`;
    const items = parseRss(many, 5);
    expect(items).toHaveLength(5);
    expect(items[0]!.summary.length).toBeLessThanOrEqual(300);
    expect(items[0]!.summary.endsWith("…")).toBe(true);
  });
});
