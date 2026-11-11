import { describe, expect, it } from "vitest";
import { FIELD_TYPES, PortfolioSchema, SECTION_KINDS, SectionSchema, emptyValue, keyFromLabel, slugify, VALUE_SCHEMAS } from "./portfolio";
import { SECTION_PRESETS, createItem, createSection } from "./presets";
import { SEEDS } from "./seeds";
import { blankPortfolio, switchTemplate } from "./factory";
import { MigrationError, migrate } from "./migrate";
import { TEMPLATES } from "../templates/meta";

describe("portfolio schema", () => {
  it.each(Object.entries(SEEDS))("seed %s is valid and references a real template/palette/font", (_, seed) => {
    const parsed = PortfolioSchema.parse(seed.portfolio);
    const t = TEMPLATES.find((x) => x.id === parsed.theme.templateId);
    expect(t).toBeDefined();
    expect(t!.palettes.some((p) => p.id === parsed.theme.paletteId)).toBe(true);
    expect(t!.fontPairs.some((p) => p.id === parsed.theme.fontPairId)).toBe(true);
  });

  it("has a preset with a default shape for every section kind", () => {
    for (const kind of SECTION_KINDS) {
      const s = createSection(kind);
      expect(SectionSchema.safeParse(s).success).toBe(true);
      expect(SECTION_PRESETS[kind].fields.length + (SECTION_PRESETS[kind].itemSchema?.length ?? 0)).toBeGreaterThan(0);
    }
  });

  it("empty values of every field type validate", () => {
    for (const type of FIELD_TYPES) expect(VALUE_SCHEMAS[type].safeParse(emptyValue(type)).success).toBe(true);
  });

  it("accepts a user-invented section with custom fields", () => {
    const patents = createSection("custom", {
      title: "Patents",
      itemSchema: [
        { key: "title", label: "Title", type: "text" },
        { key: "patentNo", label: "Patent no.", type: "text" },
        { key: "link", label: "Link", type: "url" },
        { key: "date", label: "Date", type: "date" },
      ],
    });
    patents.items = [createItem(patents.itemSchema!, { title: "Widget", patentNo: "US 1", link: "https://example.com", date: "2024-01" })];
    expect(SectionSchema.safeParse(patents).success).toBe(true);
    expect(SectionSchema.safeParse({ ...patents, kind: "patents" }).success).toBe(true);
  });

  it("rejects non-http(s) URLs and javascript: links", () => {
    expect(VALUE_SCHEMAS.url.safeParse("javascript:alert(1)").success).toBe(false);
    expect(VALUE_SCHEMAS.url.safeParse("ftp://example.com").success).toBe(false);
    expect(VALUE_SCHEMAS.link.safeParse({ label: "x", href: "javascript:alert(1)" }).success).toBe(false);
    expect(VALUE_SCHEMAS.image.safeParse({ src: "data:image/png;base64,AAAA", alt: "" }).success).toBe(false);
    expect(VALUE_SCHEMAS.image.safeParse({ src: "//evil.example/x.png", alt: "" }).success).toBe(false);
    expect(VALUE_SCHEMAS.link.safeParse({ label: "x", href: "mailto:a@b.co" }).success).toBe(true);
    expect(VALUE_SCHEMAS.url.safeParse("https://example.com/a?b=c").success).toBe(true);
  });

  it("validates item values against the item shape and reports the path", () => {
    const s = createSection("projects");
    s.items = [{ id: "a", visible: true, values: { title: "ok", repo: "notaurl" } }];
    const res = SectionSchema.safeParse(s);
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0]!.path).toEqual(["items", 0, "values", "repo"]);
  });

  it("rejects duplicate field keys", () => {
    const s = createSection("about");
    s.fields.push({ ...s.fields[0]! });
    expect(SectionSchema.safeParse(s).success).toBe(false);
  });

  it("generates unique, valid keys from labels", () => {
    expect(keyFromLabel("Patent no.")).toBe("patentNo");
    expect(keyFromLabel("Title", ["title"])).toBe("title2");
    expect(keyFromLabel("123 go")).toMatch(/^f123Go$/);
    expect(keyFromLabel("???")).toBe("f");
    expect(slugify("Inés Carvalho!")).toBe("ines-carvalho");
  });

  it("switching template preserves content and resets template-specific ids", () => {
    const before = SEEDS.developer.portfolio;
    const after = switchTemplate(before, "editorial");
    expect(after.sections).toEqual(before.sections);
    expect(after.profile).toEqual(before.profile);
    expect(after.theme.templateId).toBe("editorial");
    expect(after.theme.paletteId).toBe("paper");
    expect(after.theme.mode).toBe(before.theme.mode);
    expect(PortfolioSchema.safeParse(after).success).toBe(true);
  });

  it("blank portfolios are valid for every template", () => {
    for (const t of TEMPLATES) expect(PortfolioSchema.safeParse(blankPortfolio({ name: "A B", slug: "a-b", templateId: t.id })).success).toBe(true);
  });
});

describe("migrate", () => {
  it("passes current-version portfolios through unchanged", () => {
    expect(migrate(SEEDS.designer.portfolio)).toEqual(SEEDS.designer.portfolio);
  });

  it("upgrades a v0 portfolio", () => {
    const v0 = {
      meta: { title: "Old", description: "", slug: "old-site" },
      profile: { name: "Old Timer", headline: "Hi", avatar: "https://example.com/me.png" },
      theme: { template: "signal", palette: "cobalt", font: "all-mono", animations: false },
      sections: [
        {
          id: "p",
          type: "projects",
          title: "Work",
          hidden: true,
          itemSchema: [
            { key: "title", label: "Title", type: "text" },
            { key: "image", label: "Image", type: "image" },
          ],
          items: [{ id: "1", title: "Thing", image: "https://example.com/a.png", hidden: true }],
        },
      ],
    };
    const p = migrate(v0);
    expect(p.schemaVersion).toBe(1);
    expect(p.theme).toMatchObject({ templateId: "signal", paletteId: "cobalt", fontPairId: "all-mono", motion: "none", mode: "system" });
    expect(p.profile.avatar).toEqual({ src: "https://example.com/me.png", alt: "Old Timer" });
    expect(p.sections[0]).toMatchObject({ kind: "projects", visible: false });
    expect(p.sections[0]!.items![0]).toMatchObject({ visible: false, values: { title: "Thing", image: { src: "https://example.com/a.png", alt: "" } } });
  });

  it("drops fields with unknown types instead of failing", () => {
    const p = structuredClone(SEEDS.developer.portfolio) as unknown as { sections: { fields: unknown[] }[] };
    p.sections[0]!.fields.push({ key: "weird", label: "Weird", type: "hologram", value: 1 });
    expect(migrate(p).sections[0]!.fields.some((f) => f.key === "weird")).toBe(false);
  });

  it("rejects newer versions and garbage", () => {
    expect(() => migrate({ ...SEEDS.developer.portfolio, schemaVersion: 99 })).toThrow(MigrationError);
    expect(() => migrate("nope")).toThrow(MigrationError);
    expect(() => migrate({ schemaVersion: 1 })).toThrow(MigrationError);
  });
});
