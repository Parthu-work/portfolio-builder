import type { Metadata } from "next";
import Link from "next/link";
import { getTemplateMeta } from "@runtime/templates/meta";
import { buttonStyles } from "@/components/ui/styles";
import { isAdmin, requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { PortfolioCard, SignOutButton } from "./DashboardClient";

export const metadata: Metadata = { title: "Your portfolios", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await requireUser("/dashboard");
  const store = getStore();
  const rows = await store.listPortfolios(user.id);
  const cards = await Promise.all(
    rows.map(async (r) => {
      const deployments = await store.listDeployments(user.id, r.id);
      return {
        id: r.id,
        slug: r.slug,
        title: r.draft.meta.title || r.draft.profile.name || "Untitled",
        templateName: getTemplateMeta(r.templateId).name,
        updatedAt: r.updatedAt,
        publishedAt: r.publishedAt,
        unpublishedChanges: Boolean(r.published) && JSON.stringify(r.published) !== JSON.stringify(r.draft),
        liveUrl: deployments[0] ? `https://${deployments[0].vercelUrl}` : null,
      };
    }),
  );
  return (
    <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Your portfolios</h1>
          <p className="mt-1 text-sm text-dim">Signed in as {user.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isAdmin(user) ? (
            <Link href="/admin" className={buttonStyles({ variant: "secondary" })}>
              Admin
            </Link>
          ) : null}
          <SignOutButton />
          <Link href="/new" className={buttonStyles({ variant: "primary" })}>
            New portfolio
          </Link>
        </div>
      </div>
      {cards.length === 0 ? (
        <div className="grid place-items-center gap-4 rounded-2xl border border-dashed border-edge px-6 py-20 text-center">
          <h2 className="font-display text-xl font-semibold">Nothing here yet</h2>
          <p className="max-w-sm text-dim">Pick a template, fill in the form, and you will have a live site in about ten minutes.</p>
          <Link href="/new" className={buttonStyles({ variant: "primary", size: "lg" })}>
            Create your first portfolio
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <PortfolioCard key={c.id} card={c} />
          ))}
        </ul>
      )}
    </div>
  );
}
