"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Section mini-cards are <details>. From 1024px CSS already shows their
 * content (data-auto); this opens them for real so the toggle state matches
 * what is on screen, then hands control back to the visitor.
 */
export function CardFolds() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const main = ref.current?.parentElement;
    if (!main) return;
    const wide = window.matchMedia("(min-width: 1024px)");
    const folds = Array.from(main.querySelectorAll<HTMLDetailsElement>("details[data-auto]"));
    if (wide.matches) for (const d of folds) d.open = true;
    for (const d of folds) d.removeAttribute("data-auto");
    // Following a link to a section (e.g. the quick links) unfolds it.
    const onHash = () => {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      const d = target?.querySelector("details");
      if (d) d.open = true;
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return <span ref={ref} hidden />;
}

/** Native share sheet where available; otherwise copies the page URL. Announced politely. */
export function ShareButton({ title }: { title: string }) {
  const [msg, setMsg] = useState("");
  const timer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const say = (text: string) => {
    setMsg(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(""), 2600);
  };

  const share = async () => {
    const url = location.href.split("#")[0]!;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      say("Link copied");
    } catch {
      say("Copy failed — use the address bar");
    }
  };

  return (
    <>
      <button type="button" className="cd-share" onClick={share}>
        <span aria-hidden="true" className="cd-share-icon" />
        <span>Share</span>
      </button>
      <p role="status" aria-live="polite" className={`cd-toast ${msg ? "is-on" : ""}`}>
        {msg}
      </p>
    </>
  );
}
