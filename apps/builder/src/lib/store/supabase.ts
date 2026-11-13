import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Portfolio } from "@runtime/schema/portfolio";
import type { EventType } from "../analytics-core";
import {
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
  type SnapshotInput,
  type SnapshotRow,
  type Store,
  type VersionRow,
} from "./types";

type Row = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" ? v : "");
const sn = (v: unknown) => (typeof v === "string" ? v : null);

const toPortfolio = (r: Row): PortfolioRow => ({
  id: s(r.id),
  userId: s(r.user_id),
  slug: s(r.slug),
  templateId: s(r.template_id),
  draft: r.draft as Portfolio,
  published: (r.published as Portfolio | null) ?? null,
  publishedAt: sn(r.published_at),
  editCount: typeof r.edit_count === "number" ? r.edit_count : 0,
  createdAt: s(r.created_at),
  updatedAt: s(r.updated_at),
});
const toDeployment = (r: Row): DeploymentRow => ({
  id: s(r.id),
  portfolioId: s(r.portfolio_id),
  vercelUrl: s(r.vercel_url),
  templateId: s(r.template_id),
  runtimeVersion: s(r.runtime_version),
  firstSeenAt: s(r.first_seen_at),
  lastSeenAt: s(r.last_seen_at),
});
const toVersion = (r: Row): VersionRow => ({ id: s(r.id), portfolioId: s(r.portfolio_id), label: sn(r.label), createdAt: s(r.created_at) });

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) {
    if (res.error.code === "23505") throw new SlugTakenError("this address");
    throw new Error(`Database error: ${res.error.message}`);
  }
  return res.data;
}

const SNAPSHOT_COLS = "id,portfolio_id,provider,account,data,fetched_at,status,error,verified,verify_code";
const toSnapshot = (r: Row): SnapshotRow => ({
  id: s(r.id),
  portfolioId: s(r.portfolio_id),
  provider: s(r.provider),
  account: s(r.account),
  data: r.data ?? null,
  fetchedAt: s(r.fetched_at),
  status: r.status === "error" || r.status === "stale" ? r.status : "ok",
  error: sn(r.error),
  verified: r.verified === true,
  verifyCode: sn(r.verify_code),
});

type DbError = { message: string; code?: string } | null;
/** Postgres 42P01 (undefined table) or PostgREST PGRST205 (table not in the schema cache): the migration has not been applied. */
export const isMissingTable = (e: DbError) => Boolean(e && (e.code === "42P01" || e.code === "PGRST205" || /relation .* does not exist|could not find the table/i.test(e.message)));
let warnedMissingSnapshots = false;

const PORTFOLIO_COLS = "id,user_id,slug,template_id,draft,published,published_at,edit_count,created_at,updated_at";

/**
 * Production store. User-facing operations run through `user()` — a client
 * bound to the caller's session — so Postgres Row Level Security is the
 * source of truth for "only your own rows". Server-only operations (public
 * API, analytics, audit, admin) use the service-role client.
 */
export class SupabaseStore implements Store {
  constructor(
    private user: () => Promise<SupabaseClient>,
    private admin: () => SupabaseClient,
  ) {}

  async ensureProfile(u: SessionUser) {
    const db = this.admin();
    const existing = check(await db.from("profiles").select("user_id").eq("user_id", u.id).maybeSingle());
    if (existing) return { created: false };
    const res = await db.from("profiles").insert({ user_id: u.id, display_name: u.name, email: u.email });
    if (res.error && res.error.code !== "23505") throw new Error(res.error.message);
    return { created: !res.error };
  }

  async slugAvailable(slug: string, except?: string) {
    let q = this.admin().from("portfolios").select("id").eq("slug", slug).is("deleted_at", null);
    if (except) q = q.neq("id", except);
    return (check(await q.limit(1)) as Row[]).length === 0;
  }

  async listPortfolios(userId: string) {
    const db = await this.user();
    const rows = check(await db.from("portfolios").select(PORTFOLIO_COLS).eq("user_id", userId).is("deleted_at", null).order("updated_at", { ascending: false }));
    return (rows as Row[]).map(toPortfolio);
  }

  async getPortfolio(userId: string, id: string) {
    const db = await this.user();
    const row = check(await db.from("portfolios").select(PORTFOLIO_COLS).eq("id", id).eq("user_id", userId).is("deleted_at", null).maybeSingle());
    return row ? toPortfolio(row as Row) : null;
  }

  async createPortfolio(userId: string, draft: Portfolio) {
    if (!(await this.slugAvailable(draft.meta.slug))) throw new SlugTakenError(draft.meta.slug);
    const db = await this.user();
    const row = check(
      await db.from("portfolios").insert({ user_id: userId, slug: draft.meta.slug, template_id: draft.theme.templateId, draft }).select(PORTFOLIO_COLS).single(),
    );
    return toPortfolio(row as Row);
  }

  private async update(userId: string, id: string, patch: Row) {
    const db = await this.user();
    const row = check(await db.from("portfolios").update(patch).eq("id", id).eq("user_id", userId).is("deleted_at", null).select(PORTFOLIO_COLS).maybeSingle());
    if (!row) throw new NotFoundError("Portfolio not found");
    return toPortfolio(row as Row);
  }

  async saveDraft(userId: string, id: string, draft: Portfolio) {
    if (!(await this.slugAvailable(draft.meta.slug, id))) throw new SlugTakenError(draft.meta.slug);
    return this.update(userId, id, { draft, slug: draft.meta.slug, template_id: draft.theme.templateId });
  }

  async publish(userId: string, id: string) {
    const current = await this.getPortfolio(userId, id);
    if (!current) throw new NotFoundError("Portfolio not found");
    return this.update(userId, id, { published: current.draft, published_at: new Date().toISOString() });
  }

  async deletePortfolio(userId: string, id: string) {
    await this.update(userId, id, { deleted_at: new Date().toISOString() });
  }

  async listVersions(_userId: string, portfolioId: string) {
    const db = await this.user();
    const rows = check(await db.from("portfolio_versions").select("id,portfolio_id,label,created_at").eq("portfolio_id", portfolioId).order("created_at", { ascending: false }).limit(20));
    return (rows as Row[]).map(toVersion);
  }

  async getVersion(_userId: string, portfolioId: string, versionId: string) {
    const db = await this.user();
    const row = check(await db.from("portfolio_versions").select("data").eq("id", versionId).eq("portfolio_id", portfolioId).maybeSingle());
    return row ? ((row as Row).data as Portfolio) : null;
  }

  async addVersion(_userId: string, portfolioId: string, data: Portfolio, label: string | null) {
    const db = await this.user();
    const row = check(await db.from("portfolio_versions").insert({ portfolio_id: portfolioId, data, label }).select("id,portfolio_id,label,created_at").single());
    return toVersion(row as Row);
  }

  async listDeployments(_userId: string, portfolioId: string) {
    const db = await this.user();
    const rows = check(await db.from("deployments").select("*").eq("portfolio_id", portfolioId).order("last_seen_at", { ascending: false }));
    return (rows as Row[]).map(toDeployment);
  }

  async getPublished(q: { id: string } | { slug: string }) {
    let query = this.admin().from("portfolios").select("id,published,published_at").is("deleted_at", null).not("published", "is", null);
    query = "id" in q ? query.eq("id", q.id) : query.eq("slug", q.slug);
    const row = check(await query.maybeSingle()) as Row | null;
    if (!row?.published) return null;
    return { id: s(row.id), portfolio: row.published as Portfolio, publishedAt: s(row.published_at) };
  }

  async upsertDeployment(input: { portfolioId: string; vercelUrl: string; templateId: string; runtimeVersion: string }) {
    const db = this.admin();
    const owner = check(await db.from("portfolios").select("user_id").eq("id", input.portfolioId).is("deleted_at", null).maybeSingle()) as Row | null;
    if (!owner) return null;
    const existing = check(await db.from("deployments").select("id").eq("portfolio_id", input.portfolioId).eq("vercel_url", input.vercelUrl).maybeSingle());
    const row = check(
      await db
        .from("deployments")
        .upsert(
          { portfolio_id: input.portfolioId, vercel_url: input.vercelUrl, template_id: input.templateId, runtime_version: input.runtimeVersion, last_seen_at: new Date().toISOString() },
          { onConflict: "portfolio_id,vercel_url" },
        )
        .select("*")
        .single(),
    );
    return { firstSeen: !existing, ownerId: s(owner.user_id), row: toDeployment(row as Row) };
  }

  async insertEvents(events: EventRow[]) {
    if (!events.length) return;
    check(
      await this.admin().from("events").insert(
        events.map((e) => ({
          ts: e.ts,
          type: e.type,
          session_hash: e.sessionHash,
          user_id: e.userId,
          portfolio_id: e.portfolioId,
          path: e.path,
          referrer_domain: e.referrerDomain,
          country: e.country,
          device: e.device,
          props: e.props,
        })),
      ),
    );
  }

  async insertAudit(a: AuditInput) {
    check(
      await this.admin().from("audit_log").insert({ actor_user_id: a.actorUserId, action: a.action, entity_type: a.entityType, entity_id: a.entityId, before: a.before ?? null, after: a.after ?? null, ip_hash: a.ipHash }),
    );
  }

  /** Unwraps a snapshot query. A missing table is logged once and reported as null ("integrations unavailable"). */
  private snap<T>(res: { data: T; error: DbError }): T | null {
    if (!res.error) return res.data;
    if (isMissingTable(res.error)) {
      if (!warnedMissingSnapshots) {
        warnedMissingSnapshots = true;
        console.warn(JSON.stringify({ level: "warn", msg: "integration_snapshots table is missing; integrations are disabled until the migration is applied", ts: new Date().toISOString() }));
      }
      return null;
    }
    throw new Error(`Database error: ${res.error.message}`);
  }

  async listSnapshots(portfolioId: string) {
    const rows = this.snap(await this.admin().from("integration_snapshots").select(SNAPSHOT_COLS).eq("portfolio_id", portfolioId));
    return rows ? (rows as Row[]).map(toSnapshot) : null;
  }

  async upsertSnapshot(input: SnapshotInput) {
    const row = this.snap(
      await this.admin()
        .from("integration_snapshots")
        .upsert(
          { portfolio_id: input.portfolioId, provider: input.provider, account: input.account, data: input.data, fetched_at: input.fetchedAt, status: input.status, error: input.error, verified: input.verified, verify_code: input.verifyCode },
          { onConflict: "portfolio_id,provider,account" },
        )
        .select(SNAPSHOT_COLS)
        .single(),
    );
    return row ? toSnapshot(row as Row) : null;
  }

  async updateSnapshot(id: string, patch: Partial<Omit<SnapshotRow, "id" | "portfolioId" | "provider" | "account">>) {
    const cols: Row = {};
    if ("data" in patch) cols.data = patch.data;
    if (patch.fetchedAt !== undefined) cols.fetched_at = patch.fetchedAt;
    if (patch.status !== undefined) cols.status = patch.status;
    if ("error" in patch) cols.error = patch.error;
    if (patch.verified !== undefined) cols.verified = patch.verified;
    if ("verifyCode" in patch) cols.verify_code = patch.verifyCode;
    const row = this.snap(await this.admin().from("integration_snapshots").update(cols).eq("id", id).select(SNAPSHOT_COLS).maybeSingle());
    return row ? toSnapshot(row as Row) : null;
  }

  async deleteSnapshot(portfolioId: string, id: string) {
    const rows = this.snap(await this.admin().from("integration_snapshots").delete().eq("id", id).eq("portfolio_id", portfolioId).select("id"));
    return rows ? (rows as Row[]).length > 0 : null;
  }

  async takeToken(key: string, capacity: number, refillPerSec: number) {
    const res = await this.admin().rpc("take_token", { p_key: key, p_capacity: capacity, p_refill_per_sec: refillPerSec });
    if (res.error) throw new Error(res.error.message);
    return res.data === true;
  }

  async listEvents(since: string | null, limit: number) {
    // PostgREST caps a response at 1,000 rows, so page through the range.
    const out: EventRow[] = [];
    for (let from = 0; from < limit; from += 1000) {
      let q = this.admin().from("events").select("ts,type,session_hash,user_id,portfolio_id,path,referrer_domain,country,device,props").order("ts", { ascending: false });
      if (since) q = q.gte("ts", since);
      const rows = check(await q.range(from, Math.min(from + 999, limit - 1))) as Row[];
      for (const r of rows) {
        out.push({
          ts: s(r.ts),
          type: s(r.type) as EventType,
          sessionHash: s(r.session_hash),
          userId: sn(r.user_id),
          portfolioId: sn(r.portfolio_id),
          path: sn(r.path),
          referrerDomain: sn(r.referrer_domain),
          country: sn(r.country),
          device: sn(r.device),
          props: (r.props as EventRow["props"]) ?? {},
        });
      }
      if (rows.length < 1000) break;
    }
    return out.reverse();
  }

  async recentDeployments(limit: number) {
    const rows = check(await this.admin().from("deployments").select("*, portfolios(slug)").order("last_seen_at", { ascending: false }).limit(limit)) as Row[];
    return rows.map((r) => ({ ...toDeployment(r), slug: sn((r.portfolios as Row | null)?.slug) }));
  }

  async recentProfiles(limit: number) {
    const rows = check(await this.admin().from("profiles").select("*").order("created_at", { ascending: false }).limit(limit)) as Row[];
    return rows.map((r): ProfileRow => ({ userId: s(r.user_id), displayName: sn(r.display_name), email: sn(r.email), createdAt: s(r.created_at) }));
  }

  async mostEdited(limit: number) {
    const rows = check(
      await this.admin().from("portfolios").select("id,slug,template_id,edit_count,updated_at,published_at").is("deleted_at", null).order("edit_count", { ascending: false }).limit(limit),
    ) as Row[];
    return rows.map((r) => ({ id: s(r.id), slug: s(r.slug), templateId: s(r.template_id), editCount: Number(r.edit_count ?? 0), updatedAt: s(r.updated_at), published: Boolean(r.published_at) }));
  }

  async listAudit(f: AuditFilter) {
    let q = this.admin().from("audit_log").select("*").order("ts", { ascending: false }).limit(f.limit ?? 200);
    if (f.actor) q = q.eq("actor_user_id", f.actor);
    if (f.action) q = q.eq("action", f.action);
    if (f.from) q = q.gte("ts", f.from);
    if (f.to) q = q.lte("ts", f.to);
    const rows = check(await q) as Row[];
    return rows.map(
      (r): AuditRow => ({ id: String(r.id), ts: s(r.ts), actorUserId: sn(r.actor_user_id), action: s(r.action), entityType: s(r.entity_type), entityId: sn(r.entity_id), before: r.before ?? null, after: r.after ?? null, ipHash: sn(r.ip_hash) }),
    );
  }
}
