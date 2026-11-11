import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { HttpError, json, route } from "@/lib/api";
import { limitsFor } from "@/lib/billing";
import { backendMode } from "@/lib/env";

const TYPES: Record<string, string> = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg", "image/avif": "avif" };

/**
 * LOCAL MODE ONLY image upload (files under .data/uploads). With Supabase the
 * browser uploads straight to the `portfolio-assets` bucket, which enforces
 * the same type and size rules through bucket settings and storage policies.
 */
export const POST = route({ auth: "user", rate: { name: "upload", capacity: 20, perMinute: 20 } }, async ({ req, user }) => {
  if (backendMode() !== "local") throw new HttpError(404, "Not found");
  const type = (req.headers.get("content-type") || "").split(";")[0]!.trim();
  const ext = TYPES[type];
  if (!ext) throw new HttpError(415, "Only WebP, PNG, JPEG or AVIF images are allowed.");
  const bytes = new Uint8Array(await req.arrayBuffer());
  const { maxUploadBytes } = await limitsFor(user!.id);
  if (bytes.byteLength === 0 || bytes.byteLength > maxUploadBytes) throw new HttpError(413, "Images must be 2 MB or smaller.");
  const name = `${user!.id.slice(0, 8)}-${crypto.randomUUID()}.${ext}`;
  const dir = join(process.cwd(), ".data", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), bytes);
  return json({ url: `/api/uploads/${name}` }, { status: 201 });
});
