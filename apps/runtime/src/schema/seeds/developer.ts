import { link, metric, range, seedPortfolio } from "./build";

export const developerSeed = seedPortfolio({
  meta: {
    title: "Maya Okafor — Staff Software Engineer",
    description: "Staff engineer building fast, observable distributed systems and the tools teams use to run them.",
    slug: "maya-okafor",
    language: "en",
  },
  profile: {
    name: "Maya Okafor",
    headline: "Staff software engineer — distributed systems & developer tooling",
    location: "Lisbon, Portugal",
    email: "maya@example.com",
    socials: [
      { platform: "github", url: "https://github.com/example" },
      { platform: "linkedin", url: "https://www.linkedin.com/in/example" },
      { platform: "mastodon", url: "https://hachyderm.io/@example" },
    ],
  },
  theme: { templateId: "signal", paletteId: "phosphor", mode: "dark", fontPairId: "grotesk-mono", motion: "full", radius: "soft" },
  sections: [
    {
      kind: "hero",
      fields: {
        eyebrow: "Open to staff+ roles",
        tagline: "I make slow systems fast and opaque systems legible. Ten years of queues, caches and the dashboards that explain them.",
        cta: link("See selected work", "#projects"),
        secondaryCta: link("Email me", "mailto:maya@example.com"),
      },
    },
    {
      kind: "about",
      fields: {
        body: "<p>I started out fixing flaky deploy scripts and never really stopped. Today I lead platform work for a 60-engineer org: the ingestion pipeline, the query layer, and the internal tooling that keeps both boring.</p><p>I care about <strong>measurable outcomes</strong>, written design docs, and leaving every codebase easier to change than I found it. Outside work I maintain a small open-source tracing library and mentor early-career engineers.</p>",
        highlights: ["Distributed systems", "Performance", "Observability", "Mentoring"],
      },
    },
    {
      kind: "metrics",
      items: [
        { metric: metric("38 ms", "p99 query latency"), context: "Down from 420 ms" },
        { metric: metric("4.2B", "events ingested daily"), context: "Across three regions" },
        { metric: metric("99.99%", "pipeline availability"), context: "Trailing 12 months" },
        { metric: metric("−61%", "infrastructure cost"), context: "After the storage rewrite" },
      ],
    },
    {
      kind: "projects",
      items: [
        {
          title: "Lumen Query Engine",
          role: "Tech lead",
          summary: "Rebuilt the analytics query path around columnar storage and vectorised execution. Dashboards that timed out now return before you finish blinking.",
          tags: ["Rust", "Arrow", "Kubernetes"],
          impact: metric("11×", "faster p99"),
          link: link("Read the write-up", "https://example.com/lumen"),
          repo: "https://github.com/example/lumen",
        },
        {
          title: "Relay Ingestion Pipeline",
          role: "Architect",
          summary: "A back-pressure-aware ingestion tier that survives regional failover without dropping or duplicating events.",
          tags: ["Go", "Kafka", "gRPC"],
          impact: metric("4.2B", "events / day"),
          link: link("Architecture notes", "https://example.com/relay"),
        },
        {
          title: "Tracekit",
          role: "Creator & maintainer",
          summary: "A tiny open-source tracing library with zero dependencies and a flame-graph viewer that runs in the terminal.",
          tags: ["TypeScript", "OpenTelemetry", "Open source"],
          impact: metric("3.1k", "GitHub stars"),
          repo: "https://github.com/example/tracekit",
        },
        {
          title: "Deploy Radar",
          role: "Engineer",
          summary: "Progressive delivery for 200 services: automated canaries, SLO-based rollbacks and a timeline anyone can read.",
          tags: ["Python", "Argo", "Prometheus"],
          impact: metric("−73%", "failed deploys"),
        },
      ],
    },
    {
      kind: "experience",
      items: [
        {
          role: "Staff Software Engineer",
          company: "Northwind Data",
          period: range("2021-03"),
          summary: "<p>Lead the platform group. Set technical direction for ingestion, storage and query; grew the team from 4 to 11.</p><ul><li>Cut p99 query latency from 420 ms to 38 ms</li><li>Introduced design-doc reviews now used company-wide</li></ul>",
          stack: ["Rust", "Go", "Kafka", "ClickHouse"],
        },
        {
          role: "Senior Software Engineer",
          company: "Parcel & Post",
          period: range("2017-06", "2021-02"),
          summary: "<p>Owned the real-time tracking service through a 30× traffic increase. Migrated a monolith to event-driven services without downtime.</p>",
          stack: ["Go", "PostgreSQL", "Redis"],
        },
        {
          role: "Software Engineer",
          company: "Brightside Labs",
          period: range("2014-09", "2017-05"),
          summary: "<p>Full-stack engineer on a B2B analytics product. Built the first CI pipeline and the on-call rotation.</p>",
          stack: ["Python", "React"],
        },
      ],
    },
    {
      kind: "skills",
      items: [
        { group: "Languages", skills: ["Rust", "Go", "TypeScript", "Python", "SQL"] },
        { group: "Systems", skills: ["Kafka", "ClickHouse", "PostgreSQL", "Redis", "Kubernetes"] },
        { group: "Practice", skills: ["System design", "Performance profiling", "Incident response", "Technical writing"] },
      ],
    },
    {
      kind: "talks",
      items: [
        { title: "Back-pressure Is a Feature", event: "SystemsConf Europe", date: "2024-10", link: link("Slides", "https://example.com/talks/back-pressure") },
        { title: "What Your p99 Is Hiding", event: "Observability Day", date: "2023-05", link: link("Watch", "https://example.com/talks/p99") },
      ],
    },
    {
      kind: "custom",
      id: "patents",
      title: "Patents",
      itemSchema: [
        { key: "title", label: "Title", type: "text", required: true },
        { key: "patentNo", label: "Patent no.", type: "text" },
        { key: "date", label: "Date", type: "date" },
        { key: "link", label: "Link", type: "url" },
      ],
      items: [
        { title: "Adaptive back-pressure for multi-region event streams", patentNo: "EP 4 012 345", date: "2023-08", link: "https://example.com/patents/4012345" },
        { title: "Incremental compaction of columnar segments", patentNo: "EP 3 998 221", date: "2022-02", link: "https://example.com/patents/3998221" },
      ],
    },
    {
      kind: "education",
      items: [{ degree: "BSc Computer Science", school: "University of Lagos", period: range("2010-09", "2014-07"), summary: "First-class honours. Thesis on consensus in partially synchronous networks." }],
    },
    {
      kind: "contact",
      fields: {
        blurb: "Hiring for a hard infrastructure problem, or want a second pair of eyes on a design doc? I read every email.",
        email: "maya@example.com",
        calendar: link("Book a 30-minute call", "https://example.com/cal"),
      },
    },
  ],
});
