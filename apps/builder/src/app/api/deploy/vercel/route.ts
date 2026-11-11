import { HttpError, route } from "@/lib/api";
import { flags } from "@/lib/env";

/**
 * PHASE 2 SCAFFOLD — off by default (FEATURE_VERCEL_API_DEPLOY=1 to enable).
 * Intended flow: Vercel OAuth integration → POST /v13/deployments with the
 * generated files (see lib/vercel-api.ts), for deploying without GitHub.
 * Not implemented: the OAuth token exchange and token storage.
 */
export const POST = route({ auth: "user" }, async () => {
  if (!flags.vercelApiDeploy) throw new HttpError(404, "Not found");
  throw new HttpError(501, "Direct Vercel API deploys are not implemented yet. Use the Deploy button.");
});
