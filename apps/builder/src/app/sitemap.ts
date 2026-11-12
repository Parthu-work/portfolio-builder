import type { MetadataRoute } from "next";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100").replace(/\/+$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/templates", "/privacy", "/terms"].map((path) => ({ url: `${SITE}${path}`, changeFrequency: "monthly" as const, priority: path === "/" ? 1 : 0.6 }));
}
