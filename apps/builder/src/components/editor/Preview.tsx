"use client";

import { useEffect, useRef, useState } from "react";
import type { Portfolio } from "@runtime/schema/portfolio";
import { cn } from "@/lib/cn";

export type Device = "desktop" | "tablet" | "mobile";
const WIDTHS: Record<Device, number> = { desktop: 1440, tablet: 820, mobile: 390 };

/**
 * Live preview: the draft is posted (debounced) to a same-origin iframe that
 * renders the real template components. The iframe has a true device-width
 * viewport, so responsive layouts behave exactly as deployed.
 */
export function Preview({ portfolio, device, focus }: { portfolio: Portfolio; device: Device; focus: string | null }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const ready = useRef(false);
  const latest = useRef(portfolio);
  const [size, setSize] = useState({ w: 0, h: 0 });
  latest.current = portfolio;

  const post = (focusId?: string | null) => {
    if (!ready.current) return;
    frame.current?.contentWindow?.postMessage({ source: "persona-editor", type: "portfolio", portfolio: latest.current, ...(focusId ? { focus: focusId } : {}) }, window.location.origin);
  };

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      if ((e.data as { source?: string; type?: string } | null)?.source === "persona-preview") {
        ready.current = true;
        post();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => post(), 120);
    return () => window.clearTimeout(t);
  }, [portfolio]);

  useEffect(() => {
    if (focus) post(focus);
  }, [focus]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => entry && setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const width = WIDTHS[device];
  const scale = size.w ? Math.min(1, size.w / width) : 1;
  const height = size.h ? size.h / scale : 800;

  return (
    <div ref={box} className="relative h-full w-full overflow-hidden">
      <div className={cn("absolute left-1/2 top-0 origin-top overflow-hidden bg-panel shadow-xl", device !== "desktop" && "rounded-b-xl border-x border-b border-rule")} style={{ width, height, transform: `translateX(-50%) scale(${scale})` }}>
        <iframe ref={frame} src="/preview-frame" title="Live preview of your portfolio" className="h-full w-full border-0" />
      </div>
    </div>
  );
}
