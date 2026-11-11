import { Cover, TemplateRoot } from "../../render/Root";
import { Links, Prose, Rest, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { TemplateProps } from "../types";

const WRAP = "mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12";
const GRID = "grid grid-cols-4 gap-x-5 md:grid-cols-12 md:gap-x-8";
const LABEL = "font-mono text-[0.75rem] uppercase tracking-[0.14em] text-mute";

const num = (i: number) => String(i + 1).padStart(2, "0");

function Body({ e, lang }: { e: Entry; lang: string }) {
  return (
    <>
      {e.body ? <Prose html={e.body} className="max-w-[62ch] text-mute" /> : null}
      <Tail e={e} lang={lang} />
    </>
  );
}

function Lead({ s, lang }: { s: SectionView; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  return (
    <div className={`${GRID} gap-y-6`}>
      <div className={`col-span-4 grid content-start gap-5 ${e.image ? "md:col-span-8" : "md:col-span-12"}`}>
        {e.title ? <p className="font-display text-xl font-semibold">{e.title}</p> : null}
        {e.subtitle ? <p className="text-mute">{e.subtitle}</p> : null}
        {e.body ? <Prose html={e.body} className="max-w-[62ch] text-[1.125rem] leading-relaxed md:text-[1.25rem]" /> : null}
        {e.metric ? (
          <p>
            <span className="pf-metric">
              <span className="pf-metric-value">{e.metric.value}</span>
              <span className="pf-metric-label">{e.metric.label}</span>
            </span>
          </p>
        ) : null}
        <Tail e={{ ...e, links: s.kind === "contact" ? [] : e.links }} lang={lang} />
        {s.kind === "contact" ? <Links links={e.links} primaryFirst /> : null}
      </div>
      {e.image ? (
        <div className="col-span-4 md:col-span-4">
          <Img image={e.image} aspect="4 / 5" sizes="(min-width: 768px) 30vw, 100vw" className="sw-media" />
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
        <ul className="grid grid-cols-2 gap-x-8 border-t border-ink lg:grid-cols-4">
          {s.entries.map((e) => (
            <li key={e.id} className="pf-reveal grid content-start gap-1 border-b border-line py-6">
              {e.metric ? <span className="font-display text-[clamp(2.25rem,5vw,4rem)] font-bold leading-none tracking-[-0.03em] tabular-nums">{e.metric.value}</span> : null}
              <span className="font-medium">{e.metric?.label || e.title}</span>
              {e.metric?.label && e.title ? <span className="text-sm text-mute">{e.title}</span> : null}
              {e.subtitle ? <span className="text-sm text-mute">{e.subtitle}</span> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "tags":
      return (
        <dl className="border-t border-ink">
          {s.entries.map((e) => (
            <div key={e.id} className={`${GRID} gap-y-2 border-b border-line py-5`}>
              <dt className={`col-span-4 md:col-span-3 ${LABEL} pt-1`}>{e.title}</dt>
              <dd className="col-span-4 grid gap-3 md:col-span-9">
                {e.tags?.length ? (
                  <ul className="flex flex-wrap gap-x-2 text-[1.0625rem] leading-relaxed">
                    {e.tags.map((t, i) => (
                      <li key={t + i}>
                        {t}
                        {i < e.tags!.length - 1 ? <span aria-hidden="true" className="pl-2 text-sig">/</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {e.subtitle ? <p className="text-mute">{e.subtitle}</p> : null}
                <Body e={{ ...e, tags: [] }} lang={lang} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case "quotes":
      return (
        <div className="grid gap-10 border-t border-ink pt-8 md:grid-cols-2">
          {s.entries.map((e) => (
            <figure key={e.id} className="pf-reveal grid content-start gap-5">
              {e.body ? (
                <blockquote className="font-display text-[1.375rem] font-medium leading-snug tracking-[-0.01em] md:text-[1.625rem]">
                  <Prose html={e.body} />
                </blockquote>
              ) : null}
              <figcaption className="flex items-center gap-3 text-sm">
                {e.image ? <Img image={e.image} aspect="1 / 1" sizes="40px" className="w-10 shrink-0 rounded-full" /> : <span aria-hidden="true" className="h-px w-8 bg-sig" />}
                <span>
                  <span className="font-semibold">{e.title}</span>
                  {e.subtitle ? <span className="block text-mute">{e.subtitle}</span> : null}
                </span>
              </figcaption>
              <Tail e={e} lang={lang} />
            </figure>
          ))}
        </div>
      );
    case "grid":
      return (
        <ul className="grid gap-x-8 gap-y-12 border-t border-ink pt-8 sm:grid-cols-2">
          {s.entries.map((e, i) => (
            <li key={e.id} className="pf-reveal sw-card grid content-start gap-4">
              {e.image ? (
                <Img image={e.image} aspect="4 / 3" sizes="(min-width: 640px) 45vw, 100vw" className="sw-media" />
              ) : (
                <Cover seed={e.id + (e.title ?? "")} label={e.title} className="sw-media aspect-[4/3]" />
              )}
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-display text-xl font-semibold tracking-[-0.01em]">
                  <span className="mr-2 font-mono text-xs font-normal text-sig">{num(i)}</span>
                  {e.title}
                </h3>
                {e.date ? <span className={LABEL}>{e.date}</span> : null}
              </div>
              {e.subtitle ? <p className={LABEL}>{e.subtitle}</p> : null}
              {e.metric ? (
                <p className="flex items-baseline gap-2 border-y border-line py-2">
                  <span className="font-display text-2xl font-bold tabular-nums text-sig">{e.metric.value}</span>
                  <span className="text-sm text-mute">{e.metric.label}</span>
                </p>
              ) : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "list":
      return (
        <ul className="border-t border-ink">
          {s.entries.map((e) => (
            <li key={e.id} className={`sw-row ${GRID} gap-y-1 border-b border-line py-4`}>
              <div className="col-span-4 md:col-span-7">
                <h3 className="font-display text-[1.0625rem] font-semibold">{e.title}</h3>
                {e.body ? <Prose html={e.body} className="mt-1 max-w-[62ch] text-[0.9375rem] text-mute" /> : null}
                <Tail e={e} lang={lang} className="mt-2" />
              </div>
              <p className="col-span-3 text-mute md:col-span-3">{e.subtitle}</p>
              <p className={`col-span-1 text-right md:col-span-2 ${LABEL} pt-1`}>{e.date}</p>
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <ol className="border-t border-ink">
          {s.entries.map((e) => (
            <li key={e.id} className={`pf-reveal ${GRID} gap-y-2 border-b border-line py-7`}>
              <p className={`col-span-4 md:col-span-3 ${LABEL} pt-1.5`}>{e.date}</p>
              <div className="col-span-4 grid content-start gap-3 md:col-span-9">
                <h3 className="font-display text-xl font-semibold tracking-[-0.01em]">
                  {e.title}
                  {e.subtitle ? <span className="font-normal text-mute"> — {e.subtitle}</span> : null}
                </h3>
                {e.image ? <Img image={e.image} aspect="16 / 9" sizes="(min-width: 768px) 60vw, 100vw" className="sw-media max-w-xl" /> : null}
                <Body e={e} lang={lang} />
              </div>
            </li>
          ))}
        </ol>
      );
  }
}

export default function Swiss({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  return (
    <TemplateRoot portfolio={portfolio}>
      <header className="sticky top-0 z-40 border-b border-line bg-ground/90 backdrop-blur-sm">
        <div className={`${WRAP} flex h-14 items-center justify-between gap-6`}>
          <a href="#top" className="font-display text-[0.9375rem] font-bold tracking-[-0.01em]">
            {hero.name}
            <span aria-hidden="true" className="text-sig">.</span>
          </a>
          {v.nav.length ? (
            <nav aria-label="Sections" className="hidden min-w-0 md:block">
              <ul className="flex gap-6 overflow-x-auto text-[0.8125rem]">
                {v.nav.slice(0, 7).map((n, i) => (
                  <li key={n.href} className="shrink-0">
                    <a href={n.href} className="sw-nav py-2 text-mute hover:text-ink">
                      <span aria-hidden="true" className="mr-1 font-mono text-[0.6875rem] text-sig">{num(i)}</span>
                      {n.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <section id="top" className={`${WRAP} ${hero.present ? "pb-16 pt-16 md:pb-24 md:pt-28" : "pb-8 pt-12"}`}>
          <div className={`${GRID} gap-y-8`}>
            <div className="col-span-4 md:col-span-9">
              {hero.eyebrow ? (
                <p className={`${LABEL} mb-6 flex items-center gap-3`}>
                  <span aria-hidden="true" className="inline-block size-2 bg-sig" />
                  {hero.eyebrow}
                </p>
              ) : null}
              <h1 className={`font-display font-bold leading-[0.92] tracking-[-0.045em] ${hero.present ? "text-[clamp(3rem,10.5vw,10rem)]" : "text-[clamp(2.25rem,5vw,4rem)]"}`}>{hero.name}</h1>
            </div>
            {hero.image && hero.present ? (
              <div className="col-span-2 md:col-span-3 md:justify-self-end">
                <Img image={hero.image} aspect="1 / 1" sizes="(min-width: 768px) 20vw, 50vw" priority className="sw-media w-full md:w-48" />
              </div>
            ) : null}
            {hero.headline ? <p className="col-span-4 font-display text-[clamp(1.25rem,2.4vw,2rem)] font-medium leading-tight tracking-[-0.015em] md:col-span-6">{hero.headline}</p> : null}
            {hero.present ? (
              <div className="col-span-4 grid content-start gap-6 md:col-span-5 md:col-start-8">
                {hero.tagline ? <Prose html={hero.tagline} className="text-[1.0625rem] leading-relaxed text-mute" /> : null}
                <Links links={hero.links} primaryFirst />
                <Rest slots={hero.rest} lang={v.lang} />
              </div>
            ) : null}
          </div>
          {hero.location || v.socials.length ? (
            <div className={`${GRID} mt-14 gap-y-3 border-t border-ink pt-4 text-[0.8125rem]`}>
              {hero.location ? <p className={`col-span-4 md:col-span-3 ${LABEL}`}>{hero.location}</p> : null}
              <ul className="col-span-4 flex flex-wrap gap-x-6 gap-y-2 md:col-span-9 md:justify-end">
                {v.socials.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer me" className="pf-link">
                      {s.label}
                      <span aria-hidden="true"> ↗</span>
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        {v.sections.map((s, i) => (
          <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className={`${WRAP} py-14 md:py-20`}>
            <div className={`${GRID} gap-y-8`}>
              <header className="col-span-4 md:col-span-3">
                <div className="md:sticky md:top-24">
                  <p aria-hidden="true" className="font-mono text-[0.8125rem] text-sig">{num(i)}</p>
                  <h2 id={`${s.anchor}-title`} className="mt-1 font-display text-[1.75rem] font-bold leading-none tracking-[-0.03em] md:text-[2rem]">
                    {s.title}
                  </h2>
                  {s.subtitle ? <p className="mt-3 max-w-[28ch] text-sm text-mute">{s.subtitle}</p> : null}
                </div>
              </header>
              <div className="col-span-4 grid content-start gap-10 md:col-span-9">
                <Lead s={s} lang={v.lang} />
                <Items s={s} lang={v.lang} />
              </div>
            </div>
          </section>
        ))}
      </main>

      <footer className="mt-10 border-t border-ink">
        <div className={`${WRAP} flex flex-wrap items-center justify-between gap-4 py-8 text-[0.8125rem] text-mute`}>
          <p>
            © {hero.name}
          </p>
          {v.email ? (
            <a href={`mailto:${v.email}`} className="pf-link">
              {v.email}
            </a>
          ) : null}
          <a href="#top" className="sw-nav hover:text-ink">
            Back to top <span aria-hidden="true">↑</span>
          </a>
        </div>
      </footer>
    </TemplateRoot>
  );
}
