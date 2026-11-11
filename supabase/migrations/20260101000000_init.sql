-- Persona — initial schema. Every table has Row Level Security enabled.
-- Users can only ever touch their own rows; analytics, audit and rate-limit
-- tables have NO policies, so only the server (service role) can use them.

create extension if not exists pgcrypto;

-- ─────────────────────────── profiles ───────────────────────────
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  email text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles: read own" on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy "profiles: insert own" on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "profiles: update own" on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ─────────────────────────── portfolios ───────────────────────────
create table public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 48),
  template_id text not null,
  draft jsonb not null,
  published jsonb,
  published_at timestamptz,
  edit_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
-- Slugs are unique among live portfolios; deleting one frees its slug.
create unique index portfolios_slug_key on public.portfolios (slug) where deleted_at is null;
create index portfolios_user_idx on public.portfolios (user_id) where deleted_at is null;

alter table public.portfolios enable row level security;
create policy "portfolios: read own" on public.portfolios for select to authenticated using (user_id = (select auth.uid()));
create policy "portfolios: insert own" on public.portfolios for insert to authenticated with check (user_id = (select auth.uid()));
create policy "portfolios: update own" on public.portfolios for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "portfolios: delete own" on public.portfolios for delete to authenticated using (user_id = (select auth.uid()));

create function public.touch_portfolio() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if new.draft is distinct from old.draft then
    new.edit_count := old.edit_count + 1;
  end if;
  return new;
end $$;
create trigger portfolios_touch before update on public.portfolios for each row execute function public.touch_portfolio();

-- ─────────────────────────── portfolio_versions (last 20 kept) ───────────────────────────
create table public.portfolio_versions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios (id) on delete cascade,
  data jsonb not null,
  label text,
  created_at timestamptz not null default now()
);
create index portfolio_versions_portfolio_idx on public.portfolio_versions (portfolio_id, created_at desc);

alter table public.portfolio_versions enable row level security;
create policy "versions: read own" on public.portfolio_versions for select to authenticated
  using (exists (select 1 from public.portfolios p where p.id = portfolio_id and p.user_id = (select auth.uid())));
create policy "versions: insert own" on public.portfolio_versions for insert to authenticated
  with check (exists (select 1 from public.portfolios p where p.id = portfolio_id and p.user_id = (select auth.uid())));
create policy "versions: delete own" on public.portfolio_versions for delete to authenticated
  using (exists (select 1 from public.portfolios p where p.id = portfolio_id and p.user_id = (select auth.uid())));

create function public.prune_portfolio_versions() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  delete from public.portfolio_versions v
  where v.portfolio_id = new.portfolio_id
    and v.id not in (
      select id from public.portfolio_versions
      where portfolio_id = new.portfolio_id
      order by created_at desc, id desc
      limit 20
    );
  return null;
end $$;
create trigger portfolio_versions_prune after insert on public.portfolio_versions for each row execute function public.prune_portfolio_versions();

-- ─────────────────────────── deployments (written by the build ping) ───────────────────────────
create table public.deployments (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios (id) on delete cascade,
  vercel_url text not null,
  template_id text not null,
  runtime_version text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (portfolio_id, vercel_url)
);
alter table public.deployments enable row level security;
create policy "deployments: read own" on public.deployments for select to authenticated
  using (exists (select 1 from public.portfolios p where p.id = portfolio_id and p.user_id = (select auth.uid())));

-- ─────────────────────────── events (first-party analytics; service role only) ───────────────────────────
create table public.events (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  type text not null,
  session_hash text not null,
  user_id uuid,
  portfolio_id uuid,
  path text,
  referrer_domain text,
  country text,
  device text,
  props jsonb not null default '{}'::jsonb
);
create index events_ts_idx on public.events (ts desc);
create index events_type_ts_idx on public.events (type, ts desc);
alter table public.events enable row level security;

-- ─────────────────────────── audit_log (service role only) ───────────────────────────
create table public.audit_log (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  actor_user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  before jsonb,
  after jsonb,
  ip_hash text
);
create index audit_log_ts_idx on public.audit_log (ts desc);
create index audit_log_actor_idx on public.audit_log (actor_user_id, ts desc);
create index audit_log_action_idx on public.audit_log (action, ts desc);
alter table public.audit_log enable row level security;

-- ─────────────────────────── rate limiting: token bucket in Postgres ───────────────────────────
create table public.rate_limits (
  key text primary key,
  tokens double precision not null,
  updated_at timestamptz not null default now()
);
alter table public.rate_limits enable row level security;

-- Takes one token from the bucket `p_key`. Buckets hold `p_capacity` tokens and
-- refill at `p_refill_per_sec`. Returns false when the bucket is empty.
create function public.take_token(p_key text, p_capacity double precision, p_refill_per_sec double precision)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_tokens double precision;
begin
  insert into public.rate_limits as r (key, tokens, updated_at)
  values (p_key, p_capacity - 1, now())
  on conflict (key) do update
    set tokens = least(p_capacity, r.tokens + extract(epoch from (now() - r.updated_at)) * p_refill_per_sec) - 1,
        updated_at = now()
  returning r.tokens into v_tokens;

  if v_tokens < 0 then
    -- Bucket was empty: undo the take (but keep the refreshed timestamp).
    update public.rate_limits set tokens = tokens + 1 where key = p_key;
    return false;
  end if;
  return true;
end $$;
revoke all on function public.take_token(text, double precision, double precision) from public, anon, authenticated;
grant execute on function public.take_token(text, double precision, double precision) to service_role;

-- Nothing in the service-only tables is reachable with the public anon key.
revoke all on public.events, public.audit_log, public.rate_limits from anon, authenticated;
revoke all on public.deployments from anon;
revoke insert, update, delete on public.deployments from authenticated;
