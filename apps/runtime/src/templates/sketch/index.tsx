import type { CSSProperties, ReactNode } from "react";
import { Cover, TemplateRoot } from "../../render/Root";
import { Links, Prose, Rest, Socials, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { initials, viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { TemplateProps } from "../types";

/* Hand-drawn marks. pathLength="1" lets CSS draw them with a single dash. */
function Scribble({ variant = 0 }: { variant?: number }) {
  const paths = [
    ["M3 12 C 40 4, 85 17, 125 9 S 182 5, 197 11", "M14 17 C 62 12, 128 19, 186 14"],
    ["M2 10 C 52 15, 96 3, 142 10 S 186 15, 198 8", "M20 16 C 70 13, 140 18, 192 13"],
  ][variant % 2]!;
  return (
    <svg className="sk-scribble" viewBox="0 0 200 20" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {paths.map((d) => (
        <path key={d} d={d} pathLength={1} />
      ))}
    </svg>
  );
}

function Loop() {
  return (
    <svg className="sk-loop" viewBox="0 0 220 70" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path d="M14 36 C 10 10, 96 4, 160 9 C 214 14, 214 52, 150 60 C 88 67, 10 58, 8 34 C 7 20, 40 9, 74 7" pathLength={1} />
    </svg>
  );
}

function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg className={`sk-arrow ${className}`} viewBox="0 0 100 50" aria-hidden="true" focusable="false">
      <path d="M6 40 C 26 14, 58 8, 88 18" pathLength={1} />
      <path d="M76 8 L90 19 L75 28" pathLength={1} />
    </svg>
  );
}

function Taped({ children, i = 0, className = "" }: { children: ReactNode; i?: number; className?: string }) {
  return (
    <div className={`sk-taped ${className}`} style={{ "--tilt": `${[-1.6, 1.2, -0.8, 1.8][i % 4]}deg` } as CSSProperties}>
      <span aria-hidden="true" className="sk-tape sk-tape-a" />
      <span aria-hidden="true" className="sk-tape sk-tape-b" />
      {children}
    </div>
  );
}

function Body({ e, lang }: { e: Entry; lang: string }) {
  return (
    <>
      {e.body ? <Prose html={e.body} className="sk-prose" /> : null}
      <Tail e={e} lang={lang} />
    </>
  );
}

function Lead({ s, si, lang }: { s: SectionView; si: number; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  const contact = s.kind === "contact";
  return (
    <div className={`sk-lead ${e.image ? "sk-lead-img" : ""}`}>
      <div className="grid content-start gap-4">
        {e.title ? <p className="sk-lead-title">{e.title}</p> : null}
        {e.subtitle || e.date ? <p className="sk-note">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
        {e.body ? <Prose html={e.body} className="sk-prose sk-prose-lead" /> : null}
        {e.metric ? (
          <p className="sk-circled">
            <span className="sk-circled-num">
              {e.metric.value}
              <Loop />
            </span>
            <span className="sk-circled-label">{e.metric.label}</span>
          </p>
        ) : null}
        <Tail e={{ ...e, links: contact ? [] : e.links }} lang={lang} />
        {contact ? <Links links={e.links} primaryFirst /> : null}
      </div>
      {e.image ? (
        <Taped i={si} className="sk-polaroid sk-lead-polaroid">
          <Img image={e.image} aspect="1 / 1" sizes="(min-width: 1024px) 280px, 70vw" />
          {e.image.alt ? <p className="sk-polaroid-cap">{e.image.alt}</p> : null}
        </Taped>
      ) : null}
    </div>
  );
}

function Items({ s, si, lang }: { s: SectionView; si: number; lang: string }) {
  if (!s.entries.length) return null;
  switch (s.layout) {
    case "metrics":
      return (
        <ul className="sk-metrics">
          {s.entries.map((e) => (
            <li key={e.id} className="sk-circled">
              {e.metric ? (
                <span className="sk-circled-num">
                  {e.metric.value}
                  <Loop />
                </span>
              ) : null}
              <span className="sk-circled-label">{e.metric?.label || e.title}</span>
              {e.metric?.label && e.title ? <span className="sk-note">{e.title}</span> : null}
              {e.subtitle ? <span className="sk-note">{e.subtitle}</span> : null}
              {e.date ? <span className="sk-note">{e.date}</span> : null}
              {e.image ? <Img image={e.image} aspect="1 / 1" sizes="120px" className="sk-thumb" /> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "tags":
      return (
        <div className="sk-taggroups">
          {s.entries.map((e) => (
            <div key={e.id} className="sk-taggroup">
              <h3 className="sk-h3 sk-h3-hand">
                {e.title}
                {e.date ? <span className="sk-note"> · {e.date}</span> : null}
              </h3>
              {e.subtitle ? <p className="sk-note">{e.subtitle}</p> : null}
              {e.tags?.length ? (
                <ul className="sk-marked">
                  {e.tags.map((t, i) => (
                    <li key={t + i}>
                      <mark className="sk-mark">{t}</mark>
                    </li>
                  ))}
                </ul>
              ) : null}
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="240px" className="sk-thumb max-w-xs" /> : null}
              <Body e={{ ...e, tags: [] }} lang={lang} />
            </div>
          ))}
        </div>
      );
    case "quotes":
      return (
        <div className="sk-notes">
          {s.entries.map((e, i) => (
            <figure key={e.id} className="sk-sticky" style={{ "--tilt": `${[-2.2, 1.6, -1, 2.4][i % 4]}deg` } as CSSProperties}>
              <span aria-hidden="true" className="sk-pin" />
              {e.body ? (
                <blockquote className="sk-sticky-text">
                  <Prose html={e.body} />
                </blockquote>
              ) : null}
              <figcaption className="sk-sticky-by">
                {e.image ? <Img image={e.image} aspect="1 / 1" sizes="36px" className="sk-avatar" /> : null}
                <span>
                  — {e.title}
                  {e.subtitle ? <span className="sk-sticky-role">, {e.subtitle}</span> : null}
                  {e.date ? <span className="sk-sticky-role"> · {e.date}</span> : null}
                </span>
              </figcaption>
              <Tail e={e} lang={lang} />
            </figure>
          ))}
        </div>
      );
    case "grid":
      return (
        <ul className="sk-polaroids">
          {s.entries.map((e, i) => (
            <li key={e.id} className="grid content-start gap-3">
              <Taped i={i + si} className="sk-polaroid">
                {e.image ? (
                  <Img image={e.image} aspect="4 / 3" sizes="(min-width: 900px) 40vw, 90vw" />
                ) : (
                  <Cover seed={e.id + (e.title ?? "")} label={e.title} className="aspect-[4/3]" />
                )}
                <p className="sk-polaroid-cap" aria-hidden="true">
                  {e.title ? initials(e.title) : ""} {e.date ? `· ${e.date}` : ""}
                </p>
              </Taped>
              <h3 className="sk-h3">{e.title}</h3>
              {e.subtitle ? <p className="sk-note">{e.subtitle}</p> : null}
              {e.metric ? (
                <p className="sk-inline-metric">
                  <mark className="sk-mark">{e.metric.value}</mark> {e.metric.label}
                </p>
              ) : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "list":
      return (
        <ul className="sk-checklist">
          {s.entries.map((e) => (
            <li key={e.id} className="sk-check">
              <span aria-hidden="true" className="sk-box">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M4 13 L10 19 L21 5" pathLength={1} />
                </svg>
              </span>
              <div className="grid min-w-0 gap-1.5">
                <h3 className="sk-h3 sk-h3-sm">{e.title}</h3>
                {e.subtitle || e.date ? <p className="sk-note">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
                {e.image ? <Img image={e.image} aspect="16 / 9" sizes="240px" className="sk-thumb max-w-[15rem]" /> : null}
                <Body e={e} lang={lang} />
              </div>
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <ol className="sk-line">
          {s.entries.map((e, i) => (
            <li key={e.id} className="sk-line-item">
              <span aria-hidden="true" className="sk-dot" style={{ "--tilt": `${i * 37}deg` } as CSSProperties} />
              {e.date ? <p className="sk-hand sk-date">{e.date}</p> : null}
              <h3 className="sk-h3">{e.title}</h3>
              {e.subtitle ? <p className="sk-note">{e.subtitle}</p> : null}
              {e.image ? (
                <Taped i={i} className="sk-polaroid max-w-xs">
                  <Img image={e.image} aspect="4 / 3" sizes="(min-width: 768px) 320px, 80vw" />
                </Taped>
              ) : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ol>
      );
  }
}

export default function Sketch({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  return (
    <TemplateRoot portfolio={portfolio}>
      <div className="sk-page">
        <header className="sk-top">
          <a href="#top" className="sk-hand sk-top-name">
            {hero.name}
          </a>
          {v.nav.length ? (
            <nav aria-label="Sections" className="sk-top-nav">
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

        <main id="main" tabIndex={-1} className="sk-main">
          <section id="top" className={`sk-hero ${hero.present ? "" : "sk-hero-compact"}`}>
            <div className="sk-hero-text">
              {hero.eyebrow ? (
                <p className="sk-eyebrow">
                  <span className="sk-hand">{hero.eyebrow}</span>
                  <Loop />
                </p>
              ) : null}
              <h1 className="sk-name">{hero.name}</h1>
              {hero.headline ? (
                <p className="sk-headline">
                  {hero.headline}
                  <Scribble variant={1} />
                </p>
              ) : null}
              {hero.present && hero.tagline ? <Prose html={hero.tagline} className="sk-prose sk-tagline" /> : null}
              {hero.present ? <Links links={hero.links} primaryFirst /> : null}
              <Rest slots={hero.rest} lang={v.lang} />
              <div className="sk-hero-meta">
                {hero.location ? <span className="sk-hand">{hero.location}</span> : null}
                {v.email ? (
                  <a href={`mailto:${v.email}`} className="pf-link">
                    {v.email}
                  </a>
                ) : null}
                <Socials socials={v.socials} className="sk-socials" />
              </div>
            </div>
            {hero.image && hero.present ? (
              <div className="sk-hero-art">
                <Taped i={1} className="sk-polaroid sk-hero-polaroid">
                  <Img image={hero.image} aspect="1 / 1" sizes="(min-width: 900px) 320px, 70vw" priority />
                </Taped>
                <Arrow className="sk-hero-arrow" />
              </div>
            ) : null}
          </section>

          {v.sections.map((s, si) => (
            <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className={`sk-section sk-l-${s.layout}`}>
              <header className="sk-section-head">
                <span className="sk-hand sk-section-no" aria-hidden="true">
                  #{si + 1}
                </span>
                <div className="sk-h2-wrap">
                  <h2 id={`${s.anchor}-title`} className="sk-h2">
                    {s.title}
                  </h2>
                  <Scribble variant={si} />
                </div>
                {s.subtitle ? <p className="sk-hand sk-section-sub">{s.subtitle}</p> : null}
                {si % 3 === 1 ? <Arrow className="sk-margin-arrow" /> : null}
              </header>
              <div className="sk-section-body">
                <Lead s={s} si={si} lang={v.lang} />
                <Items s={s} si={si} lang={v.lang} />
              </div>
            </section>
          ))}
        </main>

        <footer className="sk-foot">
          <p className="sk-hand sk-foot-name">{hero.name}</p>
          <a href="#top" className="sk-hand sk-foot-top">
            back to top <span aria-hidden="true">↑</span>
          </a>
        </footer>
      </div>
    </TemplateRoot>
  );
}
