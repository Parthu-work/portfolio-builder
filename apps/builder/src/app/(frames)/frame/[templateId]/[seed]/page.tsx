import { notFound } from "next/navigation";
import { defaultTheme } from "@runtime/schema/factory";
import { SEED_IDS, SEEDS, isSeedId } from "@runtime/schema/seeds";
import { getTemplateMeta, TEMPLATE_IDS } from "@runtime/templates/meta";
import { TemplateView } from "@runtime/templates/registry";

export const dynamicParams = false;

export function generateStaticParams() {
  return TEMPLATE_IDS.flatMap((templateId) => SEED_IDS.map((seed) => ({ templateId, seed })));
}

/** A sample portfolio rendered statically in one template — embedded (as an iframe) by the landing page and gallery. */
export default async function FramePage({ params }: { params: Promise<{ templateId: string; seed: string }> }) {
  const { templateId, seed } = await params;
  if (!TEMPLATE_IDS.includes(templateId) || !isSeedId(seed)) notFound();
  const meta = getTemplateMeta(templateId);
  return <TemplateView portfolio={{ ...SEEDS[seed].portfolio, theme: { ...defaultTheme(templateId), mode: meta.preferredMode } }} />;
}
