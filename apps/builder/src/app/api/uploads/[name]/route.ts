import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { backendMode } from "@/lib/env";

const TYPES: Record<string, string> = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", avif: "image/avif" };

/** LOCAL MODE ONLY: serves files written by /api/upload. */
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const m = /^[0-9a-f-]{8,60}\.(webp|png|jpg|avif)$/.exec(name);
  if (backendMode() !== "local" || !m) return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(join(process.cwd(), ".data", "uploads", name));
    return new Response(new Uint8Array(buf), { headers: { "content-type": TYPES[m[1]!]!, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
