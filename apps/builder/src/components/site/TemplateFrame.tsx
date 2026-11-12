"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * A live template preview: a real page in an iframe, rendered at a desktop
 * (or given) viewport and scaled to fit its container. Non-interactive
 * previews are `inert`, so they are skipped by keyboard and screen readers.
 */
export function TemplateFrame({
  src,
  title,
  width = 1440,
  height = 900,
  interactive = false,
  eager = false,
  idle = false,
  className,
}: {
  src: string;
  title: string;
  width?: number;
  height?: number;
  interactive?: boolean;
  eager?: boolean;
  /** Fetch the preview on the visitor's first interaction (or after 8 seconds) instead of during page load. */
  idle?: boolean;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);
  const [visible, setVisible] = useState(eager);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(!idle);

  useEffect(() => {
    if (!idle) return;
    const events = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"] as const;
    const go = () => setReady(true);
    const t = window.setTimeout(go, 8000);
    for (const e of events) window.addEventListener(e, go, { once: true, passive: true });
    return () => {
      window.clearTimeout(t);
      for (const e of events) window.removeEventListener(e, go);
    };
  }, [idle]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => entry && setScale(entry.contentRect.width / width));
    ro.observe(el);
    const io = new IntersectionObserver(([entry]) => entry?.isIntersecting && setVisible(true), { rootMargin: "300px" });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, [width]);

  return (
    <div ref={box} className={cn("relative w-full overflow-hidden bg-panel2", className)} style={{ aspectRatio: `${width} / ${height}` }}>
      {!loaded ? <div aria-hidden="true" className="skeleton absolute inset-0 rounded-none" /> : null}
      {visible && ready && scale !== null ? (
        <iframe
          key={src}
          src={src}
          title={title}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          {...(interactive ? {} : { inert: true, tabIndex: -1, "aria-hidden": true })}
          className={cn("absolute left-0 top-0 origin-top-left border-0 transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0", !interactive && "pointer-events-none")}
          style={{ width, height, transform: `scale(${scale})` }}
        />
      ) : null}
    </div>
  );
}
