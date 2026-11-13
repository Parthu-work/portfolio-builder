"use client";

import { useRef, useState, type KeyboardEvent } from "react";

type Tile = { href: string; label: string; no: string; count: number };

/**
 * The level-select map: one tile per section. A roving tabindex keeps it a
 * single Tab stop; arrow keys move the selector (up/down by row), Home/End
 * jump, Enter follows the link to the section.
 */
export function LevelSelect({ items }: { items: Tile[] }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);

  const focus = (i: number) => {
    const n = Math.max(0, Math.min(items.length - 1, i));
    setActive(n);
    refs.current[n]?.focus();
  };

  /** Tiles per row, measured from layout (it changes with the viewport). */
  const columns = () => {
    const tops = refs.current.filter(Boolean).map((el) => el!.offsetTop);
    const first = tops[0];
    const perRow = tops.filter((t) => t === first).length;
    return Math.max(1, perRow);
  };

  const onKey = (ev: KeyboardEvent<HTMLAnchorElement>, i: number) => {
    const cols = columns();
    const moves: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + cols, ArrowUp: i - cols, Home: 0, End: items.length - 1 };
    const next = moves[ev.key];
    if (next === undefined) return;
    ev.preventDefault();
    focus(next);
  };

  return (
    <ul className="ac-map">
      {items.map((it, i) => (
        <li key={it.href}>
          <a
            ref={(el) => {
              refs.current[i] = el;
            }}
            href={it.href}
            className="ac-px ac-tile"
            tabIndex={i === active ? 0 : -1}
            data-selected={i === active ? "" : undefined}
            onFocus={() => setActive(i)}
            onKeyDown={(ev) => onKey(ev, i)}
          >
            <span className="ac-tile-no" aria-hidden="true">
              {it.no}
            </span>
            <span className="ac-tile-label">{it.label}</span>
            {it.count ? (
              <span className="ac-tile-count">
                <span aria-hidden="true">×</span>
                {it.count}
                <span className="sr-only"> {it.count === 1 ? "entry" : "entries"}</span>
              </span>
            ) : null}
          </a>
        </li>
      ))}
    </ul>
  );
}
