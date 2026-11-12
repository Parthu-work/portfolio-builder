"use client";

import { useEffect } from "react";
import { buttonStyles } from "@/components/ui/styles";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="mx-auto grid max-w-xl place-items-center gap-5 px-6 py-28 text-center">
      <h1 className="font-display text-3xl font-bold tracking-tight">Something broke on our side.</h1>
      <p className="text-dim">Your work is saved as you type, so nothing is lost. Try again in a moment.</p>
      {error.digest ? <p className="font-mono text-xs text-dim">Reference: {error.digest}</p> : null}
      <button type="button" className={buttonStyles({ variant: "primary" })} onClick={reset}>
        Try again
      </button>
    </div>
  );
}
