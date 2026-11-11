import { Cover, TemplateRoot } from "../../render/Root";
import { Links, Metric, Prose, Rest, Socials, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { TemplateProps } from "../types";

const WRAP = "mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-8";
const LABEL = "font-body text-[0.8125rem] font-bold uppercase tracking-[0.06em]";
const BOX = "br-box grid content-start gap-4 p-5 md:p-6";

function Body({ e, lang }: { e: Entry; lang: string }) {
  return (
    <>
      {e.body ? <Prose html={e.body} className="text-[1rem] leading-relaxed" /> : null}
      <Tail e={e} lang={lang} />
    </>
  );
}

function Lead({ s, lang }: { s: SectionView; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  const contact = s.kind === "contact";
  return (
    <div className={`grid gap-6 ${e.image && !contact ? "md:grid-cols-[1fr_minmax(0,20rem)]" : ""}`}>
      <div className={`${BOX} ${contact ? "br-invert md:p-10" : ""} gap-5`}>
        {e.title ? <p className="font-display text-2xl font-black uppercase">{e.title}</p> : null}
        {e.subtitle ? <p className="font-bold">{e.subtitle}</p> : null}
        {e.body ? <Prose html={e.body} className={contact ? "max-w-[24ch] font-display text-[clamp(1.875rem,4.6vw,3.75rem)] font-black uppercase leading-[0.98] tracking-[-0.02em]" : "max-w-[64ch] text-[1.125rem] leading-relaxed"} /> : null}
        {e.metric ? <Metric metric={e.metric} className="text-3xl" /> : null}
        <Tail e={{ ...e, links: contact ? [] : e.links }} lang={lang} />
        {contact ? <Links links={e.links} primaryFirst /> : null}
      </div>
      {e.image && !contact ? <Img image={e.image} aspect="4 / 5" sizes="(min-width: 768px) 320px, 100vw" className="br-media br-tilt" /> : null}
    </div>
  );
}

function Items({ s, lang }: { s: SectionView; lang: string }) {
  if (!s.entries.length) return null;
  switch (s.layout) {
    case "metrics":
      return (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {s.entries.map((e, i) => (
            <li key={e.id} className={`${BOX} br-pop gap-2 ${i % 3 === 0 ? "br-fill" : i % 3 === 1 ? "" : "br-invert"}`}>
              {e.metric ? <span className="font-display text-[clamp(2.75rem,6vw,4.5rem)] font-black leading-[0.9] tracking-[-0.04em]">{e.metric.value}</span> : null}
              <span className={LABEL}>{e.metric?.label || e.title}</span>
              {e.metric?.label && e.title ? <span className="text-sm">{e.title}</span> : null}
              {e.subtitle ? <span className="text-sm">{e.subtitle}</span> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "tags":
      return (
        <ul className="grid gap-5 md:grid-cols-3">
          {s.entries.map((e) => (
            <li key={e.id} className={BOX}>
              <h3 className="br-sticker w-fit">{e.title}</h3>
              {e.subtitle ? <p className="text-sm">{e.subtitle}</p> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "quotes":
      return (
        <div className="grid gap-6 md:grid-cols-2">
          {s.entries.map((e, i) => (
            <figure key={e.id} className={`${BOX} br-pop ${i % 2 ? "md:mt-10" : ""}`}>
              <span aria-hidden="true" className="font-display text-7xl font-black leading-[0.5] text-sig">“</span>
              {e.body ? (
                <blockquote className="font-display text-[1.375rem] font-bold leading-snug">
                  <Prose html={e.body} />
                </blockquote>
              ) : null}
              <figcaption className="flex items-center gap-3 border-t-[3px] border-line pt-4 text-sm">
                {e.image ? <Img image={e.image} aspect="1 / 1" sizes="44px" className="br-media w-11 shrink-0" /> : null}
                <span>
                  <span className="font-black uppercase">{e.title}</span>
                  {e.subtitle ? <span className="block">{e.subtitle}</span> : null}
                </span>
              </figcaption>
              <Tail e={e} lang={lang} />
            </figure>
          ))}
        </div>
      );
    case "grid":
      return (
        <ul className="grid gap-7 md:grid-cols-2">
          {s.entries.map((e, i) => (
            <li key={e.id} className="br-box br-pop grid content-start overflow-hidden">
              <div className="border-b-[3px] border-line">
                {e.image ? <Img image={e.image} aspect="16 / 10" sizes="(min-width: 768px) 620px, 100vw" /> : <Cover seed={e.id + (e.title ?? "")} label={e.title} className="aspect-[16/10]" />}
              </div>
              <div className="grid gap-4 p-5 md:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="br-sticker">#{String(i + 1).padStart(2, "0")}</span>
                  {e.subtitle ? <span className={LABEL}>{e.subtitle}</span> : null}
                  {e.date ? <span className={LABEL}>· {e.date}</span> : null}
                </div>
                <h3 className="font-display text-[clamp(1.75rem,3.4vw,2.5rem)] font-black uppercase leading-[0.95] tracking-[-0.02em]">{e.title}</h3>
                {e.metric ? (
                  <p className="br-fill w-fit border-[3px] border-line px-3 py-1.5 font-bold">
                    <span className="font-display text-xl font-black">{e.metric.value}</span> {e.metric.label}
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
        <ul className="br-box divide-y-[3px] divide-line">
          {s.entries.map((e) => (
            <li key={e.id} className="br-row grid gap-x-6 gap-y-1 px-5 py-4 md:grid-cols-[1fr_auto] md:px-6">
              <div className="grid gap-2">
                <h3 className="font-display text-[1.25rem] font-black uppercase leading-tight">{e.title}</h3>
                {e.subtitle ? <p className="-mt-1 font-bold">{e.subtitle}</p> : null}
                <Body e={e} lang={lang} />
              </div>
              {e.date ? <p className={`${LABEL} md:pt-1`}>{e.date}</p> : null}
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <ol className="grid gap-6">
          {s.entries.map((e) => (
            <li key={e.id} className={`${BOX} br-pop md:grid-cols-[12rem_1fr] md:gap-8`}>
              <p className="br-sticker h-fit w-fit">{e.date || "—"}</p>
              <div className="grid content-start gap-3">
                <h3 className="font-display text-[1.75rem] font-black uppercase leading-[0.98] tracking-[-0.01em]">{e.title}</h3>
                {e.subtitle ? <p className="-mt-1 text-lg font-bold text-sig">{e.subtitle}</p> : null}
                {e.image ? <Img image={e.image} aspect="16 / 9" sizes="(min-width: 768px) 600px, 100vw" className="br-media max-w-xl" /> : null}
                <Body e={e} lang={lang} />
              </div>
            </li>
          ))}
        </ol>
      );
  }
}

export default function Brutal({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  const ticker = [hero.headline, ...v.sections.map((s) => s.title), hero.location].filter((t): t is string => Boolean(t));
  return (
    <TemplateRoot portfolio={portfolio}>
      <header className="sticky top-0 z-40 border-b-[3px] border-line bg-ground">
        <div className={`${WRAP} flex h-14 items-center justify-between gap-4`}>
          <a href="#top" className="br-sticker">
            {hero.name}
          </a>
          {v.nav.length ? (
            <nav aria-label="Sections" className="hidden md:block">
              <ul className={`${LABEL} flex gap-5`}>
                {v.nav.slice(0, 6).map((n) => (
                  <li key={n.href}>
                    <a href={n.href} className="br-nav">
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
        <section id="top" className={`${WRAP} ${hero.present ? "py-12 md:py-20" : "py-10"}`}>
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_auto]">
            <div className="grid gap-6">
              {hero.eyebrow ? <p className="br-sticker br-tilt w-fit">{hero.eyebrow}</p> : null}
              <h1 className={`font-display font-black uppercase leading-[0.82] tracking-[-0.045em] ${hero.present ? "text-[clamp(3.5rem,15vw,14rem)]" : "text-[clamp(2.5rem,7vw,5rem)]"}`}>{hero.name}</h1>
            </div>
            {hero.present && hero.image ? <Img image={hero.image} aspect="1 / 1" sizes="(min-width: 1024px) 240px, 50vw" priority className="br-media br-tilt w-40 lg:w-60" /> : null}
          </div>
          {hero.present ? (
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <div className={`${BOX} br-fill`}>
                {hero.headline ? <p className="font-display text-[clamp(1.375rem,2.8vw,2rem)] font-black uppercase leading-[1.05]">{hero.headline}</p> : null}
                <Links links={hero.links} primaryFirst />
              </div>
              {hero.tagline || hero.rest.length ? (
                <div className={BOX}>
                  {hero.tagline ? <Prose html={hero.tagline} className="text-[1.125rem] leading-relaxed" /> : null}
                  <Rest slots={hero.rest} lang={v.lang} />
                </div>
              ) : null}
            </div>
          ) : hero.headline ? (
            <p className="mt-4 text-xl font-bold">{hero.headline}</p>
          ) : null}
        </section>

        {ticker.length ? (
          <div className="br-ticker" aria-hidden="true">
            <div className="br-ticker-track">
              {[0, 1].map((k) => (
                <ul key={k}>
                  {ticker.map((t, i) => (
                    <li key={`${t}-${i}`}>
                      {t} <span>✦</span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        ) : null}

        {v.sections.map((s, i) => (
          <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className={`${WRAP} py-14 md:py-20`}>
            <header className="mb-8 flex flex-wrap items-end gap-x-6 gap-y-3 md:mb-10">
              <span aria-hidden="true" className="br-num">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h2 id={`${s.anchor}-title`} className="font-display text-[clamp(2.5rem,8vw,6rem)] font-black uppercase leading-[0.85] tracking-[-0.04em]">
                {s.title}
              </h2>
              {s.subtitle ? <p className="max-w-[40ch] basis-full font-bold md:basis-auto">{s.subtitle}</p> : null}
            </header>
            <div className="grid gap-7">
              <Lead s={s} lang={v.lang} />
              <Items s={s} lang={v.lang} />
            </div>
          </section>
        ))}
      </main>

      <footer className="border-t-[3px] border-line bg-surface">
        <div className={`${WRAP} flex flex-wrap items-center justify-between gap-4 py-8`}>
          <p className="font-display text-2xl font-black uppercase">© {hero.name}</p>
          <Socials socials={v.socials} className={`${LABEL} flex flex-wrap gap-x-5 gap-y-2`} linkClassName="br-nav" />
          <a href="#top" className="pf-btn">
            Top <span aria-hidden="true">↑</span>
          </a>
        </div>
      </footer>
    </TemplateRoot>
  );
}
