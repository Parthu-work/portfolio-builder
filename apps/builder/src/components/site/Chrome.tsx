import Link from "next/link";
import { buttonStyles } from "@/components/ui/styles";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-lg font-bold tracking-tight ${className}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 text-brand">
        <rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" />
        <path d="M8 17V7h4.6a3.4 3.4 0 0 1 0 6.8H8" fill="none" stroke="var(--brand-fg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Persona
    </span>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="Persona home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <Link href="/templates" className={buttonStyles({ variant: "ghost", size: "md" })}>
            Templates
          </Link>
          <Link href="/dashboard" className={`${buttonStyles({ variant: "ghost", size: "md" })} max-sm:hidden`}>
            Dashboard
          </Link>
          <Link href="/new" className={buttonStyles({ variant: "primary", size: "md" })}>
            Start building
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-dim sm:px-6">
        <div className="flex items-center gap-3">
          <Logo className="text-base text-fg" />
          <span>Free, open source, non-commercial.</span>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {[
              ["/templates", "Templates"],
              ["/dashboard", "Dashboard"],
              ["/privacy", "Privacy"],
              ["/terms", "Terms"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href!} className="underline-offset-4 hover:text-fg hover:underline">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
