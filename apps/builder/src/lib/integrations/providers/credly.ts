import "server-only";
import type { Section } from "@runtime/schema/portfolio";
import { providerJson } from "../http";
import { ProviderError, type Provider, type ProviderData } from "../types";

/**
 * Credly (experimental): the public badges JSON behind credly.com/users/<name>.
 * Each certification links to its badge page on Credly, which is the
 * issuer-backed proof; there is no ownership check of our own.
 */

const MAX_BADGES = 40;

type CredlyBadge = {
  id?: string;
  issued_at_date?: string | null;
  expires_at_date?: string | null;
  public?: boolean;
  state?: string;
  image_url?: string | null;
  badge_template?: { name?: string; image_url?: string | null } | null;
  issuer?: { entities?: { entity?: { name?: string } }[] } | null;
};

export type CredlyData = { badges: { id: string; name: string; issuer: string; issued: string; expires: string; image: string | null }[] };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const https = (u: unknown): string | null => (typeof u === "string" && /^https:\/\/[^\s"]+$/.test(u) && u.length <= 2000 ? u : null);

export function toCredlyData(body: { data?: CredlyBadge[] }): CredlyData {
  if (!Array.isArray(body.data)) throw new ProviderError("upstream", "Credly answered with something unexpected.");
  const badges = body.data.flatMap((b) => {
    const name = b.badge_template?.name?.trim();
    if (!b.id || !/^[0-9a-f-]{8,64}$/i.test(b.id) || !name || b.public === false || (b.state && b.state !== "accepted")) return [];
    const issuer = (b.issuer?.entities ?? []).map((e) => e.entity?.name?.trim()).filter(Boolean).join(", ");
    return [{ id: b.id, name: name.slice(0, 200), issuer: issuer.slice(0, 200), issued: DATE.test(b.issued_at_date ?? "") ? b.issued_at_date! : "", expires: DATE.test(b.expires_at_date ?? "") ? b.expires_at_date! : "", image: https(b.image_url) ?? https(b.badge_template?.image_url) }];
  });
  return { badges: badges.slice(0, MAX_BADGES) };
}

export const credlyProvider: Provider = {
  id: "credly",
  name: "Credly",
  homepage: "https://www.credly.com",
  official: false,
  accountLabel: "Username",
  accountHint: "As in credly.com/users/<username>. Your badges must be public.",
  accountPattern: /^[a-z0-9][a-z0-9._-]{1,79}$/i,
  unverifiedNote: "Issuer-verified on Credly",
  options: [{ key: "images", label: "Show badge images (large in most templates)", default: false }],

  async fetch(account, _opts, ctx) {
    const body = await providerJson<{ data?: CredlyBadge[] }>(`https://www.credly.com/users/${encodeURIComponent(account)}/badges.json`, { signal: ctx.signal });
    return toCredlyData(body) as unknown as ProviderData;
  },

  toSections(raw, cfg): Section[] {
    const d = raw as unknown as CredlyData;
    if (!d.badges.length) return [];
    const images = cfg.options.images === true;
    return [
      {
        id: `${cfg.id}_certs`,
        kind: "certifications",
        title: "Certifications",
        visible: true,
        layout: "list",
        fields: [],
        itemSchema: [
          { key: "name", label: "Name", type: "text" },
          { key: "issuer", label: "Issuer", type: "text" },
          { key: "date", label: "Date", type: "date" },
          { key: "link", label: "Credential URL", type: "url" },
          ...(images ? [{ key: "image", label: "Badge", type: "image" as const }] : []),
        ],
        items: d.badges.map((b) => ({
          id: `b-${b.id.toLowerCase()}`,
          visible: true,
          values: {
            name: b.name,
            issuer: b.issuer,
            date: b.issued,
            link: `https://www.credly.com/badges/${b.id}`,
            ...(images && b.image ? { image: { src: b.image, alt: `${b.name} badge` } } : {}),
          },
        })),
      },
    ];
  },

  highlights(raw) {
    const d = raw as unknown as CredlyData;
    return d.badges.length ? [{ id: "count", value: String(d.badges.length), label: d.badges.length === 1 ? "certification on Credly" : "certifications on Credly" }] : [];
  },
};
