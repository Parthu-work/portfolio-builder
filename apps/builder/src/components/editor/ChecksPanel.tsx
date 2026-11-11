"use client";

import { AlertTriangle, CheckCircle2, Circle, Link2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Portfolio } from "@runtime/schema/portfolio";
import { Button } from "@/components/ui";
import { completeness, contentWarnings, type Warning } from "@/lib/checks";
import { api, ApiError } from "@/lib/client";
import { collectUrls, type LinkResult } from "@/lib/links";

export function ChecksPanel({ portfolio, onJump }: { portfolio: Portfolio; onJump: (sectionId: string) => void }) {
  const { checks, percent } = useMemo(() => completeness(portfolio), [portfolio]);
  const warnings = useMemo(() => contentWarnings(portfolio), [portfolio]);
  const [links, setLinks] = useState<{ state: "idle" | "checking" | "done" | "error"; broken: LinkResult[]; total: number; error?: string }>({ state: "idle", broken: [], total: 0 });

  const checkLinks = async () => {
    const urls = collectUrls(portfolio);
    if (!urls.length) return setLinks({ state: "done", broken: [], total: 0 });
    setLinks((l) => ({ ...l, state: "checking" }));
    try {
      const { results } = await api<{ results: LinkResult[] }>("/api/check-links", { body: { urls: urls.slice(0, 40) } });
      setLinks({ state: "done", broken: results.filter((r) => !r.ok), total: results.length });
    } catch (e) {
      setLinks({ state: "error", broken: [], total: 0, error: e instanceof ApiError ? e.message : "Could not check links." });
    }
  };

  const all: Warning[] = [...warnings, ...links.broken.map((b): Warning => ({ id: `link:${b.url}`, kind: "link", message: `Broken link (${b.reason ?? "unreachable"}): ${b.url}` }))];

  return (
    <details className="group rounded-xl border border-rule bg-panel">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
        <div className="grid flex-1 gap-1.5">
          <div className="flex items-center justify-between text-[0.8125rem] font-medium">
            <span id="completeness-label">Completeness</span>
            <span>{percent}%</span>
          </div>
          <div role="progressbar" aria-labelledby="completeness-label" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-1.5 overflow-hidden rounded-full bg-panel2">
            <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${percent}%` }} />
          </div>
        </div>
        {all.length ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full border border-warn/50 px-2 py-0.5 text-xs font-medium text-warn">
            <AlertTriangle className="size-3.5" aria-hidden="true" />
            {all.length} <span className="sr-only">warnings</span>
          </span>
        ) : null}
        <span className="shrink-0 text-xs text-dim group-open:hidden">Show</span>
        <span className="hidden shrink-0 text-xs text-dim group-open:inline">Hide</span>
      </summary>
      <div className="grid gap-4 border-t border-rule p-3">
        <ul className="grid gap-1.5 text-[0.8125rem]">
          {checks.map((c) => (
            <li key={c.id} className={`flex items-center gap-2 ${c.done ? "text-dim" : ""}`}>
              {c.done ? <CheckCircle2 className="size-4 shrink-0 text-ok" aria-hidden="true" /> : <Circle className="size-4 shrink-0 text-dim" aria-hidden="true" />}
              <span>
                {c.label}
                <span className="sr-only">{c.done ? " — done" : " — to do"}</span>
              </span>
            </li>
          ))}
        </ul>
        {all.length ? (
          <ul className="grid gap-1.5 text-[0.8125rem]" aria-label="Warnings">
            {all.map((w) => (
              <li key={w.id} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden="true" />
                {w.sectionId ? (
                  <button type="button" className="break-all text-left underline-offset-2 hover:underline" onClick={() => onJump(w.sectionId!)}>
                    {w.message}
                  </button>
                ) : (
                  <span className="break-all">{w.message}</span>
                )}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={checkLinks} disabled={links.state === "checking"}>
            <Link2 /> {links.state === "checking" ? "Checking links…" : "Check links"}
          </Button>
          <p className="text-xs text-dim" aria-live="polite">
            {links.state === "done" ? (links.broken.length ? `${links.broken.length} of ${links.total} links look broken.` : links.total ? `All ${links.total} links respond.` : "No links to check yet.") : links.state === "error" ? links.error : "Links are tested from our server."}
          </p>
        </div>
      </div>
    </details>
  );
}
