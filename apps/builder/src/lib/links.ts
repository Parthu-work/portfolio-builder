/** Collects every external URL in a portfolio and checks them server-side (with SSRF guards). */
import type { Portfolio } from "@runtime/schema/portfolio";

const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|0\.0\.0\.0|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?|\[?f[cd][0-9a-f]{2}:|\[?fe80:)/i;

export function isPublicHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (u.username || u.password) return false;
    if (PRIVATE_HOST.test(u.hostname) || /^\d+$/.test(u.hostname) || !u.hostname.includes(".")) return false;
    if (u.port && !["80", "443", "8080", "8443"].includes(u.port)) return false;
    return true;
  } catch {
    return false;
  }
}

export type LinkResult = { url: string; ok: boolean; status: number | null; reason?: string };

export async function checkLink(url: string, fetcher: typeof fetch = fetch): Promise<LinkResult> {
  if (!isPublicHttpUrl(url)) return { url, ok: false, status: null, reason: "Not a public http(s) URL" };
  const attempt = async (method: "HEAD" | "GET") =>
    fetcher(url, {
      method,
      redirect: "manual", // never follow redirects server-side (a redirect could point at an internal host)
      signal: AbortSignal.timeout(6000),
      headers: { "user-agent": "PersonaLinkCheck/1.0", accept: "*/*", ...(method === "GET" ? { range: "bytes=0-0" } : {}) },
    });
  try {
    let res = await attempt("HEAD");
    if (res.status === 405 || res.status === 403 || res.status === 501) res = await attempt("GET");
    // Redirects and auth walls mean the server is alive; only 404/410/5xx are "broken".
    const broken = res.status === 404 || res.status === 410 || res.status >= 500;
    return { url, ok: !broken, status: res.status, ...(broken ? { reason: `HTTP ${res.status}` } : {}) };
  } catch (e) {
    return { url, ok: false, status: null, reason: e instanceof Error && e.name === "TimeoutError" ? "Timed out" : "Unreachable" };
  }
}

export function collectUrls(p: Portfolio): string[] {
  const out = new Set<string>();
  const add = (v: unknown) => {
    if (typeof v === "string" && /^https?:\/\//i.test(v)) out.add(v);
  };
  const visit = (type: string, value: unknown) => {
    if (!value) return;
    if (type === "url" || type === "video") add(value);
    else if (type === "link") add((value as { href?: unknown }).href);
    else if (type === "linklist" && Array.isArray(value)) for (const l of value) add((l as { href?: unknown })?.href);
  };
  for (const s of p.profile.socials) add(s.url);
  for (const section of p.sections) {
    for (const f of section.fields) visit(f.type, f.value);
    for (const item of section.items ?? []) for (const d of section.itemSchema ?? []) visit(d.type, item.values[d.key]);
  }
  return [...out];
}
