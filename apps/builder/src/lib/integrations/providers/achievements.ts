import type { Section } from "@runtime/schema/portfolio";
import type { Provider } from "../types";

/**
 * Achievement wall: no network. Collects the strongest signals each
 * connected provider reports about itself (see `Provider.highlights`) into
 * one "big numbers" section. Every entry names where it came from and
 * whether that account's ownership was checked. Nothing is scored or ranked
 * by us: values are exactly what the providers returned.
 */

const MAX_ITEMS = 12;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export const achievementsProvider: Provider = {
  id: "achievements",
  name: "Achievement wall",
  homepage: "https://persona.local",
  official: true,
  accountLabel: "Wall",
  accountPattern: /^wall$/,
  fixedAccount: "wall",
  accountHint: "Collects the strongest numbers and badges from your other connected accounts into one section.",
  unverifiedNote: "Each entry names its source",
  options: [{ key: "unverified", label: "Include accounts you have not verified", default: false }],

  async fetch() {
    return {};
  },

  toSections: () => [],

  aggregate(sources, cfg): Section[] {
    const included = sources.filter((s) => s.verified || s.note || cfg.options.unverified === true);
    const items = included
      .flatMap((s) =>
        s.highlights.map((h) => ({
          id: slug(`${s.provider}-${s.account}-${h.id}`),
          visible: true,
          values: { stat: { value: h.value, label: h.label }, context: `${s.source} · ${s.verified ? "Verified owner" : (s.note ?? "Public profile")}` },
        })),
      )
      .slice(0, MAX_ITEMS);
    if (!items.length) return [];
    return [
      {
        id: `${cfg.id}_wall`,
        kind: "metrics",
        title: "Achievements",
        visible: true,
        layout: "metrics",
        fields: [],
        itemSchema: [
          { key: "stat", label: "Metric", type: "metric" },
          { key: "context", label: "Context", type: "text" },
        ],
        items,
      },
    ];
  },
};
