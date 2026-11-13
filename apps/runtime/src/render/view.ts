import type { ChartValue, DateRangeValue, FieldDef, FieldType, ImageValue, LinkValue, MetricValue, Portfolio, Section, SocialLink, Sync } from "../schema/portfolio";
import { VALUE_SCHEMAS } from "../schema/portfolio";
import { isPresetKind } from "../schema/presets";
import { LAYOUTS, type Layout } from "../templates/types";
import { htmlToText, sanitizeRichText, textToHtml } from "./sanitize";

/** Safely narrows an unknown stored value to the type's shape, or undefined. */
export function read<T extends FieldType>(type: T, value: unknown): (typeof VALUE_SCHEMAS)[T]["_output"] | undefined {
  if (value === null || value === undefined) return undefined;
  const res = VALUE_SCHEMAS[type].safeParse(value);
  return res.success ? (res.data as (typeof VALUE_SCHEMAS)[T]["_output"]) : undefined;
}

export function isEmptyValue(type: FieldType, value: unknown): boolean {
  const v = read(type, value);
  if (v === undefined || v === null) return true;
  switch (type) {
    case "richtext":
      return htmlToText(v as string) === "";
    case "metric":
      return (v as MetricValue).value.trim() === "";
    case "daterange":
      return (v as DateRangeValue).start === "" && !(v as DateRangeValue).end;
    case "image":
      return (v as ImageValue).src === "";
    case "gallery":
      return (v as ImageValue[]).every((i) => i.src === "");
    case "tags":
      return (v as string[]).every((t) => t.trim() === "");
    case "link":
      return (v as LinkValue).href === "";
    case "linklist":
      return (v as LinkValue[]).every((l) => l.href === "");
    case "code":
      return (v as { code: string }).code.trim() === "";
    case "chart":
      return (v as ChartValue).points.length === 0;
    case "number":
      return false;
    default:
      return typeof v === "string" ? v.trim() === "" : false;
  }
}

/* ───────────── dates ───────────── */

function fmt(lang: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(lang, { ...opts, timeZone: "UTC" });
  } catch {
    return new Intl.DateTimeFormat("en", { ...opts, timeZone: "UTC" });
  }
}

/** "2024" → 2024 · "2024-10" → Oct 2024 · "2024-10-03" → 3 Oct 2024 */
export function formatDate(value: string, lang = "en"): string {
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(value);
  if (!m) return "";
  const [, y, mo, d] = m;
  if (!mo) return y!;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, d ? Number(d) : 1));
  return fmt(lang, d ? { day: "numeric", month: "short", year: "numeric" } : { month: "short", year: "numeric" }).format(date);
}

export function formatRange(value: DateRangeValue, lang = "en"): string {
  const start = formatDate(value.start, lang);
  const end = value.present || !value.end ? (value.present ? "Present" : "") : formatDate(value.end, lang);
  return [start, end].filter(Boolean).join(" — ");
}

/* ───────────── entries ───────────── */

export type Slot = { def: FieldDef; value: unknown };

/**
 * A type-driven view of a group of fields. Slots are assigned purely from
 * FieldType order (never from keys), which is what lets a user-invented
 * section look native: the first text is the title, the first date is the
 * date, the first image is the cover, and so on. Anything left over lands in
 * `rest` and is rendered by the generic <FieldValue>.
 */
export type Entry = {
  id: string;
  title?: string;
  subtitle?: string;
  date?: string;
  /** Sanitized HTML. */
  body?: string;
  image?: ImageValue;
  tags?: string[];
  links: LinkValue[];
  metric?: MetricValue;
  /** Definition of the field that supplied `metric` (lets layouts without a metric slot fall back to the generic renderer). */
  metricDef?: FieldDef;
  rest: Slot[];
};

export function hostLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function toEntry(id: string, defs: FieldDef[], values: Record<string, unknown>, lang = "en"): Entry {
  const e: Entry = { id, links: [], rest: [] };
  for (const def of defs) {
    const raw = values[def.key];
    if (isEmptyValue(def.type, raw)) continue;
    const v = read(def.type, raw);
    switch (def.type) {
      case "text":
        if (e.title === undefined) e.title = v as string;
        else if (e.subtitle === undefined) e.subtitle = v as string;
        else e.rest.push({ def, value: v });
        break;
      case "longtext":
      case "richtext":
        if (e.body === undefined) e.body = def.type === "richtext" ? sanitizeRichText(v as string) : textToHtml(v as string);
        else e.rest.push({ def, value: v });
        break;
      case "date":
      case "daterange":
        if (e.date === undefined) e.date = def.type === "date" ? formatDate(v as string, lang) : formatRange(v as DateRangeValue, lang);
        else e.rest.push({ def, value: v });
        break;
      case "image":
        if (e.image === undefined) e.image = v as ImageValue;
        else e.rest.push({ def, value: v });
        break;
      case "tags":
        if (e.tags === undefined) e.tags = (v as string[]).filter((t) => t.trim());
        else e.rest.push({ def, value: v });
        break;
      case "metric":
        if (e.metric === undefined) {
          e.metric = v as MetricValue;
          e.metricDef = def;
        } else e.rest.push({ def, value: v });
        break;
      case "link": {
        const l = v as LinkValue;
        e.links.push({ href: l.href, label: l.label || def.label });
        break;
      }
      case "linklist":
        for (const l of v as LinkValue[]) if (l.href) e.links.push({ href: l.href, label: l.label || hostLabel(l.href) });
        break;
      case "url":
        e.links.push({ href: v as string, label: def.label });
        break;
      default:
        e.rest.push({ def, value: v });
    }
  }
  return e;
}

export function isEmptyEntry(e: Entry): boolean {
  return !e.title && !e.subtitle && !e.date && !e.body && !e.image && !e.tags?.length && !e.links.length && !e.metric && !e.rest.length;
}

/* ───────────── sections ───────────── */

const KIND_LAYOUT: Record<string, Layout> = {
  experience: "timeline",
  education: "timeline",
  volunteering: "timeline",
  projects: "grid",
  skills: "tags",
  metrics: "metrics",
  testimonials: "quotes",
  certifications: "list",
  talks: "list",
  publications: "list",
  awards: "list",
};

export function resolveLayout(section: Pick<Section, "kind" | "layout">, entries: Entry[]): Layout {
  if (section.layout && (LAYOUTS as readonly string[]).includes(section.layout)) return section.layout as Layout;
  const preset = KIND_LAYOUT[section.kind];
  if (preset) return preset;
  if (entries.length && entries.every((e) => e.metric && !e.body)) return "metrics";
  if (entries.some((e) => e.image)) return "grid";
  if (entries.length && entries.every((e) => e.date)) return "timeline";
  return "list";
}

export type SectionView = {
  id: string;
  /** In-page anchor (unique). The first section of a preset kind is anchored by its kind, e.g. #projects. */
  anchor: string;
  kind: string;
  title: string;
  subtitle?: string;
  layout: Layout;
  /** The section's single-value fields, if any are filled in. */
  lead: Entry | null;
  entries: Entry[];
  /** Set on sections synced from a connected account. */
  sync?: Sync;
};

/** Key of the generated provenance slot. Field keys start with a letter, so it can never collide with a user field. */
export const SYNC_KEY = "_sync";

/** Key of an entry's checked-proof note. Set only by the builder's server from its own checks, never stored by users. */
export const PROOF_KEY = "_proof";

/** "Link checked · contains your name · 13 Nov 2026" for a server-checked proof link. */
export function proofNote(value: unknown, lang = "en"): string | null {
  const at = value && typeof value === "object" ? (value as { checkedAt?: unknown }).checkedAt : undefined;
  const day = typeof at === "string" ? /^\d{4}-\d{2}-\d{2}/.exec(at)?.[0] : undefined;
  return day ? `Link checked · contains your name · ${formatDate(day, lang)}` : null;
}

/** "Live from leetcode.com · updated 13 Nov 2026 · Verified owner" — never claims more than `sync` says. */
export function provenance(sync: Sync, lang = "en"): string {
  const day = /^\d{4}-\d{2}-\d{2}/.exec(sync.syncedAt)?.[0];
  const when = day ? formatDate(day, lang) : "";
  return [
    `${sync.live === false ? "From" : "Live from"} ${sync.source || sync.provider}`,
    when ? `${sync.live === false ? "as of" : "updated"} ${when}` : "",
    sync.verified ? "Verified owner" : sync.note || "Public profile",
    sync.experimental ? "Experimental" : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function anchorFor(section: Section, taken: Set<string>): string {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const candidates = [isPresetKind(section.kind) && section.kind !== "custom" ? section.kind : "", slug(section.title), slug(section.id)];
  for (const c of candidates) {
    if (c && !taken.has(c)) {
      taken.add(c);
      return c;
    }
  }
  let n = 2;
  const base = slug(section.id) || "section";
  while (taken.has(`${base}-${n}`)) n += 1;
  taken.add(`${base}-${n}`);
  return `${base}-${n}`;
}

export function viewSection(section: Section, lang: string, anchor: string): SectionView | null {
  const lead = toEntry(`${section.id}-lead`, section.fields, Object.fromEntries(section.fields.map((f) => [f.key, f.value])), lang);
  const defs = section.itemSchema ?? [];
  const entries = (section.items ?? [])
    .filter((it) => it.visible !== false)
    .map((it) => {
      const e = toEntry(it.id, defs, it.values, lang);
      const proof = proofNote(it.values[PROOF_KEY], lang);
      if (proof && !isEmptyEntry(e)) e.rest.push({ def: { key: PROOF_KEY, label: "", type: "text" }, value: proof });
      return e;
    })
    .filter((e) => !isEmptyEntry(e));
  const hasLead = !isEmptyEntry(lead);
  if (!hasLead && entries.length === 0) return null;
  const layout = resolveLayout(section, entries);
  // Only "metrics" and "grid" layouts have a dedicated place for a metric. Everywhere
  // else it joins the generically rendered fields, so no value is ever dropped.
  if (layout !== "metrics" && layout !== "grid") {
    for (const e of entries) {
      if (e.metric && e.metricDef) {
        e.rest.unshift({ def: e.metricDef, value: e.metric });
        delete e.metric;
      }
    }
  }
  if (section.sync) {
    // The provenance line rides in `rest`, the one place every template and every layout renders generically.
    const host = hasLead ? lead : entries[entries.length - 1]!;
    host.rest.push({ def: { key: SYNC_KEY, label: "", type: "text" }, value: provenance(section.sync, lang) });
  }
  return {
    id: section.id,
    anchor,
    kind: section.kind,
    title: section.title,
    ...(section.subtitle ? { subtitle: section.subtitle } : {}),
    layout,
    lead: hasLead ? lead : null,
    entries,
    ...(section.sync ? { sync: section.sync } : {}),
  };
}

export type HeroView = {
  name: string;
  headline: string;
  eyebrow?: string;
  /** Sanitized HTML. */
  tagline?: string;
  links: LinkValue[];
  image?: ImageValue;
  rest: Slot[];
  location?: string;
  /** False when the user hid or removed the hero section; templates then show a compact masthead. */
  present: boolean;
};

export type PortfolioView = {
  lang: string;
  hero: HeroView;
  /** Visible, non-empty sections in the user's order (hero excluded). */
  sections: SectionView[];
  socials: (SocialLink & { label: string })[];
  email?: string;
  nav: { href: string; label: string }[];
};

export const SOCIAL_LABELS: Record<SocialLink["platform"], string> = {
  github: "GitHub",
  linkedin: "LinkedIn",
  x: "X",
  mastodon: "Mastodon",
  bluesky: "Bluesky",
  dribbble: "Dribbble",
  behance: "Behance",
  youtube: "YouTube",
  instagram: "Instagram",
  medium: "Medium",
  website: "Website",
  other: "Link",
};

/** Everything a template needs, with hidden and empty content already removed. */
export function viewPortfolio(p: Portfolio): PortfolioView {
  const lang = p.meta.language || "en";
  const taken = new Set<string>(["top", "main"]);
  const heroSection = p.sections.find((s) => s.kind === "hero" && s.visible !== false);
  const heroEntry = heroSection
    ? toEntry("hero", heroSection.fields, Object.fromEntries(heroSection.fields.map((f) => [f.key, f.value])), lang)
    : null;
  const sections: SectionView[] = [];
  for (const s of p.sections) {
    if (s.kind === "hero" || s.visible === false) continue;
    const view = viewSection(s, lang, anchorFor(s, taken));
    if (view) sections.push(view);
  }
  return {
    lang,
    hero: {
      name: p.profile.name || p.meta.title || "Portfolio",
      headline: p.profile.headline,
      ...(heroEntry?.title ? { eyebrow: heroEntry.title } : {}),
      ...(heroEntry?.body ? { tagline: heroEntry.body } : {}),
      links: heroEntry?.links ?? [],
      ...(heroEntry?.image ?? p.profile.avatar?.src ? { image: heroEntry?.image ?? p.profile.avatar } : {}),
      rest: [
        ...(heroEntry?.subtitle ? [{ def: { key: "_sub", label: "", type: "text" as const }, value: heroEntry.subtitle }] : []),
        ...(heroEntry?.rest ?? []),
      ],
      ...(p.profile.location ? { location: p.profile.location } : {}),
      present: Boolean(heroSection),
    },
    sections,
    socials: p.profile.socials.filter((s) => s.url).map((s) => ({ ...s, label: s.label || SOCIAL_LABELS[s.platform] })),
    ...(p.profile.email ? { email: p.profile.email } : {}),
    nav: sections.map((s) => ({ href: `#${s.anchor}`, label: s.title })).filter((n) => n.label),
  };
}

/** Deterministic 32-bit hash for procedural decoration. */
export function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export const isExternal = (href: string) => /^https?:\/\//i.test(href);
