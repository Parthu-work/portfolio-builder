import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { DeployStatus } from "./DeployStatus";

export const metadata: Metadata = { title: "Deploy", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function DeployPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const user = await requireUser(`/deploy/${id}`);
  const row = await getStore().getPortfolio(user.id, id);
  if (!row) notFound();
  return <DeployStatus id={row.id} slug={row.slug} title={row.draft.meta.title || row.draft.profile.name || "your portfolio"} />;
}
