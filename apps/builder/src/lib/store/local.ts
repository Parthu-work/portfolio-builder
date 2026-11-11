import "server-only";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Portfolio } from "@runtime/schema/portfolio";
import {
  MAX_VERSIONS,
  NotFoundError,
  SlugTakenError,
  type AuditFilter,
  type AuditInput,
  type AuditRow,
  type DeploymentRow,
  type EventRow,
  type PortfolioRow,
  type ProfileRow,
  type SessionUser,
  type Store,
  type VersionRow,
} from "./types";

type Db = {
  profiles: ProfileRow[];
  portfolios: (PortfolioRow & { deletedAt: string | null })[];
  versions: (VersionRow & { data: Portfolio })[];
  deployments: DeploymentRow[];
  events: EventRow[];
  audit: AuditRow[];
};

const empty = (): Db => ({ profiles: [], portfolios: [], versions: [], deployments: [], events: [], audit: [] });
const now = () => new Date().toISOString();

/**
 * Development / e2e store: everything in one JSON file (.data/db.json).
 * Mirrors the Supabase behaviour (ownership checks, unique slugs, 20 versions,
 * token bucket) so local mode exercises the same application code paths.
 */
export class LocalStore implements Store {
  private db: Db;
  private buckets = new Map<string, { tokens: number; at: number }>();
  private timer: NodeJS.Timeout | null = null;

  constructor(private file: string | null = join(process.cwd(), ".data", "db.json")) {
    this.db = empty();
    if (file && existsSync(file)) {
      try {
        this.db = { ...empty(), ...(JSON.parse(readFileSync(file, "utf8")) as Partial<Db>) };
      } catch {
        this.db = empty();
      }
    }
  }

  private persist() {
    if (!this.file || this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      try {
        mkdirSync(dirname(this.file!), { recursive: true });
        writeFileSync(this.file!, JSON.stringify(this.db));
      } catch {
        /* read-only filesystem: stay in memory */
      }
    }, 50);
  }

  private own(userId: string, id: string) {
    const row = this.db.portfolios.find((p) => p.id === id && p.userId === userId && !p.deletedAt);
    if (!row) throw new NotFoundError("Portfolio not found");
    return row;
  }
  private strip = ({ deletedAt: _d, ...row }: PortfolioRow & { deletedAt: string | null }): PortfolioRow => structuredClone(row);

  async ensureProfile(user: SessionUser) {
    if (this.db.profiles.some((p) => p.userId === user.id)) return { created: false };
    this.db.profiles.push({ userId: user.id, displayName: user.name, email: user.email, createdAt: now() });
    this.persist();
    return { created: true };
  }

  async slugAvailable(slug: string, except?: string) {
    return !this.db.portfolios.some((p) => p.slug === slug && !p.deletedAt && p.id !== except);
  }

  async listPortfolios(userId: string) {
    return this.db.portfolios
      .filter((p) => p.userId === userId && !p.deletedAt)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(this.strip);
  }

  async getPortfolio(userId: string, id: string) {
    const row = this.db.portfolios.find((p) => p.id === id && p.userId === userId && !p.deletedAt);
    return row ? this.strip(row) : null;
  }

  async createPortfolio(userId: string, draft: Portfolio) {
    if (!(await this.slugAvailable(draft.meta.slug))) throw new SlugTakenError(draft.meta.slug);
    const row = {
      id: crypto.randomUUID(),
      userId,
      slug: draft.meta.slug,
      templateId: draft.theme.templateId,
      draft: structuredClone(draft),
      published: null,
      publishedAt: null,
      editCount: 0,
      createdAt: now(),
      updatedAt: now(),
      deletedAt: null,
    };
    this.db.portfolios.push(row);
    this.persist();
    return this.strip(row);
  }

  async saveDraft(userId: string, id: string, draft: Portfolio) {
    const row = this.own(userId, id);
    if (draft.meta.slug !== row.slug && !(await this.slugAvailable(draft.meta.slug, id))) throw new SlugTakenError(draft.meta.slug);
    Object.assign(row, { draft: structuredClone(draft), slug: draft.meta.slug, templateId: draft.theme.templateId, updatedAt: now(), editCount: row.editCount + 1 });
    this.persist();
    return this.strip(row);
  }

  async publish(userId: string, id: string) {
    const row = this.own(userId, id);
    Object.assign(row, { published: structuredClone(row.draft), publishedAt: now(), updatedAt: now() });
    this.persist();
    return this.strip(row);
  }

  async deletePortfolio(userId: string, id: string) {
    this.own(userId, id).deletedAt = now();
    this.persist();
  }

  async listVersions(userId: string, portfolioId: string) {
    this.own(userId, portfolioId);
    return this.db.versions
      .filter((v) => v.portfolioId === portfolioId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(({ data: _data, ...v }) => v);
  }

  async getVersion(userId: string, portfolioId: string, versionId: string) {
    this.own(userId, portfolioId);
    const v = this.db.versions.find((x) => x.id === versionId && x.portfolioId === portfolioId);
    return v ? structuredClone(v.data) : null;
  }

  async addVersion(userId: string, portfolioId: string, data: Portfolio, label: string | null) {
    this.own(userId, portfolioId);
    const v = { id: crypto.randomUUID(), portfolioId, label, createdAt: now(), data: structuredClone(data) };
    this.db.versions.push(v);
    const mine = this.db.versions.filter((x) => x.portfolioId === portfolioId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const drop = new Set(mine.slice(MAX_VERSIONS).map((x) => x.id));
    this.db.versions = this.db.versions.filter((x) => !drop.has(x.id));
    this.persist();
    return { id: v.id, portfolioId, label, createdAt: v.createdAt };
  }

  async listDeployments(userId: string, portfolioId: string) {
    this.own(userId, portfolioId);
    return this.db.deployments.filter((d) => d.portfolioId === portfolioId).sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
  }

  async getPublished(q: { id: string } | { slug: string }) {
    const row = this.db.portfolios.find((p) => !p.deletedAt && ("id" in q ? p.id === q.id : p.slug === q.slug));
    if (!row?.published || !row.publishedAt) return null;
    return { id: row.id, portfolio: structuredClone(row.published), publishedAt: row.publishedAt };
  }

  async upsertDeployment(input: { portfolioId: string; vercelUrl: string; templateId: string; runtimeVersion: string }) {
    const owner = this.db.portfolios.find((p) => p.id === input.portfolioId && !p.deletedAt);
    if (!owner) return null;
    const existing = this.db.deployments.find((d) => d.portfolioId === input.portfolioId && d.vercelUrl === input.vercelUrl);
    if (existing) {
      Object.assign(existing, { lastSeenAt: now(), templateId: input.templateId, runtimeVersion: input.runtimeVersion });
      this.persist();
      return { firstSeen: false, ownerId: owner.userId, row: existing };
    }
    const row = { id: crypto.randomUUID(), ...input, firstSeenAt: now(), lastSeenAt: now() };
    this.db.deployments.push(row);
    this.persist();
    return { firstSeen: true, ownerId: owner.userId, row };
  }

  async insertEvents(events: EventRow[]) {
    this.db.events.push(...events);
    if (this.db.events.length > 50_000) this.db.events = this.db.events.slice(-50_000);
    this.persist();
  }

  async insertAudit(entry: AuditInput) {
    this.db.audit.push({ ...entry, id: String(this.db.audit.length + 1), ts: now() });
    this.persist();
  }

  async takeToken(key: string, capacity: number, refillPerSec: number) {
    const t = Date.now();
    const b = this.buckets.get(key) ?? { tokens: capacity, at: t };
    b.tokens = Math.min(capacity, b.tokens + ((t - b.at) / 1000) * refillPerSec);
    b.at = t;
    const ok = b.tokens >= 1;
    if (ok) b.tokens -= 1;
    this.buckets.set(key, b);
    return ok;
  }

  async listEvents(since: string | null, limit: number) {
    return this.db.events.filter((e) => !since || e.ts >= since).slice(-limit);
  }

  async recentDeployments(limit: number) {
    return [...this.db.deployments]
      .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
      .slice(0, limit)
      .map((d) => ({ ...d, slug: this.db.portfolios.find((p) => p.id === d.portfolioId)?.slug ?? null }));
  }

  async recentProfiles(limit: number) {
    return [...this.db.profiles].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  async mostEdited(limit: number) {
    return this.db.portfolios
      .filter((p) => !p.deletedAt)
      .sort((a, b) => b.editCount - a.editCount)
      .slice(0, limit)
      .map((p) => ({ id: p.id, slug: p.slug, templateId: p.templateId, editCount: p.editCount, updatedAt: p.updatedAt, published: Boolean(p.published) }));
  }

  async listAudit(f: AuditFilter) {
    return this.db.audit
      .filter((a) => (!f.actor || a.actorUserId === f.actor) && (!f.action || a.action === f.action) && (!f.from || a.ts >= f.from) && (!f.to || a.ts <= f.to))
      .sort((a, b) => b.ts.localeCompare(a.ts))
      .slice(0, f.limit ?? 200);
  }
}
