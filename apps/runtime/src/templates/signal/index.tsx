import { Cover, TemplateRoot } from "../../render/Root";
import { Links, Prose, Rest, Tail } from "../../render/FieldValue";
import { Img } from "../../render/Img";
import { viewPortfolio, type Entry, type SectionView } from "../../render/view";
import type { TemplateProps } from "../types";
import { CommandPalette, Terminal, type Command } from "./islands";

const WRAP = "mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-10";
const MONO = "font-mono text-[0.75rem] tracking-[0.02em] text-mute";

/** Which bento tiles span two columns so every row of the 4-column grid is full. */
function wide(i: number, n: number): boolean {
  if (n <= 2 || n === 4) return true;
  const extra = (4 - (n % 4)) % 4;
  return [0, 3, 4].slice(0, extra).includes(i);
}

function Body({ e, lang }: { e: Entry; lang: string }) {
  return (
    <>
      {e.body ? <Prose html={e.body} className="text-[0.9375rem] leading-relaxed text-mute" /> : null}
      <Tail e={e} lang={lang} />
    </>
  );
}

function Lead({ s, lang }: { s: SectionView; lang: string }) {
  const e = s.lead;
  if (!e) return null;
  if (s.kind === "contact") {
    return (
      <div className="sg-panel grid gap-5 p-6 md:p-10">
        <p className={MONO}>
          <span className="text-sig">$</span> open --channel direct
        </p>
        {e.body ? <Prose html={e.body} className="max-w-[48ch] font-display text-[clamp(1.375rem,2.6vw,2.125rem)] font-medium leading-tight tracking-[-0.02em]" /> : null}
        <Rest slots={e.rest} lang={lang} />
        <Links links={e.links} primaryFirst />
      </div>
    );
  }
  return (
    <div className={`grid gap-6 ${e.image ? "md:grid-cols-[minmax(0,1fr)_minmax(0,18rem)]" : ""}`}>
      <div className="grid content-start gap-5">
        {e.title ? <p className="font-display text-xl font-semibold">{e.title}</p> : null}
        {e.subtitle ? <p className="text-mute">{e.subtitle}</p> : null}
        {e.body ? <Prose html={e.body} className="max-w-[68ch] text-[1.0625rem] leading-relaxed" /> : null}
        {e.metric ? (
          <span className="pf-metric">
            <span className="pf-metric-value text-sig">{e.metric.value}</span>
            <span className="pf-metric-label">{e.metric.label}</span>
          </span>
        ) : null}
        <Tail e={e} lang={lang} />
      </div>
      {e.image ? <Img image={e.image} aspect="4 / 5" sizes="(min-width: 768px) 288px, 100vw" className="sg-media" /> : null}
    </div>
  );
}

function Items({ s, lang }: { s: SectionView; lang: string }) {
  if (!s.entries.length) return null;
  switch (s.layout) {
    case "metrics":
      return (
        <ul className="sg-bento">
          {s.entries.map((e, i) => (
            <li key={e.id} className="sg-panel sg-glow pf-reveal grid content-between gap-6 p-5 md:p-6" data-wide={wide(i, s.entries.length) ? "" : undefined}>
              <p className={`${MONO} flex items-center justify-between`}>
                <span>{e.metric?.label || e.title}</span>
                <span aria-hidden="true" className="sg-pulse" />
              </p>
              <div>
                {e.metric ? <p className="font-display text-[clamp(2.25rem,5vw,3.75rem)] font-bold leading-none tracking-[-0.04em] tabular-nums">{e.metric.value}</p> : null}
                {e.metric?.label && e.title ? <p className="mt-2 text-sm text-mute">{e.title}</p> : null}
                {e.subtitle ? <p className="mt-1 text-sm text-mute">{e.subtitle}</p> : null}
                <Body e={e} lang={lang} />
              </div>
            </li>
          ))}
        </ul>
      );
    case "tags":
      return (
        <ul className="grid gap-3 md:grid-cols-3">
          {s.entries.map((e) => (
            <li key={e.id} className="sg-panel grid content-start gap-4 p-5">
              <h3 className={MONO}>
                <span className="text-sig">#</span> {e.title}
              </h3>
              {e.subtitle ? <p className="text-sm text-mute">{e.subtitle}</p> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ul>
      );
    case "quotes":
      return (
        <div className="grid gap-3 md:grid-cols-2">
          {s.entries.map((e) => (
            <figure key={e.id} className="sg-panel pf-reveal grid content-start gap-4 p-6">
              <span aria-hidden="true" className="font-mono text-sig">{"/**"}</span>
              {e.body ? (
                <blockquote className="border-l-2 border-sig pl-4 text-[1.0625rem] leading-relaxed">
                  <Prose html={e.body} />
                </blockquote>
              ) : null}
              <figcaption className="flex items-center gap-3 text-sm">
                {e.image ? <Img image={e.image} aspect="1 / 1" sizes="36px" className="w-9 shrink-0 rounded-full" /> : null}
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
        <ul className="grid gap-3 md:grid-cols-2">
          {s.entries.map((e) => (
            <li key={e.id} className="sg-panel sg-glow pf-reveal grid content-start overflow-hidden">
              {e.image ? (
                <Img image={e.image} aspect="16 / 9" sizes="(min-width: 768px) 50vw, 100vw" />
              ) : (
                <Cover seed={e.id + (e.title ?? "")} label={e.title} className="sg-cover aspect-[16/9]" />
              )}
              <div className="grid gap-4 p-5 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div>
                    <h3 className="font-display text-xl font-semibold tracking-[-0.01em]">{e.title}</h3>
                    {e.subtitle || e.date ? <p className={`${MONO} mt-1`}>{[e.subtitle, e.date].filter(Boolean).join(" · ")}</p> : null}
                  </div>
                  {e.metric ? (
                    <p className="sg-chip">
                      <strong className="text-sig">{e.metric.value}</strong> {e.metric.label}
                    </p>
                  ) : null}
                </div>
                <Body e={e} lang={lang} />
              </div>
            </li>
          ))}
        </ul>
      );
    case "list":
      return (
        <ul className="sg-panel divide-y divide-line">
          {s.entries.map((e) => (
            <li key={e.id} className="sg-row grid gap-x-6 gap-y-1 px-5 py-4 md:grid-cols-[7.5rem_minmax(0,1fr)]">
              <p className={`${MONO} pt-1`}>{e.date || "—"}</p>
              <div className="grid gap-2">
                <h3 className="font-medium">
                  {e.title}
                  {e.subtitle ? <span className="text-mute"> · {e.subtitle}</span> : null}
                </h3>
                <Body e={e} lang={lang} />
              </div>
            </li>
          ))}
        </ul>
      );
    default:
      return (
        <ol className="sg-timeline">
          {s.entries.map((e) => (
            <li key={e.id} className="pf-reveal grid gap-3 pb-10 pl-7 last:pb-0">
              <p className={MONO}>{e.date}</p>
              <h3 className="font-display text-xl font-semibold tracking-[-0.01em]">
                {e.title}
                {e.subtitle ? <span className="text-sig"> @ {e.subtitle}</span> : null}
              </h3>
              {e.image ? <Img image={e.image} aspect="16 / 9" sizes="(min-width: 768px) 560px, 100vw" className="sg-media max-w-xl" /> : null}
              <Body e={e} lang={lang} />
            </li>
          ))}
        </ol>
      );
  }
}

export default function Signal({ portfolio }: TemplateProps) {
  const v = viewPortfolio(portfolio);
  const { hero } = v;
  const user = hero.name.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") || "you";
  const commands: Command[] = [
    ...v.nav.map((n) => ({ ...n, group: "Section" })),
    ...(v.email ? [{ label: `Email ${v.email}`, href: `mailto:${v.email}`, group: "Contact" }] : []),
    ...v.socials.map((s) => ({ label: s.label, href: s.url, group: "Elsewhere" })),
  ];
  const target = v.sections.find((s) => s.kind === "projects") ?? v.sections[0];

  return (
    <TemplateRoot portfolio={portfolio} className="sg">
      <header className="sticky top-0 z-40 border-b border-line bg-ground/85 backdrop-blur-md">
        <div className={`${WRAP} flex h-13 items-center justify-between gap-4 py-2`}>
          <a href="#top" className="font-mono text-[0.8125rem] font-medium">
            <span className="text-sig">~/</span>
            {user}
          </a>
          {v.nav.length ? (
            <nav aria-label="Sections" className="hidden min-w-0 lg:block">
              <ul className="flex gap-1 font-mono text-[0.75rem]">
                {v.nav.slice(0, 6).map((n) => (
                  <li key={n.href}>
                    <a href={n.href} className="sg-tab">
                      {n.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
          <CommandPalette commands={commands} />
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <section id="top" className={`${WRAP} sg-hero grid items-center gap-10 ${hero.present ? "py-14 md:py-24 lg:grid-cols-[1.1fr_0.9fr]" : "py-10"}`}>
          <div className="grid content-start gap-6">
            {hero.eyebrow ? (
              <p className="sg-chip w-fit">
                <span aria-hidden="true" className="sg-pulse" />
                {hero.eyebrow}
              </p>
            ) : null}
            <h1 className={`font-display font-bold leading-[0.95] tracking-[-0.04em] ${hero.present ? "text-[clamp(2.75rem,7.5vw,6.25rem)]" : "text-[clamp(2rem,4vw,3rem)]"}`}>{hero.name}</h1>
            {hero.headline ? <p className="max-w-[40ch] font-display text-[clamp(1.125rem,2vw,1.5rem)] font-medium leading-snug text-sig">{hero.headline}</p> : null}
            {hero.present && hero.tagline ? <Prose html={hero.tagline} className="max-w-[56ch] text-[1.0625rem] leading-relaxed text-mute" /> : null}
            {hero.present ? <Links links={hero.links} primaryFirst /> : null}
            {hero.present ? <Rest slots={hero.rest} lang={v.lang} /> : null}
            {hero.location || v.socials.length ? (
              <ul className={`${MONO} flex flex-wrap gap-x-5 gap-y-2 pt-2`}>
                {hero.location ? <li>📍 {hero.location}</li> : null}
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
            ) : null}
          </div>
          {hero.present ? <Terminal user={user} motion={portfolio.theme.motion} target={target ? { href: `#${target.anchor}`, label: target.title } : undefined} /> : null}
        </section>

        {v.sections.length > 1 ? (
          <nav aria-label="Site map" className={`${WRAP} pb-6`}>
            <p className={`${MONO} mb-3`}>
              <span className="text-sig">{"//"}</span> request path
            </p>
            <ol className="sg-flow">
              <li>
                <span className="sg-node sg-node-src">visitor</span>
              </li>
              {v.sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.anchor}`} className="sg-node">
                    {s.title}
                    {s.entries.length ? <span className="sg-node-count">{s.entries.length}</span> : null}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        {v.sections.map((s, i) => (
          <section key={s.id} id={s.anchor} aria-labelledby={`${s.anchor}-title`} className={`${WRAP} py-12 md:py-16`}>
            <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
              <div>
                <p aria-hidden="true" className={MONO}>
                  <span className="text-sig">{String(i + 1).padStart(2, "0")}</span> / {s.kind}
                </p>
                <h2 id={`${s.anchor}-title`} className="mt-1 font-display text-[clamp(1.625rem,3.2vw,2.5rem)] font-bold tracking-[-0.03em]">
                  {s.title}
                </h2>
              </div>
              {s.subtitle ? <p className="max-w-[40ch] text-sm text-mute">{s.subtitle}</p> : null}
            </header>
            <div className="grid gap-8">
              <Lead s={s} lang={v.lang} />
              <Items s={s} lang={v.lang} />
            </div>
          </section>
        ))}
      </main>

      <footer className="mt-8 border-t border-line">
        <div className={`${WRAP} ${MONO} flex flex-wrap items-center justify-between gap-3 py-6`}>
          <p>
            <span className="text-sig">●</span> all systems nominal — © {hero.name}
          </p>
          <a href="#top" className="sg-tab">
            cd ~ <span aria-hidden="true">↑</span>
          </a>
        </div>
      </footer>
    </TemplateRoot>
  );
}
