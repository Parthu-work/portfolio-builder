/**
 * Billing seam. Persona is free and non-commercial today: everyone is on the
 * "free" plan and nothing here talks to a payment provider. When payments are
 * added, implement `getPlan` (e.g. from a `subscriptions` table) — every
 * limit in the app already flows through `limitsFor`.
 */
export type Plan = "free";

export type Limits = { maxPortfolios: number; maxVersions: number; maxUploadBytes: number };

const LIMITS: Record<Plan, Limits> = {
  free: { maxPortfolios: 10, maxVersions: 20, maxUploadBytes: 2 * 1024 * 1024 },
};

export async function getPlan(_userId: string): Promise<Plan> {
  return "free";
}

export async function limitsFor(userId: string): Promise<Limits> {
  return LIMITS[await getPlan(userId)];
}
