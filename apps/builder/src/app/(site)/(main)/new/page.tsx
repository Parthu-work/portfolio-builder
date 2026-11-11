import type { Metadata } from "next";
import { TEMPLATE_IDS } from "@runtime/templates/meta";
import { requireUser } from "@/lib/auth";
import { Wizard } from "./Wizard";

export const metadata: Metadata = { title: "New portfolio", robots: { index: false } };

export default async function NewPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const { template } = await searchParams;
  const user = await requireUser(template ? `/new?template=${encodeURIComponent(template)}` : "/new");
  return <Wizard initialTemplate={template && TEMPLATE_IDS.includes(template) ? template : null} defaultName={user.name} />;
}
