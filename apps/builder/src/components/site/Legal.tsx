import type { ReactNode } from "react";

export function Legal({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <article className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-14 sm:px-6 md:py-20">
      <header className="grid gap-2">
        <h1 className="font-display text-[clamp(2.25rem,5vw,3.5rem)] font-extrabold leading-none tracking-[-0.035em]">{title}</h1>
        <p className="text-sm text-dim">Last updated {updated}</p>
      </header>
      <div className="rich text-[1.0625rem] leading-[1.75]">{children}</div>
    </article>
  );
}
