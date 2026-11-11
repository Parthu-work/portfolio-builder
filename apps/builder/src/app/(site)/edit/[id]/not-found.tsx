import Link from "next/link";
import { buttonStyles } from "@/components/ui/styles";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="grid gap-4">
        <h1 className="font-display text-3xl font-bold">Portfolio not found</h1>
        <p className="text-dim">It may have been deleted, or it belongs to another account.</p>
        <Link href="/dashboard" className={`${buttonStyles({ variant: "primary" })} mx-auto`}>
          Back to your portfolios
        </Link>
      </div>
    </main>
  );
}
