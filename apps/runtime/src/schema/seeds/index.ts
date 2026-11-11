import type { Portfolio } from "../portfolio";
import { developerSeed } from "./developer";
import { designerSeed } from "./designer";
import { solutionsEngineerSeed } from "./solutions-engineer";

export const SEEDS = {
  developer: { label: "Developer", description: "Staff engineer with projects, metrics, talks and patents.", portfolio: developerSeed },
  designer: { label: "Designer", description: "Product designer with case studies, testimonials and awards.", portfolio: designerSeed },
  "solutions-engineer": { label: "Solutions engineer", description: "Pre-sales engineer with outcomes, customer stories and certifications.", portfolio: solutionsEngineerSeed },
} as const satisfies Record<string, { label: string; description: string; portfolio: Portfolio }>;

export type SeedId = keyof typeof SEEDS;
export const SEED_IDS = Object.keys(SEEDS) as SeedId[];
export const isSeedId = (id: string): id is SeedId => Object.prototype.hasOwnProperty.call(SEEDS, id);

export { developerSeed, designerSeed, solutionsEngineerSeed };
