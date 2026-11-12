"use client";

import { useEffect, useRef, useState } from "react";

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.closest("[contenteditable]") !== null);

/**
 * j / k move focus to the next / previous entry (a subtle marker shows where
 * you are); ? toggles a small hint. Silent: nothing is announced beyond the
 * focus move itself, and nothing fires while typing in a field.
 */
export function KeyNav() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current?.closest<HTMLElement>(".pf-root");
    if (!root) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.altKey || typing(ev.target)) return;
      if (ev.key === "?") {
        ev.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (ev.key === "Escape") {
        setOpen(false);
        return;
      }
      if (ev.key !== "j" && ev.key !== "k") return;
      const stops = Array.from(root.querySelectorAll<HTMLElement>("[data-entry]"));
      if (!stops.length) return;
      ev.preventDefault();
      const active = document.activeElement as HTMLElement | null;
      let i = active ? stops.findIndex((s) => s === active || s.contains(active)) : -1;
      if (i < 0) {
        // Start from the entry nearest the top of the viewport.
        const firstBelow = stops.findIndex((s) => s.getBoundingClientRect().top >= 0);
        i = ev.key === "j" ? (firstBelow < 0 ? stops.length - 1 : firstBelow - 1) : firstBelow < 0 ? stops.length : firstBelow;
      }
      const next = stops[Math.min(stops.length - 1, Math.max(0, i + (ev.key === "j" ? 1 : -1)))]!;
      const still = root.dataset.motion === "none" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      next.focus({ preventScroll: true });
      next.scrollIntoView({ block: "center", behavior: still ? "auto" : "smooth" });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div ref={ref} className="qt-keys">
      <button type="button" className="qt-keys-btn" aria-expanded={open} aria-controls="qt-keys-hint" onClick={() => setOpen((o) => !o)}>
        <kbd>?</kbd> Shortcuts
      </button>
      <div id="qt-keys-hint" className="qt-keys-hint" hidden={!open}>
        <p>
          <kbd>j</kbd> <kbd>k</kbd> next / previous entry
        </p>
        <p>
          <kbd>?</kbd> toggle this hint · <kbd>esc</kbd> close
        </p>
      </div>
    </div>
  );
}
