import { z } from "zod";
import { HttpError, json, route } from "@/lib/api";
import { LOCAL_COOKIE, signLocalSession } from "@/lib/auth";
import { backendMode } from "@/lib/env";
import { getStore } from "@/lib/store";

const Body = z.object({ email: z.string().trim().toLowerCase().email().max(200) });

/** LOCAL MODE ONLY (no Supabase configured): passwordless dev sign-in. Returns 404 in production setups. */
export const POST = route({ auth: "public", body: Body, rate: { name: "local-auth", capacity: 20, perMinute: 20 } }, async ({ body, audit, event }) => {
  if (backendMode() !== "local") throw new HttpError(404, "Not found");
  const token = await signLocalSession(body.email);
  const user = JSON.parse(Buffer.from(token.split(".")[0]!, "base64url").toString("utf8")) as { id: string; email: string; name: string };
  const { created } = await getStore().ensureProfile(user);
  await audit({ action: created ? "auth.signup" : "auth.login", entityType: "user", entityId: user.id, actorUserId: user.id, before: null, after: { method: "local" } });
  await event(created ? "signup" : "login", { props: { method: "local" } });
  const res = json({ ok: true });
  res.cookies.set(LOCAL_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" && process.env.LOCAL_MODE !== "1", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return res;
});
