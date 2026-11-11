import { z } from "zod";
import { json, route } from "@/lib/api";
import { toCsv } from "@/lib/stats";

const Query = z.object({
  actor: z.string().uuid().optional().catch(undefined),
  action: z.string().regex(/^[\w.]{1,60}$/).optional().catch(undefined),
  from: z.string().datetime({ offset: true }).optional().catch(undefined),
  to: z.string().datetime({ offset: true }).optional().catch(undefined),
  format: z.enum(["json", "csv"]).catch("json"),
});

export const GET = route({ auth: "admin" }, async ({ req, store, audit }) => {
  const sp = new URL(req.url).searchParams;
  const q = Query.parse(Object.fromEntries([...sp.entries()].filter(([, v]) => v !== "")));
  const rows = await store.listAudit({ ...q, limit: q.format === "csv" ? 5000 : 200 });
  if (q.format === "csv") {
    await audit({ action: "admin.export_audit", entityType: "admin", entityId: null, before: null, after: { rows: rows.length, filter: { actor: q.actor, action: q.action, from: q.from, to: q.to } } });
    return new Response(toCsv(rows as unknown as Record<string, unknown>[], ["id", "ts", "actorUserId", "action", "entityType", "entityId", "before", "after", "ipHash"]), {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="persona-audit-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" },
    });
  }
  if (q.actor || q.action || q.from || q.to) {
    await audit({ action: "admin.filter_audit", entityType: "admin", entityId: null, before: null, after: { actor: q.actor, action: q.action, from: q.from, to: q.to } });
  }
  return json({ rows }, { headers: { "cache-control": "no-store" } });
});
