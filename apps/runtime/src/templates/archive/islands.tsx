"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Img } from "../../render/Img";
import type { ImageValue } from "../../schema/portfolio";

export type IndexRow = {
  id: string;
  no: string;
  order: number;
  title: string;
  section: string;
  sectionId: string;
  year: string;
  tags: string[];
  image?: ImageValue;
};

type Sort = "order" | "asc" | "desc";
const SORT_LABEL: Record<Sort, string> = { order: "Catalogue order", asc: "Year, oldest first", desc: "Year, newest first" };

/**
 * The catalogue index: every entry, server-rendered, with client-side section
 * filters and a year sort. Hovering or focusing a row previews its image —
 * following the pointer on fine pointers, in a fixed pane otherwise.
 */
export function CatalogueIndex({ rows, sections }: { rows: IndexRow[]; sections: { id: string; label: string }[] }) {
  const [filter, setFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("order");
  const [active, setActive] = useState<IndexRow | null>(null);
  const [follow, setFollow] = useState(false);
  const floatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = floatRef.current;
    const root = el?.closest<HTMLElement>(".pf-root");
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setFollow(fine && !reduce && root?.dataset.motion !== "none");
  }, []);

  const shown = useMemo(() => {
    const list = rows.filter((r) => !filter || r.sectionId === filter);
    if (sort === "order") return list;
    const dir = sort === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (!a.year && !b.year) return a.order - b.order;
      if (!a.year) return 1;
      if (!b.year) return -1;
      return (Number(a.year) - Number(b.year)) * dir || a.order - b.order;
    });
  }, [rows, filter, sort]);

  const visible = new Set(shown.map((r) => r.id));
  const ordered = [...shown, ...rows.filter((r) => !visible.has(r.id))];

  const move = (ev: RPointerEvent) => {
    const el = floatRef.current;
    if (!el || !follow) return;
    el.style.transform = `translate3d(${ev.clientX + 18}px, ${ev.clientY + 18}px, 0)`;
  };

  const nextSort: Record<Sort, Sort> = { order: "desc", desc: "asc", asc: "order" };

  return (
    <div className="ar-index">
      <div className="ar-index-tools">
        <div className="ar-filters" role="group" aria-label="Filter by section">
          <button type="button" className="ar-chip" aria-pressed={filter === null} onClick={() => setFilter(null)}>
            All <span className="ar-chip-n">{rows.length}</span>
          </button>
          {sections.map((s) => (
            <button key={s.id} type="button" className="ar-chip" aria-pressed={filter === s.id} onClick={() => setFilter((f) => (f === s.id ? null : s.id))}>
              {s.label} <span className="ar-chip-n">{rows.filter((r) => r.sectionId === s.id).length}</span>
            </button>
          ))}
        </div>
        <div className="ar-index-status">
          <p role="status" aria-live="polite" className="ar-nums">
            {shown.length} of {rows.length} entries
          </p>
          <button type="button" className="ar-chip ar-sort" onClick={() => setSort((s) => nextSort[s])}>
            Sort: {SORT_LABEL[sort]}
          </button>
        </div>
      </div>

      <div className="ar-index-grid">
        <table className="ar-table" onPointerLeave={() => setActive(null)}>
          <thead>
            <tr>
              <th scope="col">No.</th>
              <th scope="col">Title</th>
              <th scope="col" className="ar-col-section">
                Section
              </th>
              <th scope="col" aria-sort={sort === "order" ? "none" : sort === "asc" ? "ascending" : "descending"}>
                Year
              </th>
              <th scope="col" className="ar-col-tags">
                Tags
              </th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((r) => (
              <tr
                key={r.id}
                hidden={!visible.has(r.id)}
                className={active?.id === r.id ? "is-active" : ""}
                onPointerEnter={() => setActive(r)}
                onPointerMove={move}
                onFocus={() => setActive(r)}
              >
                <td className="ar-no ar-nums">{r.no}</td>
                <td className="ar-td-title">
                  <a href={`#${r.id}`}>{r.title}</a>
                  {r.image ? (
                    <span className="ar-has-img" aria-hidden="true">
                      ◧
                    </span>
                  ) : null}
                </td>
                <td className="ar-col-section">{r.section}</td>
                <td className="ar-nums">{r.year}</td>
                <td className="ar-col-tags">{r.tags.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <aside className="ar-pane" aria-hidden="true">
          <div className="ar-pane-inner">
            {active?.image ? (
              <Img key={active.id} image={active.image} aspect="4 / 5" sizes="280px" className="ar-media" />
            ) : (
              <div className="ar-pane-empty">
                <span className="ar-pane-no">{active ? active.no : `No. 001–${String(rows.length).padStart(3, "0")}`}</span>
              </div>
            )}
            <p className="ar-pane-title">{active ? active.title : ""}</p>
            <p className="ar-pane-meta ar-nums">{active ? [active.section, active.year].filter(Boolean).join(" · ") : ""}</p>
          </div>
        </aside>
      </div>

      <div ref={floatRef} className={`ar-float ${follow && active?.image ? "is-on" : ""}`} aria-hidden="true">
        {follow && active?.image ? <Img key={active.id} image={active.image} aspect="4 / 3" sizes="240px" className="ar-media" /> : null}
      </div>
    </div>
  );
}
