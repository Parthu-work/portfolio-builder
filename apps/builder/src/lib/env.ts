import "server-only";

/** Server-side configuration, read lazily so builds never need secrets. */
export const env = {
  get supabaseUrl() {
    return process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  },
  get supabaseAnonKey() {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  },
  get supabaseServiceKey() {
    return process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  },
  get adminEmails(): string[] {
    return (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  },
  get saltSecret() {
    return process.env.ANALYTICS_SALT_SECRET || "persona-dev-salt-not-for-production";
  },
  get siteUrl() {
    const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "http://localhost:3100";
    return (/^https?:\/\//.test(raw) ? raw : `https://${raw}`).replace(/\/+$/, "");
  },
  get runtimeRepoUrl() {
    return (process.env.RUNTIME_REPO_URL || "").replace(/\/+$/, "").replace(/\.git$/, "");
  },
  get runtimeRepoBranch() {
    return process.env.RUNTIME_REPO_BRANCH || "main";
  },
};

export type BackendMode = "supabase" | "local" | "unconfigured";

/**
 * supabase     — NEXT_PUBLIC_SUPABASE_URL + anon key are set (production).
 * local        — no Supabase: file-backed store + dev login. Only in development,
 *                or in a production build when LOCAL_MODE=1 (e2e tests).
 * unconfigured — production build without Supabase: public pages work, sign-in explains what is missing.
 */
export function backendMode(): BackendMode {
  if (env.supabaseUrl && env.supabaseAnonKey) return "supabase";
  if (process.env.NODE_ENV !== "production" || process.env.LOCAL_MODE === "1") return "local";
  return "unconfigured";
}

export const flags = {
  /** Phase 2 (scaffold only): deploy via the Vercel REST API instead of the Deploy Button. */
  get vercelApiDeploy() {
    return process.env.FEATURE_VERCEL_API_DEPLOY === "1";
  },
};
