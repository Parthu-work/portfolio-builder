"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Shot = { src: string; alt: string; trigger: HTMLElement };

const TRIGGERS = "[data-lb], .pf-gallery .pf-img";

/**
 * A keyboard-accessible lightbox. Every image is already on the page; this
 * enlarges the very same picture (its loaded currentSrc) in a modal <dialog>.
 * ←/→ move, Esc closes, focus returns to the image that opened it.
 */
export function Lightbox() {
  const anchor = useRef<HTMLSpanElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const shots = useRef<Shot[]>([]);
  const [index, setIndex] = useState(-1);
  const [shot, setShot] = useState<Shot | null>(null);

  const collect = useCallback((): Shot[] => {
    const main = anchor.current?.closest("main");
    if (!main) return [];
    return Array.from(main.querySelectorAll<HTMLElement>(TRIGGERS))
      .map((trigger) => {
        const img = trigger.querySelector("img");
        return img ? { src: img.currentSrc || img.src, alt: img.alt, trigger } : null;
      })
      .filter((s): s is Shot => s !== null);
  }, []);

  const show = useCallback((i: number) => {
    const list = shots.current;
    if (!list.length) return;
    const n = (i + list.length) % list.length;
    setIndex(n);
    setShot(list[n]!);
  }, []);

  const open = useCallback(
    (trigger: HTMLElement) => {
      shots.current = collect();
      const i = shots.current.findIndex((s) => s.trigger === trigger);
      if (i < 0) return;
      show(i);
      const d = dialog.current;
      if (d && !d.open) d.showModal();
    },
    [collect, show],
  );

  useEffect(() => {
    const main = anchor.current?.closest("main");
    if (!main) return;
    // Gallery thumbnails come from the shared renderer: make them operable too.
    for (const el of Array.from(main.querySelectorAll<HTMLElement>(".pf-gallery .pf-img"))) {
      const alt = el.querySelector("img")?.alt;
      el.tabIndex = 0;
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", alt ? `Enlarge image: ${alt}` : "Enlarge image");
    }
    const onClick = (ev: MouseEvent) => {
      const t = (ev.target as Element | null)?.closest<HTMLElement>(TRIGGERS);
      if (!t || !main.contains(t)) return;
      ev.preventDefault();
      open(t);
    };
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement;
      if ((ev.key === "Enter" || ev.key === " ") && t.matches?.(".pf-gallery .pf-img")) {
        ev.preventDefault();
        open(t);
      }
    };
    main.addEventListener("click", onClick);
    main.addEventListener("keydown", onKey);
    return () => {
      main.removeEventListener("click", onClick);
      main.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => dialog.current?.close();
  const onClose = () => {
    const t = shot?.trigger;
    setShot(null);
    setIndex(-1);
    t?.focus();
  };

  return (
    <>
      <span ref={anchor} hidden />
      <dialog
        ref={dialog}
        className="lm-dialog"
        aria-label="Image viewer"
        onClose={onClose}
        onClick={(ev) => {
          if (ev.target === ev.currentTarget) close();
        }}
        onKeyDown={(ev) => {
          if (ev.key === "ArrowRight") {
            ev.preventDefault();
            show(index + 1);
          } else if (ev.key === "ArrowLeft") {
            ev.preventDefault();
            show(index - 1);
          }
        }}
      >
        <div className="lm-dialog-bar">
          <p className="lm-caps" aria-live="polite">
            {shot ? `${index + 1} / ${shots.current.length}` : ""}
          </p>
          <button type="button" className="lm-dialog-btn" onClick={close} autoFocus>
            Close
          </button>
        </div>
        <figure className="lm-dialog-figure">
          {/* eslint-disable-next-line @next/next/no-img-element -- re-shows the already-loaded image */}
          {shot ? <img src={shot.src} alt={shot.alt} className="lm-dialog-img" /> : null}
          {shot?.alt ? <figcaption className="lm-sub">{shot.alt}</figcaption> : null}
        </figure>
        {shots.current.length > 1 ? (
          <div className="lm-dialog-nav">
            <button type="button" className="lm-dialog-btn" onClick={() => show(index - 1)}>
              <span aria-hidden="true">← </span>Previous
            </button>
            <button type="button" className="lm-dialog-btn" onClick={() => show(index + 1)}>
              Next<span aria-hidden="true"> →</span>
            </button>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
