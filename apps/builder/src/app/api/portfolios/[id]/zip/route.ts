import files from "@/generated/runtime-files.json";
import { HttpError, route } from "@/lib/api";
import { stripProofs } from "@/lib/integrations/sections";
import { mergeLive } from "@/lib/integrations/service";
import { buildZip, type RuntimeFiles } from "@/lib/zip";

/** "Download code (.zip)": the runtime with the owner's current draft baked in. */
export const GET = route<undefined, { id: string }>({ auth: "user", rate: { name: "zip", capacity: 5, perMinute: 5 } }, async ({ store, user, event }, { id }) => {
  const row = await store.getPortfolio(user!.id, id);
  if (!row) throw new HttpError(404, "Portfolio not found");
  const folder = `${row.slug}-portfolio`;
  // Bake in the latest snapshot of every connected account: a self-hosted copy keeps showing the data, it just stops updating.
  const { portfolio } = await mergeLive(store, row.id, row.draft, { live: false }).catch(() => ({ portfolio: stripProofs(row.draft) }));
  const zip = buildZip(files as RuntimeFiles, portfolio, folder);
  await event("zip_downloaded", { portfolioId: id, props: { templateId: row.templateId } });
  return new Response(zip.buffer as ArrayBuffer, {
    headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${folder}.zip"`, "cache-control": "no-store" },
  });
});
