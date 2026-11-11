/**
 * Builds the Vercel Deploy Button URL. The user signs in to THEIR OWN Vercel
 * account, Vercel clones apps/runtime into THEIR OWN GitHub repo and deploys
 * it — the builder never deploys anything into its own account.
 */
export type DeployUrlInput = {
  /** Public repo that contains apps/runtime, e.g. https://github.com/acme/persona */
  repoUrl: string;
  branch?: string;
  slug: string;
  portfolioId: string;
  builderUrl: string;
};

export class DeployConfigError extends Error {}

export function buildDeployUrl({ repoUrl, branch = "main", slug, portfolioId, builderUrl }: DeployUrlInput): string {
  const repo = repoUrl.replace(/\/+$/, "").replace(/\.git$/, "");
  if (!/^https:\/\/(github|gitlab|bitbucket)\.(com|org)\/[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw new DeployConfigError("RUNTIME_REPO_URL must be a public https Git repository URL, e.g. https://github.com/you/portfolio-builder");
  }
  if (!/^https?:\/\//.test(builderUrl)) throw new DeployConfigError("NEXT_PUBLIC_SITE_URL must be an absolute URL");
  if (!/^[\w./-]+$/.test(branch)) throw new DeployConfigError("Invalid branch name");
  const name = `${slug}-portfolio`.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 52);
  const params = new URLSearchParams({
    "repository-url": `${repo}/tree/${branch}/apps/runtime`,
    "project-name": name,
    "repository-name": name,
    env: "PORTFOLIO_ID,BUILDER_URL",
    envDefaults: JSON.stringify({ PORTFOLIO_ID: portfolioId, BUILDER_URL: builderUrl.replace(/\/+$/, "") }),
    envDescription: "Pre-filled by Persona. They tell your site which portfolio to show — just click Deploy.",
    envLink: `${builderUrl.replace(/\/+$/, "")}/privacy#deploy-ping`,
  });
  return `https://vercel.com/new/clone?${params.toString()}`;
}
