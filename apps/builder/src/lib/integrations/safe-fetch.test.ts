import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dns = vi.hoisted(() => ({ answer: [] as { address: string; family: number }[] }));
vi.mock("node:dns", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:dns")>()),
  lookup: (_host: string, _opts: unknown, cb: (err: Error | null, list: unknown) => void) => cb(null, dns.answer),
}));

import { checkUrl, fetchPage, guardedLookup, isPrivateIp, PAGE_MAX_BYTES } from "./safe-fetch";

type Reply = { status: number; location?: string; chunks?: Buffer[] };
function fake(replies: Record<string, Reply | Error>) {
  const seen: string[] = [];
  const request = vi.fn(async (url: URL) => {
    seen.push(url.toString());
    const r = replies[url.toString()];
    if (!r) throw Object.assign(new Error("nope"), { code: "ENOTFOUND" });
    if (r instanceof Error) throw r;
    const chunks = r.chunks ?? [Buffer.from("<p>ok</p>")];
    return { status: r.status, location: r.location ?? null, body: Object.assign((async function* () { yield* chunks; })(), { destroy: vi.fn() }) };
  });
  return { request, seen };
}
const signal = () => new AbortController().signal;

beforeEach(() => {
  vi.resetAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("safe page fetch", () => {
  it("treats every non-public range as private", () => {
    for (const ip of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "::", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "not an ip"]) expect(isPrivateIp(ip), ip).toBe(true);
    for (const ip of ["93.184.216.34", "8.8.8.8", "2606:4700:4700::1111", "172.32.0.1"]) expect(isPrivateIp(ip), ip).toBe(false);
  });

  it("accepts public https URLs on the default port only", () => {
    expect(checkUrl("https://coursera.org/verify/ABC")).not.toBeNull();
    for (const bad of ["http://coursera.org/x", "https://user:pw@coursera.org/", "https://coursera.org:8443/", "https://127.0.0.1/", "https://[::1]/", "https://localhost/", "https://printer.local/", "https://intranet/", "javascript:alert(1)"]) expect(checkUrl(bad), bad).toBeNull();
  });

  it("refuses DNS answers that point inside, even when only one of them does", () => {
    const cb = vi.fn();
    dns.answer = [{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.5", family: 4 }];
    guardedLookup("evil.example", {}, cb);
    expect(cb.mock.calls[0]![0]).toMatchObject({ code: "EBLOCKED" });
    dns.answer = [{ address: "93.184.216.34", family: 4 }];
    guardedLookup("ok.example", {}, cb);
    expect(cb.mock.calls[1]).toEqual([null, "93.184.216.34", 4]);
  });

  it("follows at most three https redirects, re-checking each", async () => {
    const { request, seen } = fake({
      "https://a.example/": { status: 301, location: "/b" },
      "https://a.example/b": { status: 302, location: "https://c.example/" },
      "https://c.example/": { status: 200, chunks: [Buffer.from("<h1>Maya</h1>")] },
    });
    expect(await fetchPage("https://a.example/", { signal: signal(), request })).toEqual({ ok: true, status: 200, url: "https://c.example/", text: "<h1>Maya</h1>" });
    expect(seen).toHaveLength(3);
    const loop = fake(Object.fromEntries([0, 1, 2, 3, 4].map((i) => [`https://l.example/${i}`, { status: 302, location: `/${i + 1}` }])));
    expect(await fetchPage("https://l.example/0", { signal: signal(), request: loop.request })).toEqual({ ok: false, reason: "Too many redirects" });
    const down = fake({ "https://a.example/": { status: 302, location: "http://a.example/" } });
    expect(await fetchPage("https://a.example/", { signal: signal(), request: down.request })).toEqual({ ok: false, reason: "Redirects somewhere we will not follow" });
    const inward = fake({ "https://a.example/": { status: 302, location: "https://127.0.0.1/admin" } });
    expect((await fetchPage("https://a.example/", { signal: signal(), request: inward.request })).ok).toBe(false);
    expect(inward.seen).toEqual(["https://a.example/"]);
  });

  it("reads at most 1 MB and reports failures plainly", async () => {
    const big = fake({ "https://a.example/": { status: 200, chunks: [Buffer.alloc(PAGE_MAX_BYTES - 10, 97), Buffer.alloc(100, 98)] } });
    const page = await fetchPage("https://a.example/", { signal: signal(), request: big.request });
    expect(page.ok && page.text.length).toBe(PAGE_MAX_BYTES);
    expect(await fetchPage("https://a.example/", { signal: signal(), request: fake({ "https://a.example/": { status: 404 } }).request })).toEqual({ ok: false, reason: "HTTP 404" });
    expect(await fetchPage("https://a.example/", { signal: signal(), request: fake({ "https://a.example/": Object.assign(new Error("x"), { code: "EBLOCKED" }) }).request })).toEqual({ ok: false, reason: "Points at a private network address" });
    expect(await fetchPage("http://a.example/", { signal: signal(), request: fake({}).request })).toEqual({ ok: false, reason: "Not a public https link" });
  });
});
