import type { Section } from "@runtime/schema/portfolio";
import { ProviderError, type Provider, type ProviderData } from "../types";

/**
 * A provider that never touches the network. Registered only outside real
 * production (development, unit tests and LOCAL_MODE e2e), so the whole
 * connect → publish → refresh flow can be exercised deterministically.
 *
 * Handles steer its behaviour: "missing" does not exist, "down" always fails,
 * and the bio-code check passes for handles starting with "owner".
 */
type MockData = { account: string; solved: number; streak: number; weekly: number[]; badges: string[] };

const seedOf = (s: string) => [...s].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 7);

export const mockProvider: Provider = {
  id: "mock",
  name: "Mock Judge",
  homepage: "https://mock.example.com",
  official: false,
  accountLabel: "Handle",
  accountHint: "Any handle. Try “missing” or “down” to see failures.",
  accountPattern: /^[a-z0-9][a-z0-9-]{1,29}$/,
  options: [{ key: "badges", label: "Show badges", default: true }],

  async fetch(account) {
    if (account === "missing") throw new ProviderError("not_found", "No such account.");
    if (account === "down") throw new ProviderError("upstream", "The provider is having trouble (HTTP 503).");
    const seed = seedOf(account);
    const data: MockData = {
      account,
      solved: 100 + (seed % 400),
      streak: 3 + (seed % 40),
      weekly: Array.from({ length: 8 }, (_, i) => (seed * (i + 3)) % 23),
      badges: ["Century Club", "Night Owl"],
    };
    return data;
  },

  toSections(raw: ProviderData, cfg): Section[] {
    const d = raw as MockData;
    const sections: Section[] = [
      {
        id: `${cfg.id}_stats`,
        kind: "custom",
        title: "Mock Judge",
        visible: true,
        layout: "metrics",
        fields: [
          {
            key: "weekly",
            label: "Weekly solves",
            type: "chart",
            value: {
              variant: "bars",
              title: "Weekly solves",
              summary: `${d.weekly.reduce((a, b) => a + b, 0)} problems solved over the last 8 weeks`,
              points: d.weekly.map((y, i) => ({ x: `Week ${i + 1}`, y })),
            },
          },
        ],
        itemSchema: [{ key: "stat", label: "Stat", type: "metric" }],
        items: [
          { id: "solved", visible: true, values: { stat: { value: String(d.solved), label: "problems solved" } } },
          { id: "streak", visible: true, values: { stat: { value: String(d.streak), label: "day streak" } } },
        ],
      },
    ];
    if (cfg.options.badges !== false && d.badges.length) {
      sections.push({
        id: `${cfg.id}_badges`,
        kind: "awards",
        title: "Mock Judge badges",
        visible: true,
        fields: [],
        itemSchema: [{ key: "title", label: "Title", type: "text" }],
        items: d.badges.map((b) => ({ id: b.toLowerCase().replace(/[^a-z0-9]+/g, "-"), visible: true, values: { title: b } })),
      });
    }
    return sections;
  },

  highlights(raw) {
    const d = raw as MockData;
    return [{ id: "solved", value: String(d.solved), label: "Mock Judge problems solved" }];
  },

  verify: {
    method: "bio-code",
    instructions: "Paste the code into your Mock Judge bio, then press Verify. (In this mock, handles starting with “owner” pass.)",
    async check(account) {
      return account.startsWith("owner");
    },
  },
};
