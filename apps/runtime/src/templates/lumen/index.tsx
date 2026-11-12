import { Cover, TemplateRoot } from "../../render/Root";
import { Links, Prose, Rest, Socials, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { ImageValue } from "../../schema/portfolio";
import type { TemplateProps } from "../types";
import { Lightbox } from "./islands";

const ASPECTS = ["4 / 5", "1 / 1", "3 / 4", "5 / 4"];

/** An image that opens in the lightbox. The <img> is the one enlarged — nothing is re-fetched. */
function Zoom({ image, sizes, aspect, priority = false, className = "" }: { image: ImageValue; sizes: string; aspect?: string; priority?: boolean; className?: string }) {
  return (
    <button type="button" className={`lm-zoom ${className}`} data-lb="" aria-label={image.alt ? `Enlarge image: ${image.alt}` : "Enlarge image"}>
      <Img image={image} sizes={sizes} {...(aspect ? { aspect } : {})} priority={priority} className="lm-media" />
    </button>
  );
}

function Body({ e, lang }: { e: Entry; lang: string }) {
  return (
    <>
      {e.body ? <Prose html={e.body} className="lm-prose" /> : null}
      <Tail e={e} lang={lang} />
    </>
  );
}

function Lead({ s, lang }: { s: SectionView; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  const contact = s.kind === "contact";
  return (
    <div className={`lm-lead ${e.image ? "lm-lead-img" : ""}`}>
      {e.image ? <Zoom image={e.image} sizes="(min-width: 1024px) 40vw, 90vw" className="lm-lead-zoom" /> : null}
      <div className="lm-narrow grid content-start gap-4">
        {e.title ? <p className="lm-lead-title">{e.title}</p> : null}
        {e.subtitle || e.date ? <p className="lm-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
        {e.body ? <Prose html={e.body} className="lm-prose" /> : null}
        {e.metric ? (
          <p className="lm-figure">
            <span className="lm-figure-value">{e.metric.value}</span>
            <span className="lm-caps">{e.metric.label}</span>
          </p>
        ) : null}
        <Tail e={{ ...e, links: contact ? [] : e.links }} lang={lang} />
        {contact ? <Links links={e.links} primaryFirst /> : null}
      </div>
    </div>
  );
}

function Items({ s, lang }: { s: SectionView; lang: string }) {
  if (!s.entries.length) return null;
  switch (s.layout) {
    case "metrics":
      return (
        <ul className="lm-figures lm-narrow-wide">
          {s.entries.map((e) => (
            <li key={e.id} className="lm-figure">
              {e.metric ? <span className="lm-figure-value">{e.metric.value}</span> : null}
              <span className="lm-caps">{e.metric?.label || e.title}</span>
              {e.metric?.label && e.title ? <span className="lm-sub">{e.title}</span> : null}
              {e.subtitle ? <span className="lm-sub">{e.subtitle}</span> : null}
              {e.date ? <span className="lm-sub">{e.date}</span> : null}
              {e.image ? <Zoom image={e.image} aspect="1 / 1" sizes="160px" /> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "tags":
      return (
        <dl className="lm-taglist lm-narrow">
          {s.entries.map((e) => (
            <div key={e.id} className="lm-tagrow">
              <dt className="lm-caps">
                {e.title}
                {e.date ? ` · ${e.date}` : ""}
              </dt>
              <dd className="grid gap-2">
                {e.tags?.length ? <p className="lm-inline">{e.tags.join(" / ")}</p> : null}
                {e.subtitle ? <p className="lm-sub">{e.subtitle}</p> : null}
                {e.image ? <Zoom image={e.image} aspect="4 / 3" sizes="240px" className="max-w-[15rem]" /> : null}
                <Body e={{ ...e, tags: [] }} lang={lang} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case "quotes":
      return (
        <div className="lm-quotes">
          {s.entries.map((e) => (
            <figure key={e.id} className="lm-quote">
              {e.body ? (
                <blockquote className="lm-quote-text">
                  <Prose html={e.body} />
                </blockquote>
              ) : null}
              <figcaption className="lm-quote-by">
                {e.image ? <Img image={e.image} aspect="1 / 1" sizes="40px" className="lm-avatar" /> : null}
                <span>
                  <span className="lm-caps">{e.title}</span>
                  {e.subtitle || e.date ? <span className="lm-sub"> — {[e.subtitle, e.date].filter(Boolean).join(", ")}</span> : null}
                </span>
              </figcaption>
              <Tail e={e} lang={lang} />
            </figure>
          ))}
        </div>
      );
    case "grid":
      return (
        <ul className="lm-wall">
          {s.entries.map((e, i) => (
            <li key={e.id} className="lm-tile">
              {e.image ? (
                <Zoom image={e.image} sizes="(min-width: 1400px) 30vw, (min-width: 700px) 45vw, 94vw" />
              ) : (
                <Cover seed={e.id + (e.title ?? "")} label={e.title} className="lm-media" style={{ aspectRatio: ASPECTS[i % ASPECTS.length] }} />
              )}
              <div className="lm-caption">
                <h3 className="lm-h3">{e.title}</h3>
                {e.subtitle || e.date ? <p className="lm-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
                {e.metric ? (
                  <p className="lm-sub">
                    <span className="lm-metric">{e.metric.value}</span> {e.metric.label}
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
        <ul className="lm-captions lm-narrow-wide">
          {s.entries.map((e) => (
            <li key={e.id} className="lm-cap-row">
              {e.image ? <Zoom image={e.image} aspect="1 / 1" sizes="96px" className="lm-cap-thumb" /> : null}
              <div className="grid min-w-0 gap-1">
                <h3 className="lm-h3">{e.title}</h3>
                <p className="lm-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p>
                <Body e={e} lang={lang} />
              </div>
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <ol className="lm-twocol lm-narrow-wide">
          {s.entries.map((e) => (
            <li key={e.id} className="lm-tc-row">
              <p className="lm-sub lm-nums">{e.date}</p>
              <div className="grid min-w-0 gap-1.5">
                <h3 className="lm-h3">{e.title}</h3>
                {e.subtitle ? <p className="lm-sub">{e.subtitle}</p> : null}
                {e.image ? <Zoom image={e.image} aspect="3 / 2" sizes="(min-width: 768px) 360px, 90vw" className="max-w-sm" /> : null}
                <Body e={e} lang={lang} />
              </div>
            </li>
          ))}
        </ol>
      );
  }
}

export default function Lumen({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  const imageCount = v.sections.reduce((n, s) => n + s.entries.filter((e) => e.image).length + (s.lead?.image ? 1 : 0), 0);
  return (
    <TemplateRoot portfolio={portfolio}>
      <header className="lm-bar">
        <a href="#top" className="lm-bar-name">
          {hero.name}
        </a>
        {v.nav.length ? (
          <nav aria-label="Sections" className="lm-bar-nav">
            <ul>
              {v.nav.slice(0, 5).map((n) => (
                <li key={n.href}>
                  <a href={n.href}>{n.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>
      <main id="main" tabIndex={-1} className="lm-main">
        <section id="top" className={`lm-hero ${hero.present ? "" : "lm-hero-compact"}`}>
          {hero.present ? (
            <div className="lm-hero-art">
              {hero.image ? (
                <Zoom image={hero.image} sizes="100vw" priority className="lm-hero-zoom" />
              ) : (
                <Cover seed={hero.name} className="lm-hero-cover" />
              )}
            </div>
          ) : null}
          <div className="lm-hero-text">
            {hero.eyebrow ? <p className="lm-caps lm-eyebrow">{hero.eyebrow}</p> : null}
            <h1 className="lm-name">{hero.name}</h1>
            {hero.headline ? <p className="lm-headline">{hero.headline}</p> : null}
          </div>
        </section>

        {hero.present && (hero.tagline || hero.links.length || hero.rest.length) ? (
          <div className="lm-intro">
            {hero.tagline ? <Prose html={hero.tagline} className="lm-prose lm-intro-text" /> : null}
            <Links links={hero.links} primaryFirst />
            <Rest slots={hero.rest} lang={v.lang} />
          </div>
        ) : null}

        {v.sections.map((s) => (
          <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className={`lm-section lm-l-${s.layout}`}>
            <header className="lm-section-head">
              <h2 id={`${s.anchor}-title`} className="lm-h2">
                {s.title}
              </h2>
              {s.subtitle ? <p className="lm-sub">{s.subtitle}</p> : null}
            </header>
            <div className="lm-section-body">
              <Lead s={s} lang={v.lang} />
              <Items s={s} lang={v.lang} />
            </div>
          </section>
        ))}
        <Lightbox />
      </main>
      <footer className="lm-foot">
        <div className="grid gap-2">
          <p className="lm-foot-name">{hero.name}</p>
          <p className="lm-sub">
            {[hero.location, imageCount ? `${imageCount} images` : ""].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="grid content-start gap-2 justify-items-start">
          {v.email ? (
            <a href={`mailto:${v.email}`} className="pf-link">
              {v.email}
            </a>
          ) : null}
          <Socials socials={v.socials} className="lm-socials" />
        </div>
      </footer>
    </TemplateRoot>
  );
}
