import { json, route } from "@/lib/api";
import { LOCAL_COOKIE } from "@/lib/auth";
import { backendMode } from "@/lib/env";
import { userClient } from "@/lib/supabase/server";

export const POST = route({ auth: "public" }, async ({ user, audit }) => {
  if (user) await audit({ action: "auth.logout", entityType: "user", entityId: user.id, before: null, after: null });
  if (backendMode() === "supabase") await (await userClient()).auth.signOut();
  const res = json({ ok: true });
  res.cookies.delete(LOCAL_COOKIE);
  return res;
});
