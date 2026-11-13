import { HttpError, json, route } from "@/lib/api";
import { ChoicesSchema, configFor, ownConnection, unavailable } from "@/lib/integrations/api";
import { getProvider } from "@/lib/integrations/registry";
import { connectionInfo, MANUAL_INTERVAL_S, refresh, sectionsFor } from "@/lib/integrations/service";

type P = { id: string; integrationId: string };

/** Manual refresh, at most once per 10 minutes per account. A failed refresh keeps the last good data. */
export const POST = route<typeof ChoicesSchema, P>({ auth: "user", body: ChoicesSchema, rate: { name: "int-write", capacity: 20, perMinute: 20 } }, async ({ store, user, body }, { id, integrationId }) => {
  const { portfolio, row, provider } = await ownConnection(store, user!.id, id, integrationId);
  if (!getProvider(provider.id)) throw new HttpError(503, `${provider.name} is switched off at the moment.`);
  if (!(await store.takeToken(`int-manual:${portfolio.id}:${row.provider}:${row.account}`, 1, 1 / MANUAL_INTERVAL_S))) {
    throw new HttpError(429, "You can refresh an account once every 10 minutes.");
  }
  const config = configFor(provider, row, portfolio, body);
  const next = await refresh(store, provider, row, config.options);
  if (!next) throw unavailable();
  return json({ config, connection: connectionInfo(provider, next, config), sections: sectionsFor(provider, next, config) });
});
