import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PortfolioSchema, type IntegrationConfig, type Portfolio, type Section } from "@runtime/schema/portfolio";
import { SEEDS } from "@runtime/schema/seeds";
import { viewPortfolio } from "@runtime/render/view";
import { LocalStore } from "../store/local";
import { isMissingTable, SupabaseStore } from "../store/supabase";
import { providerFetch, providerJson } from "./http";
import { mockProvider } from "./providers/mock";
import { findProvider, getProvider, listProviders, providerInfo } from "./registry";
import { addMissing, applyHidden, mergeSynced, removeAccount, resync, syncAccount, toggles } from "./sections";
import { connect, connectionInfo, defaultConfig, mergeLive, newVerifyCode, ownedViaSignIn, refresh, refreshStale, REFRESH_AFTER_MS, sectionsFor } from "./service";
import { ProviderError, type Provider } from "./types";

const PID = "3f2b1c9e-0000-4000-8000-000000000001";
const base = (): Portfolio => structuredClone(SEEDS.developer.portfolio);

/** A provider whose answers the test controls. */
function fake(over: Partial<Provider> = {}): Provider & { calls: number; next: (v: number | Error) => void } {
  let value: number | Error = 1;
  const p = {
    ...mockProvider,
    id: "fake",
    name: "Fake",
    homepage: "https://www.fake.example.com/",
    official: true,
    options: [],
    calls: 0,
    next: (v: number | Error) => {
      value = v;
    },
    async fetch() {
      p.calls += 1;
      if (value instanceof Error) throw value;
      return { n: value };
    },
    toSections(data: Record<string, unknown>, cfg: { id: string }): Section[] {
      return [
        {
          id: `${cfg.id}_stats`,
          kind: "custom",
          title: "Fake stats",
          visible: true,
          layout: "metrics",
          fields: [{ key: "trend", label: "Trend", type: "chart", value: { variant: "line", title: "Trend", summary: `n is ${data.n}`, points: [{ x: "a", y: Number(data.n) }] } }],
          itemSchema: [{ key: "stat", label: "Stat", type: "metric" }],
          items: [
            { id: "n", visible: true, values: { stat: { value: String(data.n), label: "things" } } },
            { id: "m", visible: true, values: { stat: { value: "2", label: "others" } } },
          ],
        },
      ];
    },
    ...over,
  };
  return p;
}

beforeEach(() => {
  process.env.FEATURE_INTEGRATIONS = "1";
});
afterEach(() => {
  delete process.env.FEATURE_INTEGRATIONS;
  delete process.env.INTEGRATION_MOCK_DISABLED;
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("feature flags and registry", () => {
  it("offers nothing when FEATURE_INTEGRATIONS is off", () => {
    delete process.env.FEATURE_INTEGRATIONS;
    expect(listProviders()).toEqual([]);
    expect(getProvider("mock")).toBeNull();
    expect(findProvider("mock")).toBeNull();
  });

  it("registers the mock provider outside production only", () => {
    expect(getProvider("mock")?.id).toBe("mock");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LOCAL_MODE", "");
    expect(getProvider("mock")).toBeNull();
    vi.stubEnv("LOCAL_MODE", "1"); // e2e: production build, file-backed store
    expect(getProvider("mock")?.id).toBe("mock");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
    expect(getProvider("mock")).toBeNull(); // a real backend never gets the mock
  });

  it("a provider kill switch stops calls but keeps stored data renderable", () => {
    process.env.INTEGRATION_MOCK_DISABLED = "1";
    expect(getProvider("mock")).toBeNull();
    expect(findProvider("mock")?.id).toBe("mock");
  });

  it("offers providers that need a server token only once it is configured, but still renders their data", () => {
    vi.stubEnv("GITHUB_API_TOKEN", "");
    expect(getProvider("github")).toBeNull();
    expect(findProvider("github")?.id).toBe("github");
    vi.stubEnv("GITHUB_API_TOKEN", "t0ken");
    expect(listProviders().map((p) => p.id)).toContain("github");
  });

  it("tells the browser about a provider without functions or secrets", () => {
    const info = providerInfo(mockProvider);
    expect(info).toMatchObject({ id: "mock", official: false, verify: { method: "bio-code" } });
    expect(JSON.stringify(info)).not.toMatch(/function|token/i);
  });
});

describe("mock provider", () => {
  it("is deterministic, validates handles and maps into valid sections", async () => {
    const ctx = { signal: new AbortController().signal };
    const a = await mockProvider.fetch("maya", {}, ctx);
    expect(await mockProvider.fetch("maya", {}, ctx)).toEqual(a);
    expect(mockProvider.accountPattern.test("Not A Handle")).toBe(false);
    const cfg = { id: "i1", provider: "mock", account: "maya", options: { badges: true }, hidden: [] };
    const sections = mockProvider.toSections(a, cfg);
    expect(sections.map((s) => s.id)).toEqual(["i1_stats", "i1_badges"]);
    expect(PortfolioSchema.safeParse({ ...base(), sections }).success).toBe(true);
    expect(mockProvider.toSections(a, { ...cfg, options: { badges: false } })).toHaveLength(1);
    await expect(mockProvider.fetch("missing", {}, ctx)).rejects.toMatchObject({ kind: "not_found" });
    await expect(mockProvider.fetch("down", {}, ctx)).rejects.toMatchObject({ kind: "upstream" });
  });
});

describe("connect, refresh and keep-last-good", () => {
  it("stores a snapshot on connect and nothing when the provider fails", async () => {
    const store = new LocalStore(null);
    const p = fake();
    await expect(connect(store, PID, p, "Bad Handle!", {})).rejects.toMatchObject({ kind: "not_found" });
    expect(p.calls).toBe(0); // the handle is validated before any network call
    p.next(new ProviderError("upstream", "boom"));
    await expect(connect(store, PID, p, "maya", {})).rejects.toThrow("boom");
    expect(await store.listSnapshots(PID)).toEqual([]);
    p.next(5);
    const row = (await connect(store, PID, p, "maya", {}, Date.parse("2026-11-13T08:00:00Z")))!;
    expect(row).toMatchObject({ provider: "fake", account: "maya", data: { n: 5 }, status: "ok", verified: false, fetchedAt: "2026-11-13T08:00:00.000Z" });
    expect(row.verifyCode).toMatch(/^persona-[A-Z2-9]{6}$/);
    expect(newVerifyCode()).not.toBe(newVerifyCode());
  });

  it("a failed refresh keeps the last good data and its as-of time", async () => {
    const store = new LocalStore(null);
    const p = fake();
    const row = (await connect(store, PID, p, "maya", {}, Date.parse("2026-11-13T08:00:00Z")))!;
    p.next(new ProviderError("rate_limited", "slow down"));
    const failed = (await refresh(store, p, row))!;
    expect(failed).toMatchObject({ status: "stale", error: "slow down", data: { n: 1 }, fetchedAt: row.fetchedAt });
    p.next(new Error("TypeError: secret internals"));
    expect((await refresh(store, p, failed))!.error).toBe("Something went wrong while reading the provider.");
    p.next(9);
    const ok = (await refresh(store, p, failed, {}, Date.parse("2026-11-14T08:00:00Z")))!;
    expect(ok).toMatchObject({ status: "ok", error: null, data: { n: 9 }, fetchedAt: "2026-11-14T08:00:00.000Z" });
  });

  it("stamps provenance from the snapshot, never from the provider or the document", async () => {
    const store = new LocalStore(null);
    const p = fake();
    const row = (await connect(store, PID, p, "maya", {}, Date.parse("2026-11-13T08:00:00Z")))!;
    const [s] = sectionsFor(p, row, defaultConfig(p, row));
    expect(s!.sync).toEqual({ provider: "fake", account: "maya", syncedAt: "2026-11-13T08:00:00.000Z", verified: false, source: "fake.example.com" });
    const unofficial = sectionsFor({ ...p, official: false, unverifiedNote: "Issuer-verified on Fake" }, { ...row, verified: true }, defaultConfig(p, row), false)[0]!.sync;
    expect(unofficial).toMatchObject({ verified: true, experimental: true, note: "Issuer-verified on Fake", live: false });
    // A provider that throws, or returns sections outside its own id space, contributes nothing.
    expect(sectionsFor({ ...p, toSections: () => { throw new Error("bug"); } }, row, defaultConfig(p, row))).toEqual([]);
    expect(sectionsFor({ ...p, toSections: () => [{ id: "about", kind: "about", title: "Hijack", visible: true, fields: [] }] }, row, defaultConfig(p, row))).toEqual([]);
    expect(connectionInfo(p, row).available).toHaveLength(1);
    expect(connectionInfo(p, { ...row, verified: true }).verifyCode).toBeNull();
  });
});

describe("ownership via sign-in", () => {
  const p = fake({ ownerId: (d) => (typeof d.n === "number" ? `u${d.n}` : null) });

  it("verifies at connect only when the signed-in identity is the account's owner", async () => {
    const store = new LocalStore(null);
    p.next(7);
    const mine = (await connect(store, PID, p, "maya", {}, Date.now(), ["github:u7", "fake:u7"]))!;
    expect(mine).toMatchObject({ verified: true, verifyCode: null });
    const theirs = (await connect(store, PID, p, "zed", {}, Date.now(), ["fake:u8", "github:u7"]))!;
    expect(theirs.verified).toBe(false);
  });

  it("never verifies without an owner id, or when reading it throws", () => {
    expect(ownedViaSignIn(fake(), { n: 7 }, ["fake:u7"])).toBe(false);
    expect(ownedViaSignIn(p, null, ["fake:u7"])).toBe(false);
    expect(ownedViaSignIn(p, { n: "x" }, ["fake:null"])).toBe(false);
    expect(ownedViaSignIn(fake({ ownerId: () => { throw new Error("bad"); } }), { n: 7 }, ["fake:u7"])).toBe(false);
  });
});

describe("hidden choices", () => {
  const p = fake();
  const cfg = { id: "i1", provider: "fake", account: "maya", options: {}, hidden: [] as string[] };
  const sections = p.toSections({ n: 4 }, cfg);

  it("lists a labelled toggle for every chart and entry", () => {
    expect(toggles(sections[0]!, cfg)).toEqual([
      { key: "stats.trend", label: "Trend" },
      { key: "stats#n", label: "things" },
      { key: "stats#m", label: "others" },
    ]);
  });

  it("hides fields, items and whole sections; empty sections disappear", () => {
    expect(applyHidden(sections, cfg)).toBe(sections);
    const some = applyHidden(sections, { ...cfg, hidden: ["stats.trend", "stats#m"] });
    expect(some[0]!.fields).toEqual([]);
    expect(some[0]!.items!.map((i) => i.id)).toEqual(["n"]);
    expect(applyHidden(sections, { ...cfg, hidden: ["stats"] })).toEqual([]);
    expect(applyHidden(sections, { ...cfg, hidden: ["stats.trend", "stats#m", "stats#n"] })).toEqual([]);
  });
});

describe("editor sync of one account", () => {
  const p = fake();
  const stamped = (n: number, cfg: IntegrationConfig) => p.toSections({ n }, cfg).map((s) => ({ ...s, sync: { provider: "fake", account: "maya", syncedAt: "2026-11-13T08:00:00Z", verified: false } }));
  const cfg = { id: "i1", provider: "fake", account: "maya", options: {}, hidden: [] as string[] };

  it("places a new account after the chosen section and stores its choices", () => {
    const doc = base();
    const target = doc.sections[1]!.id;
    const next = syncAccount(doc, cfg, stamped(1, cfg), target);
    expect(next.sections[2]!.id).toBe("i1_stats");
    expect(next.integrations).toEqual([cfg]);
    expect(PortfolioSchema.safeParse(next).success).toBe(true);
  });

  it("updates content in place, keeps the user's title and visibility, and leaves other accounts alone", () => {
    const other = { ...cfg, id: "i2", account: "zed" };
    let doc = syncAccount(syncAccount(base(), cfg, stamped(1, cfg)), other, stamped(5, other));
    doc = { ...doc, sections: doc.sections.map((s) => (s.id === "i1_stats" ? { ...s, title: "Mine", visible: false } : s)) };
    const at = doc.sections.findIndex((s) => s.id === "i1_stats");
    const hiddenCfg = { ...cfg, hidden: ["stats#m"] };
    const next = syncAccount(doc, hiddenCfg, applyHidden(stamped(9, cfg), hiddenCfg), doc.sections[0]!.id);
    expect(next.sections[at]).toMatchObject({ id: "i1_stats", title: "Mine", visible: false });
    expect(next.sections[at]!.items!.map((i) => i.values.stat)).toEqual([{ value: "9", label: "things" }]);
    expect(next.sections.find((s) => s.id === "i2_stats")!.items![0]!.values.stat).toEqual({ value: "5", label: "things" });
    expect(next.integrations).toEqual([hiddenCfg, other]);
  });

  it("resyncs a draft from newer snapshots, and returns it untouched when nothing changed", () => {
    const doc = syncAccount(base(), cfg, stamped(1, cfg));
    const reordered = JSON.parse(JSON.stringify(doc, (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).reverse()) : v))) as Portfolio;
    expect(resync(reordered, [{ id: "i1", available: stamped(1, cfg) }])).toBe(reordered);
    expect(resync(doc, [{ id: "unknown", available: stamped(3, cfg) }])).toBe(doc);
    const next = resync(doc, [{ id: "i1", available: stamped(3, cfg) }]);
    expect(next.sections.find((s) => s.id === "i1_stats")!.items![0]!.values.stat).toEqual({ value: "3", label: "things" });
  });

  it("drops sections the account no longer produces, and everything on removal", () => {
    const doc = syncAccount(base(), cfg, stamped(1, cfg));
    expect(syncAccount(doc, { ...cfg, hidden: ["stats"] }, []).sections).toEqual(base().sections);
    const removed = removeAccount(doc, "i1");
    expect(removed.sections).toEqual(base().sections);
    expect(removed.integrations).toEqual([]);
  });
});

describe("merge on read", () => {
  async function setup() {
    const store = new LocalStore(null);
    const p = fake();
    const deps = { find: (id: string) => (id === "fake" ? p : null), now: () => Date.parse("2026-11-13T09:00:00Z") };
    const row = (await connect(store, PID, p, "maya", {}, Date.parse("2026-11-13T08:00:00Z")))!;
    const cfg = defaultConfig(p, row);
    const doc = addMissing({ ...base(), integrations: [cfg] }, sectionsFor(p, row, cfg));
    return { store, p, deps, row, cfg, doc };
  }

  it("leaves documents without synced sections untouched, flag on or off", async () => {
    const store = new LocalStore(null);
    const doc = base();
    expect((await mergeLive(store, PID, doc)).portfolio).toBe(doc);
    delete process.env.FEATURE_INTEGRATIONS;
    expect((await mergeLive(store, PID, doc)).portfolio).toBe(doc);
  });

  it("places new synced sections before Contact and keeps the document valid", async () => {
    const { doc, row } = await setup();
    const kinds = doc.sections.map((s) => s.kind);
    expect(doc.sections.at(-2)!.id).toBe(`${row.id}_stats`);
    expect(kinds.at(-1)).toBe("contact");
    expect(PortfolioSchema.safeParse(doc).success).toBe(true);
    expect(addMissing(doc, doc.sections.filter((s) => s.sync))).toBe(doc);
  });

  it("serves fresh content where the user put the section, keeping their title and visibility", async () => {
    const { store, p, deps, row, doc } = await setup();
    const id = `${row.id}_stats`;
    const mine = doc.sections.find((s) => s.id === id)!;
    const moved: Portfolio = { ...doc, sections: [doc.sections[0]!, { ...mine, title: "My numbers" }, ...doc.sections.slice(1).filter((s) => s.id !== id)] };
    p.next(42);
    await refresh(store, p, row, {}, Date.parse("2026-11-13T08:30:00Z"));
    const { portfolio, stale } = await mergeLive(store, PID, moved, {}, deps);
    expect(stale).toEqual([]);
    expect(portfolio.sections[1]).toMatchObject({ id, title: "My numbers", sync: { syncedAt: "2026-11-13T08:30:00.000Z", verified: false } });
    expect(portfolio.sections[1]!.items![0]!.values.stat).toEqual({ value: "42", label: "things" });
    expect(PortfolioSchema.safeParse(portfolio).success).toBe(true);
    const text = JSON.stringify(viewPortfolio(portfolio));
    expect(text).toContain("Live from fake.example.com · updated Nov 13, 2026 · Public profile");
    // Hidden sections stay hidden; the user's `hidden` choices are applied.
    const hidden = await mergeLive(store, PID, { ...moved, sections: moved.sections.map((s) => (s.id === id ? { ...s, visible: false } : s)), integrations: [{ ...moved.integrations![0]!, hidden: ["stats#m"] }] }, {}, deps);
    expect(hidden.portfolio.sections[1]).toMatchObject({ visible: false });
    expect(hidden.portfolio.sections[1]!.items).toHaveLength(1);
  });

  it("never trusts provenance stored in the document", async () => {
    const { store, deps, row, doc } = await setup();
    const forged: Portfolio = { ...doc, sections: doc.sections.map((s) => (s.sync ? { ...s, sync: { ...s.sync, verified: true }, items: [] } : s)) };
    const merged = (await mergeLive(store, PID, forged, {}, deps)).portfolio.sections.find((s) => s.sync)!;
    expect(merged.sync!.verified).toBe(false);
    expect(merged.items).toHaveLength(2);
    await store.updateSnapshot(row.id, { verified: true });
    expect((await mergeLive(store, PID, forged, {}, deps)).portfolio.sections.find((s) => s.sync)!.sync!.verified).toBe(true);
  });

  it("drops synced sections once the account is disconnected", async () => {
    const { store, deps, row, doc } = await setup();
    expect(await store.deleteSnapshot("someone-else", row.id)).toBe(false);
    expect(await store.deleteSnapshot(PID, row.id)).toBe(true);
    const { portfolio } = await mergeLive(store, PID, doc, {}, deps);
    expect(portfolio.sections.some((s) => s.sync)).toBe(false);
    expect(portfolio.sections).toHaveLength(doc.sections.length - 1);
  });

  it("keeps stored content but claims nothing when snapshots cannot be read or the feature is off", async () => {
    const { store, deps, doc } = await setup();
    const verified: Portfolio = { ...doc, sections: doc.sections.map((s) => (s.sync ? { ...s, sync: { ...s.sync, verified: true } } : s)) };
    const broken = Object.assign(Object.create(Object.getPrototypeOf(store)), store, { listSnapshots: async () => null }) as LocalStore;
    for (const run of [() => mergeLive(broken, PID, verified, {}, deps), () => (delete process.env.FEATURE_INTEGRATIONS, mergeLive(store, PID, verified, {}, deps))]) {
      const s = (await run()).portfolio.sections.find((x) => x.sync)!;
      expect(s.items).toHaveLength(2);
      expect(s.sync).toMatchObject({ verified: false, live: false });
    }
    expect(mergeSynced(base(), null).sections).toEqual(base().sections);
  });

  it("freezes provenance in exports", async () => {
    const { store, deps, doc } = await setup();
    const { portfolio } = await mergeLive(store, PID, doc, { live: false }, deps);
    expect(JSON.stringify(viewPortfolio(portfolio))).toContain("From fake.example.com · as of Nov 13, 2026 · Public profile");
  });

  it("reports snapshots older than 12 hours as stale, and still serves them", async () => {
    const { store, p, row, doc } = await setup();
    const later = { find: () => p, now: () => Date.parse(row.fetchedAt) + REFRESH_AFTER_MS + 1 };
    const { portfolio, stale } = await mergeLive(store, PID, doc, {}, later);
    expect(stale.map((r) => r.id)).toEqual([row.id]);
    expect(portfolio.sections.find((s) => s.sync)!.items).toHaveLength(2);
  });
});

describe("background refresh", () => {
  it("calls a provider at most once per 6 hours per account, even when it fails", async () => {
    const store = new LocalStore(null);
    const row = (await connect(store, PID, mockProvider, "maya", {}))!;
    const spy = vi.spyOn(mockProvider, "fetch");
    await refreshStale(store, [row]);
    await refreshStale(store, [row]);
    await refreshStale(store, [row, row]);
    expect(spy).toHaveBeenCalledTimes(1);
    const down = (await store.upsertSnapshot({ ...row, account: "down" }))!;
    await refreshStale(store, [down]);
    await refreshStale(store, [down]);
    expect(spy).toHaveBeenCalledTimes(2);
    expect((await store.listSnapshots(PID))!.find((r) => r.account === "down")).toMatchObject({ status: "stale", data: row.data });
    process.env.INTEGRATION_MOCK_DISABLED = "1";
    await refreshStale(store, [(await store.upsertSnapshot({ ...row, account: "other" }))!]);
    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });
});

describe("supabase store without the migration", () => {
  const missing = { data: null, error: { code: "42P01", message: 'relation "public.integration_snapshots" does not exist' } };
  const chain = (result: unknown) => {
    const q: Record<string, unknown> = { then: (ok: (v: unknown) => unknown) => Promise.resolve(result).then(ok) };
    for (const m of ["select", "eq", "upsert", "update", "delete", "single", "maybeSingle"]) q[m] = () => q;
    return q;
  };
  const client = (result: unknown) => ({ from: () => chain(result) }) as unknown as SupabaseClient;

  it("recognises a missing table however it is reported", () => {
    expect(isMissingTable(missing.error)).toBe(true);
    expect(isMissingTable({ code: "PGRST205", message: "Could not find the table 'public.integration_snapshots' in the schema cache" })).toBe(true);
    expect(isMissingTable({ code: "23505", message: "duplicate key" })).toBe(false);
    expect(isMissingTable(null)).toBe(false);
  });

  it("acts as if integrations were disabled, and says so once", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const store = new SupabaseStore(async () => client(missing), () => client(missing));
    expect(await store.listSnapshots(PID)).toBeNull();
    expect(await store.upsertSnapshot({ portfolioId: PID, provider: "mock", account: "a", data: {}, fetchedAt: "", status: "ok", error: null, verified: false, verifyCode: null })).toBeNull();
    expect(await store.updateSnapshot("x", { verified: true })).toBeNull();
    expect(await store.deleteSnapshot(PID, "x")).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    // The published document is served exactly as stored.
    const doc = base();
    expect((await mergeLive(store, PID, doc)).portfolio).toBe(doc);
    warn.mockRestore();
  });

  it("still surfaces other database errors, and maps rows", async () => {
    const bad = new SupabaseStore(async () => client({}), () => client({ data: null, error: { code: "57014", message: "timeout" } }));
    await expect(bad.listSnapshots(PID)).rejects.toThrow("timeout");
    const ok = new SupabaseStore(async () => client({}), () => client({ data: [{ id: "1", portfolio_id: PID, provider: "mock", account: "a", data: { n: 1 }, fetched_at: "t", status: "stale", error: "e", verified: true, verify_code: null }], error: null }));
    expect(await ok.listSnapshots(PID)).toEqual([{ id: "1", portfolioId: PID, provider: "mock", account: "a", data: { n: 1 }, fetchedAt: "t", status: "stale", error: "e", verified: true, verifyCode: null }]);
  });
});

describe("provider HTTP helper", () => {
  const signal = () => new AbortController().signal;
  const respond = (status: number, body = "{}") => vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status })));

  it("identifies itself, never caches and parses JSON", async () => {
    respond(200, '{"a":1}');
    expect(await providerJson("https://api.example.com/x", { signal: signal() })).toEqual({ a: 1 });
    const [, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(init.headers["user-agent"]).toMatch(/^Persona\/1\.0 \(\+https?:\/\/.+\)$/);
    expect(init.cache).toBe("no-store");
  });

  it("refuses plain http and maps failures without retrying", async () => {
    await expect(providerFetch("http://api.example.com", { signal: signal() })).rejects.toMatchObject({ kind: "upstream" });
    for (const [status, kind] of [[404, "not_found"], [429, "rate_limited"], [503, "upstream"]] as const) {
      respond(status);
      await expect(providerJson("https://api.example.com/x", { signal: signal() })).rejects.toMatchObject({ kind });
      expect(fetch).toHaveBeenCalledTimes(1);
    }
    respond(403);
    await expect(providerJson("https://api.example.com/x", { signal: signal() })).rejects.toMatchObject({ kind: "upstream" });
    respond(200, "<html>");
    await expect(providerJson("https://api.example.com/x", { signal: signal() })).rejects.toThrow(/not JSON/);
    vi.stubGlobal("fetch", vi.fn(async () => { throw Object.assign(new Error("t"), { name: "TimeoutError" }); }));
    await expect(providerJson("https://api.example.com/x", { signal: signal() })).rejects.toThrow(/too long/);
  });

  it("caps the response size", async () => {
    respond(200, "x".repeat(5000));
    await expect(providerFetch("https://api.example.com/x", { signal: signal(), maxBytes: 1000 })).rejects.toThrow(/too large/);
  });
});
