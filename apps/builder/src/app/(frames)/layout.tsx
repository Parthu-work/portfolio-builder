import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./frames.css";

export const metadata: Metadata = { title: "Persona preview", robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

/** Root layout for pages that render a portfolio template (previews, embeds). */
export default function FramesLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
