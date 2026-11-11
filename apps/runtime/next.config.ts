import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Portfolio owners can reference images hosted anywhere (https only).
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    formats: ["image/avif", "image/webp"],
  },
  experimental: { optimizePackageImports: ["framer-motion"] },
};

export default config;
