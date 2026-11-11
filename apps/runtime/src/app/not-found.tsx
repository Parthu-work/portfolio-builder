import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "2rem", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
      <div>
        <h1 style={{ fontSize: "2rem", fontWeight: 700 }}>Page not found</h1>
        <p style={{ marginTop: "0.75rem" }}>
          <Link href="/" style={{ textDecoration: "underline" }}>
            Back to the portfolio
          </Link>
        </p>
      </div>
    </main>
  );
}
