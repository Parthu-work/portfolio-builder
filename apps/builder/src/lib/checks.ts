import type { ImageValue, Portfolio } from "@runtime/schema/portfolio";
import { isEmptyValue, viewPortfolio } from "@runtime/render/view";

export type Check = { id: string; label: string; done: boolean };
export type Warning = { id: string; kind: "alt" | "required" | "link"; message: string; sectionId?: string };

/** The completeness meter: a short checklist of what makes a portfolio feel finished. */
export function completeness(p: Portfolio): { checks: Check[]; percent: number } {
  const v = viewPortfolio(p);
  const kinds = new Set(v.sections.map((s) => s.kind));
  const withItems = v.sections.filter((s) => s.entries.length > 0);
  const checks: Check[] = [
    { id: "name", label: "Add your name", done: p.profile.name.trim().length > 0 },
    { id: "headline", label: "Write a headline", done: p.profile.headline.trim().length > 0 },
    { id: "tagline", label: "Write a hero tagline", done: Boolean(v.hero.tagline) },
    { id: "about", label: "Tell your story in About", done: kinds.has("about") },
    { id: "work", label: "Show at least one project or role", done: withItems.some((s) => ["projects", "experience"].includes(s.kind)) || withItems.length > 0 },
    { id: "three", label: "Have three or more sections with content", done: v.sections.length >= 3 },
    { id: "contact", label: "Give people a way to reach you", done: Boolean(p.profile.email) || kinds.has("contact") || v.socials.length > 0 },
    { id: "description", label: "Add a page description for search engines", done: p.meta.description.trim().length >= 20 },
  ];
  return { checks, percent: Math.round((checks.filter((c) => c.done).length / checks.length) * 100) };
}

/** Content warnings: images without alt text and required fields left empty. */
export function contentWarnings(p: Portfolio): Warning[] {
  const out: Warning[] = [];
  const alt = (img: unknown, where: string, id: string, sectionId?: string) => {
    const i = img as ImageValue | null | undefined;
    if (i && typeof i.src === "string" && i.src && !(i.alt ?? "").trim()) out.push({ id, kind: "alt", message: `${where}: image has no alt text`, ...(sectionId ? { sectionId } : {}) });
  };
  alt(p.profile.avatar, "Profile avatar", "alt:avatar");
  for (const s of p.sections) {
    if (!s.visible) continue;
    const name = s.title || s.kind;
    for (const f of s.fields) {
      if (f.type === "image") alt(f.value, `${name} › ${f.label}`, `alt:${s.id}:${f.key}`, s.id);
      if (f.type === "gallery" && Array.isArray(f.value)) f.value.forEach((g, n) => alt(g, `${name} › ${f.label} #${n + 1}`, `alt:${s.id}:${f.key}:${n}`, s.id));
      if (f.required && isEmptyValue(f.type, f.value)) out.push({ id: `req:${s.id}:${f.key}`, kind: "required", message: `${name}: “${f.label}” is required`, sectionId: s.id });
    }
    (s.items ?? []).forEach((item, n) => {
      if (!item.visible) return;
      for (const d of s.itemSchema ?? []) {
        const v = item.values[d.key];
        const where = `${name} #${n + 1} › ${d.label}`;
        if (d.type === "image") alt(v, where, `alt:${s.id}:${item.id}:${d.key}`, s.id);
        if (d.type === "gallery" && Array.isArray(v)) v.forEach((g, m) => alt(g, `${where} #${m + 1}`, `alt:${s.id}:${item.id}:${d.key}:${m}`, s.id));
        if (d.required && isEmptyValue(d.type, v)) out.push({ id: `req:${s.id}:${item.id}:${d.key}`, kind: "required", message: `${name} #${n + 1}: “${d.label}” is required`, sectionId: s.id });
      }
    });
  }
  return out;
}
