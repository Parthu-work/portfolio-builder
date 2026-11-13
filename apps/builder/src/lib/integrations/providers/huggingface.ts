import "server-only";
import type { Section } from "@runtime/schema/portfolio";
import { providerFetch, providerJson } from "../http";
import { ProviderError, type FetchCtx, type Provider, type ProviderData } from "../types";

/**
 * Hugging Face (official Hub API): the models, Spaces and datasets an
 * account (user or organization) publishes. The Hub's `downloads` figure
 * covers the last 30 days.
 */

const HUB = "https://huggingface.co";
const LIMIT = 100;
const PER_KIND = 4;

type Kind = "model" | "space" | "dataset";
type Repo = { id: string; likes: number; downloads: number | null; tag: string };
export type HuggingfaceData = { account: string; models: Repo[]; spaces: Repo[]; datasets: Repo[]; capped: Kind[] };

type HubRepo = { id?: string; likes?: number; downloads?: number; pipeline_tag?: string; sdk?: string };

const repoId = (s: unknown) => (typeof s === "string" && /^[A-Za-z0-9][\w.-]{0,95}\/[\w.-]{1,96}$/.test(s) ? s : null);

async function exists(account: string, ctx: FetchCtx): Promise<boolean> {
  for (const path of ["users", "organizations"]) {
    const res = await providerFetch(`${HUB}/api/${path}/${encodeURIComponent(account)}/overview`, { signal: ctx.signal }).catch((e) => {
      if (e instanceof ProviderError && e.kind === "not_found") return null;
      throw e;
    });
    if (res && res.status < 400) return true;
  }
  return false;
}

const list = (kind: "models" | "spaces" | "datasets", account: string, sort: string, ctx: FetchCtx) => providerJson<HubRepo[]>(`${HUB}/api/${kind}?author=${encodeURIComponent(account)}&sort=${sort}&direction=-1&limit=${LIMIT}`, { signal: ctx.signal });

const toRepos = (items: HubRepo[], account: string, withDownloads: boolean): Repo[] =>
  (Array.isArray(items) ? items : []).flatMap((r) => {
    const id = repoId(r.id);
    if (!id || id.split("/")[0]!.toLowerCase() !== account.toLowerCase()) return [];
    return [{ id, likes: Math.max(0, r.likes ?? 0), downloads: withDownloads && typeof r.downloads === "number" ? r.downloads : null, tag: (r.pipeline_tag ?? r.sdk ?? "").slice(0, 40) }];
  });

const n = (v: number) => v.toLocaleString("en-US");
const count = (d: HuggingfaceData, k: Kind, items: Repo[]) => `${n(items.length)}${d.capped.includes(k) ? "+" : ""}`;
const sum = (items: Repo[], f: (r: Repo) => number) => items.reduce((a, r) => a + f(r), 0);

export const huggingfaceProvider: Provider = {
  id: "huggingface",
  name: "Hugging Face",
  homepage: "https://huggingface.co",
  official: true,
  accountLabel: "Username",
  accountHint: "A user or organization, as in huggingface.co/<name>.",
  accountPattern: /^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$/,

  async fetch(account, _opts, ctx) {
    if (!(await exists(account, ctx))) throw new ProviderError("not_found", "No Hugging Face user or organization with that name.");
    const [models, spaces, datasets] = await Promise.all([list("models", account, "downloads", ctx), list("spaces", account, "likes", ctx), list("datasets", account, "downloads", ctx)]);
    const capped = ([["model", models], ["space", spaces], ["dataset", datasets]] as const).filter(([, l]) => Array.isArray(l) && l.length >= LIMIT).map(([k]) => k);
    const data: HuggingfaceData = { account, models: toRepos(models, account, true), spaces: toRepos(spaces, account, false), datasets: toRepos(datasets, account, true), capped: [...capped] };
    return data as unknown as ProviderData;
  },

  toSections(raw, cfg): Section[] {
    const d = raw as unknown as HuggingfaceData;
    const all = [...d.models, ...d.spaces, ...d.datasets];
    if (!all.length) return [];
    const metric = (id: string, value: string, label: string) => ({ id, visible: true, values: { stat: { value, label } } });
    const items = [
      ...(d.models.length ? [metric("models", count(d, "model", d.models), d.models.length === 1 ? "model" : "models")] : []),
      ...(d.spaces.length ? [metric("spaces", count(d, "space", d.spaces), d.spaces.length === 1 ? "Space" : "Spaces")] : []),
      ...(d.datasets.length ? [metric("datasets", count(d, "dataset", d.datasets), d.datasets.length === 1 ? "dataset" : "datasets")] : []),
      metric("likes", n(sum(all, (r) => r.likes)), "likes"),
      ...(d.models.length ? [metric("downloads", n(sum(d.models, (r) => r.downloads ?? 0)), "model downloads (last 30 days)")] : []),
    ];
    const entry = (kind: Kind, r: Repo) => ({
      id: `${kind}-${r.id.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 56)}`,
      visible: true,
      values: {
        title: r.id.split("/")[1]!,
        summary: [kind === "model" ? "Model" : kind === "space" ? "Space" : "Dataset", r.tag].filter(Boolean).join(" · "),
        tags: [] as string[],
        impact: r.downloads !== null && r.downloads > 0 ? { value: n(r.downloads), label: "downloads (30 days)" } : { value: n(r.likes), label: r.likes === 1 ? "like" : "likes" },
        link: { label: "Hugging Face", href: `${HUB}/${kind === "model" ? "" : `${kind}s/`}${r.id}` },
      },
    });
    return [
      { id: `${cfg.id}_stats`, kind: "custom", title: "On Hugging Face", visible: true, layout: "metrics", fields: [], itemSchema: [{ key: "stat", label: "Stat", type: "metric" }], items },
      {
        id: `${cfg.id}_repos`,
        kind: "projects",
        title: "Hugging Face models and Spaces",
        visible: true,
        layout: "grid",
        fields: [],
        itemSchema: [
          { key: "title", label: "Title", type: "text" },
          { key: "summary", label: "Summary", type: "longtext" },
          { key: "tags", label: "Tags", type: "tags" },
          { key: "impact", label: "Headline metric", type: "metric" },
          { key: "link", label: "Link", type: "link" },
        ],
        items: [...d.models.slice(0, PER_KIND).map((r) => entry("model", r)), ...d.spaces.slice(0, PER_KIND).map((r) => entry("space", r)), ...d.datasets.slice(0, PER_KIND).map((r) => entry("dataset", r))],
      },
    ];
  },

  highlights(raw) {
    const d = raw as unknown as HuggingfaceData;
    const downloads = sum(d.models, (r) => r.downloads ?? 0);
    const likes = sum([...d.models, ...d.spaces, ...d.datasets], (r) => r.likes);
    return [...(downloads > 0 ? [{ id: "downloads", value: n(downloads), label: "Hugging Face model downloads (30 days)" }] : []), ...(likes > 0 ? [{ id: "likes", value: n(likes), label: "likes on Hugging Face" }] : [])];
  },
};
