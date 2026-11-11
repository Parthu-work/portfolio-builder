"use client";

import { Download, ExternalLink, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import { Fragment, useCallback, useEffect, useState } from "react";
import { Badge, Button, Input, Label, Select } from "@/components/ui";
import { buttonStyles } from "@/components/ui/styles";
import { cn } from "@/lib/cn";
import { api, ApiError } from "@/lib/client";
import { RANGES, type Kpi, type Range, type Stats } from "@/lib/stats";

// Recharts is only downloaded when an admin opens this page.
const skeleton = () => <div className="skeleton h-64" aria-label="Loading chart" />;
const VisitorsChart = dynamic(() => import("./Charts").then((m) => m.VisitorsChart), { ssr: false, loading: skeleton });
const DeploysChart = dynamic(() => import("./Charts").then((m) => m.DeploysChart), { ssr: false, loading: skeleton });
const TemplatesChart = dynamic(() => import("./Charts").then((m) => m.TemplatesChart), { ssr: false, loading: skeleton });

type Deployment = { id: string; vercelUrl: string; templateId: string; runtimeVersion: string; firstSeenAt: string; lastSeenAt: string; slug: string | null };
type Profile = { userId: string; displayName: string | null; email: string | null; createdAt: string };
type Edited = { id: string; slug: string; templateId: string; editCount: number; updatedAt: string; published: boolean };
type Payload = { stats: Stats; deployments: Deployment[]; signups: Profile[]; mostEdited: Edited[] };
type AuditRow = { id: string; ts: string; actorUserId: string | null; action: string; entityType: string; entityId: string | null; before: unknown; after: unknown; ipHash: string | null };

const RANGE_LABELS: Record<Range, string> = { "24h": "24 hours", "7d": "7 days", "30d": "30 days", all: "All time" };
const dt = (iso: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
const num = (n: number) => new Intl.NumberFormat("en").format(n);

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const n = Math.max(2, values.length);
  const pts = values.map((v, i) => `${((i / (n - 1)) * 100).toFixed(2)},${(26 - (v / max) * 22).toFixed(2)}`).join(" ");
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true" className="h-7 w-full">
      <polyline points={pts} fill="none" stroke="var(--series-1)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function KpiTile({ kpi }: { kpi: Kpi }) {
  return (
    <li className="grid gap-2 rounded-2xl border border-rule bg-panel p-4">
      <p className="text-[0.8125rem] text-dim">{kpi.label}</p>
      <p className="font-display text-3xl font-bold tabular-nums tracking-tight" data-testid={`kpi-${kpi.key}`}>
        {kpi.format === "percent" ? `${kpi.value}%` : num(kpi.value)}
      </p>
      <Sparkline values={kpi.spark} />
    </li>
  );
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("grid content-start gap-4 rounded-2xl border border-rule bg-panel p-5", className)}>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function BarList({ rows, empty }: { rows: { name: string; count: number }[]; empty: string }) {
  if (!rows.length) return <p className="text-sm text-dim">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <ol className="grid gap-2 text-sm">
      {rows.map((r) => (
        <li key={r.name} className="grid gap-1">
          <div className="flex justify-between gap-3">
            <span className="truncate">{r.name}</span>
            <span className="tabular-nums text-dim">{num(r.count)}</span>
          </div>
          <div aria-hidden="true" className="h-1.5 rounded-full bg-panel2">
            <div className="h-full rounded-full bg-[var(--series-1)]" style={{ width: `${Math.max(2, (r.count / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="text-sm">
      <summary className="w-fit cursor-pointer text-dim underline-offset-4 hover:underline">View as table</summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-rule">
        <table className="w-full text-left text-[0.8125rem]">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-panel2">
            <tr>
              {head.map((h) => (
                <th key={h} scope="col" className="px-3 py-1.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-rule">
                {r.map((c, j) => (
                  <td key={j} className="px-3 py-1.5 tabular-nums">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Flattens JSON into "a.b.c" → value so two snapshots can be compared line by line. */
function flatten(value: unknown, prefix = "", out: Record<string, string> = {}): Record<string, string> {
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (!entries.length && prefix) out[prefix] = Array.isArray(value) ? "[]" : "{}";
    for (const [k, v] of entries) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else if (prefix || value !== null) {
    out[prefix || "value"] = value === undefined ? "" : JSON.stringify(value);
  }
  return out;
}

function Diff({ before, after }: { before: unknown; after: unknown }) {
  const a = flatten(before);
  const b = flatten(after);
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  if (!keys.length) return <p className="text-dim">No details recorded.</p>;
  return (
    <table className="w-full font-mono text-xs">
      <caption className="sr-only">Before and after</caption>
      <thead>
        <tr className="text-left text-dim">
          <th scope="col" className="py-1 pr-3 font-medium">Field</th>
          <th scope="col" className="py-1 pr-3 font-medium">Before</th>
          <th scope="col" className="py-1 font-medium">After</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((k) => {
          const changed = a[k] !== b[k];
          return (
            <tr key={k} className="border-t border-rule align-top">
              <th scope="row" className="py-1 pr-3 text-left font-normal">
                {k}
                {changed ? <span className="sr-only"> (changed)</span> : null}
              </th>
              <td className={cn("break-all py-1 pr-3", changed && a[k] !== undefined && "text-bad")}>{a[k] !== undefined ? `${changed ? "− " : ""}${a[k]}` : "—"}</td>
              <td className={cn("break-all py-1", changed && b[k] !== undefined && "text-ok")}>{b[k] !== undefined ? `${changed ? "+ " : ""}${b[k]}` : "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function AuditLog() {
  const [filter, setFilter] = useState({ actor: "", action: "", from: "", to: "" });
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const query = useCallback(
    (format?: "csv") => {
      const sp = new URLSearchParams();
      if (filter.actor.trim()) sp.set("actor", filter.actor.trim());
      if (filter.action) sp.set("action", filter.action);
      if (filter.from) sp.set("from", new Date(`${filter.from}T00:00:00`).toISOString());
      if (filter.to) sp.set("to", new Date(`${filter.to}T23:59:59`).toISOString());
      if (format) sp.set("format", format);
      return `/api/admin/audit?${sp.toString()}`;
    },
    [filter],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows((await api<{ rows: AuditRow[] }>(query())).rows);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load the audit log.");
    }
  }, [query]);

  useEffect(() => {
    void load();
    // Initial load only; later loads happen when the filter form is submitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ACTIONS = ["auth.signup", "auth.login", "auth.logout", "portfolio.create", "portfolio.publish", "portfolio.delete", "portfolio.duplicate", "deployment.confirmed", "admin.view_dashboard", "admin.filter_audit", "admin.export_audit"];

  return (
    <Card title="Audit log" className="lg:col-span-2">
      <form
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_auto_auto_auto_auto] lg:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void load();
        }}
      >
        <div className="grid gap-1">
          <Label htmlFor="a-actor">Actor (user id)</Label>
          <Input id="a-actor" className="font-mono" placeholder="uuid" value={filter.actor} onChange={(e) => setFilter({ ...filter, actor: e.target.value })} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="a-action">Action</Label>
          <Select id="a-action" value={filter.action} onChange={(e) => setFilter({ ...filter, action: e.target.value })}>
            <option value="">All actions</option>
            {ACTIONS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </Select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="a-from">From</Label>
          <Input id="a-from" type="date" value={filter.from} onChange={(e) => setFilter({ ...filter, from: e.target.value })} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="a-to">To</Label>
          <Input id="a-to" type="date" value={filter.to} onChange={(e) => setFilter({ ...filter, to: e.target.value })} />
        </div>
        <Button type="submit" variant="primary">
          Apply
        </Button>
        <a href={query("csv")} className={buttonStyles({ variant: "secondary" })} download>
          <Download /> CSV
        </a>
      </form>
      {error ? <p role="alert" className="text-sm text-bad">{error}</p> : null}
      {rows === null ? (
        <div className="skeleton h-40" />
      ) : rows.length === 0 ? (
        <p className="text-sm text-dim">No audit entries match.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <caption className="sr-only">Audit log entries, newest first</caption>
            <thead className="text-[0.8125rem] text-dim">
              <tr>
                <th scope="col" className="py-2 pr-3 font-medium">When</th>
                <th scope="col" className="py-2 pr-3 font-medium">Action</th>
                <th scope="col" className="py-2 pr-3 font-medium">Actor</th>
                <th scope="col" className="py-2 pr-3 font-medium">Entity</th>
                <th scope="col" className="py-2 font-medium">
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.id}>
                  <tr className="border-t border-rule">
                    <td className="whitespace-nowrap py-2 pr-3 text-dim">{dt(r.ts)}</td>
                    <td className="py-2 pr-3">
                      <Badge tone={r.action.startsWith("admin.") ? "warn" : r.action.includes("delete") ? "bad" : "neutral"}>{r.action}</Badge>
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {r.actorUserId ? (
                        <button type="button" className="underline-offset-2 hover:underline" title="Filter by this actor" onClick={() => setFilter((f) => ({ ...f, actor: r.actorUserId! }))}>
                          {r.actorUserId.slice(0, 8)}…<span className="sr-only"> (filter by this actor)</span>
                        </button>
                      ) : (
                        <span className="text-dim">system</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">
                      {r.entityType}
                      {r.entityId ? `:${r.entityId.slice(0, 12)}` : ""}
                    </td>
                    <td className="py-2 text-right">
                      <Button size="sm" variant="ghost" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)}>
                        {open === r.id ? "Hide diff" : "Diff"}
                      </Button>
                    </td>
                  </tr>
                  {open === r.id ? (
                    <tr className="bg-panel2/60">
                      <td colSpan={5} className="p-3">
                        <Diff before={r.before} after={r.after} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function AdminDashboard() {
  const [range, setRange] = useState<Range>("7d");
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (r: Range) => {
    setLoading(true);
    setError(null);
    try {
      setData(await api<Payload>(`/api/admin/stats?range=${r}`));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(range);
  }, [range, load]);

  const s = data?.stats;
  const funnelMax = Math.max(1, ...(s?.funnel.map((f) => f.value) ?? [1]));

  return (
    <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Admin</h1>
          <p className="mt-1 text-sm text-dim">First-party, cookie-less analytics. No raw IP addresses are stored.</p>
        </div>
        <div className="flex items-center gap-2">
          <fieldset>
            <legend className="sr-only">Date range</legend>
            <div className="flex gap-1 rounded-xl bg-panel2 p-1">
              {RANGES.map((r) => (
                <label key={r} className="cursor-pointer rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium text-dim has-[:checked]:bg-panel has-[:checked]:text-fg has-[:checked]:shadow-sm has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand">
                  <input type="radio" name="range" value={r} checked={range === r} onChange={() => setRange(r)} className="sr-only" />
                  {RANGE_LABELS[r]}
                </label>
              ))}
            </div>
          </fieldset>
          <Button size="icon" aria-label="Refresh" onClick={() => load(range)} disabled={loading}>
            <RefreshCw className={cn(loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {error ? <p role="alert" className="rounded-xl border border-bad/50 p-4 text-sm text-bad">{error}</p> : null}
      {s?.truncated ? <p className="rounded-xl border border-warn/50 p-3 text-sm">Showing the most recent 20,000 events in this range.</p> : null}

      {!s ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="skeleton h-32" />
          ))}
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Key metrics">
            {s.kpis.map((k) => (
              <KpiTile key={k.key} kpi={k} />
            ))}
          </ul>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Funnel" className="lg:col-span-2">
              <ol className="grid gap-2.5">
                {s.funnel.map((f, i) => {
                  const prev = i > 0 ? s.funnel[i - 1]!.value : 0;
                  return (
                    <li key={f.step} className="grid gap-1 sm:grid-cols-[12rem_1fr_7rem] sm:items-center sm:gap-4">
                      <span className="text-sm">{f.step}</span>
                      <div aria-hidden="true" className="h-6 rounded-md bg-panel2">
                        <div className="h-full rounded-md bg-[var(--series-1)]" style={{ width: `${Math.max(f.value ? 1.5 : 0, (f.value / funnelMax) * 100)}%` }} />
                      </div>
                      <span className="text-sm tabular-nums">
                        {num(f.value)}
                        {i > 0 && prev > 0 ? <span className="text-dim"> · {Math.round((f.value / prev) * 100)}%</span> : null}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </Card>

            <Card title="Visitors over time">
              <VisitorsChart series={s.series} />
              <DataTable caption="Unique visitors and page views over time" head={["Period", "Visitors", "Page views"]} rows={s.series.map((p) => [p.label, p.visitors, p.pageViews])} />
            </Card>
            <Card title="Deploys over time">
              <DeploysChart series={s.series} />
              <DataTable caption="Deploy clicks and confirmed deployments over time" head={["Period", "Clicks", "Confirmed"]} rows={s.series.map((p) => [p.label, p.deployClicks, p.deployConfirmed])} />
            </Card>
            <Card title="Template popularity" className="lg:col-span-2">
              {s.templates.length ? (
                <>
                  <TemplatesChart templates={s.templates} />
                  <DataTable caption="Templates selected versus deployed" head={["Template", "Selected", "Deployed"]} rows={s.templates.map((t) => [t.templateId, t.selected, t.deployed])} />
                </>
              ) : (
                <p className="text-sm text-dim">No template activity in this range.</p>
              )}
            </Card>

            <Card title="Top custom section names">
              <BarList rows={s.customSections} empty="Nobody has added a custom section in this range." />
            </Card>
            <Card title="Top referrers">
              <BarList rows={s.referrers} empty="No external referrers yet." />
            </Card>
            <Card title="Devices">
              <BarList rows={s.devices} empty="No visits yet." />
            </Card>
            <Card title="Countries">
              <BarList rows={s.countries} empty="No visits yet." />
            </Card>

            <Card title="Recent deployments" className="lg:col-span-2">
              {data.deployments.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[36rem] text-left text-sm">
                    <caption className="sr-only">Recent confirmed deployments</caption>
                    <thead className="text-[0.8125rem] text-dim">
                      <tr>
                        <th scope="col" className="py-2 pr-3 font-medium">Live URL</th>
                        <th scope="col" className="py-2 pr-3 font-medium">Portfolio</th>
                        <th scope="col" className="py-2 pr-3 font-medium">Template</th>
                        <th scope="col" className="py-2 pr-3 font-medium">First seen</th>
                        <th scope="col" className="py-2 font-medium">Last build</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.deployments.map((d) => (
                        <tr key={d.id} className="border-t border-rule">
                          <td className="py-2 pr-3">
                            <a href={`https://${d.vercelUrl}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[0.8125rem] text-brand underline underline-offset-4">
                              {d.vercelUrl} <ExternalLink className="size-3.5" aria-hidden="true" />
                              <span className="sr-only">(opens in a new tab)</span>
                            </a>
                          </td>
                          <td className="py-2 pr-3 font-mono text-[0.8125rem]">{d.slug ?? "—"}</td>
                          <td className="py-2 pr-3">{d.templateId}</td>
                          <td className="whitespace-nowrap py-2 pr-3 text-dim">{dt(d.firstSeenAt)}</td>
                          <td className="whitespace-nowrap py-2 text-dim">{dt(d.lastSeenAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-dim">No confirmed deployments yet.</p>
              )}
            </Card>

            <Card title="Recent signups">
              {data.signups.length ? (
                <ul className="grid gap-2 text-sm">
                  {data.signups.map((p) => (
                    <li key={p.userId} className="flex justify-between gap-3 border-t border-rule pt-2 first:border-0 first:pt-0">
                      <span className="truncate">{p.email ?? p.displayName ?? p.userId.slice(0, 8)}</span>
                      <span className="shrink-0 text-dim">{dt(p.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-dim">No signups yet.</p>
              )}
            </Card>
            <Card title="Most-edited portfolios">
              {data.mostEdited.length ? (
                <ul className="grid gap-2 text-sm">
                  {data.mostEdited.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 border-t border-rule pt-2 first:border-0 first:pt-0">
                      <span className="truncate font-mono text-[0.8125rem]">{p.slug}</span>
                      <span className="flex shrink-0 items-center gap-2 text-dim">
                        <Badge>{p.templateId}</Badge>
                        {p.published ? <Badge tone="ok">published</Badge> : null}
                        <span className="tabular-nums">{num(p.editCount)} edits</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-dim">No portfolios yet.</p>
              )}
            </Card>

            <AuditLog />
          </div>
        </>
      )}
    </div>
  );
}
