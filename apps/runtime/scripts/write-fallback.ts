// Regenerates the bundled sample snapshot: `pnpm tsx scripts/write-fallback.ts`
import { writeFileSync } from "node:fs";
import { developerSeed } from "../src/schema/seeds/developer";

writeFileSync(new URL("../src/data/fallback.json", import.meta.url), `${JSON.stringify(developerSeed, null, 2)}\n`);
