import { json, route } from "@/lib/api";
import { ownConnection, unavailable } from "@/lib/integrations/api";

type P = { id: string; integrationId: string };

/** Disconnect: deletes the snapshot. The editor removes the synced sections from the draft. */
export const DELETE = route<undefined, P>({ auth: "user", rate: { name: "int-write", capacity: 20, perMinute: 20 } }, async ({ store, user, audit }, { id, integrationId }) => {
  const { portfolio, row } = await ownConnection(store, user!.id, id, integrationId);
  if ((await store.deleteSnapshot(portfolio.id, row.id)) === null) throw unavailable();
  await audit({ action: "integration.disconnect", entityType: "portfolio", entityId: portfolio.id, before: { provider: row.provider, account: row.account }, after: null });
  return json({ ok: true });
});
