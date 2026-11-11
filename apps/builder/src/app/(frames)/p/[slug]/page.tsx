import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { migrate } from "@runtime/schema/migrate";
import { SlugSchema } from "@runtime/schema/portfolio";
import { TemplateView } from "@runtime/templates/registry";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  if (!SlugSchema.safeParse(slug).success) return null;
  const found = await getStore().getPublished({ slug });
  if (!found) return null;
  try {
    return migrate(found.portfolio);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await load((await params).slug);
  return { title: p ? `${p.meta.title || p.profile.name} — preview` : "Preview not found", robots: { index: false, follow: false } };
}

/** Hosted preview of the PUBLISHED version, for sharing before deploying. Never indexed. */
export default async function HostedPreview({ params }: { params: Promise<{ slug: string }> }) {
  const portfolio = await load((await params).slug);
  if (!portfolio) notFound();
  return <TemplateView portfolio={portfolio} />;
}
