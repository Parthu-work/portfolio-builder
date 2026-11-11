import { migrate } from "@runtime/schema/migrate";
import { HttpError, json, route } from "@/lib/api";

export const GET = route<undefined, { id: string; versionId: string }>({ auth: "user" }, async ({ store, user }, { id, versionId }) => {
  const data = await store.getVersion(user!.id, id, versionId);
  if (!data) throw new HttpError(404, "Version not found");
  return json({ data: migrate(data) });
});
