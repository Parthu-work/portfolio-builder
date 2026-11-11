import { Cover, TemplateRoot } from "../../render/Root";
import { Links, Metric, Prose, Rest, Socials, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { TemplateProps } from "../types";
import { Rail, Reel } from "./islands";

const WRAP = "mx-auto w-full max-w-[1500px] px-5 sm:px-10 lg:pl-16 lg:pr-28";
const CAPS = "font-body text-[0.75rem] uppercase tracking-[0.24em] text-mute";

function Body({ e, lang }: { e: Entry; lang: string }) {
  return (
    <>
      {e.body ? <Prose html={e.body} className="max-w-[60ch] text-[1.0625rem] leading-[1.75] text-mute" /> : null}
      <Tail e={e} lang={lang} />
    </>
  );
}

function Lead({ s, lang }: { s: SectionView; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  const contact = s.kind === "contact";
  return (
    <div className={`grid gap-10 ${e.image ? "xl:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]" : ""}`}>
      <div className="grid content-start gap-7">
        {e.title ? <p className="font-display text-2xl">{e.title}</p> : null}
        {e.subtitle ? <p className={CAPS}>{e.subtitle}</p> : null}
        {e.body ? <Prose html={e.body} className={contact ? "max-w-[20ch] font-display text-[clamp(2.25rem,5.4vw,5rem)] leading-[1.02] tracking-[-0.03em]" : "cn-lede max-w-[58ch] text-[1.1875rem] leading-[1.8]"} /> : null}
        {e.metric ? <Metric metric={e.metric} className="text-3xl" /> : null}
        <Tail e={{ ...e, links: contact ? [] : e.links }} lang={lang} />
        {contact ? <Links links={e.links} primaryFirst /> : null}
      </div>
      {e.image ? <Img image={e.image} aspect="3 / 4" sizes="(min-width: 1280px) 320px, 100vw" className="cn-media max-xl:max-w-sm" /> : null}
    </div>
  );
}

function Items({ s, lang, motion }: { s: SectionView; lang: string; motion: string }) {
  if (!s.entries.length) return null;
  switch (s.layout) {
    case "grid":
      return (
        <Reel label={s.title} motionLevel={motion}>
          {s.entries.map((e, i) => (
            <li key={e.id} className="cn-card">
              {e.image ? <Img image={e.image} aspect="16 / 10" sizes="(min-width: 1024px) 46vw, 86vw" className="cn-media" /> : <Cover seed={e.id + (e.title ?? "")} label={e.title} className="cn-media aspect-[16/10]" />}
              <div className="grid gap-4 pt-6">
                <p className={CAPS}>
                  <span className="text-sig">{String(i + 1).padStart(2, "0")}</span> / {String(s.entries.length).padStart(2, "0")}
                  {e.subtitle ? ` — ${e.subtitle}` : ""}
                  {e.date ? ` — ${e.date}` : ""}
                </p>
                <h3 className="font-display text-[clamp(1.875rem,3.4vw,3rem)] leading-[1.02] tracking-[-0.025em]">{e.title}</h3>
                {e.metric ? (
                  <p className="flex items-baseline gap-3">
                    <span className="font-display text-4xl text-sig">{e.metric.value}</span>
                    <span className="text-mute">{e.metric.label}</span>
                  </p>
                ) : null}
                <Body e={e} lang={lang} />
              </div>
            </li>
          ))}
        </Reel>
      );
    case "metrics":
      return (
        <ul className="grid gap-x-10 gap-y-12 sm:grid-cols-2">
          {s.entries.map((e) => (
            <li key={e.id} className="pf-reveal grid content-start gap-2 border-t border-line pt-6">
              {e.metric ? <span className="font-display text-[clamp(3.25rem,7.5vw,6.5rem)] leading-[0.9] tracking-[-0.04em] text-sig">{e.metric.value}</span> : null}
              <span className="text-lg">{e.metric?.label || e.title}</span>
              {e.metric?.label && e.title ? <span className="text-sm text-mute">{e.title}</span> : null}
              {e.subtitle ? <span className="text-sm text-mute">{e.subtitle}</span> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "tags":
      return (
        <dl className="grid gap-10">
          {s.entries.map((e) => (
            <div key={e.id} className="pf-reveal grid gap-3 border-t border-line pt-6 md:grid-cols-[12rem_minmax(0,1fr)] md:gap-8">
              <dt className={CAPS}>{e.title}</dt>
              <dd className="grid gap-3">
                {e.tags?.length ? <p className="font-display text-[clamp(1.5rem,2.8vw,2.25rem)] leading-[1.25]">{e.tags.join(" · ")}</p> : null}
                {e.subtitle ? <p className="text-mute">{e.subtitle}</p> : null}
                <Body e={{ ...e, tags: [] }} lang={lang} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case "quotes":
      return (
        <div className="grid gap-20">
          {s.entries.map((e) => (
            <figure key={e.id} className="pf-reveal grid gap-7">
              {e.body ? (
                <blockquote className="font-display text-[clamp(1.75rem,3.8vw,3.5rem)] leading-[1.12] tracking-[-0.02em]">
                  <Prose html={e.body} />
                </blockquote>
              ) : null}
              <figcaption className="flex items-center gap-4">
                {e.image ? <Img image={e.image} aspect="1 / 1" sizes="48px" className="w-12 shrink-0 rounded-full" /> : <span aria-hidden="true" className="h-px w-14 bg-sig" />}
                <span className={CAPS}>
                  <span className="text-ink">{e.title}</span>
                  {e.subtitle ? <span className="block pt-1 normal-case tracking-normal">{e.subtitle}</span> : null}
                </span>
              </figcaption>
              <Tail e={e} lang={lang} />
            </figure>
          ))}
        </div>
      );
    case "list":
      return (
        <ul>
          {s.entries.map((e) => (
            <li key={e.id} className="cn-row grid gap-x-8 gap-y-2 border-t border-line py-6 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="grid gap-2">
                <h3 className="font-display text-[1.625rem] leading-tight tracking-[-0.015em]">{e.title}</h3>
                {e.subtitle ? <p className="text-sig">{e.subtitle}</p> : null}
                <Body e={e} lang={lang} />
              </div>
              {e.date ? <p className={`${CAPS} md:pt-3`}>{e.date}</p> : null}
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <ol className="cn-timeline grid gap-14">
          {s.entries.map((e) => (
            <li key={e.id} className="pf-reveal grid gap-4">
              <p className={CAPS}>{e.date}</p>
              <h3 className="font-display text-[clamp(1.75rem,3vw,2.5rem)] leading-[1.05] tracking-[-0.02em]">
                {e.title}
                {e.subtitle ? <span className="block pt-1 text-[0.6em] text-sig">{e.subtitle}</span> : null}
              </h3>
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="(min-width: 768px) 640px, 100vw" className="cn-media max-w-2xl" /> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ol>
      );
  }
}

export default function Cinematic({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  const motion = portfolio.theme.motion;
  const chapters = [{ id: "top", label: "Opening" }, ...v.sections.map((s) => ({ id: s.anchor, label: s.title }))];
  return (
    <TemplateRoot portfolio={portfolio}>
      {chapters.length > 1 ? <Rail chapters={chapters} /> : null}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30">
        <div className="flex items-center justify-between gap-6 px-5 py-5 sm:px-10 lg:px-16">
          <a href="#top" className={`${CAPS} cn-brand pointer-events-auto text-ink`}>
            {hero.name}
          </a>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <section id="top" className={`cn-opening ${WRAP} grid content-center gap-8 ${hero.present ? "min-h-dvh py-28" : "pb-16 pt-32"}`}>
          {hero.eyebrow ? <p className={`${CAPS} text-sig`}>{hero.eyebrow}</p> : null}
          <h1 className={`font-display leading-[0.86] tracking-[-0.045em] ${hero.present ? "text-[clamp(3.5rem,13.5vw,14rem)]" : "text-[clamp(2.5rem,6vw,5rem)]"}`}>{hero.name}</h1>
          <div className="grid gap-8 md:grid-cols-12">
            {hero.headline ? <p className="font-display text-[clamp(1.375rem,2.8vw,2.25rem)] leading-[1.2] md:col-span-6">{hero.headline}</p> : null}
            {hero.present ? (
              <div className="grid content-start gap-6 md:col-span-5 md:col-start-8">
                {hero.tagline ? <Prose html={hero.tagline} className="text-[1.0625rem] leading-[1.75] text-mute" /> : null}
                <Links links={hero.links} primaryFirst />
                <Rest slots={hero.rest} lang={v.lang} />
              </div>
            ) : null}
          </div>
          {hero.present ? (
            <p className={`${CAPS} cn-cue`} aria-hidden="true">
              Scroll
            </p>
          ) : null}
        </section>

        {v.sections.map((s, i) => (
          <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className="cn-chapter">
            <div className={`${WRAP} grid gap-x-16 gap-y-10 lg:grid-cols-12`}>
              <header className="lg:col-span-4">
                <div className="cn-pin grid gap-5">
                  <p aria-hidden="true" className={CAPS}>
                    Chapter <span className="text-sig">{String(i + 1).padStart(2, "0")}</span>
                  </p>
                  <h2 id={`${s.anchor}-title`} className="font-display text-[clamp(2.75rem,5.6vw,5.5rem)] leading-[0.95] tracking-[-0.035em]">
                    {s.title}
                  </h2>
                  {s.subtitle ? <p className="max-w-[30ch] text-mute">{s.subtitle}</p> : null}
                </div>
              </header>
              <div className={`grid min-w-0 content-start gap-16 lg:col-span-8 ${s.layout === "grid" ? "cn-has-reel" : ""}`}>
                <Lead s={s} lang={v.lang} />
                <Items s={s} lang={v.lang} motion={motion} />
              </div>
            </div>
          </section>
        ))}
      </main>

      <footer className="cn-chapter border-t border-line">
        <div className={`${WRAP} grid gap-8`}>
          <p className="font-display text-[clamp(2.5rem,9vw,9rem)] leading-[0.9] tracking-[-0.04em]">Fin.</p>
          <div className={`${CAPS} flex flex-wrap items-center justify-between gap-4`}>
            <p>© {hero.name}</p>
            <Socials socials={v.socials} className="flex flex-wrap gap-x-6 gap-y-2" />
            <a href="#top" className="pf-link">
              Back to the opening <span aria-hidden="true">↑</span>
            </a>
          </div>
        </div>
      </footer>
    </TemplateRoot>
  );
}
