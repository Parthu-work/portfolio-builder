import "server-only";
import { backendMode } from "../env";
import { adminClient, userClient } from "../supabase/server";
import { LocalStore } from "./local";
import { SupabaseStore } from "./supabase";
import type { Store } from "./types";

export * from "./types";

const g = globalThis as typeof globalThis & { __personaLocalStore?: LocalStore };

export function getStore(): Store {
  if (backendMode() === "supabase") return new SupabaseStore(userClient, adminClient);
  // One instance per process, surviving hot reloads in dev.
  g.__personaLocalStore ??= new LocalStore();
  return g.__personaLocalStore;
}
