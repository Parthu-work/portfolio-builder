import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The editor preview renders the exact template components that get deployed,
  // imported straight from ../runtime/src (see the @runtime/* path alias).
  experimental: { externalDir: true, optimizePackageImports: ["framer-motion", "lucide-react", "recharts"] },
  env: {
    // Runtime <Img> skips the image optimizer inside the builder (arbitrary user image hosts).
    NEXT_PUBLIC_PERSONA_UNOPTIMIZED: "1",
  },
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default config;
