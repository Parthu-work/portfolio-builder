"use client";

import { useEffect, useRef } from "react";

/**
 * The aurora: three blurred OKLCH blobs that drift slowly (CSS) and lean
 * toward the cursor. The pointer only updates two CSS variables inside a
 * requestAnimationFrame, and the blobs move with `translate3d` — compositor
 * only, no layout or paint.
 */
export function AuroraField({ motion }: { motion: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || motion === "none" || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.matchMedia("(pointer: fine)").matches) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const onMove = (e: PointerEvent) => {
      x = e.clientX / window.innerWidth - 0.5;
      y = e.clientY / window.innerHeight - 0.5;
      raf ||= requestAnimationFrame(() => {
        raf = 0;
        el.style.setProperty("--px", x.toFixed(3));
        el.style.setProperty("--py", y.toFixed(3));
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [motion]);
  return (
    <div ref={ref} className="au-field" aria-hidden="true">
      <span className="au-blob au-blob-1" />
      <span className="au-blob au-blob-2" />
      <span className="au-blob au-blob-3" />
    </div>
  );
}
