"use client";

import { useEffect, useRef, useState } from "react";

/** A4 height ÷ width. */
const A4 = 297 / 210;

/**
 * Floating sheet tools: "Save as PDF" (the browser's print dialog, which the
 * print stylesheet turns into a clean résumé) and a toggle for dashed
 * page-break guides drawn at every A4 page height. Hidden in print.
 */
export function PaperTools() {
  const ref = useRef<HTMLDivElement>(null);
  const [guides, setGuides] = useState(false);
  const [pages, setPages] = useState(0);

  useEffect(() => {
    ref.current?.closest(".pf-root")?.setAttribute("data-guides", guides ? "on" : "off");
  }, [guides]);

  useEffect(() => {
    const sheet = ref.current?.closest(".pf-root")?.querySelector<HTMLElement>(".pp-sheet");
    if (!sheet || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const { width, height } = sheet.getBoundingClientRect();
      if (width > 0) setPages(Math.max(1, Math.ceil(height / (width * A4) - 0.01)));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(sheet);
    measure();
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="pp-tools" role="group" aria-label="Sheet tools">
      <button type="button" className="pp-tool" aria-pressed={guides} onClick={() => setGuides((g) => !g)}>
        <span aria-hidden="true" className="pp-tool-icon pp-tool-icon-guides" />
        <span>Page guides</span>
        {pages ? <span className="pp-tool-count">{pages === 1 ? "1 page" : `${pages} pages`}</span> : null}
      </button>
      <button type="button" className="pp-tool pp-tool-primary" onClick={() => window.print()}>
        <span aria-hidden="true" className="pp-tool-icon pp-tool-icon-pdf" />
        <span>Save as PDF</span>
      </button>
    </div>
  );
}
