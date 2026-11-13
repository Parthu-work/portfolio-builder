import "server-only";
import { SectionSchema, type IntegrationConfig, type Portfolio, type Section, type Sync } from "@runtime/schema/portfolio";
import { flags } from "../env";
import type { SnapshotRow, Store } from "../store/types";
import { TIMEOUT_MS } from "./http";
import { findProvider, getProvider, serverToken } from "./registry";
import { applyHidden, mergeSynced, stamp } from "./sections";
import { ProviderError, type ConnectionInfo, type HighlightSource, type Provider, type ProviderData } from "./types";

/** Snapshots older than this are refreshed in the background the next time a site reads them. */
export const REFRESH_AFTER_MS = 12 * 60 * 60 * 1000;
/** Hard floor between two automatic calls to a provider for the same account. */
export const MIN_INTERVAL_S = 6 * 60 * 60;
/** A person can ask for a refresh this often. */
export const MANUAL_INTERVAL_S = 10 * 60;
export const MAX_INTEGRATIONS = 12;
const MAX_DATA_BYTES = 512 * 1024;

export type Deps = { find: (id: string) => Provider | null; now: () => number };
const DEPS: Deps = { find: findProvider, now: () => Date.now() };

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export function syncOf(provider: Provider, row: SnapshotRow, live = true): Sync {
  return {
    provider: provider.id,
    account: row.account,
    syncedAt: row.fetchedAt,
    verified: row.verified,
    source: provider.aggregate ? "your connected accounts" : host(provider.homepage),
    ...(provider.official ? {} : { experimental: true }),
    ...(provider.unverifiedNote ? { note: provider.unverifiedNote } : {}),
    ...(live ? {} : { live: false }),
  };
}

export function defaultConfig(provider: Provider, row: Pick<SnapshotRow, "id" | "account">): IntegrationConfig {
  return { id: row.id, provider: provider.id, account: row.account, options: Object.fromEntries((provider.options ?? []).map((o) => [o.key, o.default])), hidden: [] };
}

/** Every snapshot of a portfolio: aggregators read their siblings from it. */
export type Siblings = { rows: SnapshotRow[]; find: (id: string) => Provider | null };

/** What the other connected accounts offer an aggregator, with the provenance each item will carry. */
export function highlightSources(siblings: Siblings | undefined): HighlightSource[] {
  if (!siblings) return [];
  return siblings.rows.flatMap((row) => {
    const provider = siblings.find(row.provider);
    if (!provider?.highlights || provider.aggregate || row.data === null || row.data === undefined) return [];
    let highlights;
    try {
      highlights = provider.highlights(row.data as ProviderData);
    } catch {
      return [];
    }
    const sync = syncOf(provider, row);
    return highlights.length ? [{ provider: provider.id, name: provider.name, source: sync.source ?? provider.id, account: row.account, verified: row.verified, ...(provider.unverifiedNote ? { note: provider.unverifiedNote } : {}), fetchedAt: row.fetchedAt, highlights }] : [];
  });
}

/** Runs a provider's mapping defensively: a bug or odd data in one provider can never break a page. */
function mapSections(provider: Provider, row: SnapshotRow, cfg: IntegrationConfig, live: boolean, siblings?: Siblings): Section[] {
  if (row.data === null || row.data === undefined) return [];
  let raw: Section[];
  let stampRow = row;
  try {
    if (provider.aggregate) {
      const sources = highlightSources(siblings);
      const newest = sources.map((x) => x.fetchedAt).sort().at(-1);
      if (newest) stampRow = { ...row, fetchedAt: newest };
      raw = provider.aggregate(sources, cfg);
    } else raw = provider.toSections(row.data as ProviderData, cfg);
  } catch {
    return [];
  }
  const valid: Section[] = [];
  for (const s of raw) {
    if (!s.id.startsWith(`${cfg.id}_`)) continue;
    const parsed = SectionSchema.safeParse(s);
    if (parsed.success) valid.push(parsed.data);
  }
  return stamp(valid, syncOf(provider, stampRow, live));
}

/** The sections an account contributes, after the user's choices. */
export function sectionsFor(provider: Provider, row: SnapshotRow, cfg: IntegrationConfig, live = true, siblings?: Siblings): Section[] {
  return applyHidden(mapSections(provider, row, cfg, live, siblings), cfg);
}

export function connectionInfo(provider: Provider, row: SnapshotRow, cfg?: IntegrationConfig, siblings?: Siblings): ConnectionInfo {
  return {
    id: row.id,
    provider: row.provider,
    account: row.account,
    fetchedAt: row.fetchedAt,
    status: row.status,
    error: row.error,
    verified: row.verified,
    verifyCode: row.verified ? null : row.verifyCode,
    available: mapSections(provider, row, { ...(cfg ?? defaultConfig(provider, row)), id: row.id, hidden: [] }, true, siblings),
  };
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newVerifyCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `persona-${[...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("")}`;
}

async function callProvider(provider: Provider, account: string, options: Record<string, unknown>): Promise<ProviderData> {
  const data = await provider.fetch(account, options, { token: serverToken(provider.id), signal: AbortSignal.timeout(TIMEOUT_MS * 3) });
  if (JSON.stringify(data).length > MAX_DATA_BYTES) throw new ProviderError("upstream", "The provider returned more data than we can store.");
  return data;
}

export const describeError = (e: unknown): string => (e instanceof ProviderError ? e.message : "Something went wrong while reading the provider.");

/** True when the user signed in with this provider as the account the data belongs to. */
export function ownedViaSignIn(provider: Provider, data: unknown, linked: string[] = []): boolean {
  if (!provider.ownerId || data === null || data === undefined) return false;
  try {
    const id = provider.ownerId(data as ProviderData);
    return Boolean(id) && linked.includes(`${provider.id}:${id}`);
  } catch {
    return false;
  }
}

/** First fetch for an account. Throws ProviderError when the provider cannot be read: nothing is stored then. */
export async function connect(store: Store, portfolioId: string, provider: Provider, account: string, options: Record<string, unknown>, now = Date.now(), linked: string[] = []): Promise<SnapshotRow | null> {
  if (!provider.accountPattern.test(account)) throw new ProviderError("not_found", `That does not look like a ${provider.name} ${provider.accountLabel.toLowerCase()}.`);
  const data = await callProvider(provider, account, options);
  const owned = ownedViaSignIn(provider, data, linked);
  return store.upsertSnapshot({
    portfolioId,
    provider: provider.id,
    account,
    data,
    fetchedAt: new Date(now).toISOString(),
    status: "ok",
    error: null,
    verified: owned,
    verifyCode: !owned && provider.verify?.method === "bio-code" ? newVerifyCode() : null,
  });
}

/**
 * Re-reads an account. On failure the last good data stays in place and keeps
 * its original "as of" time; only the status and error change.
 */
export async function refresh(store: Store, provider: Provider, row: SnapshotRow, options: Record<string, unknown> = {}, now = Date.now()): Promise<SnapshotRow | null> {
  try {
    const data = await callProvider(provider, row.account, options);
    return await store.updateSnapshot(row.id, { data, fetchedAt: new Date(now).toISOString(), status: "ok", error: null });
  } catch (e) {
    const hasData = row.data !== null && row.data !== undefined;
    return store.updateSnapshot(row.id, { status: hasData ? "stale" : "error", error: describeError(e).slice(0, 300) });
  }
}

export type Merged = { portfolio: Portfolio; stale: SnapshotRow[] };

/**
 * Swaps the content of every synced section for the latest snapshot.
 * With the feature off, storage unavailable or nothing synced, the document
 * comes back as it was (minus any claim of being live or verified).
 */
export async function mergeLive(store: Store, portfolioId: string, doc: Portfolio, opts: { live?: boolean } = {}, deps: Deps = DEPS): Promise<Merged> {
  if (!doc.sections.some((s) => s.sync)) return { portfolio: doc, stale: [] };
  const rows = flags.integrations ? await store.listSnapshots(portfolioId).catch(() => null) : null;
  if (!rows) return { portfolio: mergeSynced(doc, null), stale: [] };
  const generated: Section[] = [];
  const stale: SnapshotRow[] = [];
  for (const row of rows) {
    const provider = deps.find(row.provider);
    if (!provider) continue;
    const cfg = doc.integrations?.find((c) => c.id === row.id) ?? defaultConfig(provider, row);
    generated.push(...sectionsFor(provider, row, { ...cfg, id: row.id, provider: row.provider, account: row.account }, opts.live !== false, { rows, find: deps.find }));
    if (deps.now() - Date.parse(row.fetchedAt) > REFRESH_AFTER_MS) stale.push(row);
  }
  return { portfolio: mergeSynced(doc, generated), stale };
}

/**
 * Background refresh of stale snapshots (run inside `after()`). The shared
 * token bucket guarantees at most one automatic provider call per account
 * every 6 hours, across all server instances; a failed call consumes the
 * token too, which is the back-off.
 */
export async function refreshStale(store: Store, rows: SnapshotRow[], doc: Portfolio | null = null): Promise<void> {
  for (const row of rows) {
    try {
      const provider = getProvider(row.provider);
      if (!provider) continue;
      if (!(await store.takeToken(`int-auto:${row.portfolioId}:${row.provider}:${row.account}`, 1, 1 / MIN_INTERVAL_S))) continue;
      await refresh(store, provider, row, doc?.integrations?.find((c) => c.id === row.id)?.options ?? {});
    } catch {
      /* never let a background refresh surface */
    }
  }
}
