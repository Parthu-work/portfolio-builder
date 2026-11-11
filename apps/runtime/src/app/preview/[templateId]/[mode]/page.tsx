import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { defaultTheme } from "../../../../schema/factory";
import { fixturePortfolio } from "../../../../schema/seeds/fixture";
import { TEMPLATE_IDS } from "../../../../templates/meta";
import { TemplateView } from "../../../../templates/registry";

/**
 * Template test bench: renders the kitchen-sink fixture in any template and
 * mode. Only built when ENABLE_TEMPLATE_PREVIEW=1 (CI / local QA); in a
 * normal deploy these routes do not exist.
 */
const ENABLED = process.env.ENABLE_TEMPLATE_PREVIEW === "1";

export const dynamicParams = false;
export const metadata: Metadata = { robots: { index: false, follow: false } };

export function generateStaticParams() {
  if (!ENABLED) return [{ templateId: "_", mode: "_" }];
  return TEMPLATE_IDS.flatMap((templateId) => ["light", "dark"].map((mode) => ({ templateId, mode })));
}

export default async function PreviewPage({ params }: { params: Promise<{ templateId: string; mode: string }> }) {
  const { templateId, mode } = await params;
  if (!ENABLED || !TEMPLATE_IDS.includes(templateId) || (mode !== "light" && mode !== "dark")) notFound();
  return <TemplateView portfolio={{ ...fixturePortfolio, theme: { ...defaultTheme(templateId), mode } }} />;
}
