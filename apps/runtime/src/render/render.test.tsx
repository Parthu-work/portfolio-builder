import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FIELD_TYPES, type FieldType } from "../schema/portfolio";
import { createSection } from "../schema/presets";
import { SEEDS } from "../schema/seeds";
import { FIXTURE_CHARTS, fixturePortfolio } from "../schema/seeds/fixture";
import { FieldValue, Rest } from "./FieldValue";
import { sanitizeRichText, safeHref, textToHtml } from "./sanitize";
import { formatDate, formatRange, isEmptyValue, proofNote, provenance, toEntry, viewPortfolio, viewSection } from "./view";
import { contrast, oklchToSrgb, toHex, paletteGrade } from "./color";
import { TEMPLATES } from "../templates/meta";

const SAMPLE: Record<FieldType, unknown> = {
  text: "Plain text",
  longtext: "Line one\n\nLine <two>",
  richtext: "<p>Hello <strong>bold</strong></p>",
  url: "https://example.com/page",
  email: "a@example.com",
  phone: "+1 (555) 010-9999",
  number: 12345,
  metric: { value: "42%", label: "uplift" },
  date: "2024-03",
  daterange: { start: "2020-01", end: "", present: true },
  image: { src: "https://example.com/a.png", alt: "A thing" },
  gallery: [{ src: "https://example.com/1.png", alt: "One" }, { src: "", alt: "" }],
  tags: ["alpha", "beta"],
  link: { label: "Docs", href: "https://example.com/docs" },
  linklist: [{ label: "One", href: "https://example.com/1" }],
  video: "https://example.com/watch?v=1",
  code: { language: "ts", code: "const a = 1 < 2;" },
  select: "Option A",
  chart: FIXTURE_CHARTS.bars,
};

describe("generic field renderer", () => {
  it.each(FIELD_TYPES)("renders %s", (type) => {
    const html = renderToStaticMarkup(<FieldValue def={{ type, label: "Label" }} value={SAMPLE[type]} />);
    expect(html.length).toBeGreaterThan(0);
    expect(html).not.toContain("<script");
  });

  it.each(FIELD_TYPES)("renders nothing for an empty or malformed %s", (type) => {
    expect(renderToStaticMarkup(<FieldValue def={{ type, label: "L" }} value={null} />)).toBe("");
    if (type !== "number") expect(renderToStaticMarkup(<FieldValue def={{ type, label: "L" }} value={{ nonsense: true }} />)).toBe("");
  });

  it("escapes text and code, formats dates, numbers and links", () => {
    expect(renderToStaticMarkup(<FieldValue def={{ type: "longtext", label: "" }} value={SAMPLE.longtext} />)).toContain("Line &lt;two&gt;");
    expect(renderToStaticMarkup(<FieldValue def={{ type: "code", label: "Snippet" }} value={SAMPLE.code} />)).toContain("1 &lt; 2");
    expect(renderToStaticMarkup(<FieldValue def={{ type: "date", label: "" }} value="2024-03" />)).toContain("Mar 2024");
    expect(renderToStaticMarkup(<FieldValue def={{ type: "number", label: "" }} value={12345} />)).toContain("12,345");
    const link = renderToStaticMarkup(<FieldValue def={{ type: "url", label: "" }} value="https://www.example.com/x" />);
    expect(link).toContain('rel="noopener noreferrer"');
    expect(link).toContain("example.com");
    expect(renderToStaticMarkup(<FieldValue def={{ type: "phone", label: "" }} value="+1 (555) 010" />)).toContain('href="tel:+1555010"');
  });

  it("renders leftover slots as a labelled list and skips empties", () => {
    const html = renderToStaticMarkup(
      <Rest slots={[{ def: { key: "a", label: "Patent no.", type: "text" }, value: "EP 1" }, { def: { key: "b", label: "Empty", type: "tags" }, value: [] }]} />,
    );
    expect(html).toContain("<dt>Patent no.</dt>");
    expect(html).toContain("EP 1");
  });
});

describe("charts", () => {
  const draw = (chart: unknown) => renderToStaticMarkup(<FieldValue def={{ type: "chart", label: "Chart" }} value={chart} />);

  it.each(Object.values(FIXTURE_CHARTS))("draws $variant as labelled inline SVG with a data table", (chart) => {
    const html = draw(chart);
    expect(html).toContain(`data-variant="${chart.variant}"`);
    expect(html).toContain(`role="img" aria-label="${chart.summary}"`);
    expect(html).toMatch(/viewBox="0 0 [\d.]+ [\d.]+"/);
    expect(html).toMatch(/aspect-ratio:\s*[\d.]+ \/ [\d.]+/);
    // Colours come from theme tokens only: no hard-coded colour anywhere.
    expect(html).toContain("var(--sig)");
    expect(html).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i);
    expect(html).not.toMatch(/<animate|animation|transition/);
    // Every point is in the fallback table.
    expect(html.match(/<tr>/g)!.length).toBe(chart.points.length + 1);
  });

  it("draws exactly the given numbers", () => {
    const html = draw(FIXTURE_CHARTS.rings);
    for (const n of ["180", "192", "40"]) expect(html).toContain(`>${n}</text>`);
    expect(draw(FIXTURE_CHARTS.heatmap).match(/<rect/g)!.length).toBe(364);
  });

  it("renders nothing without points, and survives a single point and all-zero data", () => {
    expect(draw({ variant: "line", title: "T", summary: "S", points: [] })).toBe("");
    expect(draw({ variant: "line", title: "T", summary: "S", points: [{ x: "a", y: 5 }] })).not.toContain("NaN");
    for (const variant of ["heatmap", "line", "bars", "rings"]) {
      const html = draw({ variant, title: "T", summary: "S", points: [{ x: "a", y: 0 }, { x: "b", y: 0 }] });
      expect(html).toContain("<svg");
      expect(html).not.toMatch(/NaN|Infinity/);
    }
  });

  it("escapes labels", () => {
    expect(draw({ variant: "bars", title: "<b>x</b>", summary: "a \"q\" <i>", points: [{ x: "<script>", y: 1 }] })).not.toMatch(/<script|<b>|<i>/);
  });
});

describe("synced sections", () => {
  const sync = { provider: "leetcode", account: "maya", syncedAt: "2026-11-13T08:00:00.000Z", verified: true, source: "leetcode.com" };

  it("words provenance from the sync metadata and never overclaims", () => {
    expect(provenance(sync)).toBe("Live from leetcode.com · updated Nov 13, 2026 · Verified owner");
    expect(provenance({ ...sync, verified: false, experimental: true })).toBe("Live from leetcode.com · updated Nov 13, 2026 · Public profile · Experimental");
    expect(provenance({ ...sync, verified: false, note: "Issuer-verified on Credly", source: undefined })).toBe("Live from leetcode · updated Nov 13, 2026 · Issuer-verified on Credly");
    expect(provenance({ ...sync, live: false })).toBe("From leetcode.com · as of Nov 13, 2026 · Verified owner");
    expect(provenance({ ...sync, syncedAt: "nonsense" })).toBe("Live from leetcode.com · Verified owner");
  });

  it("adds one provenance line per synced section, through the generic renderer", () => {
    const view = viewPortfolio(fixturePortfolio);
    const synced = view.sections.find((s) => s.id === "synced")!;
    expect(synced.sync?.provider).toBe("github");
    const slots = [synced.lead, ...synced.entries].flatMap((e) => e?.rest ?? []).filter((r) => r.def.key === "_sync");
    expect(slots).toHaveLength(1);
    expect(synced.lead!.rest.map((r) => r.def.type)).toEqual(["chart", "text"]);
    const html = renderToStaticMarkup(<Rest slots={synced.lead!.rest} />);
    expect(html).toContain("pf-sync");
    expect(html).toContain("Live from github.com · updated Nov 13, 2026 · Verified owner");
    // Sections without sync are untouched.
    expect(view.sections.filter((s) => s.id !== "synced").flatMap((s) => [s.lead, ...s.entries]).flatMap((e) => e?.rest ?? []).some((r) => r.def.key === "_sync")).toBe(false);
  });

  it("adds a quiet proof note to entries the server checked, and nothing for malformed values", () => {
    const section = { id: "c", kind: "certifications", title: "Certs", visible: true, fields: [], itemSchema: [{ key: "name", label: "Name", type: "text" as const }], items: [
      { id: "a", visible: true, values: { name: "AWS SAA", _proof: { checkedAt: "2026-11-13T08:00:00.000Z" } } },
      { id: "b", visible: true, values: { name: "Other", _proof: { checkedAt: "yesterday" } } },
      { id: "e", visible: true, values: { _proof: { checkedAt: "2026-11-13" } } },
    ] };
    const view = viewSection(section, "en", "c")!;
    expect(view.entries.map((e) => e.rest.map((r) => r.value))).toEqual([["Link checked · contains your name · Nov 13, 2026"], []]);
    expect(proofNote(undefined)).toBeNull();
    expect(renderToStaticMarkup(<Rest slots={view.entries[0]!.rest} />)).toContain("pf-proof");
  });

  it("puts provenance on the last entry when a synced section has no lead", () => {
    const s = createSection("awards");
    const view = viewSection({ ...s, sync, items: [{ id: "a", visible: true, values: { title: "Knight" } }, { id: "b", visible: true, values: { title: "Guardian" } }] }, "en", "x")!;
    expect(view.lead).toBeNull();
    expect(view.entries.map((e) => e.rest.length)).toEqual([0, 1]);
  });
});

describe("sanitizer", () => {
  it("keeps the allowlist and strips everything else", () => {
    expect(sanitizeRichText('<p onclick="x()">Hi <b>there</b> <u>u</u><img src=x onerror=alert(1)></p>')).toBe("<p>Hi <b>there</b> u</p>");
    expect(sanitizeRichText("<ul><li>a</li><li>b</li></ul>")).toBe("<ul><li>a</li><li>b</li></ul>");
  });
  it("drops script/style with their content", () => {
    expect(sanitizeRichText("<p>a</p><script>alert(1)</script><style>p{}</style><p>b</p>")).toBe("<p>a</p><p>b</p>");
    expect(sanitizeRichText("a<script>alert(1)")).toBe("a");
    expect(sanitizeRichText("<svg><script>x</script></svg>ok")).toBe("ok");
  });
  it("only allows safe hrefs", () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
    expect(sanitizeRichText('<a href="jav&#x61;script:alert(1)">x</a>')).toBe("<a>x</a>");
    expect(sanitizeRichText("<a href=' java\tscript:alert(1)'>x</a>")).toBe("<a>x</a>");
    expect(sanitizeRichText('<a href="data:text/html,x">x</a>')).toBe("<a>x</a>");
    expect(sanitizeRichText('<a href="https://example.com/?a=1&amp;b=2" style="x">x</a>')).toBe(
      '<a href="https://example.com/?a=1&amp;b=2" target="_blank" rel="noopener noreferrer nofollow">x</a>',
    );
    expect(sanitizeRichText('<a href="mailto:a@b.co">x</a>')).toBe('<a href="mailto:a@b.co">x</a>');
    expect(safeHref("//evil.example")).toBeNull();
  });
  it("balances tags and neutralises stray angle brackets", () => {
    expect(sanitizeRichText("<p><strong>a</p>")).toBe("<p><strong>a</strong></p>");
    expect(sanitizeRichText("</p>1 < 2 & 3 > 2 &amp; &copy;")).toBe("1 &lt; 2 &amp; 3 &gt; 2 &amp; &copy;");
    expect(sanitizeRichText('<p>x</p><!-- c --><p title="a>b">y</p>')).toBe("<p>x</p><p>y</p>");
    expect(sanitizeRichText("<scr<script>ipt>alert(1)</script>")).not.toContain("<script");
  });
  it("converts plain text to paragraphs", () => {
    expect(textToHtml("a\nb\n\n<c>")).toBe("<p>a<br>b</p><p>&lt;c&gt;</p>");
  });
});

describe("view model", () => {
  it("assigns slots from field types, not keys", () => {
    const e = toEntry(
      "x",
      [
        { key: "zzz", label: "Name", type: "text" },
        { key: "n", label: "Patent no.", type: "text" },
        { key: "extra", label: "Office", type: "text" },
        { key: "when", label: "Filed", type: "date" },
        { key: "u", label: "Registry", type: "url" },
        { key: "c", label: "Claims", type: "number" },
      ],
      { zzz: "Widget", n: "EP 1", extra: "EPO", when: "2023-08", u: "https://example.com/p", c: 12 },
    );
    expect(e).toMatchObject({ title: "Widget", subtitle: "EP 1", date: "Aug 2023", links: [{ href: "https://example.com/p", label: "Registry" }] });
    expect(e.rest.map((r) => r.def.key)).toEqual(["extra", "c"]);
  });

  it("detects empty values per type", () => {
    expect(isEmptyValue("richtext", "<p><br></p>")).toBe(true);
    expect(isEmptyValue("metric", { value: " ", label: "x" })).toBe(true);
    expect(isEmptyValue("tags", ["", " "])).toBe(true);
    expect(isEmptyValue("number", 0)).toBe(false);
    expect(isEmptyValue("link", { label: "x", href: "" })).toBe(true);
  });

  it("omits hidden and empty sections and items, and gives sections unique anchors", () => {
    const p = structuredClone(SEEDS.developer.portfolio);
    p.sections.push(createSection("awards")); // empty → never rendered
    p.sections.push({ ...structuredClone(p.sections.find((s) => s.kind === "projects")!), id: "projects-2" });
    p.sections.find((s) => s.kind === "skills")!.visible = false;
    const projects = p.sections.find((s) => s.kind === "projects")!;
    projects.items![0]!.visible = false;
    const v = viewPortfolio(p);
    expect(v.sections.some((s) => s.kind === "awards")).toBe(false);
    expect(v.sections.some((s) => s.kind === "skills")).toBe(false);
    expect(v.sections.find((s) => s.id === "projects")!.entries).toHaveLength(3);
    const anchors = v.sections.map((s) => s.anchor);
    expect(new Set(anchors).size).toBe(anchors.length);
    expect(anchors).toContain("projects");
    expect(anchors).toContain("patents");
    expect(v.hero).toMatchObject({ name: "Maya Okafor", eyebrow: "Open to staff+ roles", present: true });
    expect(v.hero.links).toHaveLength(2);
  });

  it("resolves layouts for presets and infers them for custom sections", () => {
    const v = viewPortfolio(SEEDS.developer.portfolio);
    const by = Object.fromEntries(v.sections.map((s) => [s.id, s.layout]));
    expect(by).toMatchObject({ experience: "timeline", projects: "grid", skills: "tags", metrics: "metrics", talks: "list", patents: "list" });
    expect(viewSection({ ...SEEDS.developer.portfolio.sections.find((s) => s.id === "patents")!, layout: undefined }, "en", "x")!.layout).toBe("timeline");
    expect(viewSection(createSection("custom"), "en", "x")).toBeNull();
  });

  it("formats dates and ranges", () => {
    expect(formatDate("2024")).toBe("2024");
    expect(formatDate("2024-10-03")).toBe("Oct 3, 2024");
    expect(formatDate("bogus")).toBe("");
    expect(formatRange({ start: "2020-01", end: "2021-06" })).toBe("Jan 2020 — Jun 2021");
    expect(formatRange({ start: "2020-01", present: true })).toBe("Jan 2020 — Present");
    expect(formatDate("2024-10", "not a locale")).toBe("Oct 2024");
  });
});

describe("colour maths", () => {
  it("converts OKLCH to sRGB", () => {
    expect(oklchToSrgb("1 0 0")).toEqual([255, 255, 255]);
    expect(oklchToSrgb("0 0 0")).toEqual([0, 0, 0]);
    const red = oklchToSrgb("0.62796 0.25768 29.234");
    expect(red[0]).toBeGreaterThanOrEqual(254);
    expect(red[1]).toBeLessThanOrEqual(2);
    expect(red[2]).toBeLessThanOrEqual(2);
    expect(toHex("0.5999 0 0")).toMatch(/^#8[0-1]8[0-1]8[0-1]$/);
  });
  it("gamut-maps out-of-range chroma instead of producing invalid channels", () => {
    for (const c of oklchToSrgb("0.7 0.4 150")) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(255);
    }
  });
  it("computes WCAG contrast", () => {
    expect(contrast("1 0 0", "0 0 0")).toBeCloseTo(21, 1);
    expect(contrast("0.5 0.1 200", "0.5 0.1 200")).toBeCloseTo(1, 5);
  });
  it("every shipped palette is at least AA", () => {
    for (const t of TEMPLATES) for (const p of t.palettes) expect(paletteGrade(p).grade).not.toBe("fail");
  });
});
