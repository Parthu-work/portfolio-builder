import type { Portfolio } from "@runtime/schema/portfolio";
import type { EventType } from "../analytics-core";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  /** Accounts the user signed in with, as `<provider>:<provider's user id>` (e.g. "github:583231"). Proof of ownership. */
  linked?: string[];
};

export type PortfolioRow = {
  id: string;
  userId: string;
  slug: string;
  templateId: string;
  draft: Portfolio;
  published: Portfolio | null;
  publishedAt: string | null;
  editCount: number;
  createdAt: string;
  updatedAt: string;
};

export type VersionRow = { id: string; portfolioId: string; label: string | null; createdAt: string };
export type DeploymentRow = { id: string; portfolioId: string; vercelUrl: string; templateId: string; runtimeVersion: string; firstSeenAt: string; lastSeenAt: string };
export type ProfileRow = { userId: string; displayName: string | null; email: string | null; createdAt: string };

export type EventRow = {
  ts: string;
  type: EventType;
  sessionHash: string;
  userId: string | null;
  portfolioId: string | null;
  path: string | null;
  referrerDomain: string | null;
  country: string | null;
  device: string | null;
  props: Record<string, string | number | boolean>;
};

export type AuditRow = {
  id: string;
  ts: string;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  ipHash: string | null;
};
export type AuditInput = Omit<AuditRow, "id" | "ts">;
export type AuditFilter = { actor?: string; action?: string; from?: string; to?: string; limit?: number };

/** The latest data fetched for one connected account. `id` doubles as the integration id in the portfolio document. */
export type SnapshotRow = {
  id: string;
  portfolioId: string;
  provider: string;
  account: string;
  /** Provider-shaped JSON; null until a fetch has succeeded. */
  data: unknown;
  fetchedAt: string;
  /** ok: last fetch worked · stale: last fetch failed, `data` is the last good one · error: last fetch failed and there is no data. */
  status: "ok" | "error" | "stale";
  error: string | null;
  verified: boolean;
  verifyCode: string | null;
};
export type SnapshotInput = Omit<SnapshotRow, "id">;

export class SlugTakenError extends Error {
  constructor(slug: string) {
    super(`The address "${slug}" is already taken`);
  }
}
export class NotFoundError extends Error {
  constructor(what = "Not found") {
    super(what);
  }
}

export const MAX_VERSIONS = 20;

/**
 * All persistence goes through this interface. Two implementations:
 * SupabaseStore (production) and LocalStore (dev / e2e, a JSON file).
 * Methods that take a `userId` only ever touch that user's rows.
 */
export interface Store {
  ensureProfile(user: SessionUser): Promise<{ created: boolean }>;
  slugAvailable(slug: string, exceptPortfolioId?: string): Promise<boolean>;

  listPortfolios(userId: string): Promise<PortfolioRow[]>;
  getPortfolio(userId: string, id: string): Promise<PortfolioRow | null>;
  createPortfolio(userId: string, draft: Portfolio): Promise<PortfolioRow>;
  /** Saves the draft (and keeps slug / template_id columns in sync with it). */
  saveDraft(userId: string, id: string, draft: Portfolio): Promise<PortfolioRow>;
  publish(userId: string, id: string): Promise<PortfolioRow>;
  deletePortfolio(userId: string, id: string): Promise<void>;

  listVersions(userId: string, portfolioId: string): Promise<VersionRow[]>;
  getVersion(userId: string, portfolioId: string, versionId: string): Promise<Portfolio | null>;
  addVersion(userId: string, portfolioId: string, data: Portfolio, label: string | null): Promise<VersionRow>;
  listDeployments(userId: string, portfolioId: string): Promise<DeploymentRow[]>;

  /* ── server-only (no user context) ── */
  getPublished(idOrSlug: { id: string } | { slug: string }): Promise<{ id: string; portfolio: Portfolio; publishedAt: string } | null>;
  /** Records a deploy ping. Returns null when the portfolio does not exist. */
  upsertDeployment(input: { portfolioId: string; vercelUrl: string; templateId: string; runtimeVersion: string }): Promise<{ firstSeen: boolean; ownerId: string; row: DeploymentRow } | null>;
  insertEvents(events: EventRow[]): Promise<void>;
  insertAudit(entry: AuditInput): Promise<void>;
  takeToken(key: string, capacity: number, refillPerSec: number): Promise<boolean>;

  /* ── integrations (server-only; callers check ownership first) ──
   * Every method returns null when snapshot storage is unavailable (e.g. the
   * migration has not been applied yet): callers then behave as if integrations were off. */
  listSnapshots(portfolioId: string): Promise<SnapshotRow[] | null>;
  /** Inserts, or replaces the row with the same (portfolio, provider, account). */
  upsertSnapshot(input: SnapshotInput): Promise<SnapshotRow | null>;
  updateSnapshot(id: string, patch: Partial<Omit<SnapshotRow, "id" | "portfolioId" | "provider" | "account">>): Promise<SnapshotRow | null>;
  deleteSnapshot(portfolioId: string, id: string): Promise<boolean | null>;

  /* ── admin ── */
  listEvents(since: string | null, limit: number): Promise<EventRow[]>;
  recentDeployments(limit: number): Promise<(DeploymentRow & { slug: string | null })[]>;
  recentProfiles(limit: number): Promise<ProfileRow[]>;
  mostEdited(limit: number): Promise<{ id: string; slug: string; templateId: string; editCount: number; updatedAt: string; published: boolean }[]>;
  listAudit(filter: AuditFilter): Promise<AuditRow[]>;
}
