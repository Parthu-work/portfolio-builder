import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { isAdmin, requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Admin check happens here on the server (ADMIN_EMAILS) and again on every admin API call. */
export default async function AdminPage() {
  const user = await requireUser("/admin");
  if (!isAdmin(user)) notFound();
  return <AdminDashboard />;
}
