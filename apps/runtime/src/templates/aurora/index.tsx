import { Cover, TemplateRoot } from "../../render/Root";
import { Links, Metric, Prose, Rest, Socials, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { TemplateProps } from "../types";
import { AuroraField } from "./islands";

const WRAP = "mx-auto w-full max-w-[1120px] px-4 sm:px-6";
const KICKER = "text-[0.75rem] font-medium uppercase tracking-[0.14em] text-mute";
const GLASS = "au-glass grid content-start gap-4 p-6 md:p-7";

function Body({ e, lang }: { e: Entry; lang: string }) {
  return (
    <>
      {e.body ? <Prose html={e.body} className="text-[0.9688rem] leading-relaxed text-mute" /> : null}
      <Tail e={e} lang={lang} />
    </>
  );
}

function Lead({ s, lang }: { s: SectionView; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  const contact = s.kind === "contact";
  return (
    <div className={`${GLASS} ${contact ? "au-glow justify-items-center py-12 text-center md:py-16" : e.image ? "md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] md:items-start" : ""}`}>
      <div className={`grid content-start gap-5 ${contact ? "justify-items-center" : ""}`}>
        {e.title ? <p className="font-display text-xl font-semibold">{e.title}</p> : null}
        {e.subtitle ? <p className="text-mute">{e.subtitle}</p> : null}
        {e.body ? <Prose html={e.body} className={contact ? "max-w-[26ch] font-display text-[clamp(1.625rem,3.6vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.025em]" : "max-w-[64ch] text-[1.0938rem] leading-[1.75]"} /> : null}
        {e.metric ? <Metric metric={e.metric} className="text-2xl" /> : null}
        <Tail e={{ ...e, links: contact ? [] : e.links }} lang={lang} className={contact ? "justify-items-center" : ""} />
        {contact ? <Links links={e.links} primaryFirst className="justify-center" /> : null}
      </div>
      {e.image && !contact ? <Img image={e.image} aspect="4 / 5" sizes="(min-width: 768px) 256px, 100vw" className="au-media" /> : null}
    </div>
  );
}

function Items({ s, lang }: { s: SectionView; lang: string }) {
  if (!s.entries.length) return null;
  switch (s.layout) {
    case "metrics":
      return (
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {s.entries.map((e) => (
            <li key={e.id} className={`${GLASS} pf-reveal gap-2 text-center`}>
              {e.metric ? <span className="au-number font-display text-[clamp(2rem,4.6vw,3.25rem)] font-semibold leading-none tracking-[-0.04em]">{e.metric.value}</span> : null}
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
        <ul className="grid gap-4 md:grid-cols-3">
          {s.entries.map((e) => (
            <li key={e.id} className={GLASS}>
              <h3 className={KICKER}>{e.title}</h3>
              {e.subtitle ? <p className="text-sm text-mute">{e.subtitle}</p> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "quotes":
      return (
        <div className="grid gap-4 md:grid-cols-2">
          {s.entries.map((e) => (
            <figure key={e.id} className={`${GLASS} pf-reveal`}>
              {e.body ? (
                <blockquote className="font-display text-[1.25rem] font-medium leading-snug tracking-[-0.01em]">
                  <Prose html={e.body} />
                </blockquote>
              ) : null}
              <figcaption className="mt-auto flex items-center gap-3 pt-2 text-sm">
                {e.image ? <Img image={e.image} aspect="1 / 1" sizes="40px" className="w-10 shrink-0 rounded-full" /> : <span aria-hidden="true" className="au-dot" />}
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
        <ul className="grid gap-5 md:grid-cols-2">
          {s.entries.map((e) => (
            <li key={e.id} className="au-glass au-lift pf-reveal grid content-start overflow-hidden">
              <div className="p-2 pb-0">
                {e.image ? <Img image={e.image} aspect="16 / 10" sizes="(min-width: 768px) 520px, 100vw" className="au-media" /> : <Cover seed={e.id + (e.title ?? "")} label={e.title} className="au-media aspect-[16/10]" />}
              </div>
              <div className="grid gap-3 p-6 pt-5">
                {e.subtitle || e.date ? <p className={KICKER}>{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
                <h3 className="font-display text-[1.5rem] font-semibold leading-tight tracking-[-0.02em]">{e.title}</h3>
                {e.metric ? (
                  <p className="au-chip w-fit">
                    <strong className="text-sig">{e.metric.value}</strong> {e.metric.label}
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
        <ul className="au-glass divide-y divide-line">
          {s.entries.map((e) => (
            <li key={e.id} className="grid gap-x-6 gap-y-1 px-6 py-5 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="grid gap-2">
                <h3 className="font-display text-[1.125rem] font-semibold">
                  {e.title}
                  {e.subtitle ? <span className="font-normal text-mute"> · {e.subtitle}</span> : null}
                </h3>
                <Body e={e} lang={lang} />
              </div>
              {e.date ? <p className={`${KICKER} md:pt-1.5`}>{e.date}</p> : null}
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <ol className="grid gap-4">
          {s.entries.map((e) => (
            <li key={e.id} className={`${GLASS} pf-reveal md:grid-cols-[11rem_minmax(0,1fr)] md:gap-8`}>
              <p className={`${KICKER} md:pt-1.5`}>{e.date}</p>
              <div className="grid content-start gap-3">
                <h3 className="font-display text-[1.375rem] font-semibold leading-tight tracking-[-0.015em]">{e.title}</h3>
                {e.subtitle ? <p className="-mt-2 font-medium text-sig">{e.subtitle}</p> : null}
                {e.image ? <Img image={e.image} aspect="16 / 9" sizes="(min-width: 768px) 560px, 100vw" className="au-media max-w-xl" /> : null}
                <Body e={e} lang={lang} />
              </div>
            </li>
          ))}
        </ol>
      );
  }
}

export default function Aurora({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  return (
    <TemplateRoot portfolio={portfolio} className="au">
      <AuroraField motion={portfolio.theme.motion} />
      <header className="sticky top-3 z-40 px-4">
        <div className="au-glass au-nav mx-auto flex w-fit max-w-full items-center gap-1 p-1.5 text-[0.8125rem] font-medium">
          <a href="#top" className="au-navlink font-display font-semibold text-ink">
            {hero.name.split(/\s+/)[0]}
          </a>
          {v.nav.length ? (
            <nav aria-label="Sections" className="hidden min-w-0 md:block">
              <ul className="flex">
                {v.nav.slice(0, 6).map((n) => (
                  <li key={n.href}>
                    <a href={n.href} className="au-navlink">
                      {n.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </header>

      <main id="main" tabIndex={-1} className="relative">
        <section id="top" className={`${WRAP} grid justify-items-center gap-7 text-center ${hero.present ? "pb-20 pt-20 md:pb-28 md:pt-28" : "py-14"}`}>
          {hero.present && hero.image ? <Img image={hero.image} aspect="1 / 1" sizes="112px" priority className="au-avatar w-28" /> : null}
          {hero.eyebrow ? (
            <p className="au-chip">
              <span aria-hidden="true" className="au-dot" />
              {hero.eyebrow}
            </p>
          ) : null}
          <h1 className={`au-title font-display font-semibold leading-[0.95] tracking-[-0.045em] ${hero.present ? "text-[clamp(3rem,10vw,8rem)]" : "text-[clamp(2.25rem,5vw,3.75rem)]"}`}>{hero.name}</h1>
          {hero.headline ? <p className="max-w-[30ch] font-display text-[clamp(1.25rem,2.6vw,1.875rem)] font-medium leading-snug">{hero.headline}</p> : null}
          {hero.present && hero.tagline ? <Prose html={hero.tagline} className="max-w-[54ch] text-[1.0938rem] leading-[1.7] text-mute" /> : null}
          {hero.present ? <Links links={hero.links} primaryFirst className="justify-center" /> : null}
          {hero.present ? <Rest slots={hero.rest} lang={v.lang} /> : null}
          {hero.location || v.socials.length ? (
            <div className="au-glass au-nav flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-5 py-2.5 text-sm">
              {hero.location ? <p className="text-mute">{hero.location}</p> : null}
              <Socials socials={v.socials} className="flex flex-wrap justify-center gap-x-5 gap-y-2" />
            </div>
          ) : null}
        </section>

        {v.sections.map((s) => (
          <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className={`${WRAP} py-12 md:py-16`}>
            <header className="mb-8 grid justify-items-center gap-3 text-center">
              <h2 id={`${s.anchor}-title`} className="font-display text-[clamp(1.875rem,4.4vw,3.25rem)] font-semibold tracking-[-0.035em]">
                {s.title}
              </h2>
              {s.subtitle ? <p className="max-w-[52ch] text-mute">{s.subtitle}</p> : null}
            </header>
            <div className="grid gap-5">
              <Lead s={s} lang={v.lang} />
              <Items s={s} lang={v.lang} />
            </div>
          </section>
        ))}
      </main>

      <footer className={`${WRAP} relative flex flex-wrap items-center justify-between gap-3 py-10 text-sm text-mute`}>
        <p>© {hero.name}</p>
        <a href="#top" className="pf-link">
          Back to top <span aria-hidden="true">↑</span>
        </a>
      </footer>
    </TemplateRoot>
  );
}
