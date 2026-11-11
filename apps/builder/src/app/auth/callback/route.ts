import { NextResponse, type NextRequest } from "next/server";
import { deviceFromUa, ipHash, sessionHash } from "@/lib/analytics-core";
import { clientCountry, clientIp, doNotTrack, log } from "@/lib/api";
import { getUser, safeNext } from "@/lib/auth";
import { backendMode, env } from "@/lib/env";
import { getStore } from "@/lib/store";
import { userClient } from "@/lib/supabase/server";

/** OAuth / magic-link landing: exchanges the code for a session, then records signup vs login. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  if (backendMode() !== "supabase" || !code) return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  const supabase = await userClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    log("warn", "auth callback failed", { error: error.message });
    return NextResponse.redirect(new URL("/login?error=auth", url.origin));
  }
  try {
    const user = await getUser();
    if (user) {
      const store = getStore();
      const { created } = await store.ensureProfile(user);
      const ip = clientIp(req);
      const ua = req.headers.get("user-agent") || "";
      await store.insertAudit({ actorUserId: user.id, action: created ? "auth.signup" : "auth.login", entityType: "user", entityId: user.id, before: null, after: null, ipHash: await ipHash(env.saltSecret, ip) });
      if (!doNotTrack(req)) {
        await store.insertEvents([
          { ts: new Date().toISOString(), type: created ? "signup" : "login", sessionHash: await sessionHash(env.saltSecret, ip, ua), userId: user.id, portfolioId: null, path: "/auth/callback", referrerDomain: null, country: clientCountry(req), device: deviceFromUa(ua), props: {} },
        ]);
      }
    }
  } catch (e) {
    log("error", "post-login bookkeeping failed", { error: String(e) });
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
