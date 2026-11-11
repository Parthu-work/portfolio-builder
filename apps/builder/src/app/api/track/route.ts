import { deviceFromUa, referrerDomain, sessionHash, TrackBatchSchema } from "@/lib/analytics-core";
import { clientCountry, doNotTrack, json, route } from "@/lib/api";
import { env } from "@/lib/env";

/**
 * First-party, cookie-less analytics. Receives small batches via
 * navigator.sendBeacon. Honors Do-Not-Track / Global Privacy Control, never
 * stores the IP address (only a daily-rotating salted hash).
 */
export const POST = route({ auth: "public", body: TrackBatchSchema, rate: { name: "track", capacity: 40, perMinute: 60 } }, async ({ req, body, store, user, ip }) => {
  if (doNotTrack(req)) return new Response(null, { status: 204 });
  const ua = req.headers.get("user-agent") || "";
  const device = deviceFromUa(ua);
  if (device === "bot") return new Response(null, { status: 204 });
  const hash = await sessionHash(env.saltSecret, ip, ua);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const ts = new Date().toISOString();
  await store.insertEvents(
    body.events.map((e) => ({
      ts,
      type: e.type,
      sessionHash: hash,
      userId: user?.id ?? null,
      portfolioId: e.portfolioId ?? null,
      path: e.path ? e.path.split("?")[0]!.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, ":id") : null,
      referrerDomain: referrerDomain(e.referrer, host),
      country: clientCountry(req),
      device,
      props: e.props ?? {},
    })),
  );
  return json({ ok: true }, { status: 202 });
});
