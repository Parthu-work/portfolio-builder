"use client";

import { motion, useDragControls, useMotionValue } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type App = { id: string; title: string; short: string };

type Ctx = {
  open: Set<string>;
  order: string[];
  focus: (id: string) => void;
  close: (id: string) => void;
  bounds: React.RefObject<HTMLDivElement | null>;
};
const DesktopContext = createContext<Ctx | null>(null);

/**
 * The window manager: which windows are open and their stacking order.
 * Below 900px (see os.css) none of this applies visually — every window is a
 * plain stacked section, so content is never hidden on small screens.
 */
export function Desktop({ apps, initiallyOpen, children }: { apps: App[]; initiallyOpen: string[]; children: ReactNode }) {
  const [open, setOpen] = useState(() => new Set(initiallyOpen));
  const [order, setOrder] = useState(() => [...apps.map((a) => a.id).filter((id) => !initiallyOpen.includes(id)), ...[...initiallyOpen].reverse()]);
  const bounds = useRef<HTMLDivElement>(null);

  const focus = useCallback((id: string) => {
    setOpen((o) => (o.has(id) ? o : new Set(o).add(id)));
    setOrder((o) => (o[o.length - 1] === id ? o : [...o.filter((x) => x !== id), id]));
  }, []);
  const close = useCallback((id: string) => {
    setOpen((o) => {
      const n = new Set(o);
      n.delete(id);
      return n;
    });
  }, []);

  // In-page links (#section) open and raise the matching window.
  useEffect(() => {
    const onHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (apps.some((a) => a.id === id)) focus(id);
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [apps, focus]);

  const ctx = useMemo(() => ({ open, order, focus, close, bounds }), [open, order, focus, close]);
  const top = order[order.length - 1];

  return (
    <DesktopContext.Provider value={ctx}>
      <div ref={bounds} className="os-desktop">
        {children}
      </div>
      <nav aria-label="Dock" className="os-dock">
        <ul>
          {apps.map((a) => {
            const isOpen = open.has(a.id);
            return (
              <li key={a.id}>
                <button
                  type="button"
                  className="os-dock-btn"
                  aria-pressed={isOpen}
                  aria-controls={a.id}
                  onClick={() => {
                    if (isOpen && top === a.id) close(a.id);
                    else {
                      focus(a.id);
                      requestAnimationFrame(() => document.getElementById(a.id)?.focus({ preventScroll: true }));
                    }
                  }}
                >
                  <span className="os-dock-icon" aria-hidden="true">
                    {a.short}
                  </span>
                  <span className="os-dock-label">{a.title}</span>
                  <span className="sr-only">{isOpen ? " (open)" : " (closed)"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </DesktopContext.Provider>
  );
}

/** A draggable window. Drag by the title bar, or focus the title bar and use the arrow keys. */
export function Window({ id, title, x: x0, y: y0, width, heading = true, children }: { id: string; title: string; x: number; y: number; width: number; heading?: boolean; children: ReactNode }) {
  const ctx = useContext(DesktopContext);
  const controls = useDragControls();
  const x = useMotionValue(x0);
  const y = useMotionValue(y0);
  if (!ctx) throw new Error("Window must be inside Desktop");
  const isOpen = ctx.open.has(id);
  const z = ctx.order.indexOf(id) + 1;
  const active = ctx.order[ctx.order.length - 1] === id;

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 48 : 16;
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    const box = ctx.bounds.current?.getBoundingClientRect();
    x.set(Math.max(-width + 120, Math.min((box?.width ?? 1200) - 120, x.get() + m[0])));
    y.set(Math.max(0, Math.min((box?.height ?? 700) - 60, y.get() + m[1])));
  };

  return (
    <motion.section
      id={id}
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
      className="os-window"
      data-active={active || undefined}
      hidden={!isOpen}
      style={{ x, y, zIndex: z, width }}
      drag
      dragListener={false}
      dragControls={controls}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={ctx.bounds}
      onPointerDown={() => ctx.focus(id)}
      onFocusCapture={() => ctx.focus(id)}
    >
      <div
        className="os-titlebar"
        role="group"
        tabIndex={0}
        aria-label={`${title} window. Use the arrow keys to move it.`}
        onPointerDown={(e) => {
          if (!(e.target as HTMLElement).closest("button")) controls.start(e);
        }}
        onKeyDown={onKey}
      >
        <button type="button" className="os-close" onClick={() => ctx.close(id)}>
          <span aria-hidden="true">×</span>
          <span className="sr-only">Close {title}</span>
        </button>
        {heading ? (
          <h2 id={`${id}-title`} className="os-title">
            {title}
          </h2>
        ) : (
          <p id={`${id}-title`} className="os-title">
            {title}
          </p>
        )}
        <span className="os-grip" aria-hidden="true" />
      </div>
      <div className="os-body">{children}</div>
    </motion.section>
  );
}
