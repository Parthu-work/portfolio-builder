"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Line = { k: string; v: string; tone?: "ok" | "hint" };

function diagnose(): Line[] {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const device = w < 640 ? "phone" : w < 1024 ? "tablet" : w >= 1920 ? "large display" : "desktop";
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const now = new Date();
  const hour = now.getHours();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const lang = navigator.language || "en";
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType;
  const when = hour < 6 ? "after midnight" : hour < 12 ? "this morning" : hour < 18 ? "this afternoon" : "this evening";
  const verdict =
    hour < 6
      ? "Late-night research. I will keep this brief."
      : hour < 18
        ? `Reviewing candidates on a ${device} ${when}? Start with the work.`
        : `Browsing on a ${device} ${when}. The highlights are one click away.`;
  return [
    { k: "viewport", v: `${w}×${h} · ${device}` },
    { k: "theme", v: `${dark ? "dark" : "light"} preferred${reduced ? " · reduced motion" : ""}` },
    { k: "locale", v: `${lang} · ${tz.replace(/_/g, " ")} · ${time}` },
    ...(conn ? [{ k: "network", v: conn }] : []),
    { k: "diagnosis", v: verdict, tone: "ok" as const },
  ];
}

/** The hero terminal: inspects the visitor's own environment (locally — nothing is sent anywhere) and "diagnoses" them. */
export function Terminal({ user, motion, target }: { user: string; motion: string; target?: { href: string; label: string } }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const all = diagnose();
    const instant = motion === "none" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setLines(all);
    if (instant) {
      setShown(all.length);
      return;
    }
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= all.length) window.clearInterval(id);
    }, motion === "subtle" ? 160 : 380);
    return () => window.clearInterval(id);
  }, [motion]);

  const done = lines.length > 0 && shown >= lines.length;
  return (
    <div className="sg-term" role="group" aria-label="Terminal: visitor diagnostics">
      <div className="sg-term-bar" aria-hidden="true">
        <span />
        <span />
        <span />
        <p>{user}@portfolio — diagnose</p>
      </div>
      <div className="sg-term-body">
        <p>
          <span className="text-sig">$</span> persona diagnose --visitor
        </p>
        {lines.slice(0, shown).map((l) => (
          <p key={l.k} className={l.tone === "ok" ? "sg-ok" : undefined}>
            <span className="sg-key">{l.tone === "ok" ? "✔" : "›"} {l.k}</span>
            <span>{l.v}</span>
          </p>
        ))}
        {done && target ? (
          <p>
            <span className="sg-key">→ next</span>
            <a href={target.href} className="pf-link">
              open {target.label.toLowerCase()}
            </a>
          </p>
        ) : null}
        <p aria-hidden="true">
          <span className="text-sig">$</span> <span className="sg-caret" />
        </p>
      </div>
    </div>
  );
}

export type Command = { label: string; href: string; group: string };

/** ⌘K / Ctrl+K command palette built on the native <dialog> (focus trap and Esc for free). */
export function CommandPalette({ commands }: { commands: Command[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? commands.filter((c) => `${c.label} ${c.group}`.toLowerCase().includes(needle)) : commands;
  }, [q, commands]);

  const open = () => {
    setQ("");
    setActive(0);
    if (!ref.current?.open) ref.current?.showModal();
  };
  const close = () => ref.current?.close();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (ref.current?.open) close();
        else open();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (c: Command | undefined) => {
    if (!c) return;
    close();
    if (/^https?:/.test(c.href)) window.open(c.href, "_blank", "noopener,noreferrer");
    else window.location.assign(c.href);
  };

  return (
    <>
      <button type="button" onClick={open} className="sg-kbd-btn" aria-haspopup="dialog" aria-keyshortcuts="Meta+K Control+K">
        <span className="hidden sm:inline">Jump to…</span>
        <kbd aria-hidden="true">⌘K</kbd>
        <span className="sr-only">Open command palette</span>
      </button>
      <dialog ref={ref} className="sg-palette" aria-label="Command palette" onClick={(e) => e.target === ref.current && close()}>
        <div className="sg-palette-box">
          <input
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="sg-cmd-list"
            aria-activedescendant={results[active] ? `sg-cmd-${active}` : undefined}
            aria-label="Search sections and links"
            placeholder="Type to filter…"
            value={q}
            autoFocus
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                go(results[active]);
              }
            }}
          />
          <ul id="sg-cmd-list" role="listbox" aria-label="Results">
            {results.map((c, i) => (
              <li key={c.group + c.href + c.label} id={`sg-cmd-${i}`} role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => go(c)}>
                <span>{c.label}</span>
                <span className="sg-cmd-group">{c.group}</span>
              </li>
            ))}
            {results.length === 0 ? <li className="sg-cmd-empty" role="option" aria-selected="false" aria-disabled="true">No matches</li> : null}
          </ul>
          <p className="sg-palette-help" aria-hidden="true">
            ↑↓ navigate · ↵ open · esc close
          </p>
        </div>
      </dialog>
    </>
  );
}
