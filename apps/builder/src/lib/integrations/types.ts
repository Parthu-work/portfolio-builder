import type { IntegrationConfig, Portfolio, Section } from "@runtime/schema/portfolio";
import type { ProofSet } from "./sections";

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

/** `portfolio` is the document being edited (or the published one, for background refreshes): only providers that check the user's own content read it. */
export type FetchCtx = { token?: string; signal: AbortSignal; portfolio?: Portfolio };

/** A user-facing switch a provider offers beyond hiding individual items. */
export type ProviderOption = { key: string; label: string; default: boolean };

/** One of an account's strongest, provider-given signals (e.g. "Knight" contest badge). Never computed or scored by us. */
export type Highlight = { id: string; value: string; label: string };

/** A connected account as an aggregator sees it: its highlights plus their provenance. */
export type HighlightSource = { provider: string; name: string; source: string; account: string; verified: boolean; note?: string; fetchedAt: string; highlights: Highlight[] };

export interface Provider {
  id: string;
  name: string;
  homepage: string;
  /** True for documented public APIs; false for unofficial endpoints, which are labelled "Experimental". */
  official: boolean;
  accountLabel: string;
  /** Handles are validated against this before any network call. */
  accountPattern: RegExp;
  /** Where this account's data came from, when it varies per account (e.g. "medium.com"). Defaults to the homepage's host. */
  sourceOf?(data: ProviderData): string | null;
  /** For providers that need no handle (aggregators): the account is always this. */
  fixedAccount?: string;
  /** The account's strongest signals, for the Achievement wall. At most a few, each exactly as the provider reported it. */
  highlights?(data: ProviderData): Highlight[];
  /** Aggregators build their sections from the other connected accounts; `fetch` then only stamps the time. */
  aggregate?(sources: HighlightSource[], cfg: IntegrationConfig): Section[];
  /** Adds marks to the user's own content from fetched data (e.g. checked proof links). Applied on read, after synced sections. */
  annotate?(doc: Portfolio, data: ProviderData): Portfolio;
  /** One line per thing the provider checked, for the editor (e.g. each proof link and its result). */
  describe?(data: ProviderData): { label: string; ok: boolean; detail: string }[];
  /** Not offered for new connections unless the server has this provider's token (see `serverToken`). */
  needsToken?: boolean;
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
  /**
   * The provider's own, stable user id in fetched data. When the signed-in
   * user logged in with this provider under the same id, the account is
   * verified without a bio code.
   */
  ownerId?(data: ProviderData): string | null;
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
  fixedAccount: string | null;
  aggregate: boolean;
  annotates: boolean;
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
  /** For annotating providers (proof links): the checks, so the editor preview can show the same marks as the live site. */
  proofs: ProofSet | null;
  /** For providers that check things (proof links): what was checked and how it went. */
  details: { label: string; ok: boolean; detail: string }[];
  /** Everything the provider can show, before the user's `hidden` choices: the source for the toggles. */
  available: Section[];
};
