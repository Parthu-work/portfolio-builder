import { TemplateRoot } from "../../render/Root";
import { Links, Prose, Rest, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { initials, viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { TemplateProps } from "../types";

function Body({ e, lang }: { e: Entry; lang: string }) {
  return (
    <>
      {e.body ? <Prose html={e.body} className="ex-prose" /> : null}
      <Tail e={e} lang={lang} />
    </>
  );
}

function Lead({ s, lang }: { s: SectionView; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  const contact = s.kind === "contact";
  return (
    <div className={`ex-lead ${e.image ? "ex-lead-img" : ""}`}>
      <div className="grid content-start gap-5">
        {e.title ? <p className="ex-lead-title">{e.title}</p> : null}
        {e.subtitle || e.date ? <p className="ex-caps">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
        {e.body ? <Prose html={e.body} className="ex-prose ex-prose-lead" /> : null}
        {e.metric ? (
          <p className="ex-figure">
            <span className="ex-figure-value">{e.metric.value}</span>
            <span className="ex-caps">{e.metric.label}</span>
          </p>
        ) : null}
        <Tail e={{ ...e, links: contact ? [] : e.links }} lang={lang} />
        {contact ? <Links links={e.links} primaryFirst /> : null}
      </div>
      {e.image ? (
        <div className="ex-frame ex-lead-frame">
          <Img image={e.image} aspect="4 / 5" sizes="(min-width: 1024px) 280px, 70vw" />
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
        <ul className="ex-band">
          {s.entries.map((e) => (
            <li key={e.id} className="ex-band-item">
              {e.metric ? <span className="ex-band-value">{e.metric.value}</span> : null}
              <span className="ex-band-label">{e.metric?.label || e.title}</span>
              {e.metric?.label && e.title ? <span className="ex-band-note">{e.title}</span> : null}
              {e.subtitle ? <span className="ex-band-note">{e.subtitle}</span> : null}
              {e.date ? <span className="ex-band-note">{e.date}</span> : null}
              {e.image ? <Img image={e.image} aspect="4 / 3" sizes="160px" className="ex-band-img" /> : null}
              {e.body || e.tags?.length || e.links.length || e.rest.length ? (
                <div className="ex-band-more">
                  <Body e={e} lang={lang} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      );
    case "tags":
      return (
        <dl className="ex-capslist">
          {s.entries.map((e) => (
            <div key={e.id} className="ex-capsrow">
              <dt className="ex-h3 ex-h3-sm">
                {e.title}
                {e.date ? <span className="ex-caps"> · {e.date}</span> : null}
              </dt>
              <dd className="grid gap-2">
                {e.tags?.length ? (
                  <ul className="ex-capsrun">
                    {e.tags.map((t, i) => (
                      <li key={t + i}>{t}</li>
                    ))}
                  </ul>
                ) : null}
                {e.subtitle ? <p className="ex-sub">{e.subtitle}</p> : null}
                {e.image ? <Img image={e.image} aspect="16 / 9" sizes="240px" className="ex-media max-w-xs" /> : null}
                <Body e={{ ...e, tags: [] }} lang={lang} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case "quotes":
      return (
        <div className="ex-letters">
          {s.entries.map((e) => (
            <figure key={e.id} className="ex-letter">
              {e.body ? (
                <blockquote className="ex-letter-text">
                  <Prose html={e.body} />
                </blockquote>
              ) : null}
              <figcaption className="ex-signature">
                <span aria-hidden="true" className="ex-sign-rule" />
                <span className="ex-sign-name">{e.title}</span>
                {e.subtitle ? <span className="ex-caps">{e.subtitle}</span> : null}
                {e.date ? <span className="ex-caps">{e.date}</span> : null}
              </figcaption>
              {e.image ? <Img image={e.image} aspect="1 / 1" sizes="48px" className="ex-seal" /> : null}
              <Tail e={e} lang={lang} />
            </figure>
          ))}
        </div>
      );
    case "grid":
      return (
        <ul className="ex-cards">
          {s.entries.map((e) => (
            <li key={e.id} className="ex-card">
              {e.image ? (
                <div className="ex-frame">
                  <Img image={e.image} aspect="3 / 2" sizes="(min-width: 900px) 40vw, 90vw" />
                </div>
              ) : null}
              {e.subtitle ? <p className="ex-caps">{e.subtitle}</p> : null}
              <h3 className="ex-h3">{e.title}</h3>
              {e.date ? <p className="ex-sub">{e.date}</p> : null}
              {e.metric ? (
                <p className="ex-figure ex-figure-sm">
                  <span className="ex-figure-value">{e.metric.value}</span>
                  <span className="ex-caps">{e.metric.label}</span>
                </p>
              ) : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "list":
      return (
        <ul className="ex-ruled">
          {s.entries.map((e) => (
            <li key={e.id} className="ex-ruled-row">
              <div className="ex-ruled-line">
                <h3 className="ex-h3 ex-h3-sm">{e.title}</h3>
                {e.subtitle ? <p className="ex-caps">{e.subtitle}</p> : null}
                {e.date ? <p className="ex-sub ex-nums">{e.date}</p> : null}
              </div>
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="240px" className="ex-media max-w-[15rem]" /> : null}
              {e.body || e.tags?.length || e.links.length || e.rest.length ? (
                <div className="ex-ruled-body">
                  <Body e={e} lang={lang} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <ol className="ex-timeline">
          {s.entries.map((e) => (
            <li key={e.id} className="ex-tl">
              <div className="ex-tl-side">
                {e.date ? <p className="ex-sub ex-nums">{e.date}</p> : null}
                {e.subtitle ? <p className="ex-caps ex-company">{e.subtitle}</p> : null}
              </div>
              <div className="ex-tl-main">
                <h3 className="ex-h3">{e.title}</h3>
                {e.image ? (
                  <div className="ex-frame max-w-sm">
                    <Img image={e.image} aspect="3 / 2" sizes="(min-width: 768px) 360px, 90vw" />
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

export default function Executive({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  return (
    <TemplateRoot portfolio={portfolio}>
      <header className="ex-top">
        <a href="#top" className="ex-mark">
          <span aria-hidden="true" className="ex-monogram">
            {initials(hero.name)}
          </span>
          <span className="ex-mark-name">{hero.name}</span>
        </a>
        {v.nav.length ? (
          <nav aria-label="Sections" className="ex-nav">
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
      <main id="main" tabIndex={-1} className="ex-main">
        <section id="top" className={`ex-hero ${hero.present ? "" : "ex-hero-compact"}`}>
          <div className="ex-hero-text">
            {hero.eyebrow ? <p className="ex-caps ex-eyebrow">{hero.eyebrow}</p> : null}
            <h1 className="ex-name">{hero.name}</h1>
            {hero.headline ? <p className="ex-statement">{hero.headline}</p> : null}
            {hero.present && hero.tagline ? <Prose html={hero.tagline} className="ex-prose ex-tagline" /> : null}
            {hero.present ? <Links links={hero.links} primaryFirst /> : null}
            <Rest slots={hero.rest} lang={v.lang} />
            {hero.location || v.email || v.socials.length ? (
              <ul className="ex-contact">
                {hero.location ? <li className="ex-caps">{hero.location}</li> : null}
                {v.email ? (
                  <li>
                    <a href={`mailto:${v.email}`} className="ex-a">
                      {v.email}
                    </a>
                  </li>
                ) : null}
                {v.socials.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer me" className="ex-a">
                      {s.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {hero.image && hero.present ? (
            <div className="ex-frame ex-portrait">
              <Img image={hero.image} aspect="4 / 5" sizes="(min-width: 900px) 340px, 75vw" priority />
            </div>
          ) : null}
        </section>

        {v.sections.map((s, i) => (
          <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className={`ex-section ex-l-${s.layout}`}>
            <header className="ex-section-head">
              <span className="ex-caps ex-section-no" aria-hidden="true">
                {["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"][i] ?? String(i + 1)}
              </span>
              <h2 id={`${s.anchor}-title`} className="ex-h2">
                {s.title}
              </h2>
              {s.subtitle ? <p className="ex-sub ex-section-sub">{s.subtitle}</p> : null}
            </header>
            <div className="ex-section-body">
              <Lead s={s} lang={v.lang} />
              <Items s={s} lang={v.lang} />
            </div>
          </section>
        ))}
      </main>
      <footer className="ex-foot">
        <span aria-hidden="true" className="ex-monogram ex-monogram-lg">
          {initials(hero.name)}
        </span>
        <p className="ex-foot-name">{hero.name}</p>
        {v.email ? (
          <a href={`mailto:${v.email}`} className="ex-a">
            {v.email}
          </a>
        ) : null}
        <a href="#top" className="ex-caps ex-top-link">
          Back to top
        </a>
      </footer>
    </TemplateRoot>
  );
}
