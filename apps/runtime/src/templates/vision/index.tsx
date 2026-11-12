import { TemplateRoot } from "../../render/Root";
import { Links, Prose, Rest, Tags, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { initials, viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { TemplateProps } from "../types";
import { Capsule, Spatial } from "./islands";

function Body({ e, lang }: { e: Entry; lang: string }) {
  return (
    <>
      {e.body ? <Prose html={e.body} className="vs-prose" /> : null}
      <Tail e={e} lang={lang} />
    </>
  );
}

function Lead({ s, lang }: { s: SectionView; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  const contact = s.kind === "contact";
  return (
    <div className={`vs-lead ${e.image ? "vs-lead-img" : ""}`}>
      <div className="grid content-start gap-4">
        {e.title ? <p className="vs-lead-title">{e.title}</p> : null}
        {e.subtitle || e.date ? <p className="vs-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
        {e.body ? <Prose html={e.body} className="vs-prose vs-prose-lead" /> : null}
        {e.metric ? (
          <p className="vs-chip vs-chip-kpi">
            <span className="vs-kpi-value">{e.metric.value}</span>
            <span className="vs-kpi-label">{e.metric.label}</span>
          </p>
        ) : null}
        <Tail e={{ ...e, links: contact ? [] : e.links }} lang={lang} />
        {contact ? <Links links={e.links} primaryFirst /> : null}
      </div>
      {e.image ? <Img image={e.image} aspect="4 / 5" sizes="(min-width: 1024px) 280px, 70vw" className="vs-media vs-lead-media" /> : null}
    </div>
  );
}

function Items({ s, lang }: { s: SectionView; lang: string }) {
  if (!s.entries.length) return null;
  switch (s.layout) {
    case "metrics":
      return (
        <ul className="vs-kpis">
          {s.entries.map((e) => (
            <li key={e.id} className="vs-chip vs-chip-kpi" data-tilt="">
              {e.metric ? <span className="vs-kpi-value">{e.metric.value}</span> : null}
              <span className="vs-kpi-label">{e.metric?.label || e.title}</span>
              {e.metric?.label && e.title ? <span className="vs-sub">{e.title}</span> : null}
              {e.subtitle ? <span className="vs-sub">{e.subtitle}</span> : null}
              {e.date ? <span className="vs-sub">{e.date}</span> : null}
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="200px" className="vs-media" /> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "tags":
      return (
        <div className="vs-taggroups">
          {s.entries.map((e) => (
            <div key={e.id} className="vs-taggroup">
              <h3 className="vs-h3 vs-h3-sm">
                {e.title}
                {e.date ? <span className="vs-sub"> · {e.date}</span> : null}
              </h3>
              {e.subtitle ? <p className="vs-sub">{e.subtitle}</p> : null}
              {e.tags?.length ? <Tags tags={e.tags} className="vs-capsules" /> : null}
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="240px" className="vs-media max-w-xs" /> : null}
              <Body e={{ ...e, tags: [] }} lang={lang} />
            </div>
          ))}
        </div>
      );
    case "quotes":
      return (
        <div className="vs-quotes">
          {s.entries.map((e) => (
            <figure key={e.id} className="vs-pane vs-quote" data-tilt="">
              {e.body ? (
                <blockquote className="vs-quote-text">
                  <Prose html={e.body} />
                </blockquote>
              ) : null}
              <figcaption className="vs-quote-by">
                {e.image ? (
                  <Img image={e.image} aspect="1 / 1" sizes="44px" className="vs-avatar" />
                ) : (
                  <span aria-hidden="true" className="vs-avatar vs-avatar-ini">
                    {initials(e.title ?? "")}
                  </span>
                )}
                <span className="grid">
                  <span className="font-semibold">{e.title}</span>
                  {e.subtitle || e.date ? <span className="vs-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</span> : null}
                </span>
              </figcaption>
              <Tail e={e} lang={lang} />
            </figure>
          ))}
        </div>
      );
    case "grid":
      return (
        <ul className="vs-grid">
          {s.entries.map((e) => (
            <li key={e.id} className="vs-pane vs-card" data-tilt="">
              {e.image ? <Img image={e.image} aspect="16 / 10" sizes="(min-width: 1024px) 34vw, 90vw" className="vs-media" /> : <span aria-hidden="true" className="vs-card-glow" />}
              <div className="grid gap-2">
                <h3 className="vs-h3">{e.title}</h3>
                {e.subtitle || e.date ? <p className="vs-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
              </div>
              {e.metric ? (
                <p className="vs-chip vs-chip-inline">
                  <span className="vs-kpi-value vs-kpi-sm">{e.metric.value}</span>
                  <span className="vs-kpi-label">{e.metric.label}</span>
                </p>
              ) : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "list":
      return (
        <ul className="vs-pane vs-list">
          {s.entries.map((e) => (
            <li key={e.id} className="vs-list-row">
              <div className="vs-list-line">
                <h3 className="vs-h3 vs-h3-sm">{e.title}</h3>
                {e.date ? <span className="vs-sub vs-nums">{e.date}</span> : null}
              </div>
              {e.subtitle ? <p className="vs-sub">{e.subtitle}</p> : null}
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="240px" className="vs-media max-w-[15rem]" /> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <ol className="vs-rail">
          {s.entries.map((e) => (
            <li key={e.id} className="vs-rail-item">
              <span aria-hidden="true" className="vs-rail-dot" />
              <div className="vs-pane vs-rail-pane" data-tilt="">
                <div className="vs-list-line">
                  <h3 className="vs-h3">{e.title}</h3>
                  {e.date ? <span className="vs-chip vs-chip-date vs-nums">{e.date}</span> : null}
                </div>
                {e.subtitle ? <p className="vs-sub">{e.subtitle}</p> : null}
                {e.image ? <Img image={e.image} aspect="16 / 9" sizes="(min-width: 768px) 360px, 80vw" className="vs-media max-w-sm" /> : null}
                <Body e={e} lang={lang} />
              </div>
            </li>
          ))}
        </ol>
      );
  }
}

export default function Vision({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  return (
    <TemplateRoot portfolio={portfolio}>
      {/* The spatial environment: a lit room with a receding floor. Decorative. */}
      <div className="vs-env" aria-hidden="true">
        <div className="vs-light" />
        {hero.image ? (
          <div className="vs-tint">
            <Img image={{ ...hero.image, alt: "" }} aspect="1 / 1" sizes="200px" />
          </div>
        ) : null}
        <div className="vs-floor" />
      </div>
      <svg className="vs-defs" aria-hidden="true" width="0" height="0" focusable="false">
        <filter id="vs-refract" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.03" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <Capsule items={v.nav.map((n) => ({ href: n.href, label: n.label }))} name={hero.name} />

      <main id="main" tabIndex={-1} className="vs-main">
        <Spatial />
        <section id="top" className={`vs-hero ${hero.present ? "" : "vs-hero-compact"}`}>
          <div className="vs-pane vs-window vs-hero-pane">
            <div className="vs-hero-id">
              {hero.image && hero.present ? (
                <Img image={hero.image} aspect="1 / 1" sizes="120px" priority className="vs-portrait" />
              ) : (
                <span aria-hidden="true" className="vs-portrait vs-avatar-ini">
                  {initials(hero.name)}
                </span>
              )}
              <div className="grid gap-2">
                {hero.eyebrow ? <p className="vs-chip vs-chip-status">{hero.eyebrow}</p> : null}
                <h1 className="vs-name">{hero.name}</h1>
              </div>
            </div>
            {hero.headline ? <p className="vs-headline">{hero.headline}</p> : null}
            {hero.present && hero.tagline ? <Prose html={hero.tagline} className="vs-prose vs-tagline" /> : null}
            {hero.present ? <Links links={hero.links} primaryFirst /> : null}
            <Rest slots={hero.rest} lang={v.lang} />
          </div>
          <span aria-hidden="true" className="vs-grabber" />
          {hero.location || v.email || v.socials.length ? (
            <ul className="vs-ornaments" aria-label="Contact">
              {hero.location ? <li className="vs-chip">{hero.location}</li> : null}
              {v.email ? (
                <li>
                  <a href={`mailto:${v.email}`} className="vs-chip vs-chip-link">
                    {v.email}
                  </a>
                </li>
              ) : null}
              {v.socials.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer me" className="vs-chip vs-chip-link">
                    {s.label}
                    <span aria-hidden="true"> ↗</span>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {v.sections.map((s) => (
          <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className={`vs-section vs-l-${s.layout}`}>
            <div className="vs-pane vs-window">
              <header className="vs-section-head">
                <h2 id={`${s.anchor}-title`} className="vs-h2">
                  {s.title}
                </h2>
                {s.subtitle ? <p className="vs-sub">{s.subtitle}</p> : null}
              </header>
              <div className="vs-section-body">
                <Lead s={s} lang={v.lang} />
                <Items s={s} lang={v.lang} />
              </div>
            </div>
            <span aria-hidden="true" className="vs-grabber" />
          </section>
        ))}
      </main>

      <footer className="vs-foot">
        <span>{hero.name}</span>
        <a href="#top" className="vs-chip vs-chip-link">
          Back to top <span aria-hidden="true">↑</span>
        </a>
      </footer>
    </TemplateRoot>
  );
}
