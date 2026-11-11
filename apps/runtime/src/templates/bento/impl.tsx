"use client";

import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useId, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from "react";

/** Moves a soft spotlight under the pointer on whichever tile is hovered (CSS variables only, no re-render). */
export function Spotlight({ children, className = "" }: { children: ReactNode; className?: string }) {
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const tile = (e.target as HTMLElement).closest<HTMLElement>(".bt-tile");
    if (!tile) return;
    const r = tile.getBoundingClientRect();
    tile.style.setProperty("--mx", `${e.clientX - r.left}px`);
    tile.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <div className={className} onPointerMove={onMove}>
      {children}
    </div>
  );
}

/**
 * A tile that expands into a detail view. The tile and the dialog share a
 * framer-motion layoutId, so the card itself grows into place. The dialog
 * traps focus, closes on Esc / backdrop, and returns focus to its tile.
 */
export function ExpandableTile({ label, className = "", motionLevel, summary, detail }: { label: string; className?: string; motionLevel: string; summary: ReactNode; detail: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const reduced = useReducedMotion();
  const still = reduced || motionLevel === "none";
  const dialog = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => opener.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLElement>("[data-close]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key !== "Tab" || !dialog.current) return;
      const f = dialog.current.querySelectorAll<HTMLElement>("a[href], button, [tabindex]:not([tabindex='-1'])");
      const first = f[0];
      const last = f[f.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const onTileClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("a, button")) return;
    setOpen(true);
  };

  const spring = still ? { duration: 0 } : motionLevel === "subtle" ? { duration: 0.2 } : { type: "spring" as const, stiffness: 380, damping: 34 };

  return (
    <MotionConfig transition={spring}>
      <motion.article layoutId={`tile-${id}`} className={`bt-tile bt-expandable ${className}`} onClick={onTileClick} style={{ borderRadius: "var(--r)" }}>
        {summary}
        <button ref={opener} type="button" className="bt-open" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
          <span aria-hidden="true">↗</span>
          <span className="sr-only">Open details: {label}</span>
        </button>
      </motion.article>
      <AnimatePresence>
        {open ? (
          <div className="bt-overlay">
            <motion.div className="bt-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} aria-hidden="true" />
            <motion.div ref={dialog} layoutId={`tile-${id}`} role="dialog" aria-modal="true" aria-label={label} className="bt-dialog" style={{ borderRadius: "calc(var(--r) * 1.4)" }}>
              <button type="button" data-close className="bt-close" onClick={close}>
                <span aria-hidden="true">✕</span>
                <span className="sr-only">Close details</span>
              </button>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: still ? 0 : 0.12 } }} exit={{ opacity: 0, transition: { duration: 0.05 } }}>
                {detail}
              </motion.div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  );
}
