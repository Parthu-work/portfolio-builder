import { Cover, TemplateRoot } from "../../render/Root";
import { Prose, Rest, Tags, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { initials, isExternal, viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { TemplateProps } from "../types";
import { CardFolds, ShareButton } from "./islands";

const ext = (href: string) => (isExternal(href) ? { target: "_blank", rel: "noopener noreferrer" } : {});

function Body({ e, lang }: { e: Entry; lang: string }) {
  return (
    <>
      {e.body ? <Prose html={e.body} className="cd-prose" /> : null}
      <Tail e={e} lang={lang} />
    </>
  );
}

function Lead({ s, lang }: { s: SectionView; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  const contact = s.kind === "contact";
  return (
    <div className="cd-lead">
      {e.image ? <Img image={e.image} aspect="16 / 10" sizes="(min-width: 1280px) 360px, 440px" className="cd-media" /> : null}
      {e.title ? <p className="cd-lead-title">{e.title}</p> : null}
      {e.subtitle ? <p className="cd-sub">{e.subtitle}</p> : null}
      {e.date ? <p className="cd-sub">{e.date}</p> : null}
      {e.body ? <Prose html={e.body} className="cd-prose" /> : null}
      {e.metric ? (
        <p className="cd-pill cd-pill-wide">
          <span className="cd-pill-value">{e.metric.value}</span>
          {e.metric.label ? <span className="cd-pill-label">{e.metric.label}</span> : null}
        </p>
      ) : null}
      <Tail e={{ ...e, links: contact ? [] : e.links }} lang={lang} />
      {contact && e.links.length ? (
        <ul className="cd-buttons">
          {e.links.map((l, i) => (
            <li key={l.href + i}>
              <a href={l.href} {...ext(l.href)} className="cd-btn cd-btn-sm">
                <span>{l.label}</span>
                <span aria-hidden="true" className="cd-btn-arrow">
                  {isExternal(l.href) ? "↗" : "→"}
                </span>
                {isExternal(l.href) ? <span className="sr-only"> (opens in a new tab)</span> : null}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Items({ s, lang }: { s: SectionView; lang: string }) {
  if (!s.entries.length) return null;
  switch (s.layout) {
    case "metrics":
      return (
        <ul className="cd-pills">
          {s.entries.map((e) => (
            <li key={e.id} className="cd-pill">
              {e.metric ? <span className="cd-pill-value">{e.metric.value}</span> : null}
              <span className="cd-pill-label">{e.metric?.label || e.title}</span>
              {e.metric?.label && e.title ? <span className="cd-pill-note">{e.title}</span> : null}
              {e.subtitle ? <span className="cd-pill-note">{e.subtitle}</span> : null}
              {e.date ? <span className="cd-pill-note">{e.date}</span> : null}
              {e.image ? <Img image={e.image} aspect="1 / 1" sizes="120px" className="cd-media" /> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "tags":
      return (
        <div className="cd-taggroups">
          {s.entries.map((e) => (
            <div key={e.id} className="cd-taggroup">
              {e.title ? <h3 className="cd-h3 cd-h3-xs">{e.title}</h3> : null}
              {e.subtitle || e.date ? <p className="cd-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
              {e.tags?.length ? <Tags tags={e.tags} className="cd-chips" /> : null}
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="200px" className="cd-media" /> : null}
              <Body e={{ ...e, tags: [] }} lang={lang} />
            </div>
          ))}
        </div>
      );
    case "quotes":
      return (
        <ul className="cd-bubbles">
          {s.entries.map((e) => (
            <li key={e.id} className="cd-bubble-item">
              <figure className="grid gap-2">
                {e.body ? (
                  <blockquote className="cd-bubble">
                    <Prose html={e.body} />
                  </blockquote>
                ) : null}
                <figcaption className="cd-bubble-by">
                  {e.image ? (
                    <Img image={e.image} aspect="1 / 1" sizes="32px" className="cd-avatar-xs" />
                  ) : (
                    <span aria-hidden="true" className="cd-initials">
                      {initials(e.title ?? "")}
                    </span>
                  )}
                  <span className="grid">
                    {e.title ? <span className="font-semibold">{e.title}</span> : null}
                    {e.subtitle || e.date ? <span className="cd-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</span> : null}
                  </span>
                </figcaption>
                <Tail e={e} lang={lang} />
              </figure>
            </li>
          ))}
        </ul>
      );
    case "grid":
      return (
        <ul className="cd-thumbs">
          {s.entries.map((e) => (
            <li key={e.id} className="cd-thumb">
              {e.image ? (
                <Img image={e.image} aspect="1 / 1" sizes="(min-width: 1280px) 200px, 200px" className="cd-media" />
              ) : (
                <Cover seed={e.id + (e.title ?? "")} label={e.title} className="cd-media aspect-square" />
              )}
              <h3 className="cd-h3 cd-h3-sm">{e.title}</h3>
              {e.subtitle || e.date ? <p className="cd-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
              {e.metric ? (
                <p className="cd-metric">
                  <span className="cd-metric-value">{e.metric.value}</span> {e.metric.label}
                </p>
              ) : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "list":
      return (
        <ul className="cd-rows">
          {s.entries.map((e) => (
            <li key={e.id} className="cd-row">
              <div className="cd-row-head">
                <h3 className="cd-h3 cd-h3-sm">{e.title}</h3>
                {e.date ? <span className="cd-date">{e.date}</span> : null}
              </div>
              {e.subtitle ? <p className="cd-sub">{e.subtitle}</p> : null}
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="300px" className="cd-media" /> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <ol className="cd-minis">
          {s.entries.map((e) => (
            <li key={e.id} className="cd-mini">
              <span aria-hidden="true" className="cd-mini-dot" />
              <div className="grid min-w-0 gap-1.5">
                <h3 className="cd-h3 cd-h3-sm">{e.title}</h3>
                {e.subtitle || e.date ? (
                  <p className="cd-sub">
                    {e.subtitle}
                    {e.subtitle && e.date ? " · " : null}
                    {e.date ? <span className="cd-date">{e.date}</span> : null}
                  </p>
                ) : null}
                {e.image ? <Img image={e.image} aspect="16 / 9" sizes="300px" className="cd-media" /> : null}
                <Body e={e} lang={lang} />
              </div>
            </li>
          ))}
        </ol>
      );
  }
}

export default function Card({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  const buttons = [
    ...(hero.present ? hero.links.map((l) => ({ href: l.href, label: l.label })) : []),
    ...v.socials.map((s) => ({ href: s.url, label: s.label, me: true })),
    ...(v.email && !(hero.present && hero.links.some((l) => l.href === `mailto:${v.email}`)) ? [{ href: `mailto:${v.email}`, label: v.email }] : []),
  ];
  return (
    <TemplateRoot portfolio={portfolio}>
      <div className="cd-stage">
        <div className="cd-layout">
          <header id="top" className="cd-card">
            <div className="cd-card-band" aria-hidden="true" />
            <div className="cd-card-top">
              {hero.image ? (
                <Img image={hero.image} aspect="1 / 1" sizes="104px" priority className="cd-avatar" />
              ) : (
                <span aria-hidden="true" className="cd-avatar cd-avatar-initials">
                  {initials(hero.name)}
                </span>
              )}
              <ShareButton title={hero.name} />
            </div>
            <div className="cd-id">
              <h1 className="cd-name">{hero.name}</h1>
              {hero.headline ? <p className="cd-headline">{hero.headline}</p> : null}
              {hero.eyebrow || hero.location ? (
                <p className="cd-meta">
                  {hero.eyebrow ? <span className="cd-status">{hero.eyebrow}</span> : null}
                  {hero.location ? <span>{hero.location}</span> : null}
                </p>
              ) : null}
              {hero.present && hero.tagline ? <Prose html={hero.tagline} className="cd-prose cd-tagline" /> : null}
            </div>
            {buttons.length ? (
              <ul className="cd-buttons" aria-label="Links">
                {buttons.map((b, i) => (
                  <li key={b.href + i}>
                    <a href={b.href} {...ext(b.href)} {...("me" in b ? { rel: "noopener noreferrer me" } : {})} className={`cd-btn ${i === 0 ? "cd-btn-primary" : ""}`}>
                      <span className="cd-btn-label">{b.label}</span>
                      <span aria-hidden="true" className="cd-btn-arrow">
                        {isExternal(b.href) ? "↗" : "→"}
                      </span>
                      {isExternal(b.href) ? <span className="sr-only"> (opens in a new tab)</span> : null}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
            <Rest slots={hero.rest} lang={v.lang} className="cd-hero-rest" />
          </header>

          <main id="main" tabIndex={-1} className="cd-main">
            <CardFolds />
            {v.sections.map((s) => {
              const count = s.entries.length;
              return (
                <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className={`cd-fold cd-l-${s.layout}`}>
                  <details className="cd-details" data-auto="">
                    <summary className="cd-summary">
                      <h2 id={`${s.anchor}-title`} className="cd-h2">
                        {s.title}
                      </h2>
                      {count ? (
                        <span className="cd-count" aria-hidden="true">
                          {count}
                        </span>
                      ) : null}
                      <span aria-hidden="true" className="cd-chev" />
                    </summary>
                    <div className="cd-fold-body">
                      {s.subtitle ? <p className="cd-sub">{s.subtitle}</p> : null}
                      <Lead s={s} lang={v.lang} />
                      <Items s={s} lang={v.lang} />
                    </div>
                  </details>
                </section>
              );
            })}
            <footer className="cd-foot">
              <a href="#top">
                {hero.name} <span aria-hidden="true">↑</span>
              </a>
            </footer>
          </main>
        </div>
      </div>
    </TemplateRoot>
  );
}
