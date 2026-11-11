import { z } from "zod";

/**
 * The Persona portfolio schema.
 *
 * A portfolio is an ordered list of sections. Every section — preset or
 * custom — is described by data (`fields`, `itemSchema`, `items`), never by
 * code, so users can reshape any section and every template can still render it.
 */

export const SCHEMA_VERSION = 1 as const;

export const FIELD_TYPES = [
  "text",
  "longtext",
  "richtext",
  "url",
  "email",
  "phone",
  "number",
  "metric",
  "date",
  "daterange",
  "image",
  "gallery",
  "tags",
  "link",
  "linklist",
  "video",
  "code",
  "select",
] as const;
export const FieldTypeSchema = z.enum(FIELD_TYPES);
export type FieldType = z.infer<typeof FieldTypeSchema>;

export const SECTION_KINDS = [
  "hero",
  "about",
  "experience",
  "projects",
  "skills",
  "education",
  "metrics",
  "testimonials",
  "certifications",
  "talks",
  "publications",
  "awards",
  "volunteering",
  "contact",
  "custom",
] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

/* ───────────────────────── value schemas ───────────────────────── */

const SAFE_URL = /^https?:\/\/[^\s<>"']+$/i;
const LOCAL_PATH = /^\/(?!\/)[^\s<>"']*$/;

/** http(s) only. Empty string is allowed so drafts can be saved mid-edit. */
export const UrlSchema = z
  .string()
  .max(2048)
  .refine((v) => v === "" || SAFE_URL.test(v), "Must be an http(s) URL");

/** A link target: http(s), a same-site path, an in-page anchor, mailto: or tel:. */
export const HrefSchema = z
  .string()
  .max(2048)
  .refine(
    (v) =>
      v === "" ||
      SAFE_URL.test(v) ||
      LOCAL_PATH.test(v) ||
      /^#[\w-]*$/.test(v) ||
      /^mailto:[^\s<>"']+$/i.test(v) ||
      /^tel:[+\d\s().-]+$/i.test(v),
    "Must be an http(s), mailto:, tel: or #anchor link",
  );

/** Image sources: http(s) URL or a same-site absolute path. */
export const SrcSchema = z
  .string()
  .max(2048)
  .refine((v) => v === "" || SAFE_URL.test(v) || LOCAL_PATH.test(v), "Must be an http(s) URL");

export const ImageValueSchema = z.object({
  src: SrcSchema,
  alt: z.string().max(300).default(""),
  width: z.number().int().positive().max(10000).optional(),
  height: z.number().int().positive().max(10000).optional(),
});
export type ImageValue = z.infer<typeof ImageValueSchema>;

export const LinkValueSchema = z.object({ label: z.string().max(120), href: HrefSchema });
export type LinkValue = z.infer<typeof LinkValueSchema>;

export const MetricValueSchema = z.object({ value: z.string().max(40), label: z.string().max(120) });
export type MetricValue = z.infer<typeof MetricValueSchema>;

const YM = z
  .string()
  .regex(/^(\d{4}(-\d{2}(-\d{2})?)?)?$/, "Use YYYY, YYYY-MM or YYYY-MM-DD");
export const DateRangeValueSchema = z.object({
  start: YM,
  end: YM.optional(),
  present: z.boolean().optional(),
});
export type DateRangeValue = z.infer<typeof DateRangeValueSchema>;

export const CodeValueSchema = z.object({ language: z.string().max(40), code: z.string().max(20000) });
export type CodeValue = z.infer<typeof CodeValueSchema>;

/** The Zod schema for the value of each FieldType. */
export const VALUE_SCHEMAS = {
  text: z.string().max(500),
  longtext: z.string().max(10000),
  richtext: z.string().max(40000),
  url: UrlSchema,
  email: z.string().max(320).refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Invalid email"),
  phone: z.string().max(40).refine((v) => v === "" || /^[+\d\s().-]+$/.test(v), "Invalid phone number"),
  number: z.number().finite().nullable(),
  metric: MetricValueSchema,
  date: YM,
  daterange: DateRangeValueSchema,
  image: ImageValueSchema,
  gallery: z.array(ImageValueSchema).max(24),
  tags: z.array(z.string().max(60)).max(60),
  link: LinkValueSchema,
  linklist: z.array(LinkValueSchema).max(24),
  video: UrlSchema,
  code: CodeValueSchema,
  select: z.string().max(120),
} as const satisfies Record<FieldType, z.ZodTypeAny>;

export type FieldValueMap = { [K in FieldType]: z.infer<(typeof VALUE_SCHEMAS)[K]> };
export type FieldValue = FieldValueMap[FieldType];

/** The value a freshly-added field of the given type starts with. */
export function emptyValue<T extends FieldType>(type: T): FieldValueMap[T] {
  const empties: FieldValueMap = {
    text: "",
    longtext: "",
    richtext: "",
    url: "",
    email: "",
    phone: "",
    number: null,
    metric: { value: "", label: "" },
    date: "",
    daterange: { start: "", end: "", present: false },
    image: { src: "", alt: "" },
    gallery: [],
    tags: [],
    link: { label: "", href: "" },
    linklist: [],
    video: "",
    code: { language: "", code: "" },
    select: "",
  };
  return structuredClone(empties[type]);
}

/* ───────────────────────── fields, items, sections ───────────────────────── */

export const FieldKeySchema = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, "Keys start with a letter and use letters, digits or _");

export const FieldDefSchema = z.object({
  key: FieldKeySchema,
  label: z.string().min(1).max(80),
  type: FieldTypeSchema,
  required: z.boolean().optional(),
  placeholder: z.string().max(200).optional(),
  /** Choices for `select` fields. */
  options: z.array(z.string().max(120)).max(40).optional(),
});
export type FieldDef = z.infer<typeof FieldDefSchema>;

function checkValue(type: FieldType, value: unknown, ctx: z.RefinementCtx, path: (string | number)[]) {
  if (value === null || value === undefined) return;
  const res = VALUE_SCHEMAS[type].safeParse(value);
  if (!res.success) {
    for (const issue of res.error.issues) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: issue.message, path: [...path, ...issue.path] });
    }
  }
}

export const FieldSchema = FieldDefSchema.extend({ value: z.unknown() }).superRefine((f, ctx) =>
  checkValue(f.type, f.value, ctx, ["value"]),
);
export type Field = FieldDef & { value: unknown };

export const ItemSchema = z.object({
  id: z.string().min(1).max(64),
  values: z.record(z.string(), z.unknown()),
  visible: z.boolean().default(true),
});
export type Item = z.infer<typeof ItemSchema>;

function uniqueKeys(defs: { key: string }[], ctx: z.RefinementCtx, path: string) {
  const seen = new Set<string>();
  defs.forEach((d, i) => {
    if (seen.has(d.key)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Duplicate field key "${d.key}"`, path: [path, i, "key"] });
    }
    seen.add(d.key);
  });
}

export const SectionSchema = z
  .object({
    id: z.string().min(1).max(64),
    /** A preset kind or "custom". Unknown kinds are rendered generically. */
    kind: z.string().min(1).max(40),
    title: z.string().max(120),
    subtitle: z.string().max(300).optional(),
    visible: z.boolean().default(true),
    layout: z.string().max(40).optional(),
    fields: z.array(FieldSchema).max(40).default([]),
    items: z.array(ItemSchema).max(200).optional(),
    itemSchema: z.array(FieldDefSchema).max(40).optional(),
  })
  .superRefine((s, ctx) => {
    uniqueKeys(s.fields, ctx, "fields");
    if (s.itemSchema) uniqueKeys(s.itemSchema, ctx, "itemSchema");
    const defs = new Map((s.itemSchema ?? []).map((d) => [d.key, d]));
    s.items?.forEach((item, i) => {
      for (const [key, value] of Object.entries(item.values)) {
        const def = defs.get(key);
        // Values without a definition are tolerated (and ignored by renderers)
        // so removing a field from the item shape never invalidates a draft.
        if (def) checkValue(def.type, value, ctx, ["items", i, "values", key]);
      }
    });
  });
export type Section = z.infer<typeof SectionSchema>;

/* ───────────────────────── portfolio ───────────────────────── */

export const SOCIAL_PLATFORMS = [
  "github",
  "linkedin",
  "x",
  "mastodon",
  "bluesky",
  "dribbble",
  "behance",
  "youtube",
  "instagram",
  "medium",
  "website",
  "other",
] as const;

export const SocialLinkSchema = z.object({
  platform: z.enum(SOCIAL_PLATFORMS),
  label: z.string().max(60).optional(),
  url: UrlSchema,
});
export type SocialLink = z.infer<typeof SocialLinkSchema>;

export const SlugSchema = z
  .string()
  .min(3, "At least 3 characters")
  .max(48)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, digits and single dashes only");

export const ThemeSchema = z.object({
  templateId: z.string().min(1).max(40),
  paletteId: z.string().min(1).max(40),
  mode: z.enum(["dark", "light", "system"]).default("system"),
  fontPairId: z.string().min(1).max(40),
  motion: z.enum(["full", "subtle", "none"]).default("full"),
  radius: z.enum(["sharp", "soft", "round"]).default("soft"),
});
export type Theme = z.infer<typeof ThemeSchema>;

export const PortfolioSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  meta: z.object({
    title: z.string().max(120),
    description: z.string().max(300),
    slug: SlugSchema,
    ogImage: SrcSchema.optional(),
    favicon: SrcSchema.optional(),
    language: z.string().min(2).max(12).default("en"),
  }),
  profile: z.object({
    name: z.string().max(100),
    headline: z.string().max(200),
    location: z.string().max(120).optional(),
    avatar: ImageValueSchema.optional(),
    email: VALUE_SCHEMAS.email.optional(),
    socials: z.array(SocialLinkSchema).max(16).default([]),
  }),
  theme: ThemeSchema,
  sections: z.array(SectionSchema).max(60),
});
export type Portfolio = z.infer<typeof PortfolioSchema>;

/** Flattens Zod issues into `{ "sections.2.fields.0.value": "message" }`. */
export function issuesByPath(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[issue.path.join(".")] ??= issue.message;
  return out;
}

let counter = 0;
/** Short unique id for sections and items (not security sensitive). */
export function newId(prefix = "id"): string {
  counter += 1;
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}${counter.toString(36)}`;
}

/** Turns a label into a valid, unique field key. */
export function keyFromLabel(label: string, taken: Iterable<string> = []): string {
  const words = label
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .trim()
    .split(/[\s_]+/)
    .filter(Boolean);
  let base = words
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0]!.toUpperCase() + w.slice(1).toLowerCase()))
    .join("")
    .replace(/[^a-zA-Z0-9_]/g, "");
  if (!/^[a-zA-Z]/.test(base)) base = `f${base}`;
  base = base.slice(0, 32) || "field";
  const used = new Set(taken);
  let key = base;
  for (let n = 2; used.has(key); n += 1) key = `${base}${n}`;
  return key;
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}
