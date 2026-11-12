"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Sidenotes are <details>. On wide screens CSS already shows them in the
 * margin (data-auto); this opens them for real so state matches the screen,
 * in browsers without ::details-content too.
 */
export function Sidenotes() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const page = ref.current?.closest(".mg-page");
    if (!page) return;
    const notes = Array.from(page.querySelectorAll<HTMLDetailsElement>("details.mg-note"));
    const wide = window.matchMedia("(min-width: 1100px)");
    const sync = () => {
      for (const d of notes) {
        if (wide.matches) d.open = true;
        d.removeAttribute("data-auto");
      }
    };
    sync();
    wide.addEventListener("change", sync);
    return () => wide.removeEventListener("change", sync);
  }, []);
  return <span ref={ref} hidden />;
}

/** Copies the entry's own title, subtitle and date as a plain reference line. */
export function CopyRef({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <p className="mg-copy">
      <button
        type="button"
        className="mg-copy-btn"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setDone(true);
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => setDone(false), 2000);
          } catch {
            setDone(false);
          }
        }}
      >
        Copy reference
      </button>
      <span role="status" aria-live="polite" className="mg-copy-status">
        {done ? "Copied" : ""}
      </span>
    </p>
  );
}
