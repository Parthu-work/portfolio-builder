"use client";

import { useEffect, useState } from "react";
import { PortfolioSchema, type Portfolio } from "@runtime/schema/portfolio";
import { TemplateView } from "@runtime/templates/registry";

export type PreviewMessage = { source: "persona-editor"; type: "portfolio"; portfolio: unknown; focus?: string };

/**
 * The editor's live preview. Receives the draft over postMessage (same
 * origin only) and renders it with the exact template components that are
 * deployed. Navigation away from the preview is disabled.
 */
export default function PreviewFrame() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent<PreviewMessage>) => {
      if (e.origin !== window.location.origin || e.data?.source !== "persona-editor") return;
      const parsed = PortfolioSchema.safeParse(e.data.portfolio);
      if (parsed.success) setPortfolio(parsed.data);
      if (e.data.focus) {
        const id = e.data.focus;
        requestAnimationFrame(() => document.querySelector(`[data-section-id="${CSS.escape(id)}"], #${CSS.escape(id)}`)?.scrollIntoView({ block: "start" }));
      }
    };
    window.addEventListener("message", onMessage);
    window.parent?.postMessage({ source: "persona-preview", type: "ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    // Links inside the preview must not navigate the iframe away; in-page anchors still work.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("#")) e.preventDefault();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  if (!portfolio) {
    return (
      <div role="status" style={{ minHeight: "100dvh", display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif", color: "#777" }}>
        Loading preview…
      </div>
    );
  }
  return <TemplateView portfolio={portfolio} />;
}
