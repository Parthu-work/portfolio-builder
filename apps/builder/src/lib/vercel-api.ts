/**
 * PHASE 2 SCAFFOLD (feature-flagged off): deployment without GitHub through
 * the Vercel REST API. Given an OAuth access token for the USER's Vercel
 * account, this uploads the runtime files inline and creates a deployment in
 * THEIR account. Nothing calls this yet — see app/api/deploy/vercel.
 */
import type { Portfolio } from "@runtime/schema/portfolio";
import type { RuntimeFiles } from "./zip";

export type VercelDeployment = { id: string; url: string; readyState: string };

export function deploymentPayload(files: RuntimeFiles, portfolio: Portfolio, name: string) {
  const data = JSON.stringify(portfolio);
  return {
    name,
    target: "production" as const,
    projectSettings: { framework: "nextjs" as const },
    files: [
      ...Object.entries(files)
        .filter(([path]) => path !== "src/data/portfolio.json")
        .map(([file, content]) => (typeof content === "string" ? { file, data: content } : { file, data: content.base64, encoding: "base64" as const })),
      { file: "src/data/portfolio.json", data },
    ],
  };
}

export async function createVercelDeployment(accessToken: string, payload: ReturnType<typeof deploymentPayload>, teamId?: string): Promise<VercelDeployment> {
  const res = await fetch(`https://api.vercel.com/v13/deployments${teamId ? `?teamId=${encodeURIComponent(teamId)}` : ""}`, {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Vercel API responded ${res.status}`);
  return (await res.json()) as VercelDeployment;
}
