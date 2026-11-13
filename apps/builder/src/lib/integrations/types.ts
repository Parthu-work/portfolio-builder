import type { IntegrationConfig, Section } from "@runtime/schema/portfolio";

export type { IntegrationConfig };

/** Whatever a provider fetched, as plain JSON. Stored verbatim in the snapshot; only the provider reads it. */
export type ProviderData = Record<string, unknown>;

export type ProviderErrorKind =
  /** The account does not exist (or the handle is malformed). */
  | "not_found"
  /** The account exists but its data is not public. `message` tells the user how to make it public. */
  | "private"
  /** The provider asked us to slow down. */
  | "rate_limited"
  /** The provider failed, timed out, or answered with something we do not understand. */
  | "upstream"
  /** The provider needs server configuration that is missing (e.g. an API token). */
  | "unconfigured";

export class ProviderError extends Error {
  constructor(
    public kind: ProviderErrorKind,
    message: string,
  ) {
    super(message);
  }
}

export type FetchCtx = { token?: string; signal: AbortSignal };

/** A user-facing switch a provider offers beyond hiding individual items. */
export type ProviderOption = { key: string; label: string; default: boolean };

export interface Provider {
  id: string;
  name: string;
  homepage: string;
  /** True for documented public APIs; false for unofficial endpoints, which are labelled "Experimental". */
  official: boolean;
  accountLabel: string;
  /** Handles are validated against this before any network call. */
  accountPattern: RegExp;
  /** Shown under the handle input, e.g. "Your username, as in github.com/<username>". */
  accountHint?: string;
  options?: ProviderOption[];
  /** Shown instead of "Public profile" when the proof lives with the provider (e.g. "Issuer-verified on Credly"). */
  unverifiedNote?: string;
  fetch(account: string, opts: Record<string, unknown>, ctx: FetchCtx): Promise<ProviderData>;
  /**
   * Maps fetched data into ordinary sections (metrics, tags, links, charts…).
   * Section ids must be stable and prefixed with `cfg.id`. Do not set `sync`
   * and do not apply `cfg.hidden`: the framework does both.
   */
  toSections(data: ProviderData, cfg: IntegrationConfig): Section[];
  verify?: {
    method: "oauth" | "bio-code";
    instructions: string;
    check(account: string, code: string, ctx: FetchCtx): Promise<boolean>;
  };
}

/** What the browser is told about a provider (no functions, no secrets). */
export type ProviderInfo = {
  id: string;
  name: string;
  homepage: string;
  official: boolean;
  accountLabel: string;
  accountHint: string | null;
  accountPattern: string;
  options: ProviderOption[];
  verify: { method: "oauth" | "bio-code"; instructions: string } | null;
};

/** What the browser is told about a connected account. */
export type ConnectionInfo = {
  id: string;
  provider: string;
  account: string;
  fetchedAt: string;
  status: "ok" | "error" | "stale";
  error: string | null;
  verified: boolean;
  verifyCode: string | null;
  /** Everything the provider can show, before the user's `hidden` choices: the source for the toggles. */
  available: Section[];
};
