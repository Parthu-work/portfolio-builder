"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";

type ReelProps = { children: ReactNode; label: string; motionLevel: string };

/** Until the scroll-driven implementation (framer-motion) has loaded, the reel is a plain horizontal list — same markup, no layout shift. */
function ReelFallback({ children, label }: ReelProps) {
  return (
    <div className="cn-reel">
      <div className="cn-reel-stage">
        <div className="cn-reel-view" tabIndex={0} role="group" aria-label={`${label} — scroll sideways`}>
          <ul className="cn-reel-track">{children}</ul>
        </div>
      </div>
    </div>
  );
}

const ReelImpl = dynamic<ReelProps>(() => import("./impl").then((m) => m.Reel), { ssr: false });

export function Reel(props: ReelProps) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return ready ? <ReelImpl {...props} /> : <ReelFallback {...props} />;
}

/** Chapter progress rail: highlights the chapter currently on screen. */
export function Rail({ chapters }: { chapters: { id: string; label: string }[] }) {
  const [active, setActive] = useState(chapters[0]?.id ?? "");
  useEffect(() => {
    const els = chapters.map((c) => document.getElementById(c.id)).filter((e): e is HTMLElement => Boolean(e));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const el of els) io.observe(el);
    return () => io.disconnect();
  }, [chapters]);
  const index = Math.max(0, chapters.findIndex((c) => c.id === active));
  return (
    <nav aria-label="Chapters" className="cn-rail">
      <span className="cn-rail-fill" aria-hidden="true" style={{ height: `${chapters.length > 1 ? (index / (chapters.length - 1)) * 100 : 0}%` }} />
      <ol>
        {chapters.map((c, i) => (
          <li key={c.id}>
            <a href={`#${c.id}`} aria-current={c.id === active ? "true" : undefined}>
              <span className="cn-rail-label">{c.label}</span>
              <span className="cn-rail-dot" aria-hidden="true">
                {String(i).padStart(2, "0")}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
