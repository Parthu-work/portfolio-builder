import { TemplateRoot } from "../../render/Root";
import { Links, Prose, Rest, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { TemplateProps } from "../types";
import { KeyNav } from "./islands";

/* Every entry is a j/k stop: focusable by script (tabIndex -1), marked with data-entry. */
const STOP = { "data-entry": "", tabIndex: -1 } as const;

function Body({ e, lang }: { e: Entry; lang: string }) {
  return (
    <>
      {e.body ? <Prose html={e.body} className="qt-prose" /> : null}
      <Tail e={e} lang={lang} />
    </>
  );
}

function Pic({ e, aspect = "3 / 2" }: { e: Entry; aspect?: string }) {
  return e.image ? <Img image={e.image} aspect={aspect} sizes="(min-width: 768px) 320px, 90vw" className="qt-media" /> : null;
}

function Lead({ s, lang }: { s: SectionView; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  const contact = s.kind === "contact";
  return (
    <div className="qt-lead" {...STOP}>
      {e.title ? <p className="qt-strong">{e.title}</p> : null}
      {e.subtitle ? <p className="qt-mute">{e.subtitle}</p> : null}
      {e.date ? <p className="qt-mute">{e.date}</p> : null}
      {e.body ? <Prose html={e.body} className="qt-prose qt-prose-lead" /> : null}
      {e.metric ? (
        <p>
          <span className="qt-strong">{e.metric.value}</span> <span className="qt-mute">{e.metric.label}</span>
        </p>
      ) : null}
      <Pic e={e} aspect="4 / 5" />
      <Tail e={{ ...e, links: contact ? [] : e.links }} lang={lang} />
      {contact ? <Links links={e.links} className="qt-links" /> : null}
    </div>
  );
}

function Items({ s, lang }: { s: SectionView; lang: string }) {
  if (!s.entries.length) return null;
  switch (s.layout) {
    case "metrics":
      return (
        <ul className="qt-figures">
          {s.entries.map((e) => (
            <li key={e.id} className="qt-figure" {...STOP}>
              {e.metric ? <span className="qt-figure-value">{e.metric.value}</span> : null} <span className="qt-strong-sm">{e.metric?.label || e.title}</span>
              {e.metric?.label && e.title ? <span className="qt-mute"> — {e.title}</span> : null}
              {e.subtitle ? <span className="qt-mute"> — {e.subtitle}</span> : null}
              {e.date ? <span className="qt-mute"> — {e.date}</span> : null}
              <Pic e={e} />
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "tags":
      return (
        <dl className="qt-tags">
          {s.entries.map((e) => (
            <div key={e.id} className="qt-tagrow" {...STOP}>
              <dt className="qt-strong-sm">
                {e.title}
                {e.date ? <span className="qt-mute"> · {e.date}</span> : null}
              </dt>
              <dd className="grid gap-2">
                {e.tags?.length ? <p>{e.tags.join(", ")}</p> : null}
                {e.subtitle ? <p className="qt-mute">{e.subtitle}</p> : null}
                <Pic e={e} />
                <Body e={{ ...e, tags: [] }} lang={lang} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case "quotes":
      return (
        <div className="qt-quotes">
          {s.entries.map((e) => (
            <figure key={e.id} className="qt-quote" {...STOP}>
              {e.body ? (
                <blockquote className="qt-quote-text">
                  <Prose html={e.body} />
                </blockquote>
              ) : null}
              <figcaption className="qt-mute">
                — {e.title}
                {e.subtitle ? `, ${e.subtitle}` : ""}
                {e.date ? ` · ${e.date}` : ""}
              </figcaption>
              {e.image ? <Img image={e.image} aspect="1 / 1" sizes="40px" className="qt-avatar" /> : null}
              <Tail e={e} lang={lang} />
            </figure>
          ))}
        </div>
      );
    case "grid":
      return (
        <ul className="qt-grid">
          {s.entries.map((e) => (
            <li key={e.id} className="qt-cell" {...STOP}>
              <h3 className="qt-h3">{e.title}</h3>
              {e.subtitle || e.date ? <p className="qt-mute">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
              <Pic e={e} />
              {e.metric ? (
                <p>
                  <span className="qt-strong">{e.metric.value}</span> <span className="qt-mute">{e.metric.label}</span>
                </p>
              ) : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "list":
      return (
        <ul className="qt-rows">
          {s.entries.map((e) => (
            <li key={e.id} className="qt-row" {...STOP}>
              <div className="qt-row-line">
                <h3 className="qt-h3">
                  {e.title}
                  {e.subtitle ? <span className="qt-mute qt-normal">, {e.subtitle}</span> : null}
                </h3>
                {e.date ? <span className="qt-mute qt-nums">{e.date}</span> : null}
              </div>
              <Pic e={e} />
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <ol className="qt-timeline">
          {s.entries.map((e) => (
            <li key={e.id} className="qt-tl" {...STOP}>
              <p className="qt-when qt-nums">{e.date}</p>
              <div className="qt-tl-body">
                <h3 className="qt-h3">{e.title}</h3>
                {e.subtitle ? <p className="qt-mute">{e.subtitle}</p> : null}
                <Pic e={e} />
                <Body e={e} lang={lang} />
              </div>
            </li>
          ))}
        </ol>
      );
  }
}

export default function Quiet({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  return (
    <TemplateRoot portfolio={portfolio}>
      <div className="qt-page">
        <header id="top" className="qt-head">
          <h1 className="qt-name">{hero.name}</h1>
          {hero.headline ? <p className="qt-headline">{hero.headline}</p> : null}
          {hero.present && (hero.eyebrow || hero.location) ? (
            <p className="qt-mute">{[hero.eyebrow, hero.location].filter(Boolean).join(" · ")}</p>
          ) : hero.location ? (
            <p className="qt-mute">{hero.location}</p>
          ) : null}
          {hero.present && hero.image ? <Img image={hero.image} aspect="1 / 1" sizes="64px" priority className="qt-portrait" /> : null}
          {hero.present && hero.tagline ? <Prose html={hero.tagline} className="qt-prose qt-tagline" /> : null}
          {(hero.present && hero.links.length) || v.socials.length || v.email ? (
            <ul className="qt-inline">
              {hero.present
                ? hero.links.map((l, i) => (
                    <li key={l.href + i}>
                      <a href={l.href} className="qt-a" {...(/^https?:/.test(l.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                        {l.label}
                      </a>
                    </li>
                  ))
                : null}
              {v.email ? (
                <li>
                  <a href={`mailto:${v.email}`} className="qt-a">
                    {v.email}
                  </a>
                </li>
              ) : null}
              {v.socials.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer me" className="qt-a">
                    {s.label}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          <Rest slots={hero.rest} lang={v.lang} />
        </header>

        {v.nav.length ? (
          <nav aria-label="Index" className="qt-index">
            <ol>
              {v.sections
                .filter((s) => s.title)
                .map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.anchor}`} className="qt-index-link">
                      <span className="qt-index-title">{s.title}</span>
                      <span aria-hidden="true" className="qt-index-rule" />
                      <span className="qt-index-count qt-nums">{s.entries.length || ""}</span>
                    </a>
                  </li>
                ))}
            </ol>
          </nav>
        ) : null}

        <main id="main" tabIndex={-1} className="qt-main">
          {v.sections.map((s) => (
            <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className="qt-section">
              <header className="qt-section-head">
                <h2 id={`${s.anchor}-title`} className="qt-h2">
                  {s.title}
                </h2>
                {s.subtitle ? <p className="qt-mute">{s.subtitle}</p> : null}
              </header>
              <div className="qt-section-body">
                <Lead s={s} lang={v.lang} />
                <Items s={s} lang={v.lang} />
              </div>
            </section>
          ))}
        </main>

        <footer className="qt-foot">
          <p>{hero.name}</p>
          <KeyNav />
          <a href="#top" className="qt-a">
            Top
          </a>
        </footer>
      </div>
    </TemplateRoot>
  );
}
