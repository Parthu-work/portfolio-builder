import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUser, safeNext } from "@/lib/auth";
import { backendMode } from "@/lib/env";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getUser()) redirect(next);
  return (
    <div className="mx-auto grid w-full max-w-md gap-6 px-4 py-16 sm:py-24">
      <div className="grid gap-2 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight">Sign in to Persona</h1>
        <p className="text-dim">No password to remember. New here? Signing in creates your account.</p>
      </div>
      <LoginForm mode={backendMode()} next={next} error={sp.error === "auth" ? "That sign-in link did not work. Please try again." : undefined} />
    </div>
  );
}
