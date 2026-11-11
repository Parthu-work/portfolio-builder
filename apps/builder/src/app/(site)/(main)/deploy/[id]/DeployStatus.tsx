"use client";

import { ArrowLeft, CheckCircle2, Circle, Download, ExternalLink, Loader2, Rocket } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, buttonStyles } from "@/components/ui";
import { cn } from "@/lib/cn";
import { api, ApiError } from "@/lib/client";
import { track } from "@/lib/track";

type Deployment = { id: string; vercelUrl: string; templateId: string; firstSeenAt: string; lastSeenAt: string };
type Status = { published: boolean; publishedAt: string | null; hasUnpublishedChanges: boolean; deployUrl: string | null; configError: string | null; deployments: Deployment[] };

function Step({ n, title, state, children }: { n: number; title: string; state: "done" | "active" | "todo"; children: React.ReactNode }) {
  return (
    <li className={cn("grid gap-3 rounded-2xl border bg-panel p-5", state === "active" ? "border-brand" : "border-rule")}>
      <h2 className="flex items-center gap-3 font-display text-lg font-semibold">
        {state === "done" ? <CheckCircle2 className="size-6 text-ok" aria-hidden="true" /> : state === "active" ? <span className="grid size-6 place-items-center rounded-full bg-brand text-xs font-bold text-brand-fg">{n}</span> : <Circle className="size-6 text-dim" aria-hidden="true" />}
        {title}
        <span className="sr-only">{state === "done" ? " (done)" : state === "active" ? " (current step)" : ""}</span>
      </h2>
      <div className="grid gap-3 text-sm leading-relaxed text-dim sm:pl-9">{children}</div>
    </li>
  );
}

export function DeployStatus({ id, slug, title }: { id: string; slug: string; title: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [clicked, setClicked] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const known = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await api<Status>(`/api/portfolios/${id}/deployments`);
      setStatus(s);
      if (known.current !== null && s.deployments.length > known.current) toast.success("Your site is live!");
      known.current = s.deployments.length;
    } catch {
      /* keep polling */
    }
  }, [id]);

  useEffect(() => {
    void load();
    // Poll for the build ping while the tab is visible.
    const t = window.setInterval(() => document.visibilityState === "visible" && void load(), 5000);
    return () => window.clearInterval(t);
  }, [load]);

  const publish = async () => {
    setPublishing(true);
    try {
      await api(`/api/portfolios/${id}/publish`, { method: "POST" });
      await load();
      toast.success("Published");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not publish");
    } finally {
      setPublishing(false);
    }
  };

  const live = status?.deployments[0];
  const published = Boolean(status?.published);
  const waiting = clicked && !live;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-10 sm:px-6">
      <div className="grid gap-3">
        <Link href={`/edit/${id}`} className="inline-flex w-fit items-center gap-1 text-sm text-dim underline-offset-4 hover:text-fg hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to the editor
        </Link>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Deploy {title}</h1>
        <p className="text-dim">Your site goes to your own Vercel account and your own GitHub repository. It is free, and it is yours — Persona never hosts it.</p>
      </div>

      {status === null ? (
        <div className="grid gap-3" aria-busy="true">
          <div className="skeleton h-28" />
          <div className="skeleton h-28" />
          <div className="skeleton h-28" />
        </div>
      ) : (
        <ol className="grid gap-4">
          <Step n={1} title="Publish your content" state={published && !status.hasUnpublishedChanges ? "done" : "active"}>
            {published ? (
              status.hasUnpublishedChanges ? (
                <p>You have edits that are not published yet. Deployed sites only ever show the published version.</p>
              ) : (
                <p>Published {status.publishedAt ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(status.publishedAt)) : ""}. Your deployed site refreshes from this within an hour of every publish — no redeploy needed.</p>
              )
            ) : (
              <p>Publishing makes the current draft the version your deployed site shows. Drafts stay private.</p>
            )}
            {!published || status.hasUnpublishedChanges ? (
              <Button variant="primary" className="w-fit" onClick={publish} disabled={publishing}>
                {publishing ? "Publishing…" : published ? "Publish changes" : "Publish"}
              </Button>
            ) : null}
          </Step>

          <Step n={2} title="Deploy to your Vercel account" state={live ? "done" : published ? "active" : "todo"}>
            <p>The button opens Vercel with everything pre-filled. Sign in (a free Hobby account is enough), connect GitHub when asked, and press “Deploy”. That is all.</p>
            {status.deployUrl ? (
              <a
                href={published ? status.deployUrl : undefined}
                aria-disabled={!published}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="deploy-link"
                onClick={() => {
                  if (!published) return;
                  setClicked(true);
                  track("deploy_clicked", { portfolioId: id });
                }}
                className={cn(buttonStyles({ variant: "primary", size: "lg" }), "w-fit", !published && "pointer-events-none opacity-55")}
              >
                <Rocket /> Deploy to Vercel
                <ExternalLink className="size-4" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : (
              <p role="alert" className="rounded-lg border border-warn/50 px-3 py-2 text-fg">
                One-click deploy is not configured on this Persona instance: {status.configError} You can still download the code below and deploy it anywhere.
              </p>
            )}
            {!published ? <p>Publish first — the deploy button unlocks as soon as there is a published version.</p> : null}
          </Step>

          <Step n={3} title={live ? "Your site is live" : "Waiting for your first build"} state={live ? "done" : waiting ? "active" : "todo"}>
            <div aria-live="polite" className="grid gap-3">
              {live ? (
                <>
                  <p className="text-fg">Vercel finished building. Confirmed {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(live.firstSeenAt))}.</p>
                  <ul className="grid gap-2">
                    {status.deployments.map((d) => (
                      <li key={d.id}>
                        <a href={`https://${d.vercelUrl}`} target="_blank" rel="noopener noreferrer" data-testid="live-url" className="inline-flex items-center gap-1.5 font-mono text-[0.9375rem] text-brand underline underline-offset-4">
                          {d.vercelUrl} <ExternalLink className="size-4" aria-hidden="true" />
                          <span className="sr-only">(opens in a new tab)</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              ) : waiting ? (
                <p className="flex items-center gap-2 text-fg">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Waiting for Vercel to finish building — usually about a minute after you press Deploy. This page updates by itself.
                </p>
              ) : (
                <p>When Vercel builds your site, the build sends Persona one small confirmation (your portfolio id, the site address, the template and version — nothing else) and the live address appears here.</p>
              )}
            </div>
          </Step>

          <Step n={4} title="Add a custom domain (optional)" state={live ? "active" : "todo"}>
            <ol className="grid list-decimal gap-1.5 pl-5">
              <li>In Vercel, open your project → <strong className="text-fg">Settings → Domains</strong> and add your domain.</li>
              <li>At your domain registrar, add the DNS record Vercel shows (an <code className="font-mono">A</code> record for the root domain, or a <code className="font-mono">CNAME</code> for <code className="font-mono">www</code>).</li>
              <li>Wait for the green check in Vercel. HTTPS is issued automatically and free.</li>
              <li>Optional: set <code className="font-mono">NEXT_PUBLIC_SITE_URL</code> to your domain in Vercel → Settings → Environment Variables and redeploy, so link previews use it.</li>
            </ol>
          </Step>
        </ol>
      )}

      <section className="grid gap-3 rounded-2xl border border-rule bg-panel p-5" aria-labelledby="zip-h">
        <h2 id="zip-h" className="font-display text-lg font-semibold">
          Prefer to host it yourself?
        </h2>
        <p className="text-sm leading-relaxed text-dim">Download the complete site as a zip, with your content baked in. It is a standard Next.js app (MIT licensed) that runs on any host, with no connection to Persona.</p>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/portfolios/${id}/zip`} className={cn(buttonStyles({ variant: "secondary" }), "w-fit")} data-testid="zip-link">
            <Download /> Download code (.zip)
          </a>
          {published ? (
            <a href={`/p/${slug}`} target="_blank" rel="noopener noreferrer" className={cn(buttonStyles({ variant: "ghost" }), "w-fit")}>
              Open hosted preview <ExternalLink className="size-4" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : null}
        </div>
      </section>
    </div>
  );
}
