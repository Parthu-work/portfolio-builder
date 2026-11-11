import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/load";

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/preview/"] }], sitemap: `${siteUrl()}/sitemap.xml` };
}
