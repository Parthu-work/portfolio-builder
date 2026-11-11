import Link from "next/link";
import { buttonStyles } from "@/components/ui/styles";

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-xl place-items-center gap-5 px-6 py-28 text-center">
      <p className="font-mono text-sm text-brand">404</p>
      <h1 className="font-display text-4xl font-bold tracking-tight">This page took a different career path.</h1>
      <p className="text-dim">The link may be old, or the portfolio may have been unpublished.</p>
      <Link href="/" className={buttonStyles({ variant: "primary" })}>
        Back to Persona
      </Link>
    </div>
  );
}
