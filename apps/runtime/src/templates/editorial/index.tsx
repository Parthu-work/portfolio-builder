import { Cover, TemplateRoot } from "../../render/Root";
import { Links, Metric, Prose, Rest, Socials, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { TemplateProps } from "../types";

const WRAP = "mx-auto w-full max-w-[1400px] px-5 sm:px-10 lg:px-16";
const CAPS = "font-body text-[0.75rem] uppercase tracking-[0.18em] text-mute";
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];
const roman = (i: number) => ROMAN[i] ?? String(i + 1);

function Body({ e, lang, className = "" }: { e: Entry; lang: string; className?: string }) {
  return (
    <>
      {e.body ? <Prose html={e.body} className={`max-w-[60ch] text-[1.0625rem] leading-[1.7] ${className}`} /> : null}
      <Tail e={e} lang={lang} />
    </>
  );
}

function Lead({ s, lang }: { s: SectionView; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  if (s.kind === "contact") {
    return (
      <div className="grid gap-8">
        {e.body ? <Prose html={e.body} className="max-w-[22ch] font-display text-[clamp(2rem,5vw,4.25rem)] font-medium italic leading-[1.05] tracking-[-0.02em]" /> : null}
        <Rest slots={e.rest} lang={lang} />
        <Links links={e.links} primaryFirst />
      </div>
    );
  }
  return (
    <div className="grid gap-10 md:grid-cols-12">
      <div className={`grid content-start gap-6 ${e.image ? "md:col-span-7" : "md:col-span-10"}`}>
        {e.title ? <p className="font-display text-2xl italic">{e.title}</p> : null}
        {e.subtitle ? <p className={CAPS}>{e.subtitle}</p> : null}
        {e.body ? <Prose html={e.body} className="ed-dropcap max-w-[62ch] text-[1.1875rem] leading-[1.75]" /> : null}
        {e.metric ? <Metric metric={e.metric} className="text-2xl" /> : null}
        <Tail e={e} lang={lang} />
      </div>
      {e.image ? (
        <figure className="md:col-span-4 md:col-start-9 md:mt-16">
          <Img image={e.image} aspect="3 / 4" sizes="(min-width: 768px) 30vw, 100vw" className="ed-reveal" />
        </figure>
      ) : null}
    </div>
  );
}

function Items({ s, lang }: { s: SectionView; lang: string }) {
  if (!s.entries.length) return null;
  switch (s.layout) {
    case "metrics":
      return (
        <ul className="grid grid-cols-2 border-t border-ink lg:grid-cols-4">
          {s.entries.map((e) => (
            <li key={e.id} className="pf-reveal ed-cell grid content-start gap-2 border-b border-line py-8 pr-6">
              {e.metric ? <span className="font-display text-[clamp(2.25rem,4.6vw,4.25rem)] font-light leading-none tracking-[-0.04em]">{e.metric.value}</span> : null}
              <span className="font-display text-lg italic">{e.metric?.label || e.title}</span>
              {e.metric?.label && e.title ? <span className="text-sm text-mute">{e.title}</span> : null}
              {e.subtitle ? <span className="text-sm text-mute">{e.subtitle}</span> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "tags":
      return (
        <dl className="grid gap-x-12 gap-y-10 md:grid-cols-3">
          {s.entries.map((e) => (
            <div key={e.id} className="grid content-start gap-3 border-t border-ink pt-4">
              <dt className={CAPS}>{e.title}</dt>
              <dd className="grid gap-3">
                {e.tags?.length ? <p className="font-display text-[1.375rem] italic leading-snug">{e.tags.join(", ")}.</p> : null}
                {e.subtitle ? <p className="text-mute">{e.subtitle}</p> : null}
                <Body e={{ ...e, tags: [] }} lang={lang} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case "quotes":
      return (
        <div className="grid gap-16">
          {s.entries.map((e, i) => (
            <figure key={e.id} className={`pf-reveal grid gap-6 md:max-w-[75%] ${i % 2 ? "md:ml-auto" : ""}`}>
              {e.body ? (
                <blockquote className="ed-quote font-display text-[clamp(1.625rem,3.4vw,3rem)] font-light italic leading-[1.15] tracking-[-0.015em]">
                  <Prose html={e.body} />
                </blockquote>
              ) : null}
              <figcaption className="flex items-center gap-4">
                {e.image ? <Img image={e.image} aspect="1 / 1" sizes="48px" className="w-12 shrink-0 rounded-full" /> : <span aria-hidden="true" className="h-px w-12 bg-sig" />}
                <span className={CAPS}>
                  <span className="text-ink">{e.title}</span>
                  {e.subtitle ? <span className="block normal-case tracking-normal">{e.subtitle}</span> : null}
                </span>
              </figcaption>
              <Tail e={e} lang={lang} />
            </figure>
          ))}
        </div>
      );
    case "grid":
      return (
        <ul className="grid gap-y-20 md:gap-y-28">
          {s.entries.map((e, i) => (
            <li key={e.id} className="grid items-end gap-x-12 gap-y-6 md:grid-cols-12">
              <div className={`${i % 2 ? "md:order-2 md:col-span-6 md:col-start-7" : "md:col-span-7"}`}>
                {e.image ? (
                  <Img image={e.image} aspect={i % 2 ? "4 / 5" : "16 / 11"} sizes="(min-width: 768px) 55vw, 100vw" className="ed-reveal" />
                ) : (
                  <Cover seed={e.id + (e.title ?? "")} label={e.title} className="ed-reveal" style={{ aspectRatio: i % 2 ? "4 / 5" : "16 / 11" }} />
                )}
              </div>
              <div className={`grid content-end gap-4 ${i % 2 ? "md:order-1 md:col-span-5" : "md:col-span-5"}`}>
                <p className={CAPS}>
                  <span className="text-sig">№ {String(i + 1).padStart(2, "0")}</span>
                  {e.subtitle ? ` — ${e.subtitle}` : ""}
                  {e.date ? ` — ${e.date}` : ""}
                </p>
                <h3 className="font-display text-[clamp(1.875rem,3.6vw,3.25rem)] font-medium leading-[1.02] tracking-[-0.025em]">{e.title}</h3>
                {e.metric ? (
                  <p className="flex items-baseline gap-3 border-y border-line py-3">
                    <span className="font-display text-4xl font-light text-sig">{e.metric.value}</span>
                    <span className="font-display italic text-mute">{e.metric.label}</span>
                  </p>
                ) : null}
                <Body e={e} lang={lang} className="text-mute" />
              </div>
            </li>
          ))}
        </ul>
      );
    case "list":
      return (
        <ul className="border-t border-ink">
          {s.entries.map((e) => (
            <li key={e.id} className="ed-row grid gap-x-8 gap-y-1 border-b border-line py-5 md:grid-cols-[1fr_auto]">
              <div className="grid gap-2">
                <h3 className="font-display text-[1.5rem] font-medium leading-tight tracking-[-0.01em]">
                  {e.title}
                  {e.subtitle ? <span className="font-light italic text-mute">, {e.subtitle}</span> : null}
                </h3>
                <Body e={e} lang={lang} className="text-mute" />
              </div>
              {e.date ? <p className={`${CAPS} md:pt-2 md:text-right`}>{e.date}</p> : null}
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <ol className="grid">
          {s.entries.map((e) => (
            <li key={e.id} className="pf-reveal grid gap-x-10 gap-y-3 border-t border-line py-9 first:border-ink md:grid-cols-12">
              <p className={`${CAPS} md:col-span-3 md:pt-2`}>{e.date}</p>
              <div className="grid content-start gap-4 md:col-span-9">
                <h3 className="font-display text-[1.75rem] font-medium leading-tight tracking-[-0.015em]">
                  {e.title}
                  {e.subtitle ? <span className="block text-[1.125rem] font-normal italic text-sig">{e.subtitle}</span> : null}
                </h3>
                {e.image ? <Img image={e.image} aspect="16 / 9" sizes="(min-width: 768px) 60vw, 100vw" className="ed-reveal max-w-2xl" /> : null}
                <Body e={e} lang={lang} />
              </div>
            </li>
          ))}
        </ol>
      );
  }
}

export default function Editorial({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  return (
    <TemplateRoot portfolio={portfolio}>
      <header className={`${WRAP} flex items-center justify-between gap-6 border-b border-ink py-4`}>
        <a href="#top" className={`${CAPS} text-ink`}>
          {hero.name}
        </a>
        {v.nav.length ? (
          <nav aria-label="Sections" className="hidden md:block">
            <ul className={`${CAPS} flex gap-7`}>
              {v.nav.slice(0, 6).map((n) => (
                <li key={n.href}>
                  <a href={n.href} className="ed-nav">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
        <p className={`${CAPS} max-md:hidden`}>{hero.location ?? "Portfolio"}</p>
      </header>

      <main id="main" tabIndex={-1}>
        <section id="top" className={`${WRAP} ${hero.present ? "pb-20 pt-12 md:pb-32 md:pt-20" : "py-12"}`}>
          {hero.eyebrow ? <p className={`${CAPS} mb-8 text-sig`}>{hero.eyebrow}</p> : null}
          <h1 className={`font-display font-light leading-[0.86] tracking-[-0.05em] ${hero.present ? "text-[clamp(3.5rem,14.5vw,15rem)]" : "text-[clamp(2.5rem,6vw,5rem)]"}`}>{hero.name}</h1>
          <div className="mt-10 grid gap-x-12 gap-y-8 md:mt-16 md:grid-cols-12">
            {hero.headline ? <p className="font-display text-[clamp(1.5rem,3vw,2.5rem)] font-normal italic leading-[1.15] md:col-span-6">{hero.headline}</p> : null}
            {hero.present ? (
              <div className="grid content-start gap-6 md:col-span-4 md:col-start-9">
                {hero.image ? <Img image={hero.image} aspect="4 / 5" sizes="(min-width: 768px) 28vw, 60vw" priority className="max-md:max-w-60" /> : null}
                {hero.tagline ? <Prose html={hero.tagline} className="text-[1.0625rem] leading-[1.7] text-mute" /> : null}
                <Links links={hero.links} primaryFirst />
                <Rest slots={hero.rest} lang={v.lang} />
              </div>
            ) : null}
          </div>
        </section>

        {v.sections.map((s, i) => (
          <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className={`${WRAP} border-t border-ink py-16 md:py-28`}>
            <header className="mb-12 grid items-end gap-x-12 gap-y-4 md:mb-20 md:grid-cols-12">
              <p aria-hidden="true" className={`${CAPS} md:col-span-2`}>
                <span className="text-sig">{roman(i)}</span>
              </p>
              <h2 id={`${s.anchor}-title`} className="font-display text-[clamp(2.5rem,7vw,6.5rem)] font-light italic leading-[0.95] tracking-[-0.035em] md:col-span-7">
                {s.title}
              </h2>
              {s.subtitle ? <p className="text-mute md:col-span-3">{s.subtitle}</p> : null}
            </header>
            <div className="grid gap-16 md:pl-[16.666%]">
              <Lead s={s} lang={v.lang} />
              <Items s={s} lang={v.lang} />
            </div>
          </section>
        ))}
      </main>

      <footer className="border-t border-ink">
        <div className={`${WRAP} grid gap-6 py-10 md:grid-cols-[1fr_auto] md:items-end`}>
          <p className="font-display text-[clamp(2rem,6vw,5rem)] font-light italic leading-none tracking-[-0.03em]">{hero.name}</p>
          <div className={`${CAPS} grid gap-3 md:justify-items-end`}>
            <Socials socials={v.socials} className="flex flex-wrap gap-x-6 gap-y-2" linkClassName="ed-nav text-ink" />
            {v.email ? (
              <a href={`mailto:${v.email}`} className="pf-link normal-case tracking-normal">
                {v.email}
              </a>
            ) : null}
            <a href="#top" className="ed-nav">
              Back to top <span aria-hidden="true">↑</span>
            </a>
          </div>
        </div>
      </footer>
    </TemplateRoot>
  );
}
