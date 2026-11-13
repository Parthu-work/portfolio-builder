import { json, route } from "@/lib/api";
import { ChoicesSchema, configFor, ownConnection } from "@/lib/integrations/api";
import { connectionInfo, sectionsFor } from "@/lib/integrations/service";

type P = { id: string; integrationId: string };

/** What an account contributes under the given choices, from the stored snapshot. Never calls the provider. */
export const POST = route<typeof ChoicesSchema, P>({ auth: "user", body: ChoicesSchema, rate: { name: "int-preview", capacity: 60, perMinute: 60 } }, async ({ store, user, body }, { id, integrationId }) => {
  const { portfolio, row, provider } = await ownConnection(store, user!.id, id, integrationId);
  const config = configFor(provider, row, portfolio, body);
  return json({ config, connection: connectionInfo(provider, row, config), sections: sectionsFor(provider, row, config) });
});
