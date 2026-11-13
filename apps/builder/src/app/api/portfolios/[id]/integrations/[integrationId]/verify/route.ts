import { HttpError, json, route } from "@/lib/api";
import { ChoicesSchema, configFor, ownConnection, toHttp, unavailable } from "@/lib/integrations/api";
import { TIMEOUT_MS } from "@/lib/integrations/http";
import { getProvider, serverToken } from "@/lib/integrations/registry";
import { connectionInfo, newVerifyCode, ownedViaSignIn, sectionsFor } from "@/lib/integrations/service";

type P = { id: string; integrationId: string };

/**
 * "Verify you own this": looks for the account's code on its public profile.
 * Only a successful check ever sets `verified`.
 */
export const POST = route<typeof ChoicesSchema, P>({ auth: "user", body: ChoicesSchema, rate: { name: "int-verify", capacity: 6, perMinute: 6 } }, async ({ store, user, body, audit }, { id, integrationId }) => {
  const { portfolio, row, provider, siblings } = await ownConnection(store, user!.id, id, integrationId);
  const config = configFor(provider, row, portfolio, body);
  if (row.verified) return json({ verified: true, config, connection: connectionInfo(provider, row, config, siblings), sections: sectionsFor(provider, row, config, true, siblings) });
  if (ownedViaSignIn(provider, row.data, user!.linked)) {
    const next = await store.updateSnapshot(row.id, { verified: true, verifyCode: null });
    if (!next) throw unavailable();
    await audit({ action: "integration.verify", entityType: "portfolio", entityId: portfolio.id, before: null, after: { provider: row.provider, account: row.account, via: "sign-in" } });
    return json({ verified: true, config, connection: connectionInfo(provider, next, config, siblings), sections: sectionsFor(provider, next, config, true, siblings) });
  }
  if (!provider.verify || provider.verify.method !== "bio-code") throw new HttpError(422, `${provider.name} accounts cannot be verified this way.`);
  if (!getProvider(provider.id)) throw new HttpError(503, `${provider.name} is switched off at the moment.`);
  let current = row;
  if (!current.verifyCode) {
    const withCode = await store.updateSnapshot(row.id, { verifyCode: newVerifyCode() });
    if (!withCode) throw unavailable();
    return json({ verified: false, message: "Add this code to your profile, then verify again.", config, connection: connectionInfo(provider, withCode, config, siblings), sections: sectionsFor(provider, withCode, config, true, siblings) });
  }
  if (!(await store.takeToken(`int-verify:${portfolio.id}:${row.provider}:${row.account}`, 3, 1 / 60))) throw new HttpError(429, "Please wait a minute before verifying again.");
  const ok = await provider.verify.check(row.account, current.verifyCode, { token: serverToken(provider.id), signal: AbortSignal.timeout(TIMEOUT_MS * 2) }).catch(toHttp);
  if (ok === true) {
    const next = await store.updateSnapshot(row.id, { verified: true, verifyCode: null });
    if (!next) throw unavailable();
    current = next;
    await audit({ action: "integration.verify", entityType: "portfolio", entityId: portfolio.id, before: null, after: { provider: row.provider, account: row.account } });
  }
  return json({
    verified: current.verified,
    ...(current.verified ? {} : { message: `We could not find ${row.verifyCode} on the public ${provider.name} profile yet. Profile changes can take a minute to show.` }),
    config,
    connection: connectionInfo(provider, current, config, siblings),
    sections: sectionsFor(provider, current, config, true, siblings),
  });
});
