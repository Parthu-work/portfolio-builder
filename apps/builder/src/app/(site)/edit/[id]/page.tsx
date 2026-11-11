import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { migrate } from "@runtime/schema/migrate";
import { Editor } from "@/components/editor/Editor";
import { requireUser } from "@/lib/auth";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Editor", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const user = await requireUser(`/edit/${id}`);
  const row = await getStore().getPortfolio(user.id, id);
  if (!row) notFound();
  return <Editor id={row.id} userId={user.id} initial={migrate(row.draft)} initialPublishedAt={row.publishedAt} initialPublished={row.published ? migrate(row.published) : null} />;
}
