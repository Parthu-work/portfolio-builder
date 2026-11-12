import { Cover, TemplateRoot } from "../../render/Root";
import { Links, Prose, Rest, Socials, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { TemplateProps } from "../types";
import { CatalogueIndex, type IndexRow } from "./islands";

const cat = (n: number) => `No. ${String(n).padStart(3, "0")}`;
const yearOf = (date?: string) => date?.match(/\d{4}/)?.[0];
const entryId = (e: Entry) => `no-${e.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

type Numbered = { e: Entry; n: number };

function Body({ e, lang }: { e: Entry; lang: string }) {
  return (
    <>
      {e.body ? <Prose html={e.body} className="ar-prose" /> : null}
      <Tail e={e} lang={lang} />
    </>
  );
}

/** Subtitle, date and metric as a labelled metadata grid (labels are the field roles, not invented values). */
function Meta({ e }: { e: Entry }) {
  if (!e.subtitle && !e.date && !e.metric) return null;
  return (
    <dl className="ar-meta">
      {e.subtitle ? (
        <div>
          <dt>Detail</dt>
          <dd>{e.subtitle}</dd>
        </div>
      ) : null}
      {e.date ? (
        <div>
          <dt>Date</dt>
          <dd className="ar-nums">{e.date}</dd>
        </div>
      ) : null}
      {e.metric ? (
        <div>
          <dt>{e.metric.label || "Figure"}</dt>
          <dd className="ar-meta-figure">{e.metric.value}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function Lead({ s, lang }: { s: SectionView; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  const contact = s.kind === "contact";
  return (
    <div className={`ar-lead ${e.image ? "ar-lead-img" : ""}`}>
      <div className="grid content-start gap-4">
        {e.title ? <p className="ar-lead-title">{e.title}</p> : null}
        <Meta e={e} />
        {e.body ? <Prose html={e.body} className="ar-prose ar-prose-lead" /> : null}
        <Tail e={{ ...e, links: contact ? [] : e.links }} lang={lang} />
        {contact ? <Links links={e.links} primaryFirst /> : null}
      </div>
      {e.image ? (
        <figure className="ar-plate">
          <Img image={e.image} aspect="4 / 5" sizes="(min-width: 1024px) 300px, 70vw" className="ar-media" />
          {e.image.alt ? <figcaption className="ar-caption">{e.image.alt}</figcaption> : null}
        </figure>
      ) : null}
    </div>
  );
}

function Items({ s, items, lang }: { s: SectionView; items: Numbered[]; lang: string }) {
  if (!items.length) return null;
  switch (s.layout) {
    case "metrics":
      return (
        <ul className="ar-specimens">
          {items.map(({ e, n }) => (
            <li key={e.id} id={entryId(e)} className="ar-specimen">
              <span className="ar-no">{cat(n)}</span>
              {e.metric ? <span className="ar-specimen-value">{e.metric.value}</span> : null}
              <span className="ar-specimen-label">{e.metric?.label || e.title}</span>
              {e.metric?.label && e.title ? <span className="ar-mute">{e.title}</span> : null}
              {e.subtitle ? <span className="ar-mute">{e.subtitle}</span> : null}
              {e.date ? <span className="ar-mute ar-nums">{e.date}</span> : null}
              {e.image ? <Img image={e.image} aspect="4 / 3" sizes="200px" className="ar-media" /> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "tags":
      return (
        <ol className="ar-classes">
          {items.map(({ e, n }, gi) => (
            <li key={e.id} id={entryId(e)} className="ar-class">
              <div className="ar-class-head">
                <span className="ar-no">{cat(n)}</span>
                <h3 className="ar-h3">{e.title}</h3>
                {e.date ? <span className="ar-mute ar-nums">{e.date}</span> : null}
              </div>
              {e.subtitle ? <p className="ar-mute">{e.subtitle}</p> : null}
              {e.tags?.length ? (
                <ul className="ar-class-list">
                  {e.tags.map((t, i) => (
                    <li key={t + i}>
                      <span className="ar-code" aria-hidden="true">
                        {gi + 1}.{i + 1}
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              ) : null}
              {e.image ? <Img image={e.image} aspect="4 / 3" sizes="200px" className="ar-media max-w-[14rem]" /> : null}
              <Body e={{ ...e, tags: [] }} lang={lang} />
            </li>
          ))}
        </ol>
      );
    case "quotes":
      return (
        <div className="ar-letters">
          {items.map(({ e, n }) => (
            <figure key={e.id} id={entryId(e)} className="ar-letter">
              <header className="ar-letter-head">
                <span className="ar-no">{cat(n)}</span>
                {e.date ? <span className="ar-nums">{e.date}</span> : null}
              </header>
              {e.body ? (
                <blockquote className="ar-letter-text">
                  <Prose html={e.body} />
                </blockquote>
              ) : null}
              <figcaption className="ar-letter-by">
                {e.image ? <Img image={e.image} aspect="1 / 1" sizes="40px" className="ar-avatar" /> : null}
                <span className="grid">
                  <span className="ar-letter-name">{e.title}</span>
                  {e.subtitle ? <span className="ar-mute">{e.subtitle}</span> : null}
                </span>
              </figcaption>
              <Tail e={e} lang={lang} />
            </figure>
          ))}
        </div>
      );
    case "grid":
      return (
        <ul className="ar-cards">
          {items.map(({ e, n }) => (
            <li key={e.id} id={entryId(e)} className="ar-card">
              <div className="ar-card-plate">
                {e.image ? (
                  <Img image={e.image} aspect="4 / 3" sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw" className="ar-media" />
                ) : (
                  <Cover seed={e.id + (e.title ?? "")} label={e.title} className="ar-media aspect-[4/3]" />
                )}
                <span className="ar-no ar-card-no">{cat(n)}</span>
              </div>
              <h3 className="ar-h3">{e.title}</h3>
              <Meta e={e} />
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "list":
      return (
        <ul className="ar-rows">
          {items.map(({ e, n }) => (
            <li key={e.id} id={entryId(e)} className="ar-row">
              <span className="ar-no">{cat(n)}</span>
              <div className="grid min-w-0 gap-1.5">
                <h3 className="ar-h3 ar-h3-sm">{e.title}</h3>
                {e.subtitle ? <p className="ar-mute">{e.subtitle}</p> : null}
                {e.image ? <Img image={e.image} aspect="4 / 3" sizes="200px" className="ar-media max-w-[12rem]" /> : null}
                <Body e={e} lang={lang} />
              </div>
              <span className="ar-row-date ar-nums">{e.date}</span>
            </li>
          ))}
        </ul>
      );
    default: {
      const groups: { year: string; items: Numbered[] }[] = [];
      for (const it of items) {
        const y = yearOf(it.e.date) ?? "—";
        const last = groups[groups.length - 1];
        if (last && last.year === y) last.items.push(it);
        else groups.push({ year: y, items: [it] });
      }
      return (
        <div className="ar-years">
          {groups.map((g, gi) => (
            <div key={g.year + gi} className="ar-year">
              <p className="ar-year-label ar-nums" aria-hidden="true">
                {g.year}
              </p>
              <ol className="ar-rows">
                {g.items.map(({ e, n }) => (
                  <li key={e.id} id={entryId(e)} className="ar-row">
                    <span className="ar-no">{cat(n)}</span>
                    <div className="grid min-w-0 gap-1.5">
                      <h3 className="ar-h3 ar-h3-sm">{e.title}</h3>
                      {e.subtitle ? <p className="ar-mute">{e.subtitle}</p> : null}
                      {e.image ? <Img image={e.image} aspect="16 / 9" sizes="(min-width: 768px) 320px, 80vw" className="ar-media max-w-xs" /> : null}
                      <Body e={e} lang={lang} />
                    </div>
                    <span className="ar-row-date ar-nums">{e.date}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      );
    }
  }
}

export default function Archive({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  let n = 0;
  const numbered = v.sections.map((s) => s.entries.map((e) => ({ e, n: ++n })));
  const rows: IndexRow[] = v.sections.flatMap((s, si) =>
    numbered[si]!.map(({ e, n: no }) => ({
      id: entryId(e),
      no: cat(no),
      order: no,
      title: e.title ?? e.subtitle ?? cat(no),
      section: s.title,
      sectionId: s.anchor,
      year: yearOf(e.date) ?? "",
      tags: (e.tags ?? []).slice(0, 4),
      ...(e.image ? { image: e.image } : {}),
    })),
  );
  return (
    <TemplateRoot portfolio={portfolio}>
      <div className="ar-page">
        <header id="top" className={`ar-mast ${hero.present ? "" : "ar-mast-compact"}`}>
          <div className="ar-mast-top">
            <p className="ar-label">{hero.eyebrow ?? hero.location ?? ""}</p>
            <p className="ar-label ar-nums">
              {n} entries · {v.sections.length} sections
            </p>
          </div>
          <div className="ar-mast-main">
            <div className="grid content-end gap-5">
              <h1 className="ar-name">{hero.name}</h1>
              {hero.headline ? <p className="ar-headline">{hero.headline}</p> : null}
            </div>
            {hero.image && hero.present ? (
              <figure className="ar-plate ar-mast-plate">
                <Img image={hero.image} aspect="3 / 4" sizes="(min-width: 768px) 200px, 40vw" priority className="ar-media" />
                <figcaption className="ar-caption">{cat(0)}</figcaption>
              </figure>
            ) : null}
          </div>
          <div className="ar-mast-foot">
            {hero.present && hero.tagline ? <Prose html={hero.tagline} className="ar-prose" /> : null}
            <div className="grid content-start gap-4">
              {hero.present ? <Links links={hero.links} primaryFirst /> : null}
              <dl className="ar-meta">
                {hero.eyebrow && hero.location ? (
                  <div>
                    <dt>Location</dt>
                    <dd>{hero.location}</dd>
                  </div>
                ) : null}
                {v.email ? (
                  <div>
                    <dt>Email</dt>
                    <dd>
                      <a href={`mailto:${v.email}`} className="pf-link">
                        {v.email}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
              <Socials socials={v.socials} className="ar-socials" />
              <Rest slots={hero.rest} lang={v.lang} />
            </div>
          </div>
        </header>

        <main id="main" tabIndex={-1}>
          {rows.length ? (
            <section aria-labelledby="ar-index-title" className="ar-index-section">
              <h2 id="ar-index-title" className="ar-index-title">
                Index
              </h2>
              <CatalogueIndex rows={rows} sections={v.sections.filter((s) => s.entries.length).map((s) => ({ id: s.anchor, label: s.title }))} />
            </section>
          ) : null}

          {v.sections.map((s, si) => (
            <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className={`ar-section ar-l-${s.layout}`}>
              <header className="ar-section-head">
                <span className="ar-label ar-nums" aria-hidden="true">
                  {String.fromCharCode(65 + (si % 26))}
                  {si >= 26 ? Math.floor(si / 26) : ""}
                </span>
                <h2 id={`${s.anchor}-title`} className="ar-h2">
                  {s.title}
                </h2>
                {s.subtitle ? <p className="ar-mute ar-section-sub">{s.subtitle}</p> : null}
                {s.entries.length ? (
                  <span className="ar-label ar-nums">
                    {numbered[si]![0] ? cat(numbered[si]![0].n) : ""}
                    {s.entries.length > 1 ? ` – ${String(numbered[si]![s.entries.length - 1]!.n).padStart(3, "0")}` : ""}
                  </span>
                ) : null}
              </header>
              <div className="ar-section-body">
                <Lead s={s} lang={v.lang} />
                <Items s={s} items={numbered[si]!} lang={v.lang} />
              </div>
            </section>
          ))}
        </main>

        <footer className="ar-foot">
          <span>{hero.name}</span>
          <span className="ar-nums">{n} entries</span>
          <a href="#top" className="ar-foot-top">
            Back to top <span aria-hidden="true">↑</span>
          </a>
        </footer>
      </div>
    </TemplateRoot>
  );
}
