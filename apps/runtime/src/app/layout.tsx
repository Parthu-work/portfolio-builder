import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { loadPortfolio, siteUrl } from "../lib/load";
import { htmlToText } from "../render/sanitize";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const p = await loadPortfolio();
  const title = p.meta.title || p.profile.name || "Portfolio";
  const description = p.meta.description || htmlToText(p.profile.headline) || `${p.profile.name} — portfolio`;
  return {
    metadataBase: new URL(siteUrl()),
    title,
    description,
    alternates: { canonical: "/" },
    openGraph: { type: "profile", title, description, url: "/", siteName: p.profile.name || title, ...(p.meta.ogImage ? { images: [p.meta.ogImage] } : {}) },
    twitter: { card: "summary_large_image", title, description, ...(p.meta.ogImage ? { images: [p.meta.ogImage] } : {}) },
    ...(p.meta.favicon ? { icons: { icon: p.meta.favicon } } : {}),
    generator: "Persona",
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "light dark" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const p = await loadPortfolio();
  return (
    <html lang={p.meta.language || "en"}>
      <body>{children}</body>
    </html>
  );
}
