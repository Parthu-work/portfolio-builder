import type { Portfolio } from "../portfolio";
import { link, seedSection } from "./build";
import { designerSeed } from "./designer";
import { developerSeed } from "./developer";
import { solutionsEngineerSeed } from "./solutions-engineer";

const take = (p: Portfolio, kind: string) => {
  const s = p.sections.find((x) => x.kind === kind);
  if (!s) throw new Error(`fixture: missing ${kind}`);
  return structuredClone(s);
};

const IMG = { src: "/fixture/cover.svg", alt: "Abstract landscape in blue and coral", width: 800, height: 600 };

/** A deterministic year of daily counts (no randomness, so snapshots and tests are stable). */
const YEAR = Array.from({ length: 364 }, (_, i) => {
  const date = new Date(Date.UTC(2025, 10, 16 + i)).toISOString().slice(0, 10);
  const wave = Math.sin(i / 9) + Math.sin(i / 23) * 0.6;
  const y = i % 7 === 0 || wave < -0.7 ? 0 : Math.max(0, Math.round((wave + 1.2) * 4) - (i % 3));
  return { x: date, y };
});

export const FIXTURE_CHARTS = {
  heatmap: { variant: "heatmap", title: "Activity", summary: "1,004 lab sessions in the last year", points: YEAR, unit: "sessions" },
  line: {
    variant: "line",
    title: "Rating history",
    summary: "Rating rose from 1,480 to 1,912 over 8 rounds",
    points: [1480, 1532, 1509, 1611, 1688, 1743, 1850, 1912].map((y, i) => ({ x: `2026-${String(i + 1).padStart(2, "0")}`, y, label: `Round ${i + 1}` })),
  },
  bars: {
    variant: "bars",
    title: "Languages",
    summary: "TypeScript leads at 48% of lab code",
    points: [{ x: "TypeScript", y: 48 }, { x: "Rust", y: 27 }, { x: "Go", y: 15 }, { x: "Python", y: 10 }],
    unit: "%",
  },
  rings: {
    variant: "rings",
    title: "Solved",
    summary: "412 lab problems solved across three levels",
    points: [{ x: "Easy", y: 180 }, { x: "Medium", y: 192 }, { x: "Hard", y: 40 }],
    max: 412,
  },
} as const;

/**
 * The kitchen sink: every preset section kind, a user-invented section that
 * uses every FieldType, an unknown kind, plus hidden and empty sections that
 * must never render. Used by tests and the /preview routes.
 */
export const fixturePortfolio: Portfolio = {
  ...structuredClone(developerSeed),
  meta: { ...developerSeed.meta, slug: "fixture", title: "Fixture — every section kind" },
  profile: { ...developerSeed.profile, avatar: IMG },
  sections: [
    take(developerSeed, "hero"),
    { ...take(developerSeed, "about"), fields: take(developerSeed, "about").fields.map((f) => (f.key === "portrait" ? { ...f, value: IMG } : f)) },
    take(developerSeed, "metrics"),
    (() => {
      const s = take(developerSeed, "projects");
      s.items![0]!.values.image = IMG;
      return s;
    })(),
    take(developerSeed, "experience"),
    take(developerSeed, "skills"),
    take(developerSeed, "education"),
    take(designerSeed, "testimonials"),
    take(solutionsEngineerSeed, "certifications"),
    take(developerSeed, "talks"),
    take(designerSeed, "publications"),
    take(designerSeed, "awards"),
    take(solutionsEngineerSeed, "volunteering"),
    seedSection({
      kind: "custom",
      id: "lab",
      title: "Field lab",
      subtitle: "A user-invented section using every field type.",
      itemSchema: [
        { key: "name", label: "Name", type: "text" },
        { key: "kind", label: "Kind", type: "select", options: ["Experiment", "Prototype"] },
        { key: "notes", label: "Notes", type: "longtext" },
        { key: "detail", label: "Detail", type: "richtext" },
        { key: "site", label: "Site", type: "url" },
        { key: "mail", label: "Mail", type: "email" },
        { key: "tel", label: "Phone", type: "phone" },
        { key: "count", label: "Count", type: "number" },
        { key: "score", label: "Score", type: "metric" },
        { key: "day", label: "Day", type: "date" },
        { key: "span", label: "Span", type: "daterange" },
        { key: "pic", label: "Picture", type: "image" },
        { key: "shots", label: "Shots", type: "gallery" },
        { key: "labels", label: "Labels", type: "tags" },
        { key: "cta", label: "Call to action", type: "link" },
        { key: "refs", label: "References", type: "linklist" },
        { key: "clip", label: "Clip", type: "video" },
        { key: "snippet", label: "Snippet", type: "code" },
        { key: "extraDate", label: "Reviewed", type: "date" },
        { key: "extraText", label: "Codename", type: "text" },
        { key: "third", label: "Station", type: "text" },
        { key: "heat", label: "Heatmap", type: "chart" },
        { key: "trend", label: "Trend", type: "chart" },
        { key: "share", label: "Share", type: "chart" },
        { key: "rings", label: "Rings", type: "chart" },
      ],
      items: [
        {
          name: "Everything at once",
          kind: "Experiment",
          notes: "Plain notes with a line break.\nSecond line.",
          detail: "<p>Rich <strong>detail</strong> with a <a href=\"https://example.com\">link</a>.</p><ul><li>One</li><li>Two</li></ul>",
          site: "https://example.com/lab",
          mail: "lab@example.com",
          tel: "+1 555 010 2030",
          count: 1234567,
          score: { value: "97", label: "quality score" },
          day: "2024-06-01",
          span: { start: "2023-01", end: "2024-06", present: false },
          pic: IMG,
          shots: [IMG, { ...IMG, alt: "Second abstract landscape" }],
          labels: ["alpha", "beta", "gamma"],
          cta: link("Open the lab", "https://example.com/open"),
          refs: [link("Paper", "https://example.com/paper"), link("Dataset", "https://example.com/data")],
          clip: "https://example.com/watch/123",
          snippet: { language: "ts", code: "export const answer = (a: number, b: number) => a + b; // a deliberately long line to prove code scrolls horizontally" },
          extraDate: "2024-07",
          extraText: "Bluebird",
          third: "Station Nine",
          heat: FIXTURE_CHARTS.heatmap,
          trend: FIXTURE_CHARTS.line,
          share: FIXTURE_CHARTS.bars,
          rings: FIXTURE_CHARTS.rings,
        },
      ],
    }),
    seedSection({
      kind: "patents",
      id: "patents",
      title: "Patents",
      itemSchema: [
        { key: "title", label: "Title", type: "text" },
        { key: "patentNo", label: "Patent no.", type: "text" },
        { key: "link", label: "Link", type: "url" },
        { key: "date", label: "Date", type: "date" },
      ],
      items: [{ title: "Adaptive back-pressure for event streams", patentNo: "EP 4 012 345", link: "https://example.com/patents/1", date: "2023-08" }],
    }),
    // A section synced from a connected account: charts in the lead, metrics as items, provenance from `sync`.
    {
      id: "synced",
      kind: "custom",
      title: "Live stats",
      visible: true,
      layout: "metrics",
      fields: [{ key: "calendar", label: "Contributions", type: "chart", value: { ...FIXTURE_CHARTS.heatmap, title: "Contributions", summary: "1,004 contributions in the last year", unit: "contributions" } }],
      itemSchema: [
        { key: "stat", label: "Stat", type: "metric" },
        { key: "note", label: "Note", type: "text" },
      ],
      items: [
        { id: "synced-1", visible: true, values: { stat: { value: "1,004", label: "contributions this year" } } },
        { id: "synced-2", visible: true, values: { stat: { value: "312", label: "stars earned" } } },
        { id: "synced-3", visible: true, values: { stat: { value: "58", label: "public repositories" } } },
      ],
      sync: { provider: "github", account: "mayaokafor", syncedAt: "2026-11-13T08:00:00.000Z", verified: true, source: "github.com" },
    },
    { ...seedSection({ kind: "awards", id: "hidden-awards", title: "Hidden section", items: [{ title: "Should never render" }] }), visible: false },
    seedSection({ kind: "custom", id: "empty-custom", title: "Empty section" }),
    take(solutionsEngineerSeed, "contact"),
  ],
};

/** Titles that must be visible in every template, and titles that must not. */
export const FIXTURE_EXPECTED_TITLES = [
  "About", "By the numbers", "Selected work", "Experience", "Skills", "Education", "Kind words", "Certifications",
  "Talks", "Writing", "Recognition", "Volunteering", "Field lab", "Patents", "Live stats", "Get in touch",
];
export const FIXTURE_FORBIDDEN_TEXT = ["Hidden section", "Should never render", "Empty section"];
