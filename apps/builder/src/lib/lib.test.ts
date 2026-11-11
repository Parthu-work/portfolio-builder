import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { PortfolioSchema } from "@runtime/schema/portfolio";
import { SEEDS } from "@runtime/schema/seeds";
import { fixturePortfolio } from "@runtime/schema/seeds/fixture";
import { historyReducer } from "@/components/editor/state";
import { dailySalt, deviceFromUa, ipHash, referrerDomain, sessionHash, TrackBatchSchema } from "./analytics-core";
import { completeness, contentWarnings } from "./checks";
import { hmac, safeEqual, sha256, uuidFrom } from "./crypto";
import { buildDeployUrl, DeployConfigError } from "./deploy";
import { checkLink, collectUrls, isPublicHttpUrl } from "./links";
import { normalizePortfolio, PortfolioInputSchema } from "./portfolio-input";
import { computeStats, toCsv } from "./stats";
import { LocalStore } from "./store/local";
import { NotFoundError, SlugTakenError, type EventRow } from "./store/types";
import { buildZip } from "./zip";

describe("deploy URL builder", () => {
  const input = { repoUrl: "https://github.com/acme/persona", slug: "ada-lovelace", portfolioId: "3f2b1c9e-0000-4000-8000-000000000001", builderUrl: "https://persona.example.com/" };

  it("builds a Vercel clone URL that points at apps/runtime with pre-filled env", () => {
    const url = new URL(buildDeployUrl(input));
    expect(url.origin + url.pathname).toBe("https://vercel.com/new/clone");
    expect(url.searchParams.get("repository-url")).toBe("https://github.com/acme/persona/tree/main/apps/runtime");
    expect(url.searchParams.get("project-name")).toBe("ada-lovelace-portfolio");
    expect(url.searchParams.get("repository-name")).toBe("ada-lovelace-portfolio");
    expect(url.searchParams.get("env")).toBe("PORTFOLIO_ID,BUILDER_URL");
    expect(JSON.parse(url.searchParams.get("envDefaults")!)).toEqual({ PORTFOLIO_ID: input.portfolioId, BUILDER_URL: "https://persona.example.com" });
    expect(url.searchParams.get("envDescription")).toBeTruthy();
  });
  it("supports a custom branch and strips .git / trailing slashes", () => {
    const url = new URL(buildDeployUrl({ ...input, repoUrl: "https://github.com/acme/persona.git/", branch: "release/v1" }));
    expect(url.searchParams.get("repository-url")).toBe("https://github.com/acme/persona/tree/release/v1/apps/runtime");
  });
  it("encodes every parameter safely", () => {
    const raw = buildDeployUrl(input);
    expect(raw).not.toMatch(/[\s"{}]/);
    expect(raw).toContain("envDefaults=%7B%22PORTFOLIO_ID%22");
  });
  it("rejects missing or non-https repositories and bad builder URLs", () => {
    expect(() => buildDeployUrl({ ...input, repoUrl: "" })).toThrow(DeployConfigError);
    expect(() => buildDeployUrl({ ...input, repoUrl: "http://github.com/a/b" })).toThrow(DeployConfigError);
    expect(() => buildDeployUrl({ ...input, repoUrl: "https://evil.example/a/b" })).toThrow(DeployConfigError);
    expect(() => buildDeployUrl({ ...input, builderUrl: "persona.example.com" })).toThrow(DeployConfigError);
    expect(() => buildDeployUrl({ ...input, branch: "x y" })).toThrow(DeployConfigError);
  });
});

describe("analytics hashing", () => {
  const day1 = new Date("2026-03-01T10:00:00Z");
  const day1Late = new Date("2026-03-01T23:59:59Z");
  const day2 = new Date("2026-03-02T00:00:01Z");

  it("session hash is sha256(daily_salt + ip + user agent)", async () => {
    const salt = await dailySalt("secret", day1);
    expect(salt).toBe(await sha256("secret:2026-03-01"));
    expect(await sessionHash("secret", "203.0.113.7", "UA", day1)).toBe(await sha256(`${salt}203.0.113.7UA`));
  });
  it("is stable within a UTC day and rotates the next day", async () => {
    const a = await sessionHash("secret", "203.0.113.7", "UA", day1);
    expect(await sessionHash("secret", "203.0.113.7", "UA", day1Late)).toBe(a);
    expect(await sessionHash("secret", "203.0.113.7", "UA", day2)).not.toBe(a);
  });
  it("differs per ip, user agent and secret, and never contains the ip", async () => {
    const a = await sessionHash("secret", "203.0.113.7", "UA", day1);
    expect(await sessionHash("secret", "203.0.113.8", "UA", day1)).not.toBe(a);
    expect(await sessionHash("secret", "203.0.113.7", "UA2", day1)).not.toBe(a);
    expect(await sessionHash("other", "203.0.113.7", "UA", day1)).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain("203");
    expect(await ipHash("secret", "203.0.113.7")).toMatch(/^[0-9a-f]{32}$/);
  });
  it("classifies devices and keeps only the referrer's host", () => {
    expect(deviceFromUa("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148")).toBe("mobile");
    expect(deviceFromUa("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)")).toBe("tablet");
    expect(deviceFromUa("Mozilla/5.0 (X11; Linux x86_64) Chrome/120")).toBe("desktop");
    expect(deviceFromUa("Googlebot/2.1")).toBe("bot");
    expect(referrerDomain("https://www.google.com/search?q=secret+query", "persona.example.com")).toBe("google.com");
    expect(referrerDomain("https://persona.example.com/templates", "persona.example.com")).toBeNull();
    expect(referrerDomain("not a url", "x")).toBeNull();
  });
  it("only accepts client-reportable event types", () => {
    expect(TrackBatchSchema.safeParse({ events: [{ type: "page_view", path: "/" }] }).success).toBe(true);
    expect(TrackBatchSchema.safeParse({ events: [{ type: "signup" }] }).success).toBe(false);
    expect(TrackBatchSchema.safeParse({ events: [{ type: "deploy_confirmed" }] }).success).toBe(false);
    expect(TrackBatchSchema.safeParse({ events: [] }).success).toBe(false);
  });
  it("crypto helpers", async () => {
    expect(await sha256("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(await hmac("key", "msg")).toMatch(/^[0-9a-f]{64}$/);
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(await uuidFrom("x")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});

describe("admin stats", () => {
  const now = Date.parse("2026-03-10T12:00:00Z");
  const ev = (type: EventRow["type"], hoursAgo: number, extra: Partial<EventRow> = {}): EventRow => ({
    ts: new Date(now - hoursAgo * 3600_000).toISOString(),
    type,
    sessionHash: "s1",
    userId: null,
    portfolioId: null,
    path: "/",
    referrerDomain: null,
    country: "PT",
    device: "desktop",
    props: {},
    ...extra,
  });
  const events = [
    ev("page_view", 1),
    ev("page_view", 2),
    ev("page_view", 3, { sessionHash: "s2", device: "mobile", country: "IN", referrerDomain: "news.example" }),
    ev("signup", 2),
    ev("portfolio_created", 2, { portfolioId: "p1", props: { templateId: "signal" } }),
    ev("template_switched", 2, { props: { templateId: "swiss" } }),
    ev("custom_section_added", 2, { props: { name: " Patents " } }),
    ev("custom_section_added", 2, { props: { name: "patents" } }),
    ev("published", 1, { portfolioId: "p1" }),
    ev("published", 1, { portfolioId: "p1" }),
    ev("deploy_clicked", 1, { portfolioId: "p1" }),
    ev("deploy_clicked", 1, { portfolioId: "p2" }),
    ev("deploy_confirmed", 1, { portfolioId: "p1", props: { templateId: "signal" } }),
    ev("page_view", 24 * 20, { sessionHash: "old" }),
  ];

  it("computes KPIs, funnel and breakdowns for a range", () => {
    const s = computeStats(events, "7d", now);
    const kpi = Object.fromEntries(s.kpis.map((k) => [k.key, k.value]));
    expect(kpi).toEqual({ visitors: 2, pageViews: 3, signups: 1, created: 1, published: 2, deployClicks: 2, deployConfirmed: 1, conversion: 50 });
    expect(s.funnel.map((f) => f.value)).toEqual([2, 1, 1, 1, 2, 1]);
    expect(s.templates).toEqual([
      { templateId: "signal", selected: 1, deployed: 1 },
      { templateId: "swiss", selected: 1, deployed: 0 },
    ]);
    expect(s.customSections).toEqual([{ name: "patents", count: 2 }]);
    expect(s.referrers).toEqual([{ name: "news.example", count: 1 }]);
    expect(s.devices).toEqual([{ name: "desktop", count: 1 }, { name: "mobile", count: 1 }]);
    expect(s.series).toHaveLength(7);
    expect(s.series.reduce((a, p) => a + p.pageViews, 0)).toBe(3);
    for (const k of s.kpis) expect(k.spark).toHaveLength(7);
  });
  it("buckets hourly for 24h and includes everything for all-time", () => {
    expect(computeStats(events, "24h", now).series).toHaveLength(24);
    const all = computeStats(events, "all", now);
    expect(all.kpis[0]!.value).toBe(3);
    expect(all.series.length).toBeGreaterThanOrEqual(20);
  });
  it("handles no data", () => {
    const s = computeStats([], "30d", now);
    expect(s.kpis.every((k) => k.value === 0)).toBe(true);
    expect(s.series).toHaveLength(30);
  });
  it("exports CSV safely", () => {
    expect(toCsv([{ a: 'x,"y"', b: "=SUM(A1)", c: { k: 1 } }], ["a", "b", "c"])).toBe('a,b,c\r\n"x,""y""",\'=SUM(A1),"{""k"":1}"');
  });
});

describe("content checks", () => {
  it("scores completeness", () => {
    expect(completeness(SEEDS.developer.portfolio).percent).toBe(100);
    const blank = { ...SEEDS.developer.portfolio, profile: { name: "", headline: "", socials: [] }, meta: { ...SEEDS.developer.portfolio.meta, description: "" }, sections: [] };
    expect(completeness(blank).percent).toBe(0);
  });
  it("warns about missing alt text and empty required fields, ignoring hidden content", () => {
    const p = structuredClone(fixturePortfolio);
    expect(contentWarnings(p).filter((w) => w.kind === "alt")).toHaveLength(0);
    p.profile.avatar = { src: "https://example.com/a.png", alt: " " };
    const projects = p.sections.find((s) => s.kind === "projects")!;
    projects.items![0]!.values.image = { src: "https://example.com/cover.png", alt: "" };
    projects.items![1]!.values.title = "";
    const w = contentWarnings(p);
    expect(w.filter((x) => x.kind === "alt")).toHaveLength(2);
    expect(w.some((x) => x.kind === "required" && x.sectionId === projects.id)).toBe(true);
    projects.visible = false;
    expect(contentWarnings(p).filter((x) => x.sectionId === projects.id)).toHaveLength(0);
  });
});

describe("link checking", () => {
  it("collects every external URL once", () => {
    const urls = collectUrls(SEEDS.developer.portfolio);
    expect(urls).toContain("https://github.com/example");
    expect(urls).toContain("https://example.com/lumen");
    expect(urls).toContain("https://example.com/patents/4012345");
    expect(urls.every((u) => /^https?:/.test(u))).toBe(true);
    expect(new Set(urls).size).toBe(urls.length);
  });
  it("refuses private, local and non-http targets (SSRF guard)", () => {
    for (const bad of ["http://localhost/x", "http://127.0.0.1", "http://10.0.0.5", "http://192.168.1.1", "http://169.254.169.254/latest/meta-data", "http://[::1]/", "ftp://example.com", "http://user:pw@example.com", "http://intranet", "http://2130706433", "https://example.com:22"]) {
      expect(isPublicHttpUrl(bad), bad).toBe(false);
    }
    expect(isPublicHttpUrl("https://example.com/a")).toBe(true);
  });
  it("reports broken, alive and unreachable links without following redirects", async () => {
    const fake = (status: number) => (async (_u: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.redirect).toBe("manual");
      return new Response(null, { status });
    }) as typeof fetch;
    expect(await checkLink("https://example.com/ok", fake(200))).toMatchObject({ ok: true, status: 200 });
    expect(await checkLink("https://example.com/moved", fake(301))).toMatchObject({ ok: true });
    expect(await checkLink("https://example.com/gone", fake(404))).toMatchObject({ ok: false, reason: "HTTP 404" });
    expect(await checkLink("http://localhost:3000", fake(200))).toMatchObject({ ok: false, status: null });
    expect(await checkLink("https://example.com/x", (async () => { throw new Error("boom"); }) as typeof fetch)).toMatchObject({ ok: false, reason: "Unreachable" });
  });
});

describe("portfolio input normalisation", () => {
  it("sanitizes rich text in fields and items, and snaps theme ids", () => {
    const p = structuredClone(SEEDS.developer.portfolio);
    p.sections.find((s) => s.kind === "about")!.fields[0]!.value = '<p>ok</p><script>alert(1)</script><img src=x onerror=alert(1)>';
    p.sections.find((s) => s.kind === "experience")!.items![0]!.values.summary = '<a href="javascript:alert(1)">x</a>';
    p.theme.paletteId = "does-not-exist";
    p.theme.templateId = "nope";
    const n = normalizePortfolio(p);
    expect(n.sections.find((s) => s.kind === "about")!.fields[0]!.value).toBe("<p>ok</p>");
    expect(n.sections.find((s) => s.kind === "experience")!.items![0]!.values.summary).toBe("<a>x</a>");
    expect(n.theme).toMatchObject({ templateId: "swiss", paletteId: "classic", fontPairId: "inter" });
    expect(PortfolioInputSchema.safeParse({ ...p, schemaVersion: 2 }).success).toBe(false);
  });
});

describe("zip export", () => {
  it("bakes the portfolio into the runtime and leaves out env files", () => {
    const files = { "package.json": '{"name":"persona-runtime"}', "src/data/portfolio.json": "null\n", "src/app/page.tsx": "export default 1;", ".env.example": "X=", "public/a.png": { base64: Buffer.from([1, 2, 3]).toString("base64") } };
    const out = unzipSync(buildZip(files, SEEDS.designer.portfolio, "ines-portfolio"));
    expect(Object.keys(out).sort()).toEqual(["ines-portfolio/README.md", "ines-portfolio/package.json", "ines-portfolio/public/a.png", "ines-portfolio/src/app/page.tsx", "ines-portfolio/src/data/fallback.json", "ines-portfolio/src/data/portfolio.json"]);
    const baked = JSON.parse(strFromU8(out["ines-portfolio/src/data/portfolio.json"]!));
    expect(PortfolioSchema.parse(baked).profile.name).toBe("Inés Carvalho");
    expect([...out["ines-portfolio/public/a.png"]!]).toEqual([1, 2, 3]);
  });
});

describe("editor history", () => {
  const a = SEEDS.developer.portfolio;
  const b = { ...a, meta: { ...a.meta, title: "B" } };
  const c = { ...a, meta: { ...a.meta, title: "C" } };
  const start = { past: [], present: a, future: [], lastKey: null, lastAt: 0 };

  it("undoes and redoes", () => {
    let h = historyReducer(start, { type: "apply", next: b, key: null, at: 1 });
    h = historyReducer(h, { type: "apply", next: c, key: null, at: 2 });
    h = historyReducer(h, { type: "undo" });
    expect(h.present).toBe(b);
    h = historyReducer(h, { type: "undo" });
    expect(h.present).toBe(a);
    expect(historyReducer(h, { type: "undo" })).toBe(h);
    h = historyReducer(h, { type: "redo" });
    h = historyReducer(h, { type: "redo" });
    expect(h.present).toBe(c);
  });
  it("coalesces rapid edits to the same field into one undo step", () => {
    let h = historyReducer(start, { type: "apply", next: b, key: "title", at: 1000 });
    h = historyReducer(h, { type: "apply", next: c, key: "title", at: 1500 });
    expect(h.past).toHaveLength(1);
    expect(historyReducer(h, { type: "undo" }).present).toBe(a);
    h = historyReducer(h, { type: "apply", next: b, key: "title", at: 5000 });
    expect(h.past).toHaveLength(2);
  });
  it("a new edit clears the redo stack", () => {
    let h = historyReducer(start, { type: "apply", next: b, key: null, at: 1 });
    h = historyReducer(h, { type: "undo" });
    h = historyReducer(h, { type: "apply", next: c, key: null, at: 2 });
    expect(h.future).toHaveLength(0);
  });
});

describe("local store", () => {
  const user = { id: "u1", email: "a@example.com", name: "A" };
  const draft = (slug: string) => ({ ...structuredClone(SEEDS.developer.portfolio), meta: { ...SEEDS.developer.portfolio.meta, slug } });

  it("enforces ownership, unique slugs and published-only public reads", async () => {
    const store = new LocalStore(null);
    expect(await store.ensureProfile(user)).toEqual({ created: true });
    expect(await store.ensureProfile(user)).toEqual({ created: false });
    const row = await store.createPortfolio("u1", draft("one"));
    await expect(store.createPortfolio("u2", draft("one"))).rejects.toBeInstanceOf(SlugTakenError);
    expect(await store.getPortfolio("u2", row.id)).toBeNull();
    await expect(store.saveDraft("u2", row.id, draft("one"))).rejects.toBeInstanceOf(NotFoundError);
    await expect(store.publish("u2", row.id)).rejects.toBeInstanceOf(NotFoundError);
    expect(await store.getPublished({ id: row.id })).toBeNull();

    await store.publish("u1", row.id);
    const edited = draft("one");
    edited.profile.name = "Draft Only";
    await store.saveDraft("u1", row.id, edited);
    expect((await store.getPublished({ slug: "one" }))!.portfolio.profile.name).toBe("Maya Okafor");

    await store.deletePortfolio("u1", row.id);
    expect(await store.getPublished({ id: row.id })).toBeNull();
    expect(await store.slugAvailable("one")).toBe(true);
  });
  it("keeps only the latest 20 versions", async () => {
    const store = new LocalStore(null);
    const row = await store.createPortfolio("u1", draft("versions"));
    for (let i = 0; i < 25; i += 1) await store.addVersion("u1", row.id, draft("versions"), `v${i}`);
    expect(await store.listVersions("u1", row.id)).toHaveLength(20);
    await expect(store.listVersions("u2", row.id)).rejects.toBeInstanceOf(NotFoundError);
  });
  it("records a deployment once and reports first sight", async () => {
    const store = new LocalStore(null);
    const row = await store.createPortfolio("u1", draft("deploys"));
    const input = { portfolioId: row.id, vercelUrl: "x.vercel.app", templateId: "signal", runtimeVersion: "1.0.0" };
    expect((await store.upsertDeployment(input))!.firstSeen).toBe(true);
    expect((await store.upsertDeployment(input))!.firstSeen).toBe(false);
    expect(await store.listDeployments("u1", row.id)).toHaveLength(1);
    expect(await store.upsertDeployment({ ...input, portfolioId: "missing" })).toBeNull();
  });
  it("rate limits with a token bucket", async () => {
    const store = new LocalStore(null);
    const results = [];
    for (let i = 0; i < 5; i += 1) results.push(await store.takeToken("k", 3, 0));
    expect(results).toEqual([true, true, true, false, false]);
    expect(await store.takeToken("other", 3, 0)).toBe(true);
  });
});
