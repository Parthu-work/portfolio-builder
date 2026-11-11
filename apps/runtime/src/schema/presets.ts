import {
  emptyValue,
  newId,
  type Field,
  type FieldDef,
  type FieldType,
  type Item,
  type Section,
  type SectionKind,
} from "./portfolio";

export type SectionPreset = {
  kind: SectionKind;
  label: string;
  description: string;
  title: string;
  /** Default layout hint. Templates map this to their own variant. */
  layout?: string;
  fields: FieldDef[];
  itemSchema?: FieldDef[];
  /** Singular noun for one item ("Add project"). */
  itemLabel?: string;
};

const f = (key: string, label: string, type: FieldType, extra: Partial<FieldDef> = {}): FieldDef => ({
  key,
  label,
  type,
  ...extra,
});

export const SECTION_PRESETS: Record<SectionKind, SectionPreset> = {
  hero: {
    kind: "hero",
    label: "Hero",
    description: "The opening statement: who you are and what to do next.",
    title: "Intro",
    fields: [
      f("eyebrow", "Eyebrow", "text", { placeholder: "Available for new work" }),
      f("tagline", "Tagline", "longtext", { placeholder: "One or two sentences on what you do best." }),
      f("cta", "Primary button", "link"),
      f("secondaryCta", "Secondary button", "link"),
    ],
  },
  about: {
    kind: "about",
    label: "About",
    description: "A short bio in your own voice.",
    title: "About",
    fields: [
      f("body", "Bio", "richtext", { required: true }),
      f("portrait", "Portrait", "image"),
      f("highlights", "Highlights", "tags"),
    ],
  },
  experience: {
    kind: "experience",
    label: "Experience",
    description: "Roles you have held, newest first.",
    title: "Experience",
    layout: "timeline",
    itemLabel: "role",
    fields: [],
    itemSchema: [
      f("role", "Role", "text", { required: true }),
      f("company", "Company", "text", { required: true }),
      f("period", "Period", "daterange"),
      f("summary", "Summary", "richtext"),
      f("stack", "Stack", "tags"),
      f("link", "Link", "link"),
    ],
  },
  projects: {
    kind: "projects",
    label: "Projects",
    description: "Selected work with outcomes.",
    title: "Selected work",
    layout: "grid",
    itemLabel: "project",
    fields: [],
    itemSchema: [
      f("title", "Title", "text", { required: true }),
      f("role", "Your role", "text"),
      f("summary", "Summary", "longtext"),
      f("image", "Cover image", "image"),
      f("tags", "Tags", "tags"),
      f("impact", "Headline metric", "metric"),
      f("link", "Live link", "link"),
      f("repo", "Source", "url"),
    ],
  },
  skills: {
    kind: "skills",
    label: "Skills",
    description: "Grouped capabilities and tools.",
    title: "Skills",
    layout: "tags",
    itemLabel: "group",
    fields: [],
    itemSchema: [f("group", "Group", "text", { required: true }), f("skills", "Skills", "tags")],
  },
  education: {
    kind: "education",
    label: "Education",
    description: "Degrees and programmes.",
    title: "Education",
    layout: "timeline",
    itemLabel: "entry",
    fields: [],
    itemSchema: [
      f("degree", "Degree", "text", { required: true }),
      f("school", "School", "text", { required: true }),
      f("period", "Period", "daterange"),
      f("summary", "Notes", "longtext"),
    ],
  },
  metrics: {
    kind: "metrics",
    label: "Metrics",
    description: "Numbers that prove impact.",
    title: "By the numbers",
    layout: "metrics",
    itemLabel: "metric",
    fields: [],
    itemSchema: [f("metric", "Metric", "metric", { required: true }), f("context", "Context", "text")],
  },
  testimonials: {
    kind: "testimonials",
    label: "Testimonials",
    description: "What colleagues and clients say.",
    title: "Kind words",
    layout: "quotes",
    itemLabel: "testimonial",
    fields: [],
    itemSchema: [
      f("author", "Author", "text", { required: true }),
      f("role", "Role", "text"),
      f("quote", "Quote", "longtext", { required: true }),
      f("avatar", "Avatar", "image"),
    ],
  },
  certifications: {
    kind: "certifications",
    label: "Certifications",
    description: "Credentials and licences.",
    title: "Certifications",
    layout: "list",
    itemLabel: "certification",
    fields: [],
    itemSchema: [
      f("name", "Name", "text", { required: true }),
      f("issuer", "Issuer", "text"),
      f("date", "Date", "date"),
      f("link", "Credential URL", "url"),
    ],
  },
  talks: {
    kind: "talks",
    label: "Talks",
    description: "Conference talks, podcasts and workshops.",
    title: "Talks",
    layout: "list",
    itemLabel: "talk",
    fields: [],
    itemSchema: [
      f("title", "Title", "text", { required: true }),
      f("event", "Event", "text"),
      f("date", "Date", "date"),
      f("link", "Link", "link"),
      f("video", "Video URL", "video"),
    ],
  },
  publications: {
    kind: "publications",
    label: "Publications",
    description: "Articles, papers and books.",
    title: "Writing",
    layout: "list",
    itemLabel: "publication",
    fields: [],
    itemSchema: [
      f("title", "Title", "text", { required: true }),
      f("publisher", "Publisher", "text"),
      f("date", "Date", "date"),
      f("summary", "Summary", "longtext"),
      f("link", "Link", "link"),
    ],
  },
  awards: {
    kind: "awards",
    label: "Awards",
    description: "Recognition and honours.",
    title: "Awards",
    layout: "list",
    itemLabel: "award",
    fields: [],
    itemSchema: [
      f("title", "Title", "text", { required: true }),
      f("issuer", "Issuer", "text"),
      f("date", "Date", "date"),
      f("summary", "Summary", "longtext"),
    ],
  },
  volunteering: {
    kind: "volunteering",
    label: "Volunteering",
    description: "Community work and mentoring.",
    title: "Volunteering",
    layout: "timeline",
    itemLabel: "role",
    fields: [],
    itemSchema: [
      f("role", "Role", "text", { required: true }),
      f("organization", "Organization", "text"),
      f("period", "Period", "daterange"),
      f("summary", "Summary", "longtext"),
    ],
  },
  contact: {
    kind: "contact",
    label: "Contact",
    description: "How people can reach you.",
    title: "Get in touch",
    fields: [
      f("blurb", "Invitation", "longtext", { placeholder: "What should people contact you about?" }),
      f("email", "Email", "email"),
      f("phone", "Phone", "phone"),
      f("calendar", "Booking link", "link"),
      f("links", "Other links", "linklist"),
    ],
  },
  custom: {
    kind: "custom",
    label: "Custom section",
    description: "Invent your own: patents, press, side quests — any shape you like.",
    title: "New section",
    layout: "list",
    itemLabel: "entry",
    fields: [],
    itemSchema: [f("title", "Title", "text", { required: true }), f("description", "Description", "longtext")],
  },
};

export function isPresetKind(kind: string): kind is SectionKind {
  return Object.prototype.hasOwnProperty.call(SECTION_PRESETS, kind);
}

export function presetFor(kind: string): SectionPreset {
  return isPresetKind(kind) ? SECTION_PRESETS[kind] : SECTION_PRESETS.custom;
}

export function fieldFromDef(def: FieldDef, value?: unknown): Field {
  return { ...def, value: value === undefined ? emptyValue(def.type) : value };
}

export function createItem(itemSchema: FieldDef[], values: Record<string, unknown> = {}): Item {
  const filled: Record<string, unknown> = {};
  for (const def of itemSchema) filled[def.key] = values[def.key] ?? emptyValue(def.type);
  return { id: newId("it"), values: filled, visible: true };
}

/** A new section of the given kind with its default fields and item shape. */
export function createSection(kind: string, overrides: Partial<Section> = {}): Section {
  const preset = presetFor(kind);
  return {
    id: newId("sec"),
    kind,
    title: preset.title,
    visible: true,
    ...(preset.layout ? { layout: preset.layout } : {}),
    fields: preset.fields.map((d) => fieldFromDef(d)),
    ...(preset.itemSchema ? { itemSchema: structuredClone(preset.itemSchema), items: [] } : {}),
    ...overrides,
  };
}
