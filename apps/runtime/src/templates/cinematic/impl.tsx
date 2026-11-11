"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The project reel. On wide screens (and when motion is allowed) the section
 * pins to the viewport and vertical scrolling drives the cards sideways. In
 * every other case — touch, small screens, reduced motion, motion "none" —
 * it is an ordinary horizontally scrollable, snap-aligned, keyboard-focusable list.
 */
export function Reel({ children, label, motionLevel }: { children: ReactNode; label: string; motionLevel: string }) {
  const outer = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const reduced = useReducedMotion();
  const [distance, setDistance] = useState(0);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      const wide = window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;
      const d = Math.max(0, el.scrollWidth - (el.parentElement?.clientWidth ?? window.innerWidth));
      setDistance(d);
      setPinned(wide && !reduced && motionLevel !== "none" && d > 80);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [reduced, motionLevel]);

  const { scrollYProgress } = useScroll({ target: outer, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance]);
  const bar = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div ref={outer} className="cn-reel" data-pinned={pinned || undefined} style={pinned ? { height: `calc(100dvh + ${distance}px)` } : undefined}>
      <div className="cn-reel-stage">
        <div className="cn-reel-view" {...(pinned ? {} : { tabIndex: 0, role: "group", "aria-label": `${label} — scroll sideways` })}>
          <motion.ul ref={track} className="cn-reel-track" style={pinned ? { x } : undefined}>
            {children}
          </motion.ul>
        </div>
        {pinned ? (
          <div className="cn-reel-bar" aria-hidden="true">
            <motion.span style={{ width: bar }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
