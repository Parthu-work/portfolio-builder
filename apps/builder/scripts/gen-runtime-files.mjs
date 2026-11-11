// Bundles the runtime app's source into a JSON module so "Download code (.zip)"
// works on any host (no filesystem access needed at request time).
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../runtime", import.meta.url));
const out = fileURLToPath(new URL("../src/generated/runtime-files.json", import.meta.url));
const SKIP_DIRS = new Set(["node_modules", ".next", ".vercel", ".turbo"]);
const SKIP_FILES = new Set(["next-env.d.ts", "tsconfig.tsbuildinfo", ".env.local"]);
const BINARY = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf)$/i;

async function walk(dir, files = {}) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walk(full, files);
    } else if (!SKIP_FILES.has(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      const rel = relative(root, full).split("\\").join("/");
      const buf = await readFile(full);
      files[rel] = BINARY.test(entry.name) ? { base64: buf.toString("base64") } : buf.toString("utf8");
    }
  }
  return files;
}

const files = await walk(root);
await mkdir(fileURLToPath(new URL("../src/generated", import.meta.url)), { recursive: true });
await writeFile(out, JSON.stringify(files));
console.log(`[persona] bundled ${Object.keys(files).length} runtime files for zip export`);
