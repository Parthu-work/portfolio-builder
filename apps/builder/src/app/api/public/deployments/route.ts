import { z } from "zod";
import { json, route } from "@/lib/api";

const Host = z
  .string()
  .max(253)
  .transform((v) => v.replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase())
  .refine((v) => /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/.test(v), "Must be a public hostname");

const Body = z.object({
  portfolioId: z.string().uuid(),
  vercelUrl: Host,
  templateId: z.string().regex(/^[a-z0-9-]{1,40}$/),
  runtimeVersion: z.string().regex(/^[\w.+-]{1,24}$/),
});

/**
 * The build ping. A deployed site's build POSTs here once so the owner's
 * status screen can show "live". Stores only: portfolio id, hostname,
 * template id, runtime version. Disclosed in /privacy.
 */
export const POST = route({ auth: "public", body: Body, rate: { name: "deploy-ping", capacity: 10, perMinute: 10 } }, async ({ body, store, audit, event }) => {
  const result = await store.upsertDeployment(body);
  // Same response whether or not the portfolio exists (don't leak valid ids).
  if (result?.firstSeen) {
    await event("deploy_confirmed", { portfolioId: body.portfolioId, props: { templateId: body.templateId, runtimeVersion: body.runtimeVersion }, force: true });
    await audit({ action: "deployment.confirmed", entityType: "deployment", entityId: result.row.id, actorUserId: null, before: null, after: { portfolioId: body.portfolioId, vercelUrl: body.vercelUrl, templateId: body.templateId } });
  }
  return json({ ok: true }, { status: 202 });
});
