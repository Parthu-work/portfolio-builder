import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { Analytics } from "@/components/site/Analytics";
import "./globals.css";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100").replace(/\/+$/, "");

export const metadata: Metadata = {
  metadataBase: new URL(/^https?:\/\//.test(SITE_URL) ? SITE_URL : `https://${SITE_URL}`),
  title: { default: "Persona — build a stunning portfolio, deploy it free", template: "%s · Persona" },
  description: "Pick a template, fill in a form that bends to your story, and deploy to your own Vercel account in one click. Free, open source, no code.",
  openGraph: { type: "website", siteName: "Persona", title: "Persona — build a stunning portfolio, deploy it free", description: "Eight original templates. Fully dynamic sections. One-click deploy to your own Vercel account." },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "light dark" };

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
        <Toaster position="bottom-center" toastOptions={{ style: { background: "var(--panel)", color: "var(--fg)", border: "1px solid var(--rule)" } }} />
        <Analytics />
      </body>
    </html>
  );
}
