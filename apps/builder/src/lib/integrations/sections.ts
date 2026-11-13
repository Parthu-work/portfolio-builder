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

/** Adds sections that are new to the document (after the last synced section of the same account, else at the end, before Contact). */
export function addMissing(doc: Portfolio, generated: Section[]): Portfolio {
  const have = new Set(doc.sections.map((s) => s.id));
  const missing = generated.filter((s) => !have.has(s.id));
  if (!missing.length) return doc;
  const sections = [...doc.sections];
  for (const s of missing) {
    const sameAccount = (x: Section) => x.sync?.provider === s.sync?.provider && x.sync?.account === s.sync?.account;
    let at = sections.findLastIndex(sameAccount);
    if (at < 0) {
      const contact = sections.findIndex((x) => x.kind === "contact");
      at = contact < 0 ? sections.length - 1 : contact - 1;
    }
    sections.splice(at + 1, 0, s);
  }
  return { ...doc, sections };
}

export const stamp = (sections: Section[], sync: Sync): Section[] => sections.map((s) => ({ ...s, sync }));
