import "server-only";
import { backendMode, env, flags } from "../env";
import { githubProvider } from "./providers/github";
import { gitlabProvider } from "./providers/gitlab";
import { achievementsProvider } from "./providers/achievements";
import { codeforcesProvider } from "./providers/codeforces";
import { huggingfaceProvider } from "./providers/huggingface";
import { credlyProvider } from "./providers/credly";
import { leetcodeProvider } from "./providers/leetcode";
import { stackoverflowProvider } from "./providers/stackoverflow";
import { writingProvider } from "./providers/writing";
import { mockProvider } from "./providers/mock";
import { packagesProvider } from "./providers/packages";
import type { Provider, ProviderInfo } from "./types";

/** Real providers, in the order the editor shows them. Each lives in ./providers/<id>.ts. */
const PROVIDERS: Provider[] = [githubProvider, leetcodeProvider, codeforcesProvider, stackoverflowProvider, credlyProvider, writingProvider, packagesProvider, huggingfaceProvider, gitlabProvider, achievementsProvider];

/**
 * The mock provider exists only where there is no real backend: development
 * and LOCAL_MODE (e2e). `backendMode()` is "local" exactly then — never when
 * Supabase is configured, i.e. never in real production.
 */
const mockEnabled = () => backendMode() === "local" || process.env.NODE_ENV === "test";

const all = (): Provider[] => (flags.integrations ? [...PROVIDERS, ...(mockEnabled() ? [mockProvider] : [])] : []);

/** Providers people can connect and refresh right now: not switched off, and configured when they need a token. */
export const listProviders = (): Provider[] => all().filter((p) => !flags.providerDisabled(p.id) && (!p.needsToken || Boolean(serverToken(p.id))));
export const getProvider = (id: string): Provider | null => listProviders().find((p) => p.id === id) ?? null;
/**
 * For rendering stored snapshots only: a provider switched off with
 * INTEGRATION_<ID>_DISABLED is never called, but what it already fetched keeps showing.
 */
export const findProvider = (id: string): Provider | null => all().find((p) => p.id === id) ?? null;

/** Server-side credentials, by provider. Never sent to the browser, never stored with a snapshot. */
export function serverToken(id: string): string | undefined {
  if (id === "github") return env.githubApiToken || undefined;
  if (id === "stackoverflow") return env.stackExchangeKey || undefined;
  return undefined;
}

export const providerInfo = (p: Provider): ProviderInfo => ({
  id: p.id,
  name: p.name,
  homepage: p.homepage,
  official: p.official,
  accountLabel: p.accountLabel,
  accountHint: p.accountHint ?? null,
  accountPattern: p.accountPattern.source,
  options: p.options ?? [],
  verify: p.verify ? { method: p.verify.method, instructions: p.verify.instructions } : null,
  fixedAccount: p.fixedAccount ?? null,
  aggregate: Boolean(p.aggregate),
});
