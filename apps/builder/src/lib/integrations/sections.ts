import type { IntegrationConfig, Portfolio, Section, Sync } from "@runtime/schema/portfolio";

/**
 * Pure helpers shared by the server (merge on read) and the editor (toggles).
 *
 * Hidden keys address what a provider produced:
 *   "<section>"            a whole section
 *   "<section>.<fieldKey>" one of its single-value fields (a chart, usually)
 *   "<section>#<itemId>"   one of its entries
 * where <section> is the section id without the integration-id prefix.
 */

export const sectionKey = (cfg: Pick<IntegrationConfig, "id">, sectionId: string) => (sectionId.startsWith(`${cfg.id}_`) ? sectionId.slice(cfg.id.length + 1) : sectionId);
export const sectionId = (cfg: Pick<IntegrationConfig, "id">, key: string) => `${cfg.id}_${key}`;
export const fieldToggle = (sKey: string, fieldKey: string) => `${sKey}.${fieldKey}`;
export const itemToggle = (sKey: string, itemId: string) => `${sKey}#${itemId}`;

/** Removes everything the user switched off; sections left with nothing to show disappear. */
export function applyHidden(sections: Section[], cfg: IntegrationConfig): Section[] {
  const hidden = new Set(cfg.hidden);
  if (!hidden.size) return sections;
  const out: Section[] = [];
  for (const s of sections) {
    const key = sectionKey(cfg, s.id);
    if (hidden.has(key)) continue;
    const fields = s.fields.filter((f) => !hidden.has(fieldToggle(key, f.key)));
    const items = s.items?.filter((it) => !hidden.has(itemToggle(key, it.id)));
    if (!fields.length && !(items?.length ?? 0)) continue;
    out.push({ ...s, fields, ...(items ? { items } : {}) });
  }
  return out;
}

/** A human label for each toggle of a section, for the editor. */
export function toggles(section: Section, cfg: Pick<IntegrationConfig, "id">): { key: string; label: string }[] {
  const key = sectionKey(cfg, section.id);
  const text = (v: unknown): string => {
    if (typeof v === "string") return v;
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      for (const k of ["label", "title", "value"]) if (typeof o[k] === "string" && o[k]) return o[k] as string;
    }
    return "";
  };
  const defs = section.itemSchema ?? [];
  return [
    ...section.fields.map((f) => ({ key: fieldToggle(key, f.key), label: text(f.value) || f.label })),
    ...(section.items ?? []).map((it) => ({
      key: itemToggle(key, it.id),
      label: defs.map((d) => text(it.values[d.key])).find(Boolean) || it.id,
    })),
  ];
}

/**
 * Merges freshly generated synced sections into a document.
 *
 * The document decides *where* a synced section sits, its title and whether it
 * is visible; the snapshot decides *what* it contains. Synced sections that
 * the snapshot no longer backs are dropped. `generated === null` means
 * snapshots could not be read at all: content is kept as stored, but nothing
 * is presented as live or verified, because we cannot vouch for it right now.
 */
export function mergeSynced(doc: Portfolio, generated: Section[] | null): Portfolio {
  if (!doc.sections.some((s) => s.sync)) return doc;
  if (generated === null) {
    return { ...doc, sections: doc.sections.map((s) => (s.sync ? { ...s, sync: { ...s.sync, verified: false, live: false } } : s)) };
  }
  const fresh = new Map(generated.map((s) => [s.id, s]));
  const sections: Section[] = [];
  for (const s of doc.sections) {
    if (!s.sync) {
      sections.push(s);
      continue;
    }
    const next = fresh.get(s.id);
    if (next) sections.push({ ...next, title: s.title || next.title, visible: s.visible });
  }
  return { ...doc, sections };
}

/**
 * Adds sections that are new to the document: after the last synced section of
 * the same account, else after the section `after` names, else before Contact.
 */
export function addMissing(doc: Portfolio, generated: Section[], after?: string): Portfolio {
  const have = new Set(doc.sections.map((s) => s.id));
  const missing = generated.filter((s) => !have.has(s.id));
  if (!missing.length) return doc;
  const sections = [...doc.sections];
  for (const s of missing) {
    const sameAccount = (x: Section) => x.sync?.provider === s.sync?.provider && x.sync?.account === s.sync?.account;
    let at = sections.findLastIndex(sameAccount);
    if (at < 0 && after) at = sections.findIndex((x) => x.id === after);
    if (at < 0) {
      const contact = sections.findIndex((x) => x.kind === "contact");
      at = contact < 0 ? sections.length - 1 : contact - 1;
    }
    sections.splice(at + 1, 0, s);
  }
  return { ...doc, sections };
}

export const stamp = (sections: Section[], sync: Sync): Section[] => sections.map((s) => ({ ...s, sync }));

const ofAccount = (cfgId: string) => (s: Section) => Boolean(s.sync) && s.id.startsWith(`${cfgId}_`);

/**
 * The editor's side of a connection: stores the account's choices and brings
 * its synced sections up to date, keeping where the user put them, their
 * titles and visibility. New sections go after `after` (a section id) if given.
 */
export function syncAccount(doc: Portfolio, cfg: IntegrationConfig, generated: Section[], after?: string): Portfolio {
  const mine = ofAccount(cfg.id);
  const fresh = new Map(generated.map((s) => [s.id, s]));
  const sections = doc.sections.flatMap((s) => {
    if (!mine(s)) return [s];
    const next = fresh.get(s.id);
    return next ? [{ ...next, title: s.title || next.title, visible: s.visible }] : [];
  });
  const configs = doc.integrations ?? [];
  const integrations = configs.some((c) => c.id === cfg.id) ? configs.map((c) => (c.id === cfg.id ? cfg : c)) : [...configs, cfg];
  return addMissing({ ...doc, sections, integrations }, generated, after);
}

/** Removes a disconnected account's choices and synced sections. */
export function removeAccount(doc: Portfolio, cfgId: string): Portfolio {
  const mine = ofAccount(cfgId);
  return { ...doc, sections: doc.sections.filter((s) => !mine(s)), integrations: (doc.integrations ?? []).filter((c) => c.id !== cfgId) };
}

const canonical = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, canonical((v as Record<string, unknown>)[k])]),
    );
  return v;
};
const sameData = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

/**
 * Brings a draft in line with the latest snapshots (a background refresh may
 * have fetched newer data since it was saved). Returns the same document when
 * nothing changed. Accounts the draft has no choices for are left alone.
 */
export function resync(doc: Portfolio, connections: { id: string; available: Section[] }[]): Portfolio {
  let next = doc;
  for (const c of connections) {
    const cfg = doc.integrations?.find((x) => x.id === c.id);
    if (cfg) next = syncAccount(next, cfg, applyHidden(c.available, cfg));
  }
  return sameData(next, doc) ? doc : next;
}

/** Key the renderer reads for a checked proof link (see @runtime/render/view PROOF_KEY). */
export const PROOF_KEY = "_proof";

/** Removes any proof marks a document carries: only the server's own checks may add them. */
export function stripProofs(doc: Portfolio): Portfolio {
  if (!doc.sections.some((s) => s.items?.some((it) => PROOF_KEY in it.values))) return doc;
  return {
    ...doc,
    sections: doc.sections.map((s) =>
      s.items?.some((it) => PROOF_KEY in it.values)
        ? {
            ...s,
            items: s.items.map((it) => {
              if (!(PROOF_KEY in it.values)) return it;
              const { [PROOF_KEY]: _gone, ...values } = it.values;
              return { ...it, values };
            }),
          }
        : s,
    ),
  };
}

/** The https links of an entry (its `url` and `link` fields). */
export function entryLinks(section: Section, values: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const def of section.itemSchema ?? []) {
    const v = values[def.key];
    const href = def.type === "url" ? v : def.type === "link" && v && typeof v === "object" ? (v as { href?: unknown }).href : undefined;
    if (typeof href === "string" && href.startsWith("https://")) out.push(href);
  }
  return out;
}

export const normalizeName = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export type ProofCheck = { url: string; ok: boolean; nameFound: boolean; reason?: string };

/**
 * Marks the user's own entries whose proof link was fetched and showed their
 * name. Only for the name that was checked: after a rename nothing is marked
 * until the next check.
 */
export function annotateProofs(doc: Portfolio, checks: { name: string; checkedAt: string; checks: ProofCheck[] }): Portfolio {
  if (normalizeName(doc.profile.name) !== normalizeName(checks.name)) return doc;
  const good = new Set(checks.checks.filter((c) => c.ok && c.nameFound).map((c) => c.url));
  if (!good.size) return doc;
  return {
    ...doc,
    sections: doc.sections.map((s) => {
      if (s.sync || !s.items?.length) return s;
      let changed = false;
      const items = s.items.map((it) => {
        if (!entryLinks(s, it.values).some((u) => good.has(u))) return it;
        changed = true;
        return { ...it, values: { ...it.values, [PROOF_KEY]: { checkedAt: checks.checkedAt } } };
      });
      return changed ? { ...s, items } : s;
    }),
  };
}
