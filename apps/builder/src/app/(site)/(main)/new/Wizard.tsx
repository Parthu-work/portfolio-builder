"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Check, FileJson, FilePlus2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { SlugSchema, slugify } from "@runtime/schema/portfolio";
import { SEEDS, SEED_IDS } from "@runtime/schema/seeds";
import { TEMPLATES } from "@runtime/templates/meta";
import { TemplateFrame } from "@/components/site/TemplateFrame";
import { Badge, Button, FieldError, Input, Label } from "@/components/ui";
import { cn } from "@/lib/cn";
import { api, ApiError } from "@/lib/client";
import { track } from "@/lib/track";

const Schema = z.object({ name: z.string().trim().min(1, "Enter your name").max(100), slug: SlugSchema });
type Values = z.infer<typeof Schema>;

const STEPS = ["Template", "Starting content", "Name & address"] as const;

export function Wizard({ initialTemplate, defaultName }: { initialTemplate: string | null; defaultName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(initialTemplate ? 1 : 0);
  const [templateId, setTemplateId] = useState(initialTemplate ?? "signal");
  const [start, setStart] = useState<string>("blank");
  const [imported, setImported] = useState<{ name: string; data: unknown } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [slugState, setSlugState] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const slugTouched = useRef(false);

  const form = useForm<Values>({ resolver: zodResolver(Schema), mode: "onChange", defaultValues: { name: defaultName, slug: slugify(defaultName) } });
  const { register, handleSubmit, watch, setValue, formState } = form;
  const slug = watch("slug");

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  useEffect(() => {
    if (!SlugSchema.safeParse(slug).success) {
      setSlugState("idle");
      return;
    }
    setSlugState("checking");
    const ctrl = new AbortController();
    const t = window.setTimeout(() => {
      api<{ available: boolean }>(`/api/slug?slug=${encodeURIComponent(slug)}`, { signal: ctrl.signal })
        .then((r) => setSlugState(r.available ? "free" : "taken"))
        .catch(() => {});
    }, 350);
    return () => {
      ctrl.abort();
      window.clearTimeout(t);
    };
  }, [slug]);

  const onFile = async (file: File | undefined) => {
    setImportError(null);
    if (!file) return;
    if (file.size > 2_000_000) return setImportError("That file is larger than 2 MB.");
    try {
      setImported({ name: file.name, data: JSON.parse(await file.text()) });
      setStart("import");
    } catch {
      setImportError("That file is not valid JSON.");
    }
  };

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const res = await api<{ id: string }>("/api/portfolios", { body: { ...values, templateId, start, ...(start === "import" ? { data: imported?.data } : {}) } });
      router.push(`/edit/${res.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.code === "slug_taken") setSlugState("taken");
      setServerError(e instanceof ApiError ? e.message : "Could not create the portfolio. Please try again.");
    }
  });

  const option = (active: boolean) => cn("grid gap-2 rounded-2xl border bg-panel p-4 text-left transition-colors", active ? "border-brand ring-2 ring-brand" : "border-rule hover:border-edge");

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6">
      <nav aria-label="Progress">
        <ol className="flex flex-wrap gap-2 text-sm">
          {STEPS.map((label, i) => (
            <li key={label} aria-current={i === step ? "step" : undefined} className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5", i === step ? "border-brand text-fg" : "border-rule text-dim")}>
              <span className={cn("grid size-5 place-items-center rounded-full text-xs font-semibold", i < step ? "bg-brand text-brand-fg" : "bg-panel2")}>{i < step ? <Check className="size-3" aria-hidden="true" /> : i + 1}</span>
              {label}
            </li>
          ))}
        </ol>
      </nav>

      <form onSubmit={submit} noValidate className="grid gap-8">
        {step === 0 ? (
          <section className="grid gap-6" aria-labelledby="step-title">
            <div>
              <h1 id="step-title" ref={heading} tabIndex={-1} className="font-display text-3xl font-bold tracking-tight outline-none">
                Choose a template
              </h1>
              <p className="mt-1 text-dim">You can switch at any time without losing a word.</p>
            </div>
            <div role="radiogroup" aria-label="Template" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={templateId === t.id}
                  onClick={() => {
                    setTemplateId(t.id);
                    track("template_selected", { props: { templateId: t.id, from: "onboarding" } });
                  }}
                  className={cn(option(templateId === t.id), "overflow-hidden p-0")}
                >
                  <TemplateFrame src={`/frame/${t.id}/developer`} title={`${t.name} preview`} />
                  <span className="grid gap-1 p-4 pt-2">
                    <span className="font-display text-base font-semibold">{t.name}</span>
                    <span className="text-[0.8125rem] leading-snug text-dim">{t.signature}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {step === 1 ? (
          <section className="grid gap-6" aria-labelledby="step-title">
            <div>
              <h1 id="step-title" ref={heading} tabIndex={-1} className="font-display text-3xl font-bold tracking-tight outline-none">
                How do you want to start?
              </h1>
              <p className="mt-1 text-dim">Sample content is the fastest way to see what a finished portfolio looks like — replace it as you go.</p>
            </div>
            <div role="radiogroup" aria-label="Starting content" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <button type="button" role="radio" aria-checked={start === "blank"} onClick={() => setStart("blank")} className={option(start === "blank")}>
                <FilePlus2 className="size-5 text-brand" aria-hidden="true" />
                <span className="font-semibold">Blank</span>
                <span className="text-sm text-dim">Hero, about, projects and contact — empty and ready.</span>
              </button>
              {SEED_IDS.map((id) => (
                <button key={id} type="button" role="radio" aria-checked={start === id} onClick={() => setStart(id)} className={option(start === id)}>
                  <Badge tone="brand" className="w-fit">Sample</Badge>
                  <span className="font-semibold">{SEEDS[id].label}</span>
                  <span className="text-sm text-dim">{SEEDS[id].description}</span>
                </button>
              ))}
              <label className={cn(option(start === "import"), "cursor-pointer focus-within:ring-2 focus-within:ring-brand")}>
                <FileJson className="size-5 text-brand" aria-hidden="true" />
                <span className="font-semibold">Import JSON</span>
                <span className="text-sm text-dim">{imported ? `Using ${imported.name}` : "Upload a portfolio exported from Persona."}</span>
                <input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
            </div>
            <FieldError>{importError}</FieldError>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="grid max-w-xl gap-6" aria-labelledby="step-title">
            <div>
              <h1 id="step-title" ref={heading} tabIndex={-1} className="font-display text-3xl font-bold tracking-tight outline-none">
                Name your portfolio
              </h1>
              <p className="mt-1 text-dim">Both can be changed later.</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                autoComplete="name"
                aria-invalid={Boolean(formState.errors.name)}
                aria-describedby="name-error"
                {...register("name", {
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    if (!slugTouched.current) setValue("slug", slugify(e.target.value), { shouldValidate: true });
                  },
                })}
              />
              <FieldError id="name-error">{formState.errors.name?.message}</FieldError>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="slug">Address</Label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-dim" aria-hidden="true">/p/</span>
                <Input
                  id="slug"
                  className="font-mono"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={Boolean(formState.errors.slug) || slugState === "taken"}
                  aria-describedby="slug-help slug-error"
                  {...register("slug", { onChange: () => (slugTouched.current = true) })}
                />
              </div>
              <p id="slug-help" className="text-[0.8125rem] text-dim" aria-live="polite">
                {slugState === "checking" ? "Checking availability…" : slugState === "free" ? <span className="text-ok">✓ Available</span> : "Used for your preview link and your Vercel project name."}
              </p>
              <FieldError id="slug-error">{formState.errors.slug?.message ?? (slugState === "taken" ? "That address is taken — try another." : undefined)}</FieldError>
            </div>
            <FieldError>{serverError}</FieldError>
          </section>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-rule pt-6">
          <Button variant="ghost" onClick={() => (step === 0 ? router.push("/dashboard") : setStep(step - 1))}>
            <ArrowLeft /> {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < 2 ? (
            <Button key="next" variant="primary" size="lg" disabled={step === 1 && start === "import" && !imported} onClick={() => setStep(step + 1)}>
              Continue <ArrowRight />
            </Button>
          ) : (
            <Button key="submit" type="submit" variant="primary" size="lg" disabled={formState.isSubmitting || slugState === "taken"}>
              {formState.isSubmitting ? "Creating…" : "Create portfolio"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
