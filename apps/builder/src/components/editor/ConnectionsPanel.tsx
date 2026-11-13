"use client";

import { Check, Copy, Loader2, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { current } from "immer";
import { useCallback, useEffect, useId, useState } from "react";
import { toast } from "sonner";
import type { IntegrationConfig, Portfolio, Section } from "@runtime/schema/portfolio";
import { Badge, Button, Dialog, DialogClose, DialogContent, DialogTrigger, FieldError, Input, Label, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import { api, ApiError } from "@/lib/client";
import { applyHidden, removeAccount, sectionKey, syncAccount, toggles } from "@/lib/integrations/sections";
import type { ConnectionInfo, ProviderInfo } from "@/lib/integrations/types";
import type { Update } from "./state";

export type Listing = { enabled: boolean; providers: ProviderInfo[]; connections: ConnectionInfo[] };
type Result = { config: IntegrationConfig; connection: ConnectionInfo; sections: Section[]; verified?: boolean; message?: string };

const base = (portfolioId: string) => `/api/portfolios/${portfolioId}/integrations`;
const errorText = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);
const initials = (name: string) =>
  name
    .split(/[\s/]+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/** Applies a whole-document transform as one undoable step, on the latest draft. */
export const transform = (update: Update, fn: (doc: Portfolio) => Portfolio) =>
  update((d) => {
    const before = current(d);
    const after = fn(before);
    return after === before ? undefined : after;
  });

/** Loads what the editor needs to show the panel. `null` until known; `enabled: false` hides it. */
export function useConnections(portfolioId: string) {
  const [listing, setListing] = useState<Listing | null>(null);
  useEffect(() => {
    let live = true;
    api<Listing>(base(portfolioId))
      .then((l) => live && setListing(l))
      .catch(() => live && setListing({ enabled: false, providers: [], connections: [] }));
    return () => {
      live = false;
    };
  }, [portfolioId]);
  const put = useCallback((c: ConnectionInfo) => setListing((l) => l && { ...l, connections: l.connections.some((x) => x.id === c.id) ? l.connections.map((x) => (x.id === c.id ? c : x)) : [...l.connections, c] }), []);
  const drop = useCallback((id: string) => setListing((l) => l && { ...l, connections: l.connections.filter((x) => x.id !== id) }), []);
  return { listing, put, drop };
}

function ProviderMark({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg border border-rule bg-panel2 font-mono text-xs font-semibold">
      {initials(name)}
    </span>
  );
}

function Kind({ official }: { official: boolean }) {
  return official ? <Badge tone="ok">Official API</Badge> : <Badge tone="warn">Experimental</Badge>;
}

type Shared = { portfolio: Portfolio; update: Update; portfolioId: string; put: (c: ConnectionInfo) => void };

function ConnectForm({ portfolio, update, portfolioId, put, providers }: Shared & { providers: ProviderInfo[] }) {
  const uid = useId();
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");
  const [account, setAccount] = useState("");
  const [after, setAfter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const provider = providers.find((p) => p.id === providerId);
  if (!provider) return null;

  const connect = async () => {
    const handle = account.trim();
    if (!new RegExp(provider.accountPattern).test(handle)) {
      setError(`That does not look like a ${provider.name} ${provider.accountLabel.toLowerCase()}.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api<Result>(base(portfolioId), { body: { provider: provider.id, account: handle } });
      transform(update, (doc) => syncAccount(doc, res.config, res.sections, after || undefined));
      put(res.connection);
      setAccount("");
      toast.success(`${provider.name} connected. Choose what appears on your site.`);
    } catch (e) {
      setError(errorText(e, "Could not connect. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="grid gap-4 rounded-xl border border-rule bg-panel p-3"
      aria-labelledby={`${uid}-h`}
      onSubmit={(e) => {
        e.preventDefault();
        void connect();
      }}
    >
      <h4 id={`${uid}-h`} className="text-sm font-semibold">
        Connect an account
      </h4>
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-[0.8125rem] font-medium">Provider</legend>
        <div className="grid grid-cols-2 gap-2">
          {providers.map((p) => (
            <label
              key={p.id}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border bg-panel p-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand",
                p.id === providerId ? "border-brand ring-1 ring-brand" : "border-rule hover:border-edge",
              )}
            >
              <input type="radio" name={`${uid}-provider`} value={p.id} checked={p.id === providerId} onChange={() => (setProviderId(p.id), setError(null))} className="sr-only" />
              <ProviderMark name={p.name} />
              <span className="grid min-w-0 gap-0.5">
                <span className="truncate text-sm font-medium">{p.name}</span>
                <span className="text-xs text-dim">{p.official ? "Official API" : "Experimental"}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-1.5">
        <Label htmlFor={`${uid}-account`}>
          {provider.name} {provider.accountLabel.toLowerCase()}
        </Label>
        <Input id={`${uid}-account`} value={account} autoComplete="off" spellCheck={false} aria-invalid={Boolean(error)} aria-describedby={`${uid}-hint ${uid}-err`} onChange={(e) => setAccount(e.target.value)} />
        <p id={`${uid}-hint`} className="text-xs text-dim">
          {provider.accountHint ?? "Only what the platform shows publicly is read."} {provider.official ? "" : "Experimental: uses an unofficial endpoint that may stop working; the last good data keeps showing."}
        </p>
        <FieldError id={`${uid}-err`}>{error ?? undefined}</FieldError>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${uid}-after`}>Where it appears</Label>
        <Select id={`${uid}-after`} value={after} onChange={(e) => setAfter(e.target.value)}>
          <option value="">Before Contact (its own section)</option>
          {portfolio.sections
            .filter((s) => !s.sync)
            .map((s) => (
              <option key={s.id} value={s.id}>
                After “{s.title || s.kind}”
              </option>
            ))}
        </Select>
      </div>
      <Button type="submit" variant="primary" disabled={busy || !account.trim()} className="w-fit">
        {busy ? <Loader2 className="animate-spin" /> : null} {busy ? "Connecting…" : "Connect"}
      </Button>
    </form>
  );
}

function ConnectionCard({ portfolio, update, portfolioId, put, drop, provider, connection }: Shared & { drop: (id: string) => void; provider: ProviderInfo | undefined; connection: ConnectionInfo }) {
  const uid = useId();
  const [busy, setBusy] = useState<null | "refresh" | "verify" | "disconnect" | "options">(null);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const name = provider?.name ?? connection.provider;
  const cfg: IntegrationConfig = portfolio.integrations?.find((c) => c.id === connection.id) ?? {
    id: connection.id,
    provider: connection.provider,
    account: connection.account,
    options: Object.fromEntries((provider?.options ?? []).map((o) => [o.key, o.default])),
    hidden: [],
  };
  const hidden = new Set(cfg.hidden);
  const url = `${base(portfolioId)}/${connection.id}`;

  const applied = (res: Result) => {
    transform(update, (doc) => syncAccount(doc, res.config, res.sections));
    put(res.connection);
  };

  const run = async (kind: NonNullable<typeof busy>, fn: () => Promise<void>, fallback: string) => {
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      toast.error(errorText(e, fallback));
    } finally {
      setBusy(null);
    }
  };

  const setHidden = (key: string, hide: boolean) => {
    const next: IntegrationConfig = { ...cfg, hidden: hide ? [...cfg.hidden, key] : cfg.hidden.filter((k) => k !== key) };
    transform(update, (doc) => syncAccount(doc, next, applyHidden(connection.available, next)));
  };

  const setOption = async (key: string, value: boolean) => {
    setPending((p) => ({ ...p, [key]: value }));
    await run(
      "options",
      async () => {
        const options = { ...cfg.options, [key]: value };
        applied(await api<Result>(`${url}/preview`, { body: { options, hidden: cfg.hidden } }));
      },
      "Could not update this account.",
    );
    setPending(({ [key]: _, ...rest }) => rest);
  };

  const refresh = () =>
    run(
      "refresh",
      async () => {
        const res = await api<Result>(`${url}/refresh`, { body: { options: cfg.options, hidden: cfg.hidden } });
        applied(res);
        if (res.connection.status === "ok") toast.success(`${name} refreshed.`);
        else toast.error(`${res.connection.error ?? "Refresh failed."} The last good data keeps showing.`);
      },
      "Could not refresh.",
    );

  const verify = () =>
    run(
      "verify",
      async () => {
        const res = await api<Result>(`${url}/verify`, { body: { options: cfg.options, hidden: cfg.hidden } });
        applied(res);
        setVerifyMessage(res.verified ? null : (res.message ?? null));
        if (res.verified) toast.success("Verified. Your site now says “Verified owner”. You can remove the code from your profile.");
      },
      "Could not verify.",
    );

  const disconnect = () =>
    run(
      "disconnect",
      async () => {
        await api(url, { method: "DELETE" });
        transform(update, (doc) => removeAccount(doc, connection.id));
        drop(connection.id);
        toast(`${name} disconnected. Its data was deleted.`);
      },
      "Could not disconnect.",
    );

  return (
    <li className="grid gap-3 rounded-xl border border-rule bg-panel p-3" data-connection={connection.provider}>
      <div className="flex items-start gap-2">
        <ProviderMark name={name} />
        <div className="grid min-w-0 flex-1 gap-1">
          <h4 className="truncate text-sm font-semibold">
            {name} · <span className="font-mono font-normal">{connection.account}</span>
          </h4>
          <div className="flex flex-wrap gap-1">
            {provider ? <Kind official={provider.official} /> : null}
            {connection.verified ? (
              <Badge tone="ok">
                <ShieldCheck className="size-3" aria-hidden="true" /> Verified owner
              </Badge>
            ) : (
              <Badge>Public profile</Badge>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-dim" data-testid="synced-at">
        Last synced {when(connection.fetchedAt)}
        {connection.status !== "ok" && connection.error ? <span className="block text-warn">{connection.error} Showing the last good data.</span> : null}
      </p>

      {provider?.options.length ? (
        <fieldset className="grid gap-1.5">
          <legend className="mb-1 text-[0.8125rem] font-medium">Options</legend>
          {provider.options.map((o) => (
            <label key={o.key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-brand" checked={pending[o.key] ?? (cfg.options[o.key] !== undefined ? cfg.options[o.key] === true : o.default)} disabled={busy !== null} onChange={(e) => void setOption(o.key, e.target.checked)} />
              {o.label}
            </label>
          ))}
        </fieldset>
      ) : null}

      <fieldset className="grid gap-2">
        <legend className="mb-1 text-[0.8125rem] font-medium">What appears on your site</legend>
        {connection.available.length === 0 ? <p className="text-xs text-dim">Nothing to show yet.</p> : null}
        {connection.available.map((s) => {
          const key = sectionKey(cfg, s.id);
          const off = hidden.has(key);
          return (
            <div key={s.id} className="grid gap-1 rounded-lg border border-rule p-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" className="size-4 accent-brand" checked={!off} onChange={(e) => setHidden(key, !e.target.checked)} />
                {s.title}
              </label>
              {off ? null : (
                <ul className="grid gap-1 pl-6">
                  {toggles(s, cfg).map((t) => (
                    <li key={t.key}>
                      <label className="flex items-center gap-2 text-[0.8125rem]">
                        <input type="checkbox" className="size-4 accent-brand" checked={!hidden.has(t.key)} onChange={(e) => setHidden(t.key, !e.target.checked)} />
                        {t.label}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </fieldset>

      {!connection.verified && provider?.verify?.method === "bio-code" ? (
        <div className="grid gap-2 rounded-lg bg-panel2 p-2.5" aria-labelledby={`${uid}-verify`}>
          <h5 id={`${uid}-verify`} className="text-[0.8125rem] font-semibold">
            Verify you own this
          </h5>
          <p className="text-xs text-dim">{provider.verify.instructions}</p>
          {connection.verifyCode ? (
            <div className="flex items-center gap-1.5">
              <code className="rounded-md border border-rule bg-panel px-2 py-1 font-mono text-sm" data-testid="verify-code">
                {connection.verifyCode}
              </code>
              <Button
                size="iconSm"
                variant="ghost"
                aria-label="Copy code"
                onClick={() =>
                  navigator.clipboard?.writeText(connection.verifyCode!).then(
                    () => toast.success("Code copied."),
                    () => toast.error("Could not copy. Select the code and copy it by hand."),
                  )
                }
              >
                <Copy />
              </Button>
            </div>
          ) : null}
          {verifyMessage ? (
            <p role="status" className="text-xs text-warn">
              {verifyMessage}
            </p>
          ) : null}
          <Button size="sm" className="w-fit" disabled={busy !== null} onClick={verify}>
            {busy === "verify" ? <Loader2 className="animate-spin" /> : <Check />} Verify
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy !== null} onClick={refresh} aria-label={`Refresh ${name} ${connection.account}`}>
          <RefreshCw className={cn(busy === "refresh" && "animate-spin")} /> Refresh
        </Button>
        <DisconnectDialog name={name} account={connection.account} disabled={busy !== null} onConfirm={disconnect} />
      </div>
    </li>
  );
}

function DisconnectDialog({ name, account, disabled, onConfirm }: { name: string; account: string; disabled: boolean; onConfirm: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" disabled={disabled}>
          <Unplug /> Disconnect
        </Button>
      </DialogTrigger>
      <DialogContent title={`Disconnect ${name}?`} description={`The data fetched from ${account} is deleted and its sections leave your site right away, including sites you already deployed.`}>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="danger" onClick={() => void onConfirm().finally(() => setOpen(false))}>
            Disconnect
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ConnectionsPanel({ portfolio, update, portfolioId, listing, put, drop }: Omit<Shared, "put"> & { listing: Listing; put: (c: ConnectionInfo) => void; drop: (id: string) => void }) {
  const byId = new Map(listing.providers.map((p) => [p.id, p]));
  return (
    <section className="grid gap-4" aria-labelledby="accounts-h">
      <div className="grid gap-1">
        <h3 id="accounts-h" className="font-display text-base font-semibold">
          Connected accounts
        </h3>
        <p className="text-[0.8125rem] text-dim">Show live numbers, charts and badges from your developer accounts. Only public data is read, your site updates itself, and you choose what appears.</p>
      </div>
      {listing.connections.length ? (
        <ul className="grid gap-3" aria-label="Connected accounts">
          {listing.connections.map((c) => (
            <ConnectionCard key={c.id} portfolio={portfolio} update={update} portfolioId={portfolioId} put={put} drop={drop} provider={byId.get(c.provider)} connection={c} />
          ))}
        </ul>
      ) : null}
      {listing.providers.length ? <ConnectForm portfolio={portfolio} update={update} portfolioId={portfolioId} put={put} providers={listing.providers} /> : <p className="text-[0.8125rem] text-dim">No providers are available right now.</p>}
    </section>
  );
}
