import { link, metric, range, seedPortfolio } from "./build";

export const designerSeed = seedPortfolio({
  meta: {
    title: "Inés Carvalho — Product Designer",
    description: "Product designer turning complicated workflows into calm, obvious interfaces.",
    slug: "ines-carvalho",
    language: "en",
  },
  profile: {
    name: "Inés Carvalho",
    headline: "Product designer for complicated things",
    location: "Mexico City",
    email: "ines@example.com",
    socials: [
      { platform: "dribbble", url: "https://dribbble.com/example" },
      { platform: "linkedin", url: "https://www.linkedin.com/in/example" },
      { platform: "instagram", url: "https://www.instagram.com/example" },
    ],
  },
  theme: { templateId: "editorial", paletteId: "paper", mode: "light", fontPairId: "fraunces", motion: "full", radius: "sharp" },
  sections: [
    {
      kind: "hero",
      fields: {
        eyebrow: "Booking projects for spring",
        tagline: "I design software for people with real work to do — clinicians, dispatchers, accountants — and I measure success by how little they notice it.",
        cta: link("View case studies", "#projects"),
        secondaryCta: link("Say hello", "mailto:ines@example.com"),
      },
    },
    {
      kind: "about",
      fields: {
        body: "<p>For nine years I have worked where the stakes are high and the screens are dense. I begin every project in the field, shadowing the people who will live with the result, and I prototype in code as soon as paper stops answering questions.</p><p>Before design I trained as an architect, which is where I learned that <em>constraints are the brief</em>. I speak Spanish, Portuguese and English, and I teach an interaction design studio each autumn.</p>",
        highlights: ["Research-led", "Design systems", "Prototyping in code", "Accessibility"],
      },
    },
    {
      kind: "projects",
      title: "Case studies",
      items: [
        {
          title: "Ward — clinical handover",
          role: "Lead designer",
          summary: "A handover tool for night-shift nurses. We replaced a paper form and three logins with one glanceable board.",
          tags: ["Healthcare", "Research", "Tablet"],
          impact: metric("−42%", "handover time"),
          link: link("Read the case study", "https://example.com/ward"),
        },
        {
          title: "Ledgerly onboarding",
          role: "Product designer",
          summary: "Rebuilt first-run setup for an accounting platform around one question at a time. Activation doubled in a quarter.",
          tags: ["Fintech", "Onboarding", "Experimentation"],
          impact: metric("2.1×", "activation"),
          link: link("Read the case study", "https://example.com/ledgerly"),
        },
        {
          title: "Atlas design system",
          role: "Design systems lead",
          summary: "Tokens, components and guidance for 14 product teams, with accessibility checks built into the pipeline.",
          tags: ["Design systems", "Tokens", "Governance"],
          impact: metric("14", "teams adopted"),
        },
        {
          title: "Routewise dispatch console",
          role: "Senior designer",
          summary: "A map-first console that lets dispatchers reassign forty deliveries with a single drag.",
          tags: ["Logistics", "Data-dense UI"],
          impact: metric("+18%", "on-time deliveries"),
        },
      ],
    },
    {
      kind: "testimonials",
      items: [
        { author: "Dr. Hannah Weiss", role: "Chief Nursing Officer, Sankt Clara", quote: "Inés spent more nights on our ward than some of our residents. The product she designed is the first software my team has ever thanked me for." },
        { author: "Tomás Rivera", role: "VP Product, Ledgerly", quote: "She makes the hard decision early and backs it with evidence. Our roadmap is shorter and better because of her." },
      ],
    },
    {
      kind: "experience",
      items: [
        { role: "Principal Product Designer", company: "Sankt Clara Health", period: range("2022-01"), summary: "<p>Design lead for clinical tools used across eleven hospitals. Built and manage a team of five.</p>" },
        { role: "Senior Product Designer", company: "Ledgerly", period: range("2018-04", "2021-12"), summary: "<p>Owned onboarding and billing. Founded the Atlas design system.</p>" },
        { role: "Interaction Designer", company: "Studio Nopal", period: range("2015-08", "2018-03"), summary: "<p>Agency work for logistics, transit and civic clients.</p>" },
      ],
    },
    {
      kind: "skills",
      title: "Capabilities",
      items: [
        { group: "Practice", skills: ["Field research", "Service blueprints", "Interaction design", "Usability testing"] },
        { group: "Craft", skills: ["Design systems", "Prototyping", "Motion", "Accessibility audits"] },
        { group: "Tools", skills: ["Figma", "HTML & CSS", "React", "Origami"] },
      ],
    },
    {
      kind: "awards",
      title: "Recognition",
      items: [
        { title: "Healthcare Product of the Year", issuer: "Latin American Design Awards", date: "2024-11", summary: "For Ward — clinical handover." },
        { title: "Best Design System", issuer: "Systems Summit", date: "2021-06", summary: "For Atlas." },
      ],
    },
    {
      kind: "publications",
      items: [
        { title: "Designing for the Night Shift", publisher: "Interfaces Quarterly", date: "2024-03", summary: "What twelve weeks on a hospital ward taught me about attention.", link: link("Read", "https://example.com/night-shift") },
        { title: "Tokens Are a Team Sport", publisher: "Systems Journal", date: "2022-09", link: link("Read", "https://example.com/tokens") },
      ],
    },
    {
      kind: "contact",
      title: "Let’s work together",
      fields: {
        blurb: "I take on two or three engagements a year. Tell me about the people you are building for.",
        email: "ines@example.com",
        links: [link("Dribbble", "https://dribbble.com/example"), link("Read.cv", "https://example.com/cv")],
      },
    },
  ],
});
