import type { ReactNode } from "react";
import { Cover, TemplateRoot } from "../../render/Root";
import { Links, Prose, Rest, Tags, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { initials, viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { ImageValue } from "../../schema/portfolio";
import type { TemplateProps } from "../types";

type Who = { name: string; image?: ImageValue };

function Avatar({ who, size = "sm" }: { who: Who; size?: "sm" | "lg" }) {
  return who.image ? (
    <Img image={who.image} aspect="1 / 1" sizes={size === "lg" ? "56px" : "32px"} className={`th-av th-av-${size}`} />
  ) : (
    <span aria-hidden="true" className={`th-av th-av-${size} th-av-ini`}>
      {initials(who.name)}
    </span>
  );
}

/** A run of incoming bubbles from the portfolio owner; the avatar sits by the last one. */
function Incoming({ who, children, first = false }: { who: Who; children: ReactNode; first?: boolean }) {
  return (
    <div className={`th-in ${first ? "th-first" : ""}`}>
      <div className="th-in-stack">{children}</div>
      <span className="th-in-av" aria-hidden="true">
        <Avatar who={who} />
      </span>
    </div>
  );
}

function Bubble({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`th-bubble ${className}`}>{children}</div>;
}

function Body({ e, lang }: { e: Entry; lang: string }) {
  return (
    <>
      {e.body ? <Prose html={e.body} className="th-prose" /> : null}
      <Tail e={e} lang={lang} />
    </>
  );
}

function Lead({ s, lang }: { s: SectionView; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  const contact = s.kind === "contact";
  return (
    <>
      {e.image ? (
        <Bubble className="th-bubble-media">
          <Img image={e.image} aspect="4 / 3" sizes="(min-width: 640px) 360px, 75vw" />
        </Bubble>
      ) : null}
      <Bubble>
        {e.title ? <p className="th-strong">{e.title}</p> : null}
        {e.subtitle || e.date ? <p className="th-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
        {e.body ? <Prose html={e.body} className="th-prose" /> : null}
        {e.metric ? (
          <p className="th-reaction">
            <b>{e.metric.value}</b> {e.metric.label}
          </p>
        ) : null}
        <Tail e={{ ...e, links: contact ? [] : e.links }} lang={lang} />
        {contact ? <Links links={e.links} primaryFirst className="th-actions" /> : null}
      </Bubble>
    </>
  );
}

function Items({ s, lang }: { s: SectionView; lang: string }) {
  if (!s.entries.length) return null;
  switch (s.layout) {
    case "metrics":
      return (
        <Bubble className="th-bubble-reactions">
          <ul className="th-reactions">
            {s.entries.map((e) => (
              <li key={e.id} className="th-reaction">
                {e.metric ? <b>{e.metric.value}</b> : null} <span>{e.metric?.label || e.title}</span>
                {e.metric?.label && e.title ? <span className="th-sub"> · {e.title}</span> : null}
                {e.subtitle ? <span className="th-sub"> · {e.subtitle}</span> : null}
                {e.date ? <span className="th-sub"> · {e.date}</span> : null}
                {e.image ? <Img image={e.image} aspect="1 / 1" sizes="48px" className="th-reaction-img" /> : null}
                {e.body || e.tags?.length || e.links.length || e.rest.length ? (
                  <div className="th-reaction-more">
                    <Body e={e} lang={lang} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </Bubble>
      );
    case "tags":
      return (
        <>
          {s.entries.map((e) => (
            <Bubble key={e.id}>
              {e.title ? <h3 className="th-h3">{e.title}</h3> : null}
              {e.subtitle || e.date ? <p className="th-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
              {e.tags?.length ? <Tags tags={e.tags} className="th-chips" /> : null}
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="300px" className="th-inline-img" /> : null}
              <Body e={{ ...e, tags: [] }} lang={lang} />
            </Bubble>
          ))}
        </>
      );
    case "quotes":
      return (
        <>
          {s.entries.map((e) => (
            <Bubble key={e.id} className="th-forward">
              <p className="th-forward-label" aria-hidden="true">
                <span className="th-forward-icon" />
                Forwarded
              </p>
              <figure className="grid gap-2">
                {e.body ? (
                  <blockquote className="th-forward-text">
                    <Prose html={e.body} />
                  </blockquote>
                ) : null}
                <figcaption className="th-forward-by">
                  {e.image ? <Img image={e.image} aspect="1 / 1" sizes="28px" className="th-av th-av-xs" /> : null}
                  <span>
                    <span className="th-strong">{e.title}</span>
                    {e.subtitle || e.date ? <span className="th-sub"> · {[e.subtitle, e.date].filter(Boolean).join(" · ")}</span> : null}
                  </span>
                </figcaption>
                <Tail e={e} lang={lang} />
              </figure>
            </Bubble>
          ))}
        </>
      );
    case "grid":
      return (
        <div className="th-carousel" role="region" aria-label={s.title} tabIndex={0}>
          <ul className="th-cards">
            {s.entries.map((e) => (
              <li key={e.id} className="th-card">
                {e.image ? (
                  <Img image={e.image} aspect="4 / 3" sizes="260px" className="th-card-img" />
                ) : (
                  <Cover seed={e.id + (e.title ?? "")} label={e.title} className="th-card-img aspect-[4/3]" />
                )}
                <div className="th-card-body">
                  <h3 className="th-h3">{e.title}</h3>
                  {e.subtitle || e.date ? <p className="th-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
                  {e.metric ? (
                    <p className="th-reaction th-reaction-sm">
                      <b>{e.metric.value}</b> {e.metric.label}
                    </p>
                  ) : null}
                  <Body e={e} lang={lang} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      );
    case "list":
      return (
        <>
          {s.entries.map((e) => (
            <Bubble key={e.id}>
              <h3 className="th-h3">{e.title}</h3>
              {e.subtitle || e.date ? <p className="th-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="300px" className="th-inline-img" /> : null}
              <Body e={e} lang={lang} />
            </Bubble>
          ))}
        </>
      );
    default:
      return (
        <>
          {s.entries.map((e) => (
            <div key={e.id} className="th-dated">
              {e.date ? (
                <p className="th-sep">
                  <span>{e.date}</span>
                </p>
              ) : null}
              <Bubble>
                <h3 className="th-h3">{e.title}</h3>
                {e.subtitle ? <p className="th-sub">{e.subtitle}</p> : null}
                {e.image ? <Img image={e.image} aspect="16 / 9" sizes="300px" className="th-inline-img" /> : null}
                <Body e={e} lang={lang} />
              </Bubble>
            </div>
          ))}
        </>
      );
  }
}

export default function Thread({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  const who: Who = { name: hero.name, ...(hero.image ? { image: hero.image } : {}) };
  const intro = hero.present && (hero.headline || hero.tagline || hero.links.length || hero.rest.length || hero.eyebrow);
  return (
    <TemplateRoot portfolio={portfolio}>
      <div className="th-app">
        <header id="top" className="th-head">
          <Avatar who={who} size="lg" />
          <div className="th-head-id">
            <h1 className="th-name">{hero.name}</h1>
            {hero.location || hero.eyebrow ? <p className="th-sub th-head-status">{[hero.eyebrow, hero.location].filter(Boolean).join(" · ")}</p> : null}
          </div>
        </header>

        <main id="main" tabIndex={-1} className="th-main">
          {v.nav.length ? (
            <nav aria-label="Quick replies" className="th-quick">
              <ul>
                {v.nav.map((n) => (
                  <li key={n.href}>
                    <a href={n.href} className="th-quick-chip">
                      {n.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          {intro ? (
            <Incoming who={who} first>
              {hero.headline ? (
                <Bubble className="th-bubble-big">
                  <p>{hero.headline}</p>
                </Bubble>
              ) : null}
              {hero.tagline ? (
                <Bubble>
                  <Prose html={hero.tagline} className="th-prose" />
                </Bubble>
              ) : null}
              {hero.links.length || hero.rest.length ? (
                <Bubble>
                  <Links links={hero.links} primaryFirst className="th-actions" />
                  <Rest slots={hero.rest} lang={v.lang} />
                </Bubble>
              ) : null}
            </Incoming>
          ) : null}

          {v.sections.map((s) => (
            <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className={`th-section th-l-${s.layout}`}>
              <div className="th-out">
                <div className="th-bubble th-bubble-out">
                  <h2 id={`${s.anchor}-title`} className="th-h2">
                    {s.title}
                  </h2>
                  {s.subtitle ? <p className="th-out-sub">{s.subtitle}</p> : null}
                </div>
              </div>
              <Incoming who={who}>
                <Lead s={s} lang={v.lang} />
                <Items s={s} lang={v.lang} />
              </Incoming>
            </section>
          ))}
        </main>

        <footer className="th-foot">
          {v.socials.length ? (
            <ul className="th-socials">
              {v.socials.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer me" className="th-quick-chip">
                    {s.label}
                    <span aria-hidden="true"> ↗</span>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          <a href="#top" className="th-sub th-top">
            Back to top <span aria-hidden="true">↑</span>
          </a>
        </footer>
        {v.email ? (
          <div className="th-composer">
            <a href={`mailto:${v.email}`} className="th-compose">
              <span className="th-compose-text">{v.email}</span>
              <span aria-hidden="true" className="th-send" />
            </a>
          </div>
        ) : null}
      </div>
    </TemplateRoot>
  );
}
