import { link, metric, range, seedPortfolio } from "./build";

export const solutionsEngineerSeed = seedPortfolio({
  meta: {
    title: "Arjun Mehta — Solutions Engineer",
    description: "Solutions engineer who turns technical evaluations into signed, successful rollouts.",
    slug: "arjun-mehta",
    language: "en",
  },
  profile: {
    name: "Arjun Mehta",
    headline: "Solutions engineer — enterprise SaaS, APIs & integrations",
    location: "Bengaluru, India",
    email: "arjun@example.com",
    socials: [
      { platform: "linkedin", url: "https://www.linkedin.com/in/example" },
      { platform: "github", url: "https://github.com/example" },
      { platform: "youtube", url: "https://www.youtube.com/@example" },
    ],
  },
  theme: { templateId: "swiss", paletteId: "klein", mode: "light", fontPairId: "inter", motion: "subtle", radius: "sharp" },
  sections: [
    {
      kind: "hero",
      fields: {
        eyebrow: "Solutions engineering · Pre-sales · Integrations",
        tagline: "I sit between the customer’s architecture diagram and our product roadmap, and I do not leave until the proof of concept is in production.",
        cta: link("See outcomes", "#metrics"),
        secondaryCta: link("Connect on LinkedIn", "https://www.linkedin.com/in/example"),
      },
    },
    {
      kind: "metrics",
      title: "Outcomes",
      items: [
        { metric: metric("$14.6M", "influenced ARR"), context: "FY2022 – FY2024" },
        { metric: metric("71%", "technical win rate"), context: "Across 120+ evaluations" },
        { metric: metric("19 days", "median POC length"), context: "Down from 46" },
        { metric: metric("4.9 / 5", "customer CSAT"), context: "Post-implementation surveys" },
      ],
    },
    {
      kind: "about",
      fields: {
        body: "<p>I began as a backend engineer, moved customer-side when I realised the most interesting bugs live in other people’s systems, and have spent seven years helping enterprises adopt developer platforms.</p><p>My approach is simple: <strong>discover honestly, demo their data, document everything</strong>. I write the integration guide I wish I had been handed, and I bring what I learn in the field back to product as structured feedback.</p>",
        highlights: ["Discovery", "Technical demos", "POC delivery", "API design", "Executive briefings"],
      },
    },
    {
      kind: "experience",
      items: [
        {
          role: "Principal Solutions Engineer",
          company: "Cobalt Cloud",
          period: range("2021-07"),
          summary: "<p>Technical lead on strategic accounts in financial services and retail across APAC.</p><ul><li>Closed the company’s three largest deals to date</li><li>Built the reusable POC kit now used by all 30 SEs</li></ul>",
          stack: ["REST & GraphQL", "SSO / SCIM", "Terraform"],
        },
        {
          role: "Solutions Engineer",
          company: "Signalbox",
          period: range("2018-02", "2021-06"),
          summary: "<p>First SE hire. Created the demo environment, the security questionnaire library and the technical onboarding programme.</p>",
          stack: ["Webhooks", "Python", "Postman"],
        },
        {
          role: "Backend Engineer",
          company: "Kite Payments",
          period: range("2015-07", "2018-01"),
          summary: "<p>Built partner-facing payment APIs and the sandbox used by 400 merchants.</p>",
          stack: ["Java", "PostgreSQL"],
        },
      ],
    },
    {
      kind: "projects",
      title: "Customer stories",
      items: [
        {
          title: "Tier-1 bank: identity migration",
          role: "Technical lead",
          summary: "Moved 40,000 employees to SCIM-provisioned access in nine weeks, with zero-downtime cutover and audit sign-off.",
          tags: ["Financial services", "SSO", "SCIM"],
          impact: metric("$3.2M", "ARR"),
        },
        {
          title: "Global retailer: event pipeline",
          role: "Solutions architect",
          summary: "Designed a webhook fan-out that syncs inventory across 1,200 stores in under two seconds.",
          tags: ["Retail", "Webhooks", "Kafka"],
          impact: metric("< 2 s", "sync latency"),
        },
        {
          title: "The POC Kit",
          role: "Author",
          summary: "Terraform modules, seed data and a success-criteria template that cut proof-of-concept time by more than half.",
          tags: ["Enablement", "Terraform"],
          impact: metric("−59%", "POC duration"),
          repo: "https://github.com/example/poc-kit",
        },
      ],
    },
    {
      kind: "certifications",
      items: [
        { name: "AWS Certified Solutions Architect – Professional", issuer: "Amazon Web Services", date: "2023-04", link: "https://example.com/cert/aws" },
        { name: "Certified Kubernetes Administrator", issuer: "CNCF", date: "2022-09", link: "https://example.com/cert/cka" },
        { name: "MEDDICC Sales Certification", issuer: "MEDDICC Academy", date: "2021-11", link: "" },
      ],
    },
    {
      kind: "skills",
      items: [
        { group: "Pre-sales", skills: ["Discovery", "Demo design", "POC scoping", "RFP & security reviews"] },
        { group: "Technical", skills: ["APIs", "OAuth & SSO", "SQL", "Python", "Terraform", "Kubernetes"] },
        { group: "Industries", skills: ["Financial services", "Retail", "Logistics"] },
      ],
    },
    {
      kind: "testimonials",
      items: [
        { author: "Priya Nair", role: "CTO, Meridian Bank", quote: "Arjun understood our architecture better than some of our own vendors. He told us what the product could not do before we asked — that is why we signed." },
      ],
    },
    {
      kind: "volunteering",
      items: [{ role: "Mentor", organization: "Women Who Code Bengaluru", period: range("2020-01"), summary: "Monthly office hours on moving from engineering into customer-facing roles." }],
    },
    {
      kind: "education",
      items: [{ degree: "BTech Information Technology", school: "NIT Karnataka", period: range("2011-08", "2015-05") }],
    },
    {
      kind: "contact",
      fields: {
        blurb: "Building a solutions team, or need someone who can whiteboard with architects and present to the board in the same afternoon?",
        email: "arjun@example.com",
        phone: "+91 80 5550 0123",
        calendar: link("Schedule an intro call", "https://example.com/meet"),
      },
    },
  ],
});
