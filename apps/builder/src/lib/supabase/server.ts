import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "../env";

/** Cookie-bound client: runs as the signed-in user, so Row Level Security applies. */
export async function userClient(): Promise<SupabaseClient> {
  const jar = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) jar.set(name, value, options);
        } catch {
          /* Server Components cannot set cookies; the middleware refreshes sessions. */
        }
      },
    },
  });
}

let admin: SupabaseClient | null = null;
/** Service-role client: bypasses RLS. Server only — never import this from client code. */
export function adminClient(): SupabaseClient {
  if (!env.supabaseServiceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  admin ??= createClient(env.supabaseUrl, env.supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}
