"use client";

import { useEffect, useRef } from "react";

/**
 * Letters of the hero name near the cursor gain weight (fine pointers only,
 * never under reduced motion). Writes one custom property per letter inside
 * a single rAF; nothing runs while the pointer is elsewhere.
 */
export function Proximity() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const hero = ref.current?.parentElement;
    const name = hero?.querySelector<HTMLElement>(".kn-name");
    if (!hero || !name) return;
    const root = hero.closest<HTMLElement>(".pf-root");
    const fine = window.matchMedia("(pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduce.matches || root?.dataset.motion === "none") return;

    const letters = Array.from(name.querySelectorAll<HTMLElement>(".kn-ch"));
    let raf = 0;
    let px = 0;
    let py = 0;
    const radius = () => Math.max(120, name.getBoundingClientRect().height * 0.55);

    const paint = () => {
      raf = 0;
      const r = radius();
      for (const el of letters) {
        const b = el.getBoundingClientRect();
        const d = Math.hypot(px - (b.left + b.width / 2), py - (b.top + b.height / 2));
        const p = Math.max(0, 1 - d / r);
        el.style.setProperty("--p", (p * p).toFixed(3));
      }
    };
    const onMove = (ev: PointerEvent) => {
      px = ev.clientX;
      py = ev.clientY;
      name.dataset.near = "";
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      delete name.dataset.near;
      for (const el of letters) el.style.removeProperty("--p");
    };
    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);
    return () => {
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      onLeave();
    };
  }, []);
  return <span ref={ref} hidden />;
}
