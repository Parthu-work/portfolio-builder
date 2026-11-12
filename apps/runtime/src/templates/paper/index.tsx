import type { ReactNode } from "react";
import { TemplateRoot } from "../../render/Root";
import { Links, Prose, Rest, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { ImageValue } from "../../schema/portfolio";
import type { TemplateProps } from "../types";
import { PaperTools } from "./islands";

/** An image on screen; in print it collapses to its caption (the image's own alt text). */
function Figure({ image, aspect, sizes, className = "" }: { image: ImageValue; aspect: string; sizes: string; className?: string }) {
  return (
    <figure className={`pp-fig ${className}`}>
      <Img image={image} aspect={aspect} sizes={sizes} className="pp-media" />
      {image.alt ? <figcaption className="pp-print-only">{image.alt}</figcaption> : null}
    </figure>
  );
}

function Body({ e, lang }: { e: Entry; lang: string }) {
  return (
    <>
      {e.body ? <Prose html={e.body} className="pp-body" /> : null}
      <Tail e={e} lang={lang} />
    </>
  );
}

/** Title left, date right (tabular numerals); wraps on narrow sheets. */
function Row({ title, date, children }: { title?: string; date?: string; children?: ReactNode }) {
  return (
    <div className="pp-row">
      <h3 className="pp-h3">
        {title}
        {children}
      </h3>
      {date ? <p className="pp-date">{date}</p> : null}
    </div>
  );
}

function Lead({ s, lang }: { s: SectionView; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  const contact = s.kind === "contact";
  return (
    <div className={`pp-lead ${e.image ? "pp-lead-img" : ""}`}>
      <div className="grid content-start gap-3">
        {e.title ? <p className="pp-lead-title">{e.title}</p> : null}
        {e.subtitle ? <p className="pp-sub">{e.subtitle}</p> : null}
        {e.date ? <p className="pp-date">{e.date}</p> : null}
        {e.body ? <Prose html={e.body} className="pp-body pp-body-lead" /> : null}
        {e.metric ? (
          <p className="pp-fig-inline">
            <span className="pp-fig-value">{e.metric.value}</span>
            {e.metric.label ? <span className="pp-fig-label">{e.metric.label}</span> : null}
          </p>
        ) : null}
        <Tail e={{ ...e, links: contact ? [] : e.links }} lang={lang} />
        {contact ? <Links links={e.links} className="pp-contact-links" /> : null}
      </div>
      {e.image ? <Figure image={e.image} aspect="4 / 5" sizes="(min-width: 768px) 160px, 40vw" className="pp-lead-figure" /> : null}
    </div>
  );
}

function Items({ s, lang }: { s: SectionView; lang: string }) {
  if (!s.entries.length) return null;
  switch (s.layout) {
    case "metrics":
      return (
        <ul className="pp-figures">
          {s.entries.map((e) => (
            <li key={e.id} className="pp-figure pp-entry">
              {e.metric ? <span className="pp-fig-value">{e.metric.value}</span> : null}
              <span className="pp-fig-label">{e.metric?.label || e.title}</span>
              {e.metric?.label && e.title ? <span className="pp-fig-note">{e.title}</span> : null}
              {e.subtitle ? <span className="pp-fig-note">{e.subtitle}</span> : null}
              {e.date ? <span className="pp-fig-note">{e.date}</span> : null}
              {e.image ? <Figure image={e.image} aspect="4 / 3" sizes="160px" className="pp-thumb" /> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "tags":
      return (
        <dl className="pp-groups">
          {s.entries.map((e) => (
            <div key={e.id} className="pp-group pp-entry">
              <dt className="pp-group-title">
                {e.title}
                {e.date ? <span className="pp-date"> · {e.date}</span> : null}
              </dt>
              <dd className="grid gap-2">
                {e.tags?.length ? (
                  <p className="pp-run">
                    {e.tags.map((t, i) => (
                      <span key={t + i}>
                        {i > 0 ? <span aria-hidden="true" className="pp-dot"> · </span> : null}
                        <span className="pp-run-item">{t}</span>
                        {i < e.tags!.length - 1 ? <span className="sr-only">,</span> : null}
                      </span>
                    ))}
                  </p>
                ) : null}
                {e.subtitle ? <p className="pp-sub">{e.subtitle}</p> : null}
                {e.image ? <Figure image={e.image} aspect="4 / 3" sizes="160px" className="pp-thumb" /> : null}
                <Body e={{ ...e, tags: [] }} lang={lang} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case "quotes":
      return (
        <div className="pp-quotes">
          {s.entries.map((e) => (
            <figure key={e.id} className="pp-quote pp-entry">
              {e.body ? (
                <blockquote className="pp-quote-text">
                  <Prose html={e.body} />
                </blockquote>
              ) : null}
              <figcaption className="pp-quote-by">
                {e.image ? <Img image={e.image} aspect="1 / 1" sizes="32px" className="pp-avatar" /> : null}
                <span>
                  <span aria-hidden="true">— </span>
                  {e.title ? <span className="pp-quote-name">{e.title}</span> : null}
                  {e.subtitle ? <span className="text-mute">, {e.subtitle}</span> : null}
                  {e.date ? <span className="text-mute"> · {e.date}</span> : null}
                </span>
              </figcaption>
              <Tail e={e} lang={lang} />
            </figure>
          ))}
        </div>
      );
    case "grid":
      return (
        <ul className="pp-blocks">
          {s.entries.map((e) => (
            <li key={e.id} className="pp-block pp-entry">
              {e.image ? <Figure image={e.image} aspect="16 / 9" sizes="(min-width: 768px) 320px, 90vw" className="pp-block-figure" /> : null}
              <Row title={e.title} date={e.date} />
              {e.subtitle ? <p className="pp-sub">{e.subtitle}</p> : null}
              {e.metric ? (
                <p className="pp-fig-inline">
                  <span className="pp-fig-value">{e.metric.value}</span>
                  {e.metric.label ? <span className="pp-fig-label">{e.metric.label}</span> : null}
                </p>
              ) : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "list":
      return (
        <ul className="pp-dense">
          {s.entries.map((e) => (
            <li key={e.id} className="pp-dense-row pp-entry">
              <Row title={e.title} date={e.date}>
                {e.subtitle ? <span className="pp-h3-sub">, {e.subtitle}</span> : null}
              </Row>
              {e.image ? <Figure image={e.image} aspect="16 / 9" sizes="200px" className="pp-thumb" /> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <ol className="pp-timeline">
          {s.entries.map((e) => (
            <li key={e.id} className="pp-entry pp-tl">
              <Row title={e.title} date={e.date} />
              {e.subtitle ? <p className="pp-sub">{e.subtitle}</p> : null}
              {e.image ? <Figure image={e.image} aspect="16 / 9" sizes="(min-width: 768px) 280px, 70vw" className="pp-thumb" /> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ol>
      );
  }
}

export default function Paper({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  const contact: ReactNode[] = [];
  if (hero.location) contact.push(<span key="loc">{hero.location}</span>);
  if (v.email)
    contact.push(
      <a key="mail" href={`mailto:${v.email}`} className="pp-a">
        {v.email}
      </a>,
    );
  for (const s of v.socials)
    contact.push(
      <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer me" className="pp-a">
        {s.label}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>,
    );

  return (
    <TemplateRoot portfolio={portfolio}>
      <div className="pp-desk">
        <main id="main" tabIndex={-1} className="pp-sheet">
          <div className="pp-guides" aria-hidden="true" />
          <div className="pp-page">
            <header id="top" className={`pp-head ${hero.present ? "" : "pp-head-compact"}`}>
              <div className="pp-head-main">
                {hero.eyebrow ? <p className="pp-kicker">{hero.eyebrow}</p> : null}
                <h1 className="pp-name">{hero.name}</h1>
                {hero.headline ? <p className="pp-headline">{hero.headline}</p> : null}
              </div>
              {hero.image && hero.present ? <Img image={hero.image} aspect="1 / 1" sizes="112px" priority className="pp-portrait" /> : null}
              {contact.length ? (
                <ul className="pp-contact" aria-label="Contact">
                  {contact.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              ) : null}
              {hero.present && hero.tagline ? <Prose html={hero.tagline} className="pp-body pp-tagline" /> : null}
              {hero.present ? <Links links={hero.links} className="pp-hero-links" /> : null}
              <Rest slots={hero.rest} lang={v.lang} className="pp-hero-rest" />
            </header>

            {v.sections.map((s) => (
              <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className="pp-section">
                <header className="pp-section-head">
                  <h2 id={`${s.anchor}-title`} className="pp-h2">
                    {s.title}
                  </h2>
                  {s.subtitle ? <p className="pp-section-sub">{s.subtitle}</p> : null}
                </header>
                <div className="pp-section-body">
                  <Lead s={s} lang={v.lang} />
                  <Items s={s} lang={v.lang} />
                </div>
              </section>
            ))}

            <footer className="pp-foot">
              <span>{hero.name}</span>
              {v.email ? <span>{v.email}</span> : null}
            </footer>
          </div>
        </main>
        <PaperTools />
      </div>
    </TemplateRoot>
  );
}
