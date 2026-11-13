-- Persona — integrations. One row per connected account of a portfolio:
-- the latest public data fetched from the provider (never tokens, never passwords).
-- Owners can read their own rows; every write goes through the server (service role).

create table public.integration_snapshots (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios (id) on delete cascade,
  provider text not null check (provider ~ '^[a-z][a-z0-9-]{0,39}$'),
  account text not null check (char_length(account) between 1 and 120),
  data jsonb,
  fetched_at timestamptz not null default now(),
  status text not null default 'ok' check (status in ('ok', 'error', 'stale')),
  error text,
  verified boolean not null default false,
  verify_code text,
  unique (portfolio_id, provider, account)
);

alter table public.integration_snapshots enable row level security;
create policy "integration_snapshots: read own" on public.integration_snapshots for select to authenticated
  using (exists (select 1 from public.portfolios p where p.id = portfolio_id and p.user_id = (select auth.uid())));
-- No insert / update / delete policies: only the service role (which bypasses RLS) can write.
revoke all on public.integration_snapshots from anon, authenticated;
grant select on public.integration_snapshots to authenticated;
grant all on public.integration_snapshots to service_role;
