import type { ReactNode } from "react";
import { Cover, TemplateRoot } from "../../render/Root";
import { Links, Metric, Prose, Rest, Socials, Tags, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { TemplateProps } from "../types";
import { ExpandableTile, Spotlight } from "./islands";

const WRAP = "mx-auto w-full max-w-[1280px] px-4 sm:px-6";
const KICKER = "font-body text-[0.75rem] font-medium uppercase tracking-[0.12em] text-mute";
const TILE = "bt-tile grid content-start gap-3 p-5 md:p-6";

/** The full detail view of an entry, shown when its tile is expanded. */
function Detail({ e, lang }: { e: Entry; lang: string }) {
  return (
    <div className="grid gap-5">
      {e.image ? <Img image={e.image} aspect="16 / 9" sizes="(min-width: 768px) 720px, 100vw" className="bt-media" /> : <Cover seed={e.id + (e.title ?? "")} label={e.title} className="bt-media aspect-[16/7]" />}
      <div className="grid gap-1">
        {e.subtitle || e.date ? <p className={KICKER}>{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
        <p className="font-display text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.03em]">{e.title}</p>
      </div>
      {e.metric ? <Metric metric={e.metric} className="text-3xl" /> : null}
      {e.body ? <Prose html={e.body} className="max-w-[62ch] text-[1.0625rem] leading-relaxed" /> : null}
      <Tail e={e} lang={lang} />
    </div>
  );
}

/** Column spans that leave no holes: 4 columns from md up, 2 on phones. */
function metricSpan(i: number, n: number): string {
  const extra = (4 - (n % 4)) % 4;
  const wideMd = n <= 2 || [0, 3, 4].slice(0, extra).includes(i);
  const wideSm = n % 2 === 1 && i === 0;
  return `${wideSm ? "col-span-2" : "col-span-1"} ${wideMd ? "md:col-span-2" : "md:col-span-1"}`;
}

const pair = (i: number, n: number) => `col-span-2 ${n % 2 === 1 && i === 0 ? "md:col-span-4" : "md:col-span-2"}`;

const HEAVY = new Set(["longtext", "richtext", "image", "gallery", "code", "video", "linklist"]);
/** Small leftover fields are shown right on the tile; heavy ones (galleries, code, long text) wait in the detail view. */
const light = (e: Entry) => e.rest.filter((r) => !HEAVY.has(r.def.type));

function hasMore(e: Entry) {
  return Boolean(e.body || e.image || e.rest.some((r) => HEAVY.has(r.def.type)));
}

function Tile({ e, lang, motion, className = "", children }: { e: Entry; lang: string; motion: string; className?: string; children: ReactNode }) {
  if (!hasMore(e)) return <article className={`${TILE} ${className}`}>{children}</article>;
  return <ExpandableTile label={e.title ?? e.metric?.label ?? "Details"} className={`${TILE} ${className}`} motionLevel={motion} summary={children} detail={<Detail e={e} lang={lang} />} />;
}

function Items({ s, lang, motion }: { s: SectionView; lang: string; motion: string }) {
  switch (s.layout) {
    case "metrics":
      return s.entries.map((e, i) => (
        <Tile key={e.id} e={e} lang={lang} motion={motion} className={`${i === 0 ? "bt-accent" : ""} ${metricSpan(i, s.entries.length)}`}>
          <p className={KICKER}>{e.metric?.label || e.title}</p>
          {e.metric ? <p className="font-display text-[clamp(2.25rem,5vw,3.75rem)] font-bold leading-none tracking-[-0.04em] tabular-nums">{e.metric.value}</p> : null}
          {e.metric?.label && e.title ? <p className="text-sm text-mute">{e.title}</p> : null}
          {e.subtitle ? <p className="text-sm text-mute">{e.subtitle}</p> : null}
          <Rest slots={light(e)} lang={lang} />
          <Links links={e.links} />
        </Tile>
      ));
    case "tags":
      return s.entries.map((e, i) => (
        <Tile key={e.id} e={e} lang={lang} motion={motion} className={pair(i, s.entries.length)}>
          <h3 className={KICKER}>{e.title}</h3>
          {e.subtitle ? <p className="text-sm text-mute">{e.subtitle}</p> : null}
          {e.tags?.length ? <Tags tags={e.tags} /> : null}
          <Rest slots={light(e)} lang={lang} />
          <Links links={e.links} />
        </Tile>
      ));
    case "quotes":
      return s.entries.map((e, i) => (
        <figure key={e.id} className={`${TILE} ${pair(i, s.entries.length)}`}>
          <span aria-hidden="true" className="font-display text-5xl leading-[0.6] text-sig">“</span>
          {e.body ? (
            <blockquote className="font-display text-[1.25rem] font-medium leading-snug tracking-[-0.01em]">
              <Prose html={e.body} />
            </blockquote>
          ) : null}
          <figcaption className="mt-auto flex items-center gap-3 pt-2 text-sm">
            {e.image ? <Img image={e.image} aspect="1 / 1" sizes="40px" className="w-10 shrink-0 rounded-full" /> : null}
            <span>
              <span className="font-semibold">{e.title}</span>
              {e.subtitle ? <span className="block text-mute">{e.subtitle}</span> : null}
            </span>
          </figcaption>
          <Tail e={e} lang={lang} />
        </figure>
      ));
    case "grid":
      return s.entries.map((e, i) => (
        <Tile key={e.id} e={e} lang={lang} motion={motion} className={`bt-project col-span-2 ${s.entries.length % 2 === 1 && i === 0 ? "bt-feature md:col-span-4" : "md:col-span-2"}`}>
          {e.image ? <Img image={e.image} aspect="16 / 10" sizes="(min-width: 1024px) 600px, 100vw" className="bt-media" /> : <Cover seed={e.id + (e.title ?? "")} label={e.title} className="bt-media aspect-[16/10]" />}
          {e.subtitle || e.date ? <p className={KICKER}>{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
          <h3 className="font-display text-2xl font-bold leading-tight tracking-[-0.02em]">{e.title}</h3>
          {e.metric ? (
            <p className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-bold text-sig">{e.metric.value}</span>
              <span className="text-sm text-mute">{e.metric.label}</span>
            </p>
          ) : null}
          {e.body ? <Prose html={e.body} className="line-clamp-3 text-[0.9375rem] leading-relaxed text-mute" /> : null}
          {e.tags?.length ? <Tags tags={e.tags} /> : null}
          <Rest slots={light(e)} lang={lang} />
          <Links links={e.links} />
        </Tile>
      ));
    case "list":
      return s.entries.map((e, i) => (
        <Tile key={e.id} e={e} lang={lang} motion={motion} className={pair(i, s.entries.length)}>
          {e.date ? <p className={KICKER}>{e.date}</p> : null}
          <h3 className="font-display text-lg font-semibold leading-snug tracking-[-0.01em]">{e.title}</h3>
          {e.subtitle ? <p className="text-sm text-mute">{e.subtitle}</p> : null}
          {e.body ? <Prose html={e.body} className="line-clamp-2 text-sm leading-relaxed text-mute" /> : null}
          {e.tags?.length ? <Tags tags={e.tags} /> : null}
          <Rest slots={light(e)} lang={lang} />
          <Links links={e.links} />
        </Tile>
      ));
    default:
      return s.entries.map((e, i) => (
        <Tile key={e.id} e={e} lang={lang} motion={motion} className={`col-span-2 ${s.entries.length % 2 === 1 && i === 0 ? "md:col-span-4" : "md:col-span-2"}`}>
          <p className={`${KICKER} flex items-center gap-2`}>
            <span aria-hidden="true" className="size-1.5 rounded-full bg-sig" />
            {e.date}
          </p>
          <h3 className="font-display text-xl font-bold leading-tight tracking-[-0.02em]">{e.title}</h3>
          {e.subtitle ? <p className="font-medium text-sig">{e.subtitle}</p> : null}
          {e.body ? <Prose html={e.body} className={`${i === 0 ? "line-clamp-4" : "line-clamp-2"} text-[0.9375rem] leading-relaxed text-mute`} /> : null}
          {e.tags?.length ? <Tags tags={e.tags} /> : null}
          <Rest slots={light(e)} lang={lang} />
          <Links links={e.links} />
        </Tile>
      ));
  }
}

function Lead({ s, lang }: { s: SectionView; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  const contact = s.kind === "contact";
  return (
    <>
      <article className={`${TILE} ${contact ? "bt-accent" : ""} col-span-2 md:col-span-4 ${e.image ? "lg:col-span-3" : "lg:col-span-4"}`}>
        {e.title ? <p className="font-display text-xl font-semibold">{e.title}</p> : null}
        {e.subtitle ? <p className="text-mute">{e.subtitle}</p> : null}
        {e.body ? <Prose html={e.body} className={contact ? "max-w-[30ch] font-display text-[clamp(1.5rem,3vw,2.25rem)] font-bold leading-[1.1] tracking-[-0.025em]" : "max-w-[66ch] text-[1.0625rem] leading-relaxed"} /> : null}
        {e.metric ? <Metric metric={e.metric} className="text-2xl" /> : null}
        <Tail e={{ ...e, links: contact ? [] : e.links }} lang={lang} />
        {contact ? <Links links={e.links} primaryFirst /> : null}
      </article>
      {e.image ? (
        <div className="bt-tile col-span-2 overflow-hidden md:col-span-4 lg:col-span-1">
          <Img image={e.image} aspect="1 / 1" sizes="(min-width: 1024px) 300px, 100vw" className="h-full w-full" />
        </div>
      ) : null}
    </>
  );
}

export default function Bento({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  const motion = portfolio.theme.motion;
  return (
    <TemplateRoot portfolio={portfolio}>
      <header className={`${WRAP} flex items-center justify-between gap-4 py-4`}>
        <a href="#top" className="font-display text-lg font-bold tracking-[-0.02em]">
          {hero.name}
        </a>
        {v.nav.length ? (
          <nav aria-label="Sections" className="hidden md:block">
            <ul className="bt-nav flex gap-1 text-[0.8125rem] font-medium">
              {v.nav.slice(0, 6).map((n) => (
                <li key={n.href}>
                  <a href={n.href}>{n.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      <main id="main" tabIndex={-1} className={`${WRAP} pb-10`}>
        <Spotlight className="grid gap-12">
          <section id="top" className="bt-grid" aria-label="Introduction">
            <div className={`${TILE} bt-hero col-span-2 gap-5 md:col-span-4 ${hero.present ? "lg:col-span-3 lg:row-span-2" : ""} md:p-10`}>
              {hero.eyebrow ? (
                <p className="bt-pill w-fit">
                  <span aria-hidden="true" className="size-2 rounded-full bg-sig" />
                  {hero.eyebrow}
                </p>
              ) : null}
              <h1 className={`font-display font-extrabold leading-[0.92] tracking-[-0.05em] ${hero.present ? "text-[clamp(2.75rem,8vw,6.5rem)]" : "text-[clamp(2rem,5vw,3.5rem)]"}`}>{hero.name}</h1>
              {hero.headline ? <p className="max-w-[32ch] font-display text-[clamp(1.125rem,2.2vw,1.625rem)] font-medium leading-snug text-mute">{hero.headline}</p> : null}
              {hero.present ? <Links links={hero.links} primaryFirst className="mt-auto pt-4" /> : null}
            </div>
            {hero.present && hero.image ? (
              <div className="bt-tile col-span-2 overflow-hidden md:col-span-2 lg:col-span-1">
                <Img image={hero.image} aspect="1 / 1" sizes="(min-width: 1024px) 300px, 50vw" priority className="h-full w-full" />
              </div>
            ) : null}
            {hero.present && hero.tagline ? (
              <div className={`${TILE} col-span-2 ${hero.image ? "md:col-span-2 lg:col-span-1" : "md:col-span-4 lg:col-span-1 lg:row-span-2"}`}>
                <Prose html={hero.tagline} className="text-[0.9375rem] leading-relaxed" />
                <Rest slots={hero.rest} lang={v.lang} />
              </div>
            ) : null}
            {hero.location || v.socials.length ? (
              <div className={`${TILE} col-span-2 md:col-span-4 ${hero.present ? "lg:col-span-4" : ""} md:flex md:items-center md:justify-between`}>
                {hero.location ? <p className={KICKER}>{hero.location}</p> : null}
                <Socials socials={v.socials} className="flex flex-wrap gap-x-5 gap-y-2 text-sm" />
              </div>
            ) : null}
          </section>

          {v.sections.map((s) => (
            <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className="grid gap-4">
              <header className="flex flex-wrap items-end justify-between gap-3 px-1">
                <h2 id={`${s.anchor}-title`} className="font-display text-[clamp(1.75rem,4vw,2.75rem)] font-extrabold tracking-[-0.04em]">
                  {s.title}
                </h2>
                {s.subtitle ? <p className="max-w-[44ch] text-sm text-mute">{s.subtitle}</p> : null}
              </header>
              <div className="bt-grid">
                <Lead s={s} lang={v.lang} />
                <Items s={s} lang={v.lang} motion={motion} />
              </div>
            </section>
          ))}
        </Spotlight>
      </main>

      <footer className={`${WRAP} flex flex-wrap items-center justify-between gap-3 pb-10 text-sm text-mute`}>
        <p>© {hero.name}</p>
        <a href="#top" className="pf-link">
          Back to top <span aria-hidden="true">↑</span>
        </a>
      </footer>
    </TemplateRoot>
  );
}
