import type { CSSProperties } from "react";
import { Cover, TemplateRoot } from "../../render/Root";
import { Links, Prose, Rest, Socials, Tags, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { TemplateProps } from "../types";

/* Organic shapes: a few hand-tuned blob radii, picked per entry so a page never looks stamped. */
const BLOBS = [
  "58% 42% 47% 53% / 46% 55% 45% 54%",
  "41% 59% 62% 38% / 55% 39% 61% 45%",
  "63% 37% 41% 59% / 38% 62% 38% 62%",
  "47% 53% 35% 65% / 61% 44% 56% 39%",
  "35% 65% 56% 44% / 48% 58% 42% 52%",
];
const blob = (i: number) => ({ "--blob": BLOBS[i % BLOBS.length] }) as CSSProperties;
const ASPECTS = ["4 / 5", "1 / 1", "5 / 4", "3 / 4"];

function Body({ e, lang }: { e: Entry; lang: string }) {
  return (
    <>
      {e.body ? <Prose html={e.body} className="tr-prose" /> : null}
      <Tail e={e} lang={lang} />
    </>
  );
}

function Lead({ s, si, lang }: { s: SectionView; si: number; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  const contact = s.kind === "contact";
  return (
    <div className={`tr-lead ${e.image ? "tr-lead-img" : ""}`}>
      <div className="grid content-start gap-4">
        {e.title ? <p className="tr-lead-title">{e.title}</p> : null}
        {e.subtitle || e.date ? <p className="tr-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
        {e.body ? <Prose html={e.body} className="tr-prose tr-prose-lead" /> : null}
        {e.metric ? (
          <p className="tr-pebble tr-pebble-inline" style={blob(si)}>
            <span className="tr-pebble-value">{e.metric.value}</span>
            <span className="tr-pebble-label">{e.metric.label}</span>
          </p>
        ) : null}
        <Tail e={{ ...e, links: contact ? [] : e.links }} lang={lang} />
        {contact ? <Links links={e.links} primaryFirst /> : null}
      </div>
      {e.image ? (
        <div className="tr-mask tr-lead-mask" style={blob(si + 1)}>
          <Img image={e.image} aspect="4 / 5" sizes="(min-width: 1024px) 320px, 70vw" />
        </div>
      ) : null}
    </div>
  );
}

function Items({ s, si, lang }: { s: SectionView; si: number; lang: string }) {
  if (!s.entries.length) return null;
  switch (s.layout) {
    case "metrics":
      return (
        <ul className="tr-pebbles">
          {s.entries.map((e, i) => (
            <li key={e.id} className="tr-pebble tr-grow" style={blob(si + i)}>
              {e.metric ? <span className="tr-pebble-value">{e.metric.value}</span> : null}
              <span className="tr-pebble-label">{e.metric?.label || e.title}</span>
              {e.metric?.label && e.title ? <span className="tr-sub">{e.title}</span> : null}
              {e.subtitle ? <span className="tr-sub">{e.subtitle}</span> : null}
              {e.date ? <span className="tr-sub">{e.date}</span> : null}
              {e.image ? <Img image={e.image} aspect="1 / 1" sizes="120px" className="tr-round" /> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "tags":
      return (
        <div className="tr-taggroups">
          {s.entries.map((e) => (
            <div key={e.id} className="tr-taggroup tr-grow">
              <h3 className="tr-h3 tr-h3-sm">
                {e.title}
                {e.date ? <span className="tr-sub"> · {e.date}</span> : null}
              </h3>
              {e.subtitle ? <p className="tr-sub">{e.subtitle}</p> : null}
              {e.tags?.length ? <Tags tags={e.tags} className="tr-chips" /> : null}
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="240px" className="tr-round max-w-xs" /> : null}
              <Body e={{ ...e, tags: [] }} lang={lang} />
            </div>
          ))}
        </div>
      );
    case "quotes":
      return (
        <div className="tr-leaves">
          {s.entries.map((e, i) => (
            <figure key={e.id} className={`tr-leaf tr-grow ${i % 2 ? "tr-leaf-alt" : ""}`}>
              {e.body ? (
                <blockquote className="tr-leaf-text">
                  <Prose html={e.body} />
                </blockquote>
              ) : null}
              <figcaption className="tr-leaf-by">
                {e.image ? <Img image={e.image} aspect="1 / 1" sizes="44px" className="tr-avatar" /> : <span aria-hidden="true" className="tr-sprout" />}
                <span className="grid">
                  <span className="font-semibold">{e.title}</span>
                  {e.subtitle || e.date ? <span className="tr-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</span> : null}
                </span>
              </figcaption>
              <Tail e={e} lang={lang} />
            </figure>
          ))}
        </div>
      );
    case "grid":
      return (
        <ul className="tr-garden">
          {s.entries.map((e, i) => (
            <li key={e.id} className="tr-plant tr-grow">
              <div className="tr-mask" style={blob(si * 2 + i)}>
                {e.image ? (
                  <Img image={e.image} aspect={ASPECTS[i % ASPECTS.length]} sizes="(min-width: 900px) 40vw, 90vw" />
                ) : (
                  <Cover seed={e.id + (e.title ?? "")} label={e.title} style={{ aspectRatio: ASPECTS[i % ASPECTS.length] }} />
                )}
              </div>
              <h3 className="tr-h3">{e.title}</h3>
              {e.subtitle || e.date ? <p className="tr-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
              {e.metric ? (
                <p className="tr-metric">
                  <span className="tr-metric-value">{e.metric.value}</span> {e.metric.label}
                </p>
              ) : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "list":
      return (
        <ul className="tr-rows">
          {s.entries.map((e) => (
            <li key={e.id} className="tr-row tr-grow">
              <div className="tr-row-line">
                <h3 className="tr-h3 tr-h3-sm">{e.title}</h3>
                {e.date ? <span className="tr-sub tr-nums">{e.date}</span> : null}
              </div>
              {e.subtitle ? <p className="tr-sub">{e.subtitle}</p> : null}
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="240px" className="tr-round max-w-[15rem]" /> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <ol className="tr-path">
          {/* A winding path linking the entries (desktop); a straight stem on small screens. */}
          <svg className="tr-path-line" viewBox="0 0 100 1000" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path d="M50 0 C 90 90, 90 160, 50 250 S 10 410, 50 500 S 90 660, 50 750 S 10 910, 50 1000" />
          </svg>
          {s.entries.map((e, i) => (
            <li key={e.id} className={`tr-step tr-grow ${i % 2 ? "tr-step-r" : "tr-step-l"}`}>
              <span aria-hidden="true" className="tr-node" style={blob(i)} />
              <div className="tr-step-card">
                {e.date ? <p className="tr-date tr-nums">{e.date}</p> : null}
                <h3 className="tr-h3">{e.title}</h3>
                {e.subtitle ? <p className="tr-sub">{e.subtitle}</p> : null}
                {e.image ? (
                  <div className="tr-mask max-w-xs" style={blob(i + 2)}>
                    <Img image={e.image} aspect="5 / 4" sizes="(min-width: 768px) 320px, 80vw" />
                  </div>
                ) : null}
                <Body e={e} lang={lang} />
              </div>
            </li>
          ))}
        </ol>
      );
  }
}

export default function Terra({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  return (
    <TemplateRoot portfolio={portfolio}>
      <div className="tr-grain" aria-hidden="true" />
      <header className="tr-top">
        <a href="#top" className="tr-top-name">
          {hero.name}
        </a>
        {v.nav.length ? (
          <nav aria-label="Sections" className="tr-top-nav">
            <ul>
              {v.nav.slice(0, 6).map((n) => (
                <li key={n.href}>
                  <a href={n.href}>{n.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>
      <main id="main" tabIndex={-1} className="tr-main">
        <section id="top" className={`tr-hero ${hero.present ? "" : "tr-hero-compact"}`}>
          <span aria-hidden="true" className="tr-blob tr-blob-a" />
          <span aria-hidden="true" className="tr-blob tr-blob-b" />
          <div className="tr-hero-text">
            {hero.eyebrow ? <p className="tr-eyebrow">{hero.eyebrow}</p> : null}
            <h1 className="tr-name">{hero.name}</h1>
            {hero.headline ? <p className="tr-headline">{hero.headline}</p> : null}
            {hero.present && hero.tagline ? <Prose html={hero.tagline} className="tr-prose tr-tagline" /> : null}
            {hero.present ? <Links links={hero.links} primaryFirst /> : null}
            <Rest slots={hero.rest} lang={v.lang} />
            <div className="tr-hero-meta">
              {hero.location ? <span>{hero.location}</span> : null}
              {v.email ? (
                <a href={`mailto:${v.email}`} className="pf-link">
                  {v.email}
                </a>
              ) : null}
              <Socials socials={v.socials} className="tr-socials" />
            </div>
          </div>
          {hero.image && hero.present ? (
            <div className="tr-mask tr-hero-mask" style={blob(0)}>
              <Img image={hero.image} aspect="4 / 5" sizes="(min-width: 900px) 34vw, 80vw" priority />
            </div>
          ) : null}
        </section>

        {v.sections.map((s, si) => (
          <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className={`tr-section tr-l-${s.layout} ${si % 2 ? "tr-section-alt" : ""}`}>
            <header className="tr-section-head">
              <h2 id={`${s.anchor}-title`} className="tr-h2">
                <span className="tr-underline">{s.title}</span>
              </h2>
              {s.subtitle ? <p className="tr-sub tr-section-sub">{s.subtitle}</p> : null}
            </header>
            <div className="tr-section-body">
              <Lead s={s} si={si} lang={v.lang} />
              <Items s={s} si={si} lang={v.lang} />
            </div>
          </section>
        ))}
      </main>
      <footer className="tr-foot">
        <span aria-hidden="true" className="tr-blob tr-blob-c" />
        <p className="tr-foot-name">{hero.name}</p>
        <div className="tr-foot-row">
          {v.email ? (
            <a href={`mailto:${v.email}`} className="pf-link">
              {v.email}
            </a>
          ) : (
            <span />
          )}
          <a href="#top" className="tr-top-link">
            Back to top <span aria-hidden="true">↑</span>
          </a>
        </div>
      </footer>
    </TemplateRoot>
  );
}
