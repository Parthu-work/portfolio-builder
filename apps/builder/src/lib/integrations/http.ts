import "server-only";
import { env } from "../env";
import { ProviderError } from "./types";

export const TIMEOUT_MS = 8000;
const MAX_BYTES = 2 * 1024 * 1024;

export const userAgent = () => `Persona/1.0 (+${env.siteUrl})`;

type Init = { method?: "GET" | "POST"; headers?: Record<string, string>; body?: string; signal: AbortSignal; maxBytes?: number };

/**
 * The one way providers talk to the outside world: identifies itself, gives
 * up after 8 s, never retries, caps the response size and turns HTTP failures
 * into ProviderErrors. HTTPS only.
 */
export async function providerFetch(url: string, init: Init): Promise<{ status: number; text: string; headers: Headers }> {
  if (!url.startsWith("https://")) throw new ProviderError("upstream", "Refusing a non-HTTPS provider URL");
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? "GET",
      headers: { "user-agent": userAgent(), accept: "application/json", ...init.headers },
      ...(init.body === undefined ? {} : { body: init.body }),
      signal: AbortSignal.any([init.signal, AbortSignal.timeout(TIMEOUT_MS)]),
      redirect: "follow",
      cache: "no-store",
    });
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    throw new ProviderError("upstream", name === "TimeoutError" || name === "AbortError" ? "The provider took too long to answer." : "Could not reach the provider.");
  }
  if (res.status === 404 || res.status === 410) throw new ProviderError("not_found", "No such account.");
  if (res.status === 429) throw new ProviderError("rate_limited", "The provider is rate limiting requests. Try again later.");
  if (res.status >= 500) throw new ProviderError("upstream", `The provider is having trouble (HTTP ${res.status}).`);
  const max = init.maxBytes ?? MAX_BYTES;
  const reader = res.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read().catch(() => {
        throw new ProviderError("upstream", "The provider's answer was cut off.");
      });
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel().catch(() => {});
        throw new ProviderError("upstream", "The provider's answer was too large.");
      }
      chunks.push(value);
    }
  }
  return { status: res.status, text: Buffer.concat(chunks).toString("utf8"), headers: res.headers };
}

/** GET/POST returning parsed JSON. 401/403 mean "not public" unless the caller says otherwise. */
export async function providerJson<T = unknown>(url: string, init: Init): Promise<T> {
  const res = await providerFetch(url, init);
  if (res.status === 401 || res.status === 403) throw new ProviderError("upstream", `The provider refused the request (HTTP ${res.status}).`);
  if (res.status >= 400) throw new ProviderError("upstream", `The provider answered HTTP ${res.status}.`);
  try {
    return JSON.parse(res.text) as T;
  } catch {
    throw new ProviderError("upstream", "The provider answered with something that is not JSON.");
  }
}
