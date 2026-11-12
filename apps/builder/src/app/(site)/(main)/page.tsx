import { ArrowRight, Blocks, Check, Globe, MousePointerClick, PencilRuler, Rocket, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { FIELD_TYPES } from "@runtime/schema/portfolio";
import { TEMPLATES } from "@runtime/templates/meta";
import { Showcase } from "@/components/site/Showcase";
import { TemplateFrame } from "@/components/site/TemplateFrame";
import { FIELD_TYPE_SHORT } from "@/components/site/field-types";
import { buttonStyles } from "@/components/ui/styles";

const STEPS = [
  { icon: MousePointerClick, title: "Pick", text: `Choose one of ${TEMPLATES.length} original templates. Change your mind later — your content moves with you.` },
  { icon: PencilRuler, title: "Fill", text: "Type into a form that bends to your story. Add sections and invent your own fields; watch the real site update as you go." },
  { icon: Rocket, title: "Deploy", text: "One click sends it to your own Vercel account. Free hosting, your repository, your domain." },
];

const FAQ = [
  {
    q: "Is it really free?",
    a: "Yes. Persona is free and open source, with no paid tier, no ads and no trial clock. Your site is hosted on your own Vercel account, and Vercel’s free Hobby plan is plenty for a personal portfolio. We never ask for a card.",
  },
  { q: "Do I need to know how to code?", a: "No. You fill in a form and press a button. If you do code, the site is a normal Next.js project in your own GitHub repository — change anything you like." },
  {
    q: "Who owns the site?",
    a: "You do. The deploy button creates a repository in your GitHub account and a project in your Vercel account. The template code is MIT licensed and your content is yours. If Persona disappeared tomorrow, your site would keep working.",
  },
  { q: "Can I switch templates after I start?", a: "Any time. Content and design are stored separately, so switching from Swiss to Brutal keeps every section, field and word." },
  { q: "What if my profession doesn’t fit the usual sections?", a: "Add a custom section and define its fields — patents with a number and filing date, exhibitions with a venue and gallery, anything. Every template knows how to render every field type, so it looks native." },
  { q: "How do I update the site after deploying?", a: "Edit and press Publish. Your deployed site picks up the published version within the hour, with no redeploy. Drafts stay private until you publish." },
  { q: "Can I use my own domain?", a: "Yes — add it in your Vercel project’s settings. HTTPS is automatic and free." },
  { q: "What do you track?", a: "Cookie-free, first-party counts of page views and product actions on this builder, with no raw IP addresses stored and Do-Not-Track honoured. Your deployed portfolio contains no tracking at all." },
];

export default function Landing() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[38rem] bg-[radial-gradient(60%_60%_at_50%_0%,color-mix(in_oklch,var(--brand)_22%,transparent),transparent_70%)]" />
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 pb-16 pt-14 sm:px-6 md:pt-20 lg:pb-24">
          <div className="mx-auto grid max-w-4xl justify-items-center gap-6 text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-rule bg-panel px-3.5 py-1.5 text-[0.8125rem] font-medium text-dim">
              <span aria-hidden="true" className="size-2 rounded-full bg-ok" />
              Free &amp; open source · no code · no card
            </p>
            <h1 className="font-display text-[clamp(2.5rem,7.2vw,5.75rem)] font-extrabold leading-[0.95] tracking-[-0.045em]">
              A portfolio that looks <span className="text-brand">designed</span>, built in an afternoon.
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-dim md:text-xl">Pick a template, fill in a form that reshapes itself around your work, and deploy to your own Vercel account in one click.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/new" className={buttonStyles({ variant: "primary", size: "lg" })}>
                Start building — it’s free <ArrowRight />
              </Link>
              <Link href="/templates" className={buttonStyles({ variant: "secondary", size: "lg" })}>
                Browse templates
              </Link>
            </div>
          </div>
          <div className="mx-auto w-full max-w-5xl">
            <Showcase seed="developer" templates={TEMPLATES.map((t) => ({ id: t.id, name: t.name, signature: t.signature }))} />
          </div>
        </div>
      </section>

      <section aria-labelledby="how" className="border-y border-rule bg-panel">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 md:py-24">
          <div className="grid gap-3">
            <p className="font-mono text-sm text-brand">How it works</p>
            <h2 id="how" className="max-w-2xl font-display text-[clamp(2rem,4.4vw,3.25rem)] font-bold leading-[1.02] tracking-[-0.035em]">
              Pick. Fill. Deploy.
            </h2>
          </div>
          <ol className="grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="grid content-start gap-4 rounded-2xl border border-rule bg-bg p-6">
                <div className="flex items-center justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
                    <s.icon className="size-5" aria-hidden="true" />
                  </span>
                  <span aria-hidden="true" className="font-display text-5xl font-extrabold leading-none text-rule">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-display text-2xl font-bold tracking-[-0.02em]">{s.title}</h3>
                <p className="leading-relaxed text-dim">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="dynamic" className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2 lg:items-center">
        <div className="grid gap-5">
          <p className="font-mono text-sm text-brand">Fully dynamic</p>
          <h2 id="dynamic" className="font-display text-[clamp(2rem,4.4vw,3.25rem)] font-bold leading-[1.02] tracking-[-0.035em]">
            Your career is not a template. The form shouldn’t be either.
          </h2>
          <p className="text-lg leading-relaxed text-dim">Fifteen ready-made sections cover the usual ground. For everything else, invent a section and give it exactly the fields it needs — then reorder, hide or reshape any of it.</p>
          <ul className="grid gap-2.5">
            {["Add, rename, reorder and remove fields in any section — presets included", "Eighteen field types, from metrics and date ranges to galleries and code", "Every template renders every field, so custom sections look native", "Undo, version history, autosave and JSON export built in"].map((t) => (
              <li key={t} className="flex gap-3">
                <Check className="mt-1 size-4 shrink-0 text-ok" aria-hidden="true" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-rule bg-panel p-5 shadow-sm" role="img" aria-label="Illustration: a custom section called Patents with four custom fields, and the list of available field types">
          <div className="grid gap-3" aria-hidden="true">
            <div className="flex items-center justify-between rounded-xl border border-rule bg-bg px-4 py-3">
              <span className="font-display text-lg font-semibold">Patents</span>
              <span className="rounded-full border border-brand/50 px-2 py-0.5 text-xs font-medium text-brand">Custom section</span>
            </div>
            {[
              ["Title", "Short text"],
              ["Patent no.", "Short text"],
              ["Filed", "Date"],
              ["Registry", "URL"],
            ].map(([label, type]) => (
              <div key={label} className="flex items-center gap-3 rounded-xl border border-rule px-4 py-2.5 text-sm">
                <span className="text-dim">⋮⋮</span>
                <span className="flex-1 font-medium">{label}</span>
                <span className="rounded-md bg-panel2 px-2 py-0.5 text-xs text-dim">{type}</span>
              </div>
            ))}
            <div className="flex flex-wrap gap-1.5 border-t border-rule pt-4">
              {FIELD_TYPES.map((t) => (
                <span key={t} className="rounded-full border border-rule px-2.5 py-1 text-xs text-dim">
                  {FIELD_TYPE_SHORT[t]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="gallery" className="border-y border-rule bg-panel">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="grid gap-3">
              <p className="font-mono text-sm text-brand">{TEMPLATES.length} originals</p>
              <h2 id="gallery" className="font-display text-[clamp(2rem,4.4vw,3.25rem)] font-bold leading-[1.02] tracking-[-0.035em]">
                Templates with a point of view.
              </h2>
            </div>
            <Link href="/templates" className={buttonStyles({ variant: "secondary" })}>
              See them live <ArrowRight />
            </Link>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TEMPLATES.map((t, i) => (
              <li key={t.id}>
                <Link href={`/templates#${t.id}`} className="group grid overflow-hidden rounded-2xl border border-rule bg-bg transition-[border-color,transform] hover:-translate-y-1 hover:border-edge">
                  <TemplateFrame src={`/frame/${t.id}/${["developer", "designer", "solutions-engineer"][i % 3]}`} title={`${t.name} template preview`} />
                  <span className="grid gap-1 p-4">
                    <span className="font-display text-lg font-semibold">{t.name}</span>
                    <span className="text-[0.8125rem] leading-snug text-dim">{t.signature}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="own" className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-16 sm:px-6 md:grid-cols-3 md:py-24">
        <h2 id="own" className="sr-only">
          Why Persona
        </h2>
        {[
          { icon: Globe, title: "Yours, completely", text: "The site lives in your Vercel account and your GitHub repository. MIT-licensed code, your content, your domain." },
          { icon: ShieldCheck, title: "Accessible and fast by default", text: "Every palette is contrast-checked to WCAG AA, every template works by keyboard, respects reduced motion and ships very little JavaScript." },
          { icon: Blocks, title: "Never breaks", text: "Your deployed site keeps a copy of your content. If this builder is ever unreachable, your portfolio keeps serving the last published version." },
        ].map((f) => (
          <div key={f.title} className="grid content-start gap-3 rounded-2xl border border-rule bg-panel p-6">
            <f.icon className="size-6 text-brand" aria-hidden="true" />
            <h3 className="font-display text-xl font-bold tracking-[-0.02em]">{f.title}</h3>
            <p className="leading-relaxed text-dim">{f.text}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="faq" className="border-t border-rule bg-panel">
        <div className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-16 sm:px-6 md:py-24">
          <h2 id="faq" className="font-display text-[clamp(2rem,4.4vw,3.25rem)] font-bold leading-[1.02] tracking-[-0.035em]">
            Questions, answered.
          </h2>
          <div className="grid gap-2">
            {FAQ.map((f) => (
              <details key={f.q} className="group rounded-xl border border-rule bg-bg">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-4 font-display text-lg font-semibold [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full border border-edge text-sm transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="px-5 pb-5 leading-relaxed text-dim">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="cta" className="mx-auto grid w-full max-w-7xl justify-items-center gap-6 px-4 py-20 text-center sm:px-6 md:py-28">
        <h2 id="cta" className="max-w-3xl font-display text-[clamp(2.25rem,6vw,4.5rem)] font-extrabold leading-[0.98] tracking-[-0.04em]">
          Your work deserves a better link than a PDF.
        </h2>
        <Link href="/new" className={buttonStyles({ variant: "primary", size: "lg" })}>
          Build your portfolio <ArrowRight />
        </Link>
      </section>
    </>
  );
}
