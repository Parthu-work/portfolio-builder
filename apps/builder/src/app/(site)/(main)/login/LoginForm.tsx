"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, FieldError, Input, Label } from "@/components/ui";
import { api, ApiError } from "@/lib/client";

const Schema = z.object({ email: z.string().trim().min(1, "Enter your email").email("Enter a valid email address") });
type Values = z.infer<typeof Schema>;

export function LoginForm({ mode, next, error }: { mode: "supabase" | "local" | "unconfigured"; next: string; error?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<{ tone: "ok" | "bad"; text: string } | null>(error ? { tone: "bad", text: error } : null);
  const { register, handleSubmit, formState } = useForm<Values>({ resolver: zodResolver(Schema), defaultValues: { email: "" } });
  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const onSubmit = handleSubmit(async ({ email }) => {
    setMessage(null);
    try {
      if (mode === "local") {
        await api("/api/local-auth", { body: { email } });
        router.replace(next);
        router.refresh();
        return;
      }
      const { browserClient } = await import("@/lib/supabase/browser");
      const { error: e } = await browserClient()!.auth.signInWithOtp({ email, options: { emailRedirectTo: callback() } });
      if (e) throw new Error(e.message);
      setMessage({ tone: "ok", text: `Check ${email} — we sent you a sign-in link.` });
    } catch (e) {
      setMessage({ tone: "bad", text: e instanceof ApiError || e instanceof Error ? e.message : "Could not sign in." });
    }
  });

  const oauth = async (provider: "github" | "google") => {
    const { browserClient } = await import("@/lib/supabase/browser");
    const { error: e } = await browserClient()!.auth.signInWithOAuth({ provider, options: { redirectTo: callback() } });
    if (e) setMessage({ tone: "bad", text: e.message });
  };

  if (mode === "unconfigured") {
    return (
      <div role="alert" className="rounded-2xl border border-warn/50 bg-panel p-5 text-sm leading-relaxed">
        <p className="font-semibold">Sign-in is not configured yet.</p>
        <p className="mt-2 text-dim">
          The site owner needs to set <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code>, <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> and{" "}
          <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code>. See the README for the five-minute setup.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5 rounded-2xl border border-rule bg-panel p-6 shadow-sm">
      {mode === "supabase" ? (
        <>
          <div className="grid gap-2">
            <Button size="lg" onClick={() => oauth("github")}>
              Continue with GitHub
            </Button>
            <Button size="lg" onClick={() => oauth("google")}>
              Continue with Google
            </Button>
          </div>
          <p className="flex items-center gap-3 text-xs uppercase tracking-wider text-dim before:h-px before:flex-1 before:bg-rule after:h-px after:flex-1 after:bg-rule">or</p>
        </>
      ) : (
        <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm">
          <strong>Local mode.</strong> No Supabase project is configured, so any email signs you in instantly. Data is stored in <code className="font-mono">.data/</code>.
        </p>
      )}
      <form onSubmit={onSubmit} noValidate className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" aria-invalid={Boolean(formState.errors.email)} aria-describedby="email-error" {...register("email")} />
          <FieldError id="email-error">{formState.errors.email?.message}</FieldError>
        </div>
        <Button type="submit" variant="primary" size="lg" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? "One moment…" : mode === "local" ? "Sign in" : "Email me a sign-in link"}
        </Button>
      </form>
      <div aria-live="polite">{message ? <p className={`text-sm ${message.tone === "ok" ? "text-ok" : "text-bad"}`}>{message.text}</p> : null}</div>
    </div>
  );
}
