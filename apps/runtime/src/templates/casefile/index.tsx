import type { ReactNode } from "react";
import { Cover, TemplateRoot } from "../../render/Root";
import { Links, Prose, Rest, Tags, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { MetricValue } from "../../schema/portfolio";
import type { TemplateProps } from "../types";
import { CaseIndex, CountUp } from "./islands";

const pad = (n: number) => String(n).padStart(2, "0");

/* ───────── duration bars: parse the formatted "Mar 2021 — Present" back into months ───────── */
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
function toMonth(s: string, now: number): number | null {
  const t = s.trim();
  if (/^present$/i.test(t)) return now;
  const m = /^(?:\d{1,2}\s+)?([A-Za-z]{3})[a-z.]*\s+(\d{4})$/.exec(t);
  if (m) {
    const mo = MONTHS.indexOf(m[1]!.toLowerCase());
    return mo < 0 ? null : Number(m[2]) * 12 + mo;
  }
  const y = /^(\d{4})$/.exec(t);
  return y ? Number(y[1]) * 12 : null;
}
function span(date: string | undefined, now: number): [number, number] | null {
  if (!date) return null;
  const parts = date.split(" — ");
  if (parts.length !== 2) return null;
  const a = toMonth(parts[0]!, now);
  const b = toMonth(parts[1]!, now);
  return a !== null && b !== null && b >= a ? [a, b + 1] : null;
}
function duration(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  return [y ? `${y} yr${y > 1 ? "s" : ""}` : "", m ? `${m} mo` : ""].filter(Boolean).join(" ");
}

function Outcome({ metric, size = "lg" }: { metric: MetricValue; size?: "lg" | "md" }) {
  return (
    <div className={`cf-outcome cf-outcome-${size}`}>
      <p className="cf-kicker">Outcome</p>
      <p className="cf-outcome-line">
        <CountUp value={metric.value} className="cf-outcome-value" />
        {metric.label ? <span className="cf-outcome-label">{metric.label}</span> : null}
      </p>
    </div>
  );
}

/** Tags, labelled leftover fields and links: the entry's evidence. */
function Evidence({ e, lang }: { e: Entry; lang: string }) {
  if (!e.tags?.length && !e.links.length && !e.rest.length) return null;
  return (
    <div className="cf-evidence">
      <p className="cf-kicker">Evidence</p>
      <Tail e={e} lang={lang} />
    </div>
  );
}

function EntryHead({ e, no, children }: { e: Entry; no: string; children?: ReactNode }) {
  return (
    <header className="cf-entry-head">
      <p className="cf-no" aria-hidden="true">
        {no}
      </p>
      <div className="min-w-0">
        <h3 className="cf-h3">{e.title}</h3>
        {e.subtitle ? <p className="cf-sub">{e.subtitle}</p> : null}
      </div>
      {e.date ? <p className="cf-date">{e.date}</p> : null}
      {children}
    </header>
  );
}

function Lead({ s, lang }: { s: SectionView; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  const contact = s.kind === "contact";
  return (
    <div className={`cf-lead ${e.image ? "cf-lead-img" : ""}`}>
      <div className="grid content-start gap-4">
        {e.title ? <p className="cf-lead-title">{e.title}</p> : null}
        {e.subtitle ? <p className="cf-sub">{e.subtitle}</p> : null}
        {e.date ? <p className="cf-date">{e.date}</p> : null}
        {e.body ? <Prose html={e.body} className="cf-prose cf-prose-lead" /> : null}
        {e.metric ? <Outcome metric={e.metric} size="md" /> : null}
        <Tail e={{ ...e, links: contact ? [] : e.links }} lang={lang} />
        {contact ? <Links links={e.links} primaryFirst /> : null}
      </div>
      {e.image ? <Img image={e.image} aspect="4 / 5" sizes="(min-width: 1024px) 260px, 60vw" className="cf-media cf-lead-media" /> : null}
    </div>
  );
}

function Items({ s, si, lang }: { s: SectionView; si: number; lang: string }) {
  if (!s.entries.length) return null;
  const no = (i: number) => `${pad(si + 1)}.${i + 1}`;
  switch (s.layout) {
    case "metrics":
      return (
        <ul className="cf-kpis">
          {s.entries.map((e) => (
            <li key={e.id} className="cf-kpi pf-reveal">
              {e.metric ? <CountUp value={e.metric.value} className="cf-kpi-value" /> : null}
              <span className="cf-kpi-label">{e.metric?.label || e.title}</span>
              {e.metric?.label && e.title ? <span className="cf-kpi-note">{e.title}</span> : null}
              {e.subtitle ? <span className="cf-kpi-note">{e.subtitle}</span> : null}
              {e.date ? <span className="cf-kpi-note">{e.date}</span> : null}
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="240px" className="cf-media" /> : null}
              {e.body ? <Prose html={e.body} className="cf-prose text-mute" /> : null}
              <Tail e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "tags":
      return (
        <div className="cf-skills">
          {s.entries.map((e) => (
            <div key={e.id} className="cf-skill pf-reveal">
              <h3 className="cf-skill-title">
                {e.title}
                {e.date ? <span className="cf-date"> · {e.date}</span> : null}
              </h3>
              {e.subtitle ? <p className="cf-sub">{e.subtitle}</p> : null}
              {e.tags?.length ? <Tags tags={e.tags} className="cf-chips" /> : null}
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="240px" className="cf-media" /> : null}
              {e.body ? <Prose html={e.body} className="cf-prose" /> : null}
              <Tail e={{ ...e, tags: [] }} lang={lang} />
            </div>
          ))}
        </div>
      );
    case "quotes":
      return (
        <div className="cf-quotes">
          {s.entries.map((e) => (
            <figure key={e.id} className="cf-quote pf-reveal">
              <span aria-hidden="true" className="cf-quote-mark">
                “
              </span>
              {e.body ? (
                <blockquote className="cf-quote-text">
                  <Prose html={e.body} />
                </blockquote>
              ) : null}
              <figcaption className="cf-quote-by">
                {e.image ? <Img image={e.image} aspect="1 / 1" sizes="44px" className="cf-avatar" /> : <span aria-hidden="true" className="cf-quote-rule" />}
                <span className="grid">
                  {e.title ? <span className="font-semibold">{e.title}</span> : null}
                  {e.subtitle ? <span className="text-mute">{e.subtitle}</span> : null}
                  {e.date ? <span className="cf-date">{e.date}</span> : null}
                </span>
              </figcaption>
              <Tail e={e} lang={lang} />
            </figure>
          ))}
        </div>
      );
    case "grid":
      return (
        <ul className="cf-cases">
          {s.entries.map((e, i) => (
            <li key={e.id} className="cf-case pf-reveal">
              {e.image ? (
                <Img image={e.image} aspect="16 / 9" sizes="(min-width: 1280px) 420px, (min-width: 768px) 45vw, 100vw" className="cf-media" />
              ) : (
                <Cover seed={e.id + (e.title ?? "")} label={e.title} className="cf-media aspect-[16/9]" />
              )}
              <EntryHead e={e} no={no(i)} />
              {e.metric ? <Outcome metric={e.metric} /> : null}
              {e.body ? <Prose html={e.body} className="cf-prose" /> : null}
              <Evidence e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "list":
      return (
        <ul className="cf-table">
          {s.entries.map((e, i) => (
            <li key={e.id} className="cf-trow">
              <span className="cf-no" aria-hidden="true">
                {no(i)}
              </span>
              <div className="grid min-w-0 gap-2">
                <h3 className="cf-h3 cf-h3-sm">{e.title}</h3>
                {e.image ? <Img image={e.image} aspect="16 / 9" sizes="240px" className="cf-media max-w-[15rem]" /> : null}
                {e.body ? <Prose html={e.body} className="cf-prose text-mute" /> : null}
                <Tail e={e} lang={lang} />
              </div>
              <p className="cf-tcell">{e.subtitle}</p>
              <p className="cf-tcell cf-date">{e.date}</p>
            </li>
          ))}
        </ul>
      );
    default: {
      const now = (() => {
        const d = new Date();
        return d.getUTCFullYear() * 12 + d.getUTCMonth();
      })();
      const spans = s.entries.map((e) => span(e.date, now));
      const known = spans.filter((x): x is [number, number] => x !== null);
      const min = known.length ? Math.min(...known.map((x) => x[0])) : 0;
      const max = known.length ? Math.max(...known.map((x) => x[1])) : 1;
      const total = Math.max(1, max - min);
      return (
        <ol className="cf-log">
          {s.entries.map((e, i) => {
            const sp = spans[i];
            return (
              <li key={e.id} className="cf-log-row pf-reveal">
                <EntryHead e={e} no={no(i)} />
                {sp ? (
                  <div className="cf-bar" aria-hidden="true">
                    <span className="cf-bar-fill" style={{ left: `${((sp[0] - min) / total) * 100}%`, width: `${Math.max(1.5, ((sp[1] - sp[0]) / total) * 100)}%` }} />
                    <span className="cf-bar-label">{duration(sp[1] - sp[0])}</span>
                  </div>
                ) : null}
                <div className="cf-log-body">
                  {e.image ? <Img image={e.image} aspect="16 / 9" sizes="(min-width: 768px) 360px, 100vw" className="cf-media max-w-sm" /> : null}
                  {e.body ? <Prose html={e.body} className="cf-prose" /> : null}
                  <Tail e={e} lang={lang} />
                </div>
              </li>
            );
          })}
        </ol>
      );
    }
  }
}

export default function Casefile({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  const entries = v.sections.reduce((n, s) => n + s.entries.length, 0);
  return (
    <TemplateRoot portfolio={portfolio}>
      <div className="cf-shell">
        <CaseIndex
          name={hero.name}
          items={v.sections.filter((s) => s.title).map((s, i) => ({ href: `#${s.anchor}`, id: s.anchor, label: s.title, no: pad(i + 1), count: s.entries.length }))}
          summary={`${v.sections.length} sections · ${entries} entries`}
        />
        <main id="main" tabIndex={-1} className="cf-main">
          <header id="top" className={`cf-cover ${hero.present ? "" : "cf-cover-compact"}`}>
            <div className="cf-cover-text">
              {hero.eyebrow ? <p className="cf-eyebrow">{hero.eyebrow}</p> : null}
              <h1 className="cf-name">{hero.name}</h1>
              {hero.headline ? <p className="cf-headline">{hero.headline}</p> : null}
              {hero.present && hero.tagline ? <Prose html={hero.tagline} className="cf-prose cf-tagline" /> : null}
              {hero.present ? <Links links={hero.links} primaryFirst className="cf-hero-links" /> : null}
            </div>
            <aside className="cf-file" aria-label="Profile">
              {hero.image && hero.present ? <Img image={hero.image} aspect="1 / 1" sizes="96px" priority className="cf-portrait" /> : null}
              <dl className="cf-file-dl">
                {hero.location ? (
                  <div>
                    <dt>Location</dt>
                    <dd>{hero.location}</dd>
                  </div>
                ) : null}
                {v.email ? (
                  <div>
                    <dt>Email</dt>
                    <dd>
                      <a href={`mailto:${v.email}`} className="pf-link">
                        {v.email}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {v.socials.length ? (
                  <div>
                    <dt>Links</dt>
                    <dd className="flex flex-wrap gap-x-3 gap-y-1">
                      {v.socials.map((s) => (
                        <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer me" className="pf-link">
                          {s.label}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      ))}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <Rest slots={hero.rest} lang={v.lang} />
            </aside>
          </header>

          {v.sections.map((s, si) => (
            <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className={`cf-section cf-l-${s.layout}`}>
              <header className="cf-section-head">
                <span className="cf-tab" aria-hidden="true">
                  § {pad(si + 1)}
                </span>
                <h2 id={`${s.anchor}-title`} className="cf-h2">
                  {s.title}
                </h2>
                {s.subtitle ? <p className="cf-section-sub">{s.subtitle}</p> : null}
              </header>
              <div className="cf-section-body">
                <Lead s={s} lang={v.lang} />
                <Items s={s} si={si} lang={v.lang} />
              </div>
            </section>
          ))}

          <footer className="cf-foot">
            <p>{hero.name}</p>
            {v.email ? (
              <a href={`mailto:${v.email}`} className="pf-link">
                {v.email}
              </a>
            ) : null}
            <a href="#top" className="cf-foot-top">
              Back to top <span aria-hidden="true">↑</span>
            </a>
          </footer>
        </main>
      </div>
    </TemplateRoot>
  );
}
