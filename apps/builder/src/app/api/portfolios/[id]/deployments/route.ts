import { HttpError, json, route } from "@/lib/api";
import { buildDeployUrl, DeployConfigError } from "@/lib/deploy";
import { env } from "@/lib/env";

/** Deploy status for the guided screen: the Deploy Button URL plus confirmed deployments (from build pings). */
export const GET = route<undefined, { id: string }>({ auth: "user" }, async ({ store, user }, { id }) => {
  const row = await store.getPortfolio(user!.id, id);
  if (!row) throw new HttpError(404, "Portfolio not found");
  let deployUrl: string | null = null;
  let configError: string | null = null;
  try {
    deployUrl = buildDeployUrl({ repoUrl: env.runtimeRepoUrl, branch: env.runtimeRepoBranch, slug: row.slug, portfolioId: row.id, builderUrl: env.siteUrl });
  } catch (e) {
    configError = e instanceof DeployConfigError ? e.message : "Deploy is not configured";
  }
  return json({
    published: Boolean(row.published),
    publishedAt: row.publishedAt,
    hasUnpublishedChanges: !row.published || JSON.stringify(row.published) !== JSON.stringify(row.draft),
    deployUrl,
    configError,
    deployments: await store.listDeployments(user!.id, id),
  });
});
