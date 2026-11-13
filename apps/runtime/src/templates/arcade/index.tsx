import { Cover, TemplateRoot } from "../../render/Root";
import { Links, Prose, Rest, Socials, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { initials, viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { TemplateProps } from "../types";
import { LevelSelect } from "./islands";

const pad = (n: number) => String(n).padStart(2, "0");

function Body({ e, lang }: { e: Entry; lang: string }) {
  return (
    <>
      {e.body ? <Prose html={e.body} className="ac-prose" /> : null}
      <Tail e={e} lang={lang} />
    </>
  );
}

function Lead({ s, lang }: { s: SectionView; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  const contact = s.kind === "contact";
  return (
    <div className={`ac-px ac-panel ac-lead ${e.image ? "ac-lead-img" : ""}`}>
      <div className="grid content-start gap-4">
        {e.title ? <p className="ac-lead-title">{e.title}</p> : null}
        {e.subtitle || e.date ? <p className="ac-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
        {e.body ? <Prose html={e.body} className="ac-prose ac-prose-lead" /> : null}
        {e.metric ? (
          <p className="ac-score">
            <span className="ac-score-value">{e.metric.value}</span>
            <span className="ac-score-label">{e.metric.label}</span>
          </p>
        ) : null}
        <Tail e={{ ...e, links: contact ? [] : e.links }} lang={lang} />
        {contact ? <Links links={e.links} primaryFirst /> : null}
      </div>
      {e.image ? (
        <div className="ac-px ac-frame">
          <Img image={e.image} aspect="1 / 1" sizes="(min-width: 1024px) 240px, 60vw" className="ac-pixelated" />
        </div>
      ) : null}
    </div>
  );
}

function Items({ s, lang }: { s: SectionView; lang: string }) {
  if (!s.entries.length) return null;
  const awards = s.kind === "awards" || s.kind === "certifications";
  switch (s.layout) {
    case "metrics":
      return (
        <ul className="ac-scores">
          {s.entries.map((e) => (
            <li key={e.id} className="ac-px ac-panel ac-score">
              {e.metric ? <span className="ac-score-value">{e.metric.value}</span> : null}
              <span className="ac-score-label">{e.metric?.label || e.title}</span>
              {e.metric?.label && e.title ? <span className="ac-sub">{e.title}</span> : null}
              {e.subtitle ? <span className="ac-sub">{e.subtitle}</span> : null}
              {e.date ? <span className="ac-sub">{e.date}</span> : null}
              {e.image ? <Img image={e.image} aspect="1 / 1" sizes="96px" className="ac-pixelated ac-thumb" /> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "tags":
      return (
        <div className="ac-skills">
          {s.entries.map((e) => (
            <div key={e.id} className="ac-px ac-panel ac-skill">
              <div className="ac-skill-head">
                <h3 className="ac-h3">{e.title}</h3>
                {e.tags?.length ? <span className="ac-sub ac-nums">{e.tags.length}</span> : null}
              </div>
              {e.tags?.length ? (
                <>
                  {/* One equal segment per item: a count, not a level. */}
                  <span className="ac-xp" aria-hidden="true">
                    {e.tags.map((t, i) => (
                      <span key={t + i} className="ac-xp-seg" />
                    ))}
                  </span>
                  <ul className="ac-items">
                    {e.tags.map((t, i) => (
                      <li key={t + i} className="ac-item">
                        {t}
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              {e.subtitle || e.date ? <p className="ac-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="240px" className="ac-pixelated max-w-xs" /> : null}
              <Body e={{ ...e, tags: [] }} lang={lang} />
            </div>
          ))}
        </div>
      );
    case "quotes":
      return (
        <div className="ac-dialogues">
          {s.entries.map((e) => (
            <figure key={e.id} className="ac-dialogue">
              <figcaption className="ac-px ac-speaker">
                {e.image ? <Img image={e.image} aspect="1 / 1" sizes="32px" className="ac-pixelated ac-speaker-img" /> : null}
                <span className="ac-speaker-name">{e.title}</span>
              </figcaption>
              <div className="ac-px ac-panel ac-dialogue-box">
                {e.body ? (
                  <blockquote className="ac-dialogue-text">
                    <Prose html={e.body} />
                  </blockquote>
                ) : null}
                {e.subtitle || e.date ? <p className="ac-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
                <Tail e={e} lang={lang} />
                <span aria-hidden="true" className="ac-caret">
                  ▼
                </span>
              </div>
            </figure>
          ))}
        </div>
      );
    case "grid":
      return (
        <ul className="ac-levels">
          {s.entries.map((e, i) => (
            <li key={e.id} className="ac-px ac-panel ac-level">
              <div className="ac-px ac-frame">
                {e.image ? (
                  <Img image={e.image} aspect="4 / 3" sizes="(min-width: 900px) 40vw, 90vw" className="ac-pixelated" />
                ) : (
                  <Cover seed={e.id + (e.title ?? "")} label={e.title} className="aspect-[4/3] ac-pixel-cover" />
                )}
              </div>
              <p className="ac-tag-label" aria-hidden="true">
                {pad(i + 1)}
              </p>
              <h3 className="ac-h3">{e.title}</h3>
              {e.subtitle || e.date ? <p className="ac-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
              {e.metric ? (
                <p className="ac-score ac-score-inline">
                  <span className="ac-score-value">{e.metric.value}</span>
                  <span className="ac-score-label">{e.metric.label}</span>
                </p>
              ) : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "list":
      return (
        <ul className={awards ? "ac-achievements" : "ac-inventory"}>
          {s.entries.map((e) => (
            <li key={e.id} className={`ac-px ac-panel ${awards ? "ac-achievement" : "ac-slot-row"}`}>
              <span aria-hidden="true" className={`ac-px ${awards ? "ac-trophy" : "ac-slot"}`}>
                {awards ? "★" : initials(e.title ?? "")}
              </span>
              <div className="grid min-w-0 gap-1.5">
                {awards ? (
                  <p className="ac-tag-label" aria-hidden="true">
                    Achievement unlocked
                  </p>
                ) : null}
                <h3 className="ac-h3 ac-h3-sm">{e.title}</h3>
                {e.subtitle || e.date ? <p className="ac-sub">{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
                {e.image ? <Img image={e.image} aspect="16 / 9" sizes="240px" className="ac-pixelated max-w-[15rem]" /> : null}
                <Body e={e} lang={lang} />
              </div>
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <ol className="ac-quests">
          {s.entries.map((e, i) => (
            <li key={e.id} className="ac-px ac-panel ac-quest">
              <div className="ac-quest-head">
                <span className="ac-tag-label" aria-hidden="true">
                  Quest {pad(i + 1)}
                </span>
                {e.date ? <span className="ac-sub ac-nums">{e.date}</span> : null}
              </div>
              <h3 className="ac-h3">{e.title}</h3>
              {e.subtitle ? <p className="ac-sub">{e.subtitle}</p> : null}
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="(min-width: 768px) 360px, 90vw" className="ac-pixelated max-w-sm" /> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ol>
      );
  }
}

export default function Arcade({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  const entries = v.sections.reduce((n, s) => n + s.entries.length, 0);
  const projects = v.sections.filter((s) => s.kind === "projects").reduce((n, s) => n + s.entries.length, 0);
  const stats = [
    { k: "Levels", v: v.sections.length },
    { k: "Entries", v: entries },
    ...(projects ? [{ k: "Projects", v: projects }] : []),
  ];
  return (
    <TemplateRoot portfolio={portfolio}>
      <div className="ac-screen">
        <header className="ac-hud">
          <a href="#top" className="ac-hud-name">
            {hero.name}
          </a>
          <ul className="ac-hud-stats" aria-label="Counts">
            {stats.map((s) => (
              <li key={s.k}>
                <span className="ac-hud-k">{s.k}</span> <span className="ac-hud-v ac-nums">{pad(s.v)}</span>
              </li>
            ))}
          </ul>
        </header>

        <main id="main" tabIndex={-1} className="ac-main">
          <section id="top" className={`ac-title ${hero.present ? "" : "ac-title-compact"}`}>
            <div className="ac-title-text">
              {hero.eyebrow ? <p className="ac-tag-label ac-blink-label">{hero.eyebrow}</p> : null}
              <h1 className="ac-name">{hero.name}</h1>
              {hero.headline ? <p className="ac-headline">{hero.headline}</p> : null}
              {hero.present && hero.tagline ? <Prose html={hero.tagline} className="ac-prose" /> : null}
              {hero.present ? <Links links={hero.links} primaryFirst /> : null}
              <Rest slots={hero.rest} lang={v.lang} />
              <div className="ac-title-meta">
                {hero.location ? <span>{hero.location}</span> : null}
                {v.email ? (
                  <a href={`mailto:${v.email}`} className="pf-link">
                    {v.email}
                  </a>
                ) : null}
                <Socials socials={v.socials} className="ac-socials" />
              </div>
            </div>
            {hero.image && hero.present ? (
              <div className="ac-px ac-frame ac-avatar">
                <Img image={hero.image} aspect="1 / 1" sizes="(min-width: 900px) 220px, 50vw" priority className="ac-pixelated" />
              </div>
            ) : null}
          </section>

          {v.sections.length ? (
            <nav aria-label="Level select" className="ac-select">
              <p className="ac-tag-label ac-select-label">Level select</p>
              <LevelSelect items={v.sections.filter((s) => s.title).map((s, i) => ({ href: `#${s.anchor}`, label: s.title, no: pad(i + 1), count: s.entries.length }))} />
            </nav>
          ) : null}

          {v.sections.map((s, i) => (
            <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className={`ac-section ac-l-${s.layout}`}>
              <header className="ac-section-head">
                <span className="ac-px ac-level-no" aria-hidden="true">
                  {pad(i + 1)}
                </span>
                <div className="grid gap-1.5">
                  <h2 id={`${s.anchor}-title`} className="ac-h2">
                    {s.title}
                  </h2>
                  {s.subtitle ? <p className="ac-sub">{s.subtitle}</p> : null}
                </div>
              </header>
              <div className="ac-section-body">
                <Lead s={s} lang={v.lang} />
                <Items s={s} lang={v.lang} />
              </div>
            </section>
          ))}
        </main>

        <footer className="ac-foot">
          <p className="ac-tag-label">{hero.name}</p>
          <a href="#top" className="ac-px ac-btn-top">
            Back to top <span aria-hidden="true">▲</span>
          </a>
        </footer>
      </div>
    </TemplateRoot>
  );
}
