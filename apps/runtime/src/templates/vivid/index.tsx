import { Cover, TemplateRoot } from "../../render/Root";
import { Links, Prose, Rest, Socials, Tags, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { TemplateProps } from "../types";

const pad = (n: number) => String(n).padStart(2, "0");
const year = (d?: string) => d?.match(/\d{4}/)?.[0];

function Body({ e, lang }: { e: Entry; lang: string }) {
  return (
    <>
      {e.body ? <Prose html={e.body} className="vv-prose" /> : null}
      <Tail e={e} lang={lang} />
    </>
  );
}

function Lead({ s, lang }: { s: SectionView; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  const contact = s.kind === "contact";
  return (
    <div className={`vv-lead ${e.image ? "vv-lead-img" : ""}`}>
      <div className="grid content-start gap-5">
        {e.title ? <p className="vv-lead-title">{e.title}</p> : null}
        {e.subtitle || e.date ? <p className="vv-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
        {e.body ? <Prose html={e.body} className="vv-prose vv-prose-lead" /> : null}
        {e.metric ? (
          <p className="vv-neon-line">
            <span className="vv-neon">{e.metric.value}</span>
            <span className="vv-neon-label">{e.metric.label}</span>
          </p>
        ) : null}
        <Tail e={{ ...e, links: contact ? [] : e.links }} lang={lang} />
        {contact ? <Links links={e.links} primaryFirst /> : null}
      </div>
      {e.image ? (
        <div className="vv-ring vv-lead-media">
          <Img image={e.image} aspect="4 / 5" sizes="(min-width: 1024px) 300px, 70vw" className="vv-media" />
        </div>
      ) : null}
    </div>
  );
}

function Items({ s, lang }: { s: SectionView; lang: string }) {
  if (!s.entries.length) return null;
  switch (s.layout) {
    case "metrics":
      return (
        <ul className="vv-metrics">
          {s.entries.map((e, i) => (
            <li key={e.id} className={`vv-metric ${i % 2 ? "vv-alt" : ""}`}>
              {e.metric ? <span className="vv-neon">{e.metric.value}</span> : null}
              <span className="vv-neon-label">{e.metric?.label || e.title}</span>
              {e.metric?.label && e.title ? <span className="vv-sub">{e.title}</span> : null}
              {e.subtitle ? <span className="vv-sub">{e.subtitle}</span> : null}
              {e.date ? <span className="vv-sub">{e.date}</span> : null}
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="240px" className="vv-media" /> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "tags":
      return (
        <div className="vv-taggroups">
          {s.entries.map((e) => (
            <div key={e.id} className="vv-taggroup">
              <h3 className="vv-label">
                {e.title}
                {e.date ? ` · ${e.date}` : ""}
              </h3>
              {e.subtitle ? <p className="vv-sub">{e.subtitle}</p> : null}
              {e.tags?.length ? <Tags tags={e.tags} className="vv-chips" /> : null}
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="240px" className="vv-media max-w-xs" /> : null}
              <Body e={{ ...e, tags: [] }} lang={lang} />
            </div>
          ))}
        </div>
      );
    case "quotes":
      return (
        <div className="vv-quotes">
          {s.entries.map((e, i) => (
            <figure key={e.id} className={`vv-quote ${i === 0 ? "vv-quote-hero" : ""}`}>
              {e.body ? (
                <blockquote className="vv-quote-text">
                  <Prose html={e.body} />
                </blockquote>
              ) : null}
              <figcaption className="vv-quote-by">
                {e.image ? <Img image={e.image} aspect="1 / 1" sizes="44px" className="vv-avatar" /> : <span aria-hidden="true" className="vv-dash" />}
                <span>
                  <span className="vv-quote-name">{e.title}</span>
                  {e.subtitle || e.date ? <span className="vv-sub"> — {[e.subtitle, e.date].filter(Boolean).join(", ")}</span> : null}
                </span>
              </figcaption>
              <Tail e={e} lang={lang} />
            </figure>
          ))}
        </div>
      );
    case "grid":
      return (
        <ul className="vv-cards">
          {s.entries.map((e, i) => (
            <li key={e.id} className="vv-ring vv-card">
              {e.image ? (
                <Img image={e.image} aspect="16 / 10" sizes="(min-width: 900px) 42vw, 92vw" className="vv-media" />
              ) : (
                <Cover seed={e.id + (e.title ?? "")} label={e.title} className="vv-media aspect-[16/10]" />
              )}
              <div className="vv-card-body">
                <p className="vv-label vv-card-no" aria-hidden="true">
                  {pad(i + 1)}
                </p>
                <h3 className="vv-outline vv-card-title">{e.title}</h3>
                {e.subtitle || e.date ? <p className="vv-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
                {e.metric ? (
                  <p className="vv-neon-line vv-neon-sm">
                    <span className="vv-neon">{e.metric.value}</span>
                    <span className="vv-neon-label">{e.metric.label}</span>
                  </p>
                ) : null}
                <Body e={e} lang={lang} />
              </div>
            </li>
          ))}
        </ul>
      );
    case "list":
      return (
        <ul className="vv-rows">
          {s.entries.map((e) => (
            <li key={e.id} className="vv-row">
              <div className="vv-row-line">
                <h3 className="vv-h3">{e.title}</h3>
                {e.subtitle ? <p className="vv-sub">{e.subtitle}</p> : null}
                {e.date ? <p className="vv-label vv-row-date">{e.date}</p> : null}
              </div>
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="240px" className="vv-media max-w-[15rem]" /> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <ol className="vv-posters">
          {s.entries.map((e, i) => (
            <li key={e.id} className={`vv-poster ${i % 2 ? "vv-alt" : ""}`}>
              <span className="vv-poster-year" aria-hidden="true">
                {year(e.date) ?? pad(i + 1)}
              </span>
              <div className="vv-poster-body">
                {e.date ? <p className="vv-label">{e.date}</p> : null}
                <h3 className="vv-h3 vv-h3-lg">{e.title}</h3>
                {e.subtitle ? <p className="vv-sub">{e.subtitle}</p> : null}
                {e.image ? <Img image={e.image} aspect="16 / 9" sizes="(min-width: 768px) 360px, 90vw" className="vv-media max-w-sm" /> : null}
                <Body e={e} lang={lang} />
              </div>
            </li>
          ))}
        </ol>
      );
  }
}

export default function Vivid({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  return (
    <TemplateRoot portfolio={portfolio}>
      <header className="vv-bar">
        <a href="#top" className="vv-bar-name">
          {hero.name}
        </a>
        {v.nav.length ? (
          <nav aria-label="Sections" className="vv-bar-nav">
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
      <main id="main" tabIndex={-1} className="vv-main">
        <section id="top" className={`vv-hero ${hero.present ? "" : "vv-hero-compact"}`}>
          <span aria-hidden="true" className="vv-glow vv-glow-a" />
          <span aria-hidden="true" className="vv-glow vv-glow-b" />
          {hero.eyebrow ? <p className="vv-label vv-eyebrow">{hero.eyebrow}</p> : null}
          <h1 className="vv-outline vv-name">{hero.name}</h1>
          <div className="vv-hero-foot">
            {hero.headline ? <p className="vv-headline">{hero.headline}</p> : null}
            <div className="vv-hero-side">
              {hero.image && hero.present ? (
                <div className="vv-ring vv-portrait">
                  <Img image={hero.image} aspect="1 / 1" sizes="96px" priority className="vv-media" />
                </div>
              ) : null}
              {hero.present && hero.tagline ? <Prose html={hero.tagline} className="vv-prose" /> : null}
              {hero.present ? <Links links={hero.links} primaryFirst /> : null}
              <Rest slots={hero.rest} lang={v.lang} />
              {hero.location || v.email ? (
                <p className="vv-sub">
                  {hero.location}
                  {hero.location && v.email ? " · " : null}
                  {v.email ? (
                    <a href={`mailto:${v.email}`} className="pf-link">
                      {v.email}
                    </a>
                  ) : null}
                </p>
              ) : null}
              <Socials socials={v.socials} className="vv-socials" />
            </div>
          </div>
        </section>

        {v.sections.map((s, i) => (
          <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className={`vv-section vv-l-${s.layout} ${i % 2 ? "vv-alt" : ""}`}>
            <header className="vv-opener">
              <span className="vv-opener-no" aria-hidden="true">
                {pad(i + 1)}
              </span>
              <div className="grid gap-2">
                <h2 id={`${s.anchor}-title`} className="vv-h2">
                  {s.title}
                </h2>
                {s.subtitle ? <p className="vv-sub">{s.subtitle}</p> : null}
              </div>
            </header>
            <div className="vv-section-body">
              <Lead s={s} lang={v.lang} />
              <Items s={s} lang={v.lang} />
            </div>
          </section>
        ))}
      </main>
      <footer className="vv-foot">
        <p className="vv-outline vv-foot-name" aria-hidden="true">
          {hero.name}
        </p>
        <div className="vv-foot-row">
          {v.email ? (
            <a href={`mailto:${v.email}`} className="pf-link">
              {v.email}
            </a>
          ) : (
            <span />
          )}
          <a href="#top" className="vv-top">
            Back to top <span aria-hidden="true">↑</span>
          </a>
        </div>
      </footer>
    </TemplateRoot>
  );
}
