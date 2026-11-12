"use client";

import { useEffect, useRef, useState } from "react";

const still = (el: Element | null) =>
  !el || el.closest('[data-motion="none"]') !== null || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Item = { href: string; id: string; label: string; no: string; count: number };

/**
 * Sticky case index with scroll-spy: the section currently being read is
 * marked with aria-current. A side rail on wide screens, a scrollable tab
 * strip on small ones.
 */
export function CaseIndex({ name, items, summary }: { name: string; items: Item[]; summary: string }) {
  const [active, setActive] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, number>();
    const io = new IntersectionObserver(
      (records) => {
        for (const r of records) {
          if (r.isIntersecting) visible.set(r.target.id, r.boundingClientRect.top);
          else visible.delete(r.target.id);
        }
        const first = items.find((it) => visible.has(it.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-20% 0px -55% 0px" },
    );
    for (const it of items) {
      const el = document.getElementById(it.id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [items]);

  // Keep the active tab in view in the horizontal strip.
  useEffect(() => {
    const list = listRef.current;
    if (!list || !active || list.scrollWidth <= list.clientWidth) return;
    const link = list.querySelector<HTMLElement>(`[data-id="${CSS.escape(active)}"]`);
    if (link) list.scrollTo({ left: link.offsetLeft - 16, behavior: still(list) ? "auto" : "smooth" });
  }, [active]);

  return (
    <nav className="cf-index" aria-label="Case index">
      <div className="cf-index-inner">
        <a href="#top" className="cf-index-name">
          {name}
        </a>
        <p className="cf-index-summary">{summary}</p>
        <ol ref={listRef} className="cf-index-list">
          {items.map((it) => (
            <li key={it.href}>
              <a href={it.href} data-id={it.id} className="cf-index-link" aria-current={active === it.id ? "true" : undefined}>
                <span className="cf-index-no" aria-hidden="true">
                  {it.no}
                </span>
                <span className="cf-index-label">{it.label}</span>
                {it.count ? (
                  <span className="cf-index-count" aria-hidden="true">
                    {it.count}
                  </span>
                ) : null}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}

const NUM = /^([^\d]{0,2}?)(\d[\d,]*(?:\.\d+)?)(.*)$/s;

/**
 * Counts a metric up from zero the first time it scrolls into view — only
 * when the value starts with a number. The final value is what the server
 * renders and what assistive tech reads; under reduced motion it never moves.
 */
export function CountUp({ value, className = "" }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  const m = NUM.exec(value.trim());
  const animatable = Boolean(m) && /^[+\-−–~≈$€£]?$/.test(m?.[1] ?? "");

  useEffect(() => {
    const el = ref.current;
    if (!animatable || !m || still(el) || typeof IntersectionObserver === "undefined" || !el) return;
    const [, pre, num, post] = m;
    const target = Number(num!.replace(/,/g, ""));
    const decimals = (num!.split(".")[1] ?? "").length;
    const grouped = num!.includes(",");
    if (!Number.isFinite(target)) return;
    const fmt = (n: number) => {
      const fixed = n.toFixed(decimals);
      return grouped ? Number(fixed).toLocaleString("en", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : fixed;
    };
    let raf = 0;
    let started = false;
    const io = new IntersectionObserver(
      ([r]) => {
        if (!r?.isIntersecting || started) return;
        started = true;
        io.disconnect();
        const t0 = performance.now();
        const dur = 1100;
        const tick = (t: number) => {
          const k = Math.min(1, (t - t0) / dur);
          const eased = 1 - Math.pow(1 - k, 3);
          setShown(`${pre}${fmt(target * eased)}${post}`);
          if (k < 1) raf = requestAnimationFrame(tick);
          else setShown(value);
        };
        setShown(`${pre}${fmt(0)}${post}`);
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span className={className}>
      <span className="sr-only">{value}</span>
      {/* The final value, invisible, reserves the width so counting never shifts the layout. */}
      <span ref={ref} aria-hidden="true" className="cf-count">
        <span className="cf-count-ghost">{value}</span>
        <span className="cf-count-live">{shown}</span>
      </span>
    </span>
  );
}
