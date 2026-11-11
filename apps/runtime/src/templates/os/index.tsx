import { Cover, TemplateRoot } from "../../render/Root";
import { Links, Metric, Prose, Rest, Socials, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { TemplateProps } from "../types";
import { Desktop, Window } from "./islands";

const MONO = "font-mono text-[0.75rem] text-mute";

function Body({ e, lang }: { e: Entry; lang: string }) {
  return (
    <>
      {e.body ? <Prose html={e.body} className="text-[0.9375rem] leading-relaxed" /> : null}
      <Tail e={e} lang={lang} />
    </>
  );
}

function Lead({ s, lang }: { s: SectionView; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  return (
    <div className={`grid gap-5 ${e.image ? "sm:grid-cols-[minmax(0,1fr)_9rem]" : ""}`}>
      <div className="grid content-start gap-4">
        {e.title ? <p className="font-display text-lg font-bold">{e.title}</p> : null}
        {e.subtitle ? <p className="text-mute">{e.subtitle}</p> : null}
        {e.body ? <Prose html={e.body} className={s.kind === "contact" ? "font-display text-[1.375rem] font-bold leading-snug" : "text-[1rem] leading-relaxed"} /> : null}
        {e.metric ? <Metric metric={e.metric} className="text-2xl" /> : null}
        <Tail e={{ ...e, links: s.kind === "contact" ? [] : e.links }} lang={lang} />
        {s.kind === "contact" ? <Links links={e.links} primaryFirst /> : null}
      </div>
      {e.image ? <Img image={e.image} aspect="1 / 1" sizes="144px" className="os-media max-sm:max-w-36" /> : null}
    </div>
  );
}

function Items({ s, lang }: { s: SectionView; lang: string }) {
  if (!s.entries.length) return null;
  switch (s.layout) {
    case "metrics":
      return (
        <ul className="grid grid-cols-2 gap-3">
          {s.entries.map((e) => (
            <li key={e.id} className="os-inset grid content-start gap-1 p-4">
              {e.metric ? <span className="font-display text-[2rem] font-bold leading-none tracking-[-0.03em] text-sig">{e.metric.value}</span> : null}
              <span className="text-sm font-semibold">{e.metric?.label || e.title}</span>
              {e.metric?.label && e.title ? <span className="text-xs text-mute">{e.title}</span> : null}
              {e.subtitle ? <span className="text-xs text-mute">{e.subtitle}</span> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "tags":
      return (
        <dl className="grid gap-4">
          {s.entries.map((e) => (
            <div key={e.id} className="grid gap-2">
              <dt className={MONO}>
                <span className="text-sig">▸</span> {e.title}
              </dt>
              <dd className="grid gap-2">
                {e.subtitle ? <p className="text-sm text-mute">{e.subtitle}</p> : null}
                <Body e={e} lang={lang} />
              </dd>
            </div>
          ))}
        </dl>
      );
    case "quotes":
      return (
        <div className="grid gap-4">
          {s.entries.map((e) => (
            <figure key={e.id} className="os-inset grid gap-3 p-4">
              {e.body ? (
                <blockquote className="text-[1.0625rem] font-medium leading-snug">
                  <Prose html={e.body} />
                </blockquote>
              ) : null}
              <figcaption className="flex items-center gap-3 text-sm">
                {e.image ? <Img image={e.image} aspect="1 / 1" sizes="36px" className="os-media w-9 shrink-0" /> : null}
                <span>
                  <span className="font-bold">{e.title}</span>
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
        <ul className="grid gap-4 sm:grid-cols-2">
          {s.entries.map((e) => (
            <li key={e.id} className="os-inset grid content-start overflow-hidden">
              {e.image ? <Img image={e.image} aspect="16 / 10" sizes="320px" /> : <Cover seed={e.id + (e.title ?? "")} label={e.title} className="aspect-[16/10]" />}
              <div className="grid gap-2.5 p-4">
                <h3 className="font-display text-lg font-bold leading-tight">{e.title}</h3>
                {e.subtitle || e.date ? <p className={MONO}>{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
                {e.metric ? (
                  <p className="text-sm">
                    <strong className="font-display text-lg text-sig">{e.metric.value}</strong> {e.metric.label}
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
        <ul className="os-inset divide-y divide-line">
          {s.entries.map((e) => (
            <li key={e.id} className="grid gap-1.5 px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <h3 className="font-semibold">{e.title}</h3>
                {e.date ? <p className={MONO}>{e.date}</p> : null}
              </div>
              {e.subtitle ? <p className="text-sm text-mute">{e.subtitle}</p> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <ol className="grid gap-5">
          {s.entries.map((e) => (
            <li key={e.id} className="grid gap-2 border-l-2 border-sig pl-4">
              <p className={MONO}>{e.date}</p>
              <h3 className="font-display text-lg font-bold leading-tight">
                {e.title}
                {e.subtitle ? <span className="font-medium text-mute"> — {e.subtitle}</span> : null}
              </h3>
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="480px" className="os-media" /> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ol>
      );
  }
}

const short = (title: string) =>
  title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "•";

export default function DesktopOs({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  const apps = [{ id: "top", title: "Welcome", short: "✦" }, ...v.sections.map((s) => ({ id: s.anchor, title: s.title, short: short(s.title) }))];
  const initiallyOpen = apps.slice(0, 3).map((a) => a.id);
  const pos = (i: number) => ({ x: 36 + ((i * 210) % 630), y: 22 + ((i * 120) % 300) });

  return (
    <TemplateRoot portfolio={portfolio} className="os">
      <header className="os-menubar">
        <p className="flex items-center gap-2 font-bold">
          <span aria-hidden="true" className="os-logo" />
          {hero.name}
        </p>
        <div className="flex min-w-0 items-center gap-4">
          <Socials socials={v.socials} className="hidden gap-4 md:flex" linkClassName="os-menulink" />
          {hero.location ? <p className="truncate text-mute max-sm:hidden">{hero.location}</p> : null}
        </div>
      </header>

      <main id="main" tabIndex={-1} className="os-main">
        <Desktop apps={apps} initiallyOpen={initiallyOpen}>
          <Window id="top" title="Welcome" heading={false} width={600} {...pos(0)}>
            <div className="grid gap-5">
              <div className="flex items-start gap-4">
                {hero.present && hero.image ? <Img image={hero.image} aspect="1 / 1" sizes="80px" priority className="os-media w-20 shrink-0" /> : null}
                <div className="grid gap-2">
                  {hero.eyebrow ? (
                    <p className={MONO}>
                      <span className="text-sig">●</span> {hero.eyebrow}
                    </p>
                  ) : null}
                  <h1 className="font-display text-[clamp(2.25rem,6vw,3.5rem)] font-bold leading-[0.95] tracking-[-0.035em]">{hero.name}</h1>
                </div>
              </div>
              {hero.headline ? <p className="font-display text-[1.25rem] font-semibold leading-snug">{hero.headline}</p> : null}
              {hero.present && hero.tagline ? <Prose html={hero.tagline} className="text-[1rem] leading-relaxed text-mute" /> : null}
              {hero.present ? <Links links={hero.links} primaryFirst /> : null}
              {hero.present ? <Rest slots={hero.rest} lang={v.lang} /> : null}
              <p className={`${MONO} os-hint`}>Tip: drag windows by their title bar, or open apps from the dock below.</p>
            </div>
          </Window>
          {v.sections.map((s, i) => (
            <Window key={s.id} id={s.anchor} title={s.title} width={s.layout === "grid" ? 720 : 620} {...pos(i + 1)}>
              <div className="grid gap-5">
                {s.subtitle ? <p className="text-sm text-mute">{s.subtitle}</p> : null}
                <Lead s={s} lang={v.lang} />
                <Items s={s} lang={v.lang} />
              </div>
            </Window>
          ))}
        </Desktop>
      </main>
    </TemplateRoot>
  );
}
