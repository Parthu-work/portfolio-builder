import "server-only";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import https from "node:https";
import net from "node:net";
import { userAgent } from "./http";

/**
 * Fetches a page someone else named (a proof link) without letting it reach
 * our own network: HTTPS on port 443 only, no credentials in the URL, at most
 * 3 redirects (each re-checked), 8 s in total, 1 MB read at most. Every
 * address is checked when the connection is made, so DNS that changes
 * between a check and the request (rebinding) cannot slip through.
 */

export const PAGE_TIMEOUT_MS = 8000;
export const PAGE_MAX_BYTES = 1024 * 1024;
const MAX_REDIRECTS = 3;

/** Loopback, private, link-local, CGNAT, multicast, documentation and other non-public ranges. */
export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b, c] = ip.split(".").map(Number) as [number, number, number, number];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113) ||
      a >= 224
    );
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase().replace(/^\[|\]$/g, "");
    if (v === "::" || v === "::1") return true;
    const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(v);
    if (mapped) return isPrivateIp(mapped[1]!);
    return /^(?:::ffff:|64:ff9b:|100::|2001:db8:|2001:0?:|fc|fd|fe[89ab]|ff)/.test(v);
  }
  return true;
}

class BlockedError extends Error {
  code = "EBLOCKED";
}

/** A dns.lookup that refuses non-public answers. */
export function guardedLookup(hostname: string, options: { all?: boolean; family?: number }, callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void): void {
  dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "");
    const list = addresses as LookupAddress[];
    if (!list.length || list.some((a) => isPrivateIp(a.address))) return callback(new BlockedError(`Refusing a non-public address for ${hostname}`), "");
    if (options.all) callback(null, list);
    else callback(null, list[0]!.address, list[0]!.family);
  });
}

export type Page = { ok: true; status: number; url: string; text: string } | { ok: false; reason: string };

export function checkUrl(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" || u.username || u.password || (u.port && u.port !== "443")) return null;
    const host = u.hostname.replace(/^\[|\]$/g, "");
    if (net.isIP(host) ? isPrivateIp(host) : !host.includes(".") || /\.(local|internal|localhost)$/i.test(host) || host === "localhost") return null;
    return u;
  } catch {
    return null;
  }
}

type Requester = (url: URL, signal: AbortSignal) => Promise<{ status: number; location: string | null; body: AsyncIterable<Buffer> & { destroy(): void } }>;

const nodeRequest: Requester = (url, signal) =>
  new Promise((resolve, reject) => {
    const req = https.request(
      url,
      { method: "GET", lookup: guardedLookup as never, signal, headers: { "user-agent": userAgent(), accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5", "accept-encoding": "identity" } },
      (res) => resolve({ status: res.statusCode ?? 0, location: typeof res.headers.location === "string" ? res.headers.location : null, body: res }),
    );
    req.on("error", reject);
    req.end();
  });

export async function fetchPage(raw: string, opts: { signal: AbortSignal; request?: Requester }): Promise<Page> {
  const signal = AbortSignal.any([opts.signal, AbortSignal.timeout(PAGE_TIMEOUT_MS)]);
  const request = opts.request ?? nodeRequest;
  let url = checkUrl(raw);
  for (let hop = 0; url; hop++) {
    let res;
    try {
      res = await request(url, signal);
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      return { ok: false, reason: err.code === "EBLOCKED" ? "Points at a private network address" : err.name === "TimeoutError" || err.name === "AbortError" ? "Timed out" : "Unreachable" };
    }
    if (res.status >= 300 && res.status < 400 && res.location) {
      res.body.destroy();
      if (hop >= MAX_REDIRECTS) return { ok: false, reason: "Too many redirects" };
      let next: URL | null = null;
      try {
        next = checkUrl(new URL(res.location, url).toString());
      } catch {
        next = null;
      }
      if (!next) return { ok: false, reason: "Redirects somewhere we will not follow" };
      url = next;
      continue;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    try {
      for await (const chunk of res.body) {
        const left = PAGE_MAX_BYTES - size;
        chunks.push(chunk.length > left ? chunk.subarray(0, left) : chunk);
        size += Math.min(chunk.length, left);
        if (size >= PAGE_MAX_BYTES) {
          res.body.destroy();
          break;
        }
      }
    } catch {
      return { ok: false, reason: "The page was cut off" };
    }
    if (res.status >= 400) return { ok: false, reason: `HTTP ${res.status}` };
    return { ok: true, status: res.status, url: url.toString(), text: Buffer.concat(chunks).toString("utf8") };
  }
  return { ok: false, reason: "Not a public https link" };
}
