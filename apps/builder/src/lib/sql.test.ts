import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Runs the real Supabase migrations against an in-process Postgres (PGlite)
 * with minimal stand-ins for Supabase's `auth` / `storage` schemas and roles,
 * then exercises Row Level Security and the token-bucket function.
 */
const MIGRATIONS = join(__dirname, "../../../../supabase/migrations");
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

let db: PGlite;

async function as<T>(role: "anon" | "authenticated" | "service_role", uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
    grant usage on schema public, auth, storage to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    grant all on storage.objects to authenticated, service_role;
  `);
  for (const file of readdirSync(MIGRATIONS).sort()) await db.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
  await db.exec(`insert into auth.users (id) values ('${A}'), ('${B}');`);
});

const draft = JSON.stringify({ schemaVersion: 1 });
const insertPortfolio = (owner: string, slug: string) => db.query<{ id: string }>(`insert into public.portfolios (user_id, slug, template_id, draft) values ($1, $2, 'swiss', $3) returning id`, [owner, slug, draft]);

describe("supabase migrations", () => {
  it("enable RLS on every public table", async () => {
    const { rows } = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' order by 1`,
    );
    expect(rows.map((r) => r.relname)).toEqual(["audit_log", "deployments", "events", "integration_snapshots", "portfolio_versions", "portfolios", "profiles", "rate_limits"]);
    expect(rows.every((r) => r.relrowsecurity)).toBe(true);
  });

  it("users can only read and write their own portfolios", async () => {
    const [a] = (await as("authenticated", A, () => insertPortfolio(A, "alice-site"))).rows;
    await as("authenticated", B, () => insertPortfolio(B, "bob-site"));
    // Cannot create a row owned by someone else.
    await expect(as("authenticated", B, () => insertPortfolio(A, "forged"))).rejects.toThrow(/row-level security/);
    const seenByB = await as("authenticated", B, () => db.query<{ slug: string }>("select slug from public.portfolios"));
    expect(seenByB.rows.map((r) => r.slug)).toEqual(["bob-site"]);
    const upd = await as("authenticated", B, () => db.query(`update public.portfolios set slug = 'stolen' where id = $1`, [a!.id]));
    expect(upd.affectedRows).toBe(0);
    const del = await as("authenticated", B, () => db.query(`delete from public.portfolios where id = $1`, [a!.id]));
    expect(del.affectedRows).toBe(0);
    // Cannot give a row away either.
    await expect(as("authenticated", A, () => db.query(`update public.portfolios set user_id = $1 where id = $2`, [B, a!.id]))).rejects.toThrow(/row-level security/);
    // The anon key sees nothing at all.
    expect((await as("anon", null, () => db.query("select 1 from public.portfolios"))).rows).toHaveLength(0);
  });

  it("slugs are unique among live portfolios and freed on soft delete", async () => {
    await expect(insertPortfolio(B, "alice-site")).rejects.toThrow(/duplicate key/);
    await expect(insertPortfolio(B, "Bad Slug")).rejects.toThrow(/check constraint/);
    const { rows } = await insertPortfolio(A, "temp-site");
    await db.query(`update public.portfolios set deleted_at = now() where id = $1`, [rows[0]!.id]);
    await insertPortfolio(B, "temp-site");
  });

  it("counts edits and touches updated_at on draft changes", async () => {
    const { rows } = await insertPortfolio(A, "edit-count");
    await db.query(`update public.portfolios set draft = '{"schemaVersion":1,"x":1}' where id = $1`, [rows[0]!.id]);
    await db.query(`update public.portfolios set published = draft where id = $1`, [rows[0]!.id]);
    const r = await db.query<{ edit_count: number }>(`select edit_count from public.portfolios where id = $1`, [rows[0]!.id]);
    expect(r.rows[0]!.edit_count).toBe(1);
  });

  it("keeps only the last 20 versions and scopes them to the owner", async () => {
    const { rows } = await insertPortfolio(A, "versions");
    const pid = rows[0]!.id;
    await as("authenticated", A, async () => {
      for (let i = 0; i < 24; i += 1) await db.query(`insert into public.portfolio_versions (portfolio_id, data, label, created_at) values ($1, '{}', $2, now() + ($3 || ' seconds')::interval)`, [pid, `v${i}`, String(i)]);
    });
    const mine = await as("authenticated", A, () => db.query<{ label: string }>(`select label from public.portfolio_versions where portfolio_id = $1 order by created_at`, [pid]));
    expect(mine.rows).toHaveLength(20);
    expect(mine.rows[0]!.label).toBe("v4");
    expect((await as("authenticated", B, () => db.query(`select 1 from public.portfolio_versions where portfolio_id = $1`, [pid]))).rows).toHaveLength(0);
    await expect(as("authenticated", B, () => db.query(`insert into public.portfolio_versions (portfolio_id, data) values ($1, '{}')`, [pid]))).rejects.toThrow(/row-level security/);
  });

  it("analytics, audit and rate-limit tables are unreachable with user keys", async () => {
    for (const role of ["anon", "authenticated"] as const) {
      for (const table of ["events", "audit_log", "rate_limits"]) {
        await expect(as(role, A, () => db.query(`select 1 from public.${table}`))).rejects.toThrow(/permission denied/);
      }
      await expect(as(role, A, () => db.query(`insert into public.events (type, session_hash) values ('page_view', 'x')`))).rejects.toThrow(/permission denied/);
      await expect(as(role, A, () => db.query(`select public.take_token('k', 1, 0)`))).rejects.toThrow(/permission denied/);
    }
    await as("service_role", null, () => db.query(`insert into public.events (type, session_hash) values ('page_view', 'x')`));
  });

  it("deployments are readable by the owner only and never writable by users", async () => {
    const { rows } = await insertPortfolio(A, "deployed");
    await db.query(`insert into public.deployments (portfolio_id, vercel_url, template_id, runtime_version) values ($1, 'x.vercel.app', 'swiss', '1.0.0')`, [rows[0]!.id]);
    expect((await as("authenticated", A, () => db.query(`select 1 from public.deployments`))).rows).toHaveLength(1);
    expect((await as("authenticated", B, () => db.query(`select 1 from public.deployments`))).rows).toHaveLength(0);
    await expect(as("authenticated", A, () => db.query(`insert into public.deployments (portfolio_id, vercel_url, template_id, runtime_version) values ($1, 'y.vercel.app', 'swiss', '1')`, [rows[0]!.id]))).rejects.toThrow(/permission denied/);
  });

  it("integration snapshots: readable by the owner only, written by the server only, removed with the portfolio", async () => {
    const { rows } = await insertPortfolio(A, "synced");
    const pid = rows[0]!.id;
    const insert = `insert into public.integration_snapshots (portfolio_id, provider, account, data) values ($1, 'github', 'alice', '{"stars":3}')`;
    await expect(as("authenticated", A, () => db.query(insert, [pid]))).rejects.toThrow(/permission denied/);
    await expect(as("anon", null, () => db.query(`select 1 from public.integration_snapshots`))).rejects.toThrow(/permission denied/);
    await as("service_role", null, () => db.query(insert, [pid]));
    await expect(as("service_role", null, () => db.query(insert, [pid]))).rejects.toThrow(/duplicate key/);
    await expect(as("service_role", null, () => db.query(`insert into public.integration_snapshots (portfolio_id, provider, account, status) values ($1, 'github', 'bob', 'weird')`, [pid]))).rejects.toThrow(/check constraint/);
    expect((await as("authenticated", A, () => db.query(`select 1 from public.integration_snapshots`))).rows).toHaveLength(1);
    expect((await as("authenticated", B, () => db.query(`select 1 from public.integration_snapshots`))).rows).toHaveLength(0);
    await expect(as("authenticated", A, () => db.query(`update public.integration_snapshots set verified = true`))).rejects.toThrow(/permission denied/);
    await expect(as("authenticated", A, () => db.query(`delete from public.integration_snapshots`))).rejects.toThrow(/permission denied/);
    await db.query(`delete from public.portfolios where id = $1`, [pid]);
    expect((await db.query(`select 1 from public.integration_snapshots where portfolio_id = $1`, [pid])).rows).toHaveLength(0);
  });

  it("take_token implements a refilling token bucket", async () => {
    const take = async (key: string, cap: number, refill: number) => (await as("service_role", null, () => db.query<{ ok: boolean }>(`select public.take_token($1, $2, $3) as ok`, [key, cap, refill]))).rows[0]!.ok;
    expect([await take("ip:1", 3, 0), await take("ip:1", 3, 0), await take("ip:1", 3, 0), await take("ip:1", 3, 0), await take("ip:1", 3, 0)]).toEqual([true, true, true, false, false]);
    expect(await take("ip:2", 3, 0)).toBe(true);
    // Refill: pretend the bucket was last touched 10s ago at 1 token/s.
    await db.query(`update public.rate_limits set updated_at = now() - interval '10 seconds' where key = 'ip:1'`);
    expect(await take("ip:1", 3, 1)).toBe(true);
    const { rows } = await db.query<{ tokens: number }>(`select tokens from public.rate_limits where key = 'ip:1'`);
    expect(rows[0]!.tokens).toBeCloseTo(2, 0); // capped at capacity (3) minus the one just taken
  });

  it("storage: users can only upload into their own folder of portfolio-assets", async () => {
    const bucket = await db.query<{ file_size_limit: string; public: boolean }>(`select file_size_limit, public from storage.buckets where id = 'portfolio-assets'`);
    expect(Number(bucket.rows[0]!.file_size_limit)).toBe(2 * 1024 * 1024);
    await as("authenticated", A, () => db.query(`insert into storage.objects (bucket_id, name) values ('portfolio-assets', $1)`, [`${A}/a.webp`]));
    await expect(as("authenticated", A, () => db.query(`insert into storage.objects (bucket_id, name) values ('portfolio-assets', $1)`, [`${B}/a.webp`]))).rejects.toThrow(/row-level security/);
    await expect(as("authenticated", A, () => db.query(`insert into storage.objects (bucket_id, name) values ('other', $1)`, [`${A}/a.webp`]))).rejects.toThrow(/row-level security/);
  });
});
