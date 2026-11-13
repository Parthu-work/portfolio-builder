import "server-only";
import { z } from "zod";
import { IntegrationConfigSchema, type IntegrationConfig } from "@runtime/schema/portfolio";
import { HttpError } from "../api";
import { flags } from "../env";
import type { PortfolioRow, SnapshotRow, Store } from "../store/types";
import { findProvider } from "./registry";
import { defaultConfig, type Siblings } from "./service";
import { ProviderError, type Provider } from "./types";

const Uuid = z.string().uuid();

/** With the feature off these routes do not exist. */
export function requireEnabled() {
  if (!flags.integrations) throw new HttpError(404, "Not found");
}

export async function ownPortfolio(store: Store, userId: string, id: string): Promise<PortfolioRow> {
  if (!Uuid.safeParse(id).success) throw new HttpError(404, "Portfolio not found");
  const row = await store.getPortfolio(userId, id);
  if (!row) throw new HttpError(404, "Portfolio not found");
  return row;
}

export const unavailable = () => new HttpError(503, "Connected accounts are not available yet. Please try again later.");

/** The caller's portfolio, the snapshot and its provider — or a 404. */
export async function ownConnection(store: Store, userId: string, id: string, integrationId: string): Promise<{ portfolio: PortfolioRow; row: SnapshotRow; provider: Provider; siblings: Siblings }> {
  requireEnabled();
  const portfolio = await ownPortfolio(store, userId, id);
  const rows = await store.listSnapshots(portfolio.id);
  if (!rows) throw unavailable();
  const row = Uuid.safeParse(integrationId).success ? rows.find((r) => r.id === integrationId) : undefined;
  if (!row) throw new HttpError(404, "This account is not connected.");
  const provider = findProvider(row.provider);
  if (!provider) throw new HttpError(404, "This provider is no longer available.");
  return { portfolio, row, provider, siblings: { rows, find: findProvider } };
}

/** The user's choices for a connection: what the request sent, else what the saved draft holds, else defaults. */
export function configFor(provider: Provider, row: SnapshotRow, portfolio: PortfolioRow, sent?: { options?: IntegrationConfig["options"]; hidden?: string[] }): IntegrationConfig {
  const saved = portfolio.draft.integrations?.find((c) => c.id === row.id);
  const base = defaultConfig(provider, row);
  return { ...base, options: { ...base.options, ...saved?.options, ...sent?.options }, hidden: sent?.hidden ?? saved?.hidden ?? [] };
}

export const ChoicesSchema = z.object({
  options: IntegrationConfigSchema.shape.options.optional(),
  hidden: z.array(z.string().max(80)).max(200).optional(),
});

const STATUS: Record<ProviderError["kind"], number> = { not_found: 404, private: 409, rate_limited: 429, upstream: 502, unconfigured: 503 };
export const toHttp = (e: unknown): never => {
  if (e instanceof ProviderError) throw new HttpError(STATUS[e.kind], e.message, { kind: e.kind });
  throw e;
};
