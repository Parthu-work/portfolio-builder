import type { MetadataRoute } from "next";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100").replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/edit/", "/new", "/deploy/", "/admin", "/login", "/p/", "/frame/", "/preview-frame"] }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
