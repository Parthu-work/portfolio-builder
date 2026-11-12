-- Trigger functions are only ever invoked by their triggers; they must not be
-- callable through the REST API (/rest/v1/rpc/...).
revoke all on function public.prune_portfolio_versions() from public, anon, authenticated;
revoke all on function public.touch_portfolio() from public, anon, authenticated;
