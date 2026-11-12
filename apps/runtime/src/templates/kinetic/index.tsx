import type { CSSProperties } from "react";
import { TemplateRoot } from "../../render/Root";
import { Links, Prose, Rest, Socials, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { htmlToText } from "../../render/sanitize";
import { viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { TemplateProps } from "../types";
import { Proximity } from "./islands";

const year = (date?: string) => date?.match(/\d{4}/)?.[0];

/** Words wrapped for a staggered reveal. The spaces stay real text, so it reads normally. */
function SplitWords({ text, className = "" }: { text: string; className?: string }) {
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span className={`kn-split ${className}`}>
      {words.map((w, i) => (
        <span key={i} className="kn-word-wrap">
          <span className="kn-word" style={{ "--i": i } as CSSProperties}>
            {w}
          </span>
          {i < words.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}

function Body({ e, lang }: { e: Entry; lang: string }) {
  return (
    <>
      {e.body ? <Prose html={e.body} className="kn-prose" /> : null}
      <Tail e={e} lang={lang} />
    </>
  );
}

function Lead({ s, lang }: { s: SectionView; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  const contact = s.kind === "contact";
  return (
    <div className={`kn-lead ${e.image ? "kn-lead-img" : ""}`}>
      <div className="grid content-start gap-5">
        {e.title ? <p className="kn-lead-title">{e.title}</p> : null}
        {e.subtitle ? <p className="kn-sub">{e.subtitle}</p> : null}
        {e.date ? <p className="kn-date">{e.date}</p> : null}
        {e.body ? <Prose html={e.body} className="kn-prose kn-prose-lead" /> : null}
        {e.metric ? (
          <p className="kn-giant-line">
            <span className="kn-giant">{e.metric.value}</span>
            <span className="kn-giant-label">{e.metric.label}</span>
          </p>
        ) : null}
        <Tail e={{ ...e, links: contact ? [] : e.links }} lang={lang} />
        {contact ? <Links links={e.links} primaryFirst /> : null}
      </div>
      {e.image ? <Img image={e.image} aspect="4 / 5" sizes="(min-width: 1024px) 28vw, 80vw" className="kn-media" /> : null}
    </div>
  );
}

function Items({ s, lang, quoteReveal }: { s: SectionView; lang: string; quoteReveal: boolean }) {
  if (!s.entries.length) return null;
  switch (s.layout) {
    case "metrics":
      return (
        <ul className="kn-metrics">
          {s.entries.map((e) => (
            <li key={e.id} className="kn-metric">
              {e.metric ? <span className="kn-giant">{e.metric.value}</span> : null}
              <span className="kn-giant-label">{e.metric?.label || e.title}</span>
              {e.metric?.label && e.title ? <span className="kn-sub">{e.title}</span> : null}
              {e.subtitle ? <span className="kn-sub">{e.subtitle}</span> : null}
              {e.date ? <span className="kn-date">{e.date}</span> : null}
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="300px" className="kn-media" /> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "tags":
      return (
        <div className="kn-taggroups">
          {s.entries.map((e) => (
            <div key={e.id} className="kn-taggroup">
              <h3 className="kn-label">
                {e.title}
                {e.date ? ` · ${e.date}` : ""}
              </h3>
              {e.subtitle ? <p className="kn-sub">{e.subtitle}</p> : null}
              {e.tags?.length ? (
                <ul className="kn-words">
                  {e.tags.map((t, i) => (
                    <li key={t + i} className="kn-wordtag">
                      {t}
                      {i < e.tags!.length - 1 ? <span className="sr-only">,</span> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="300px" className="kn-media max-w-xs" /> : null}
              <Body e={{ ...e, tags: [] }} lang={lang} />
            </div>
          ))}
        </div>
      );
    case "quotes":
      return (
        <div className="kn-quotes">
          {s.entries.map((e, i) => {
            const text = e.body ? htmlToText(e.body) : "";
            const reveal = quoteReveal && i === 0 && text.length > 0 && text.length < 220 && !/<(ul|ol|a)\b/.test(e.body ?? "");
            return (
              <figure key={e.id} className={`kn-quote ${i === 0 ? "kn-quote-hero" : ""}`}>
                {e.body ? (
                  <blockquote className="kn-quote-text">{reveal ? <p><SplitWords text={text} className="kn-split-view" /></p> : <Prose html={e.body} />}</blockquote>
                ) : null}
                <figcaption className="kn-quote-by">
                  {e.image ? <Img image={e.image} aspect="1 / 1" sizes="44px" className="kn-avatar" /> : null}
                  <span>
                    <span className="kn-quote-name">{e.title}</span>
                    {e.subtitle ? <span className="kn-sub"> — {e.subtitle}</span> : null}
                    {e.date ? <span className="kn-date"> · {e.date}</span> : null}
                  </span>
                </figcaption>
                <Tail e={e} lang={lang} />
              </figure>
            );
          })}
        </div>
      );
    case "grid":
      return (
        <ul className="kn-rows">
          {s.entries.map((e, i) => (
            <li key={e.id} className="kn-row">
              <span className="kn-row-no" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="kn-row-main">
                <h3 className="kn-row-title">{e.title}</h3>
                <p className="kn-row-meta">
                  {[e.subtitle, e.date].filter(Boolean).join(" · ")}
                  {e.metric ? (
                    <span className="kn-row-metric">
                      {" "}
                      <b>{e.metric.value}</b> {e.metric.label}
                    </span>
                  ) : null}
                </p>
                <Body e={e} lang={lang} />
              </div>
              {e.image ? <Img image={e.image} aspect="4 / 3" sizes="(min-width: 1024px) 22vw, 90vw" className="kn-media kn-row-media" /> : null}
            </li>
          ))}
        </ul>
      );
    case "list":
      return (
        <ul className="kn-list">
          {s.entries.map((e) => (
            <li key={e.id} className="kn-list-row">
              <div className="kn-list-line">
                <h3 className="kn-h3">{e.title}</h3>
                {e.subtitle ? <p className="kn-sub">{e.subtitle}</p> : null}
                {e.date ? <p className="kn-date">{e.date}</p> : null}
              </div>
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="300px" className="kn-media max-w-xs" /> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <ol className="kn-timeline">
          {s.entries.map((e) => (
            <li key={e.id} className="kn-tl">
              <span className="kn-year" aria-hidden="true">
                {year(e.date) ?? "—"}
              </span>
              <div className="kn-tl-body">
                <h3 className="kn-h3">{e.title}</h3>
                {e.subtitle ? <p className="kn-sub">{e.subtitle}</p> : null}
                {e.date ? <p className="kn-date">{e.date}</p> : null}
                {e.image ? <Img image={e.image} aspect="16 / 9" sizes="(min-width: 768px) 420px, 90vw" className="kn-media max-w-md" /> : null}
                <Body e={e} lang={lang} />
              </div>
            </li>
          ))}
        </ol>
      );
  }
}

export default function Kinetic({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  const words = hero.name.split(/\s+/).filter(Boolean);
  const longest = Math.max(4, ...words.map((w) => w.length));
  // The widest state (stretch 140%) must fit the viewport: ≈0.82em per glyph.
  const nameSize = { "--kn-size": `min(22vw, ${(90 / (longest * 0.82)).toFixed(2)}vw)` } as CSSProperties;
  const firstQuotes = v.sections.findIndex((s) => s.layout === "quotes");
  return (
    <TemplateRoot portfolio={portfolio}>
      <header className="kn-bar">
        <a href="#top" className="kn-bar-name">
          {hero.name}
        </a>
        {v.nav.length ? (
          <nav aria-label="Sections" className="kn-bar-nav">
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
      <main id="main" tabIndex={-1} className="kn-main">
        <section id="top" className={`kn-hero ${hero.present ? "" : "kn-hero-compact"}`} style={nameSize}>
          {hero.eyebrow ? <p className="kn-label kn-eyebrow">{hero.eyebrow}</p> : null}
          <h1 className="kn-name" aria-label={hero.name}>
            <span aria-hidden="true">
              {words.map((w, wi) => (
                <span key={wi} className={`kn-name-word ${wi % 2 ? "kn-odd" : "kn-even"}`}>
                  {Array.from(w).map((ch, ci) => (
                    <span key={ci} className="kn-ch">
                      {ch}
                    </span>
                  ))}
                  {wi < words.length - 1 ? " " : null}
                </span>
              ))}
            </span>
          </h1>
          <Proximity />
          <div className="kn-hero-foot">
            {hero.headline ? (
              <p className="kn-headline">
                <SplitWords text={hero.headline} className="kn-split-load" />
              </p>
            ) : null}
            <div className="kn-hero-side">
              {hero.image && hero.present ? <Img image={hero.image} aspect="1 / 1" sizes="96px" priority className="kn-portrait" /> : null}
              {hero.present && hero.tagline ? <Prose html={hero.tagline} className="kn-prose" /> : null}
              {hero.present ? <Links links={hero.links} primaryFirst /> : null}
              <Rest slots={hero.rest} lang={v.lang} />
              {hero.location || v.email ? (
                <p className="kn-sub">
                  {hero.location}
                  {hero.location && v.email ? " · " : null}
                  {v.email ? (
                    <a href={`mailto:${v.email}`} className="pf-link">
                      {v.email}
                    </a>
                  ) : null}
                </p>
              ) : null}
              <Socials socials={v.socials} className="kn-socials" />
            </div>
          </div>
        </section>

        {v.sections.map((s, i) => (
          <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className={`kn-section kn-l-${s.layout}`}>
            <header className="kn-section-head">
              <span className="kn-section-no" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 id={`${s.anchor}-title`} className="kn-h2">
                {s.title}
              </h2>
              {s.subtitle ? <p className="kn-sub kn-section-sub">{s.subtitle}</p> : null}
            </header>
            <div className="kn-section-body">
              <Lead s={s} lang={v.lang} />
              <Items s={s} lang={v.lang} quoteReveal={i === firstQuotes} />
            </div>
          </section>
        ))}
      </main>
      <footer className="kn-foot">
        <p className="kn-foot-name" aria-hidden="true">
          {hero.name}
        </p>
        <div className="kn-foot-row">
          {v.email ? (
            <a href={`mailto:${v.email}`} className="pf-link">
              {v.email}
            </a>
          ) : (
            <span />
          )}
          <a href="#top" className="kn-top">
            Back to top <span aria-hidden="true">↑</span>
          </a>
        </div>
      </footer>
    </TemplateRoot>
  );
}
