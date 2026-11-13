import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hmac, safeEqual, uuidFrom } from "./crypto";
import { backendMode, env } from "./env";
import type { SessionUser } from "./store/types";
import { userClient } from "./supabase/server";

export const LOCAL_COOKIE = "persona_local_session";

const b64 = {
  enc: (s: string) => Buffer.from(s, "utf8").toString("base64url"),
  dec: (s: string) => Buffer.from(s, "base64url").toString("utf8"),
};

/** Local-mode session cookie: `<payload>.<hmac>`; never used when Supabase is configured. */
export async function signLocalSession(email: string): Promise<string> {
  const user: SessionUser = { id: await uuidFrom(`local:${email}`), email, name: email.split("@")[0] ?? email };
  const payload = b64.enc(JSON.stringify(user));
  return `${payload}.${await hmac(env.saltSecret, payload)}`;
}

async function readLocalSession(value: string | undefined): Promise<SessionUser | null> {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!payload || !sig || !safeEqual(sig, await hmac(env.saltSecret, payload))) return null;
  try {
    const u = JSON.parse(b64.dec(payload)) as SessionUser;
    return typeof u.id === "string" && typeof u.email === "string" ? u : null;
  } catch {
    return null;
  }
}

export async function getUser(): Promise<SessionUser | null> {
  const mode = backendMode();
  if (mode === "local") return readLocalSession((await cookies()).get(LOCAL_COOKIE)?.value);
  if (mode !== "supabase") return null;
  const { data } = await (await userClient()).auth.getUser();
  const u = data.user;
  if (!u?.email) return null;
  const meta = u.user_metadata as Record<string, unknown> | undefined;
  const name = [meta?.full_name, meta?.name, meta?.user_name].find((v): v is string => typeof v === "string" && v.length > 0);
  const linked = (u.identities ?? []).flatMap((i) => (i.provider && i.id ? [`${i.provider}:${i.id}`] : []));
  return { id: u.id, email: u.email, name: name ?? u.email.split("@")[0] ?? u.email, ...(linked.length ? { linked } : {}) };
}

/** For pages: redirects to /login when signed out. */
export async function requireUser(next: string): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Admins are defined solely by the ADMIN_EMAILS env var, checked on the server on every request. */
export function isAdmin(user: SessionUser | null): boolean {
  return Boolean(user && env.adminEmails.includes(user.email.toLowerCase()));
}

/** Only same-site relative paths are allowed as post-login destinations. */
export function safeNext(next: string | null | undefined): string {
  return next && /^\/(?!\/)[\w\-./?=&%[\]]*$/.test(next) ? next : "/dashboard";
}
