import type { ReactNode } from "react";
import { TemplateRoot } from "../../render/Root";
import { Links, Prose, Rest, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { TemplateProps } from "../types";
import { CopyRef, Sidenotes } from "./islands";

/**
 * A sidenote: in the margin on wide screens, an inline <details> toggle on
 * small ones (always in the DOM either way).
 */
function Note({ children }: { children: ReactNode }) {
  return (
    <details className="mg-note" data-auto="">
      <summary className="mg-note-toggle">Notes</summary>
      <div className="mg-note-body">{children}</div>
    </details>
  );
}

/** What goes in the margin for an entry: subtitle, date, metric and tags. */
function EntryNote({ e, withTags = true }: { e: Entry; withTags?: boolean }) {
  if (!e.subtitle && !e.date && !e.metric && !(withTags && e.tags?.length)) return null;
  return (
    <Note>
      {e.date ? <p className="mg-note-date">{e.date}</p> : null}
      {e.subtitle ? <p>{e.subtitle}</p> : null}
      {e.metric ? (
        <p>
          <span className="mg-note-figure">{e.metric.value}</span> {e.metric.label}
        </p>
      ) : null}
      {withTags && e.tags?.length ? <p className="mg-note-tags">{e.tags.join(", ")}</p> : null}
    </Note>
  );
}

function Body({ e, lang, tags = false }: { e: Entry; lang: string; tags?: boolean }) {
  return (
    <>
      {e.body ? <Prose html={e.body} className="mg-prose" /> : null}
      <Tail e={{ ...e, tags: tags ? e.tags : [] }} lang={lang} />
    </>
  );
}

function Figure({ e, aspect = "3 / 2" }: { e: Entry; aspect?: string }) {
  if (!e.image) return null;
  return (
    <figure className="mg-figure">
      <Img image={e.image} aspect={aspect} sizes="(min-width: 1100px) 600px, 92vw" className="mg-media" />
      {e.image.alt ? <figcaption className="mg-caption">{e.image.alt}</figcaption> : null}
    </figure>
  );
}

function Lead({ s, lang }: { s: SectionView; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  const contact = s.kind === "contact";
  return (
    <div className="mg-entry mg-lead">
      <div className="mg-main-col">
        {e.title ? <p className="mg-lead-title">{e.title}</p> : null}
        {e.body ? <Prose html={e.body} className="mg-prose mg-prose-lead" /> : null}
        <Figure e={e} aspect="4 / 3" />
        <Tail e={{ ...e, tags: [], links: contact ? [] : e.links }} lang={lang} />
        {contact ? <Links links={e.links} primaryFirst /> : null}
      </div>
      <EntryNote e={e} />
    </div>
  );
}

function Items({ s, lang }: { s: SectionView; lang: string }) {
  if (!s.entries.length) return null;
  switch (s.layout) {
    case "metrics":
      return (
        <ul className="mg-multiples">
          {s.entries.map((e) => (
            <li key={e.id} className="mg-multiple">
              {e.metric ? <span className="mg-multiple-value">{e.metric.value}</span> : null}
              <span className="mg-multiple-label">{e.metric?.label || e.title}</span>
              {e.metric?.label && e.title ? <span className="mg-small">{e.title}</span> : null}
              {e.subtitle ? <span className="mg-small">{e.subtitle}</span> : null}
              {e.date ? <span className="mg-small">{e.date}</span> : null}
              {e.image ? <Img image={e.image} aspect="4 / 3" sizes="160px" className="mg-media" /> : null}
              <Body e={e} lang={lang} tags />
            </li>
          ))}
        </ul>
      );
    case "tags":
      return (
        <div className="mg-keywords">
          {s.entries.map((e) => (
            <div key={e.id} className="mg-entry">
              <div className="mg-main-col">
                <h3 className="mg-h3 mg-h3-caps">{e.title}</h3>
                {e.tags?.length ? <p className="mg-keyline">{e.tags.join(" · ")}</p> : null}
                <Figure e={e} />
                <Body e={e} lang={lang} />
              </div>
              <EntryNote e={e} withTags={false} />
            </div>
          ))}
        </div>
      );
    case "quotes":
      return (
        <div className="mg-epigraphs">
          {s.entries.map((e) => (
            <figure key={e.id} className="mg-entry mg-epigraph">
              <div className="mg-main-col">
                {e.body ? (
                  <blockquote className="mg-epigraph-text">
                    <Prose html={e.body} />
                  </blockquote>
                ) : null}
                <figcaption className="mg-epigraph-by">
                  — {e.title}
                  {e.subtitle ? <span className="mg-small">, {e.subtitle}</span> : null}
                </figcaption>
                {e.image ? <Img image={e.image} aspect="1 / 1" sizes="40px" className="mg-avatar" /> : null}
                <Tail e={e} lang={lang} />
              </div>
              {e.date ? (
                <Note>
                  <p className="mg-note-date">{e.date}</p>
                </Note>
              ) : null}
            </figure>
          ))}
        </div>
      );
    case "grid":
      return (
        <ul className="mg-abstracts">
          {s.entries.map((e) => (
            <li key={e.id} className="mg-abstract">
              <Figure e={e} aspect="16 / 10" />
              <h3 className="mg-h3">{e.title}</h3>
              <p className="mg-small mg-abstract-meta">
                {[e.subtitle, e.date].filter(Boolean).join(" · ")}
                {e.metric ? (
                  <>
                    {e.subtitle || e.date ? " · " : ""}
                    <span className="mg-note-figure">{e.metric.value}</span> {e.metric.label}
                  </>
                ) : null}
              </p>
              <Body e={e} lang={lang} tags />
            </li>
          ))}
        </ul>
      );
    case "list": {
      return (
        <ol className="mg-refs">
          {s.entries.map((e, i) => {
            const ref = [e.title, e.subtitle, e.date].filter(Boolean).join(". ") + ".";
            return (
              <li key={e.id} className="mg-ref">
                <span className="mg-ref-n" aria-hidden="true">
                  [{i + 1}]
                </span>
                <div className="grid min-w-0 gap-1.5">
                  <h3 className="mg-ref-text">
                    <span className="mg-ref-title">{e.title}</span>
                    {e.subtitle ? <span className="mg-ref-venue">. {e.subtitle}</span> : null}
                    {e.date ? <span className="mg-ref-date">. {e.date}</span> : null}
                    <span aria-hidden="true">.</span>
                  </h3>
                  <Figure e={e} aspect="16 / 9" />
                  <Body e={e} lang={lang} tags />
                  <CopyRef text={ref} />
                </div>
              </li>
            );
          })}
        </ol>
      );
    }
    default:
      return (
        <ol className="mg-dated">
          {s.entries.map((e) => (
            <li key={e.id} className="mg-entry">
              <div className="mg-main-col">
                <h3 className="mg-h3">{e.title}</h3>
                <Figure e={e} />
                <Body e={e} lang={lang} />
              </div>
              <EntryNote e={e} />
            </li>
          ))}
        </ol>
      );
  }
}

export default function Margin({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  const grid = portfolio.theme.paletteId === "lab-notebook";
  return (
    <TemplateRoot portfolio={portfolio}>
      <div className={`mg-page ${grid ? "mg-graph" : ""}`}>
        <header id="top" className="mg-entry mg-head">
          <div className="mg-main-col">
            {hero.eyebrow ? <p className="mg-kicker">{hero.eyebrow}</p> : null}
            <h1 className="mg-name">{hero.name}</h1>
            {hero.headline ? <p className="mg-headline">{hero.headline}</p> : null}
            {hero.present && hero.tagline ? <Prose html={hero.tagline} className="mg-prose mg-abstract-lead" /> : null}
            {hero.present ? <Links links={hero.links} className="mg-hero-links" /> : null}
            <Rest slots={hero.rest} lang={v.lang} />
          </div>
          {hero.location || v.email || v.socials.length || hero.image ? (
            <Note>
              {hero.image && hero.present ? <Img image={hero.image} aspect="1 / 1" sizes="96px" priority className="mg-portrait" /> : null}
              {hero.location ? <p>{hero.location}</p> : null}
              {v.email ? (
                <p>
                  <a href={`mailto:${v.email}`} className="mg-a">
                    {v.email}
                  </a>
                </p>
              ) : null}
              {v.socials.length ? (
                <ul className="mg-note-links">
                  {v.socials.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer me" className="mg-a">
                        {s.label}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Note>
          ) : null}
        </header>

        {v.nav.length ? (
          <nav aria-label="Contents" className="mg-entry mg-toc">
            <ol className="mg-main-col">
              {v.nav.map((n, i) => (
                <li key={n.href}>
                  <a href={n.href} className="mg-toc-link">
                    <span className="mg-toc-n" aria-hidden="true">
                      {i + 1}
                    </span>
                    {n.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <main id="main" tabIndex={-1} className="mg-main">
          <Sidenotes />
          {v.sections.map((s, i) => (
            <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className={`mg-section mg-l-${s.layout}`}>
              <header className="mg-entry mg-section-head">
                <div className="mg-main-col mg-h2-row">
                  <span className="mg-h2-n" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h2 id={`${s.anchor}-title`} className="mg-h2">
                    {s.title}
                  </h2>
                </div>
                {s.subtitle ? (
                  <Note>
                    <p>{s.subtitle}</p>
                  </Note>
                ) : null}
              </header>
              <div className="mg-section-body">
                <Lead s={s} lang={v.lang} />
                <Items s={s} lang={v.lang} />
              </div>
            </section>
          ))}
        </main>

        <footer className="mg-entry mg-foot">
          <p className="mg-main-col mg-small">
            {hero.name}
            {v.email ? (
              <>
                {" · "}
                <a href={`mailto:${v.email}`} className="mg-a">
                  {v.email}
                </a>
              </>
            ) : null}
          </p>
        </footer>
      </div>
    </TemplateRoot>
  );
}

