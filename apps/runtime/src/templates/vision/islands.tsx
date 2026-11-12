"use client";

import { useEffect, useRef, useState } from "react";

const still = (el: Element | null | undefined) =>
  !el || el.closest('[data-motion="none"]') !== null || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The floating capsule tab bar. It condenses as the page scrolls (a CSS
 * scroll-driven animation); this island marks the current section and, on
 * Chromium, turns on SVG refraction behind the glass.
 */
export function Capsule({ items, name }: { items: { href: string; label: string }[]; name: string }) {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const [refract, setRefract] = useState(false);

  useEffect(() => {
    const reducedT = window.matchMedia("(prefers-reduced-transparency: reduce)").matches;
    const chromium = typeof CSS !== "undefined" && CSS.supports("backdrop-filter", "url(#vs-refract)") && "userAgentData" in navigator;
    setRefract(chromium && !reducedT);
  }, []);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const ids = items.map((i) => i.href.slice(1));
    const seen = new Set<string>();
    const io = new IntersectionObserver(
      (recs) => {
        for (const r of recs) {
          if (r.isIntersecting) seen.add(r.target.id);
          else seen.delete(r.target.id);
        }
        const first = ids.find((id) => seen.has(id));
        setActive(first ?? null);
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [items]);

  useEffect(() => {
    const list = ref.current?.querySelector<HTMLElement>(".vs-capsule-list");
    const cur = list?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!list || !cur || list.scrollWidth <= list.clientWidth) return;
    list.scrollTo({ left: cur.offsetLeft - list.clientWidth / 2 + cur.clientWidth / 2, behavior: still(list) ? "auto" : "smooth" });
  }, [active]);

  if (!items.length) return null;
  return (
    <nav ref={ref} className="vs-capsule" aria-label="Sections" data-refract={refract ? "" : undefined}>
      <a href="#top" className="vs-capsule-home" aria-label={`${name}, back to top`}>
        <span aria-hidden="true">{name.split(/\s+/)[0]}</span>
      </a>
      <ul className="vs-capsule-list">
        {items.map((it) => (
          <li key={it.href}>
            <a href={it.href} className="vs-capsule-link" aria-current={active === it.href.slice(1) ? "true" : undefined}>
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Gentle depth tilt (≤ 4°) for panes under a fine pointer. Off for touch and reduced motion. */
export function Spatial() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const main = ref.current?.parentElement;
    if (!main || still(main) || !window.matchMedia("(pointer: fine)").matches) return;
    let current: HTMLElement | null = null;
    let raf = 0;
    let x = 0;
    let y = 0;
    const apply = () => {
      raf = 0;
      if (!current) return;
      const b = current.getBoundingClientRect();
      const nx = (x - b.left) / b.width - 0.5;
      const ny = (y - b.top) / b.height - 0.5;
      const k = Math.min(4, 4 * (320 / Math.max(320, b.width)) + 1.5);
      current.style.setProperty("--rx", `${(-ny * k).toFixed(2)}deg`);
      current.style.setProperty("--ry", `${(nx * k).toFixed(2)}deg`);
      current.style.setProperty("--mx", `${((nx + 0.5) * 100).toFixed(1)}%`);
      current.style.setProperty("--my", `${((ny + 0.5) * 100).toFixed(1)}%`);
    };
    const reset = (el: HTMLElement) => {
      el.style.removeProperty("--rx");
      el.style.removeProperty("--ry");
      el.removeAttribute("data-tilting");
    };
    const onMove = (ev: PointerEvent) => {
      const el = (ev.target as Element | null)?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (el !== current) {
        if (current) reset(current);
        current = el;
        current?.setAttribute("data-tilting", "");
      }
      x = ev.clientX;
      y = ev.clientY;
      if (current && !raf) raf = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      if (current) reset(current);
      current = null;
    };
    main.addEventListener("pointermove", onMove);
    main.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      main.removeEventListener("pointermove", onMove);
      main.removeEventListener("pointerleave", onLeave);
      onLeave();
    };
  }, []);
  return <span ref={ref} hidden />;
}
