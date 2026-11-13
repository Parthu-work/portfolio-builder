import { z } from "zod";
import { HttpError, json, route } from "@/lib/api";
import { flags } from "@/lib/env";
import { ChoicesSchema, configFor, ownPortfolio, requireEnabled, toHttp, unavailable } from "@/lib/integrations/api";
import { findProvider, getProvider, listProviders, providerInfo } from "@/lib/integrations/registry";
import { connect, connectionInfo, MAX_INTEGRATIONS, sectionsFor } from "@/lib/integrations/service";

type P = { id: string };

/** Providers on offer and the accounts connected to this portfolio. `enabled: false` means the editor hides the panel. */
export const GET = route<undefined, P>({ auth: "user" }, async ({ store, user }, { id }) => {
  const portfolio = await ownPortfolio(store, user!.id, id);
  const rows = flags.integrations ? await store.listSnapshots(portfolio.id) : null;
  if (!rows) return json({ enabled: false, providers: [], connections: [] });
  const connections = rows.flatMap((row) => {
    const provider = findProvider(row.provider);
    return provider ? [connectionInfo(provider, row, configFor(provider, row, portfolio))] : [];
  });
  return json({ enabled: true, providers: listProviders().map(providerInfo), connections });
});

const ConnectSchema = ChoicesSchema.extend({ provider: z.string().min(1).max(40), account: z.string().trim().min(1).max(120) });

/** Connect: validates the handle, fetches once, stores the snapshot and returns what would appear. */
export const POST = route<typeof ConnectSchema, P>({ auth: "user", body: ConnectSchema, rate: { name: "int-connect", capacity: 10, perMinute: 6 } }, async ({ store, user, body, audit }, { id }) => {
  requireEnabled();
  const portfolio = await ownPortfolio(store, user!.id, id);
  const provider = getProvider(body.provider);
  if (!provider) throw new HttpError(404, "Unknown provider.");
  if (!provider.accountPattern.test(body.account)) throw new HttpError(422, `That does not look like a ${provider.name} ${provider.accountLabel.toLowerCase()}.`);
  const existing = await store.listSnapshots(portfolio.id);
  if (!existing) throw unavailable();
  if (existing.some((r) => r.provider === provider.id && r.account === body.account)) throw new HttpError(409, "This account is already connected.");
  if (existing.length >= MAX_INTEGRATIONS) throw new HttpError(422, `You can connect up to ${MAX_INTEGRATIONS} accounts.`);
  // One connect attempt per account per minute, whoever asks: handles cannot be used to hammer a provider.
  if (!(await store.takeToken(`int-connect:${provider.id}:${body.account}`, 2, 1 / 60))) throw new HttpError(429, "Please wait a minute before trying this account again.");
  const row = await connect(store, portfolio.id, provider, body.account, body.options ?? {}).catch(toHttp);
  if (!row) throw unavailable();
  const config = configFor(provider, row, portfolio, body);
  await audit({ action: "integration.connect", entityType: "portfolio", entityId: portfolio.id, before: null, after: { provider: provider.id, account: row.account } });
  return json({ config, connection: connectionInfo(provider, row, config), sections: sectionsFor(provider, row, config) }, { status: 201 });
});
