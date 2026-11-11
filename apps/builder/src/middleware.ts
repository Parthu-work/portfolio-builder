import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * 1. CSRF protection for every mutating API call: the request must come from
 *    our own origin, and (except for sendBeacon analytics) carry a custom
 *    header that cross-site forms cannot set. Public, unauthenticated
 *    endpoints under /api/public are exempt (they use no cookies).
 * 2. Keeps the Supabase session cookie fresh.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/") && MUTATING.has(req.method) && !pathname.startsWith("/api/public/")) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    let sameOrigin = false;
    try {
      sameOrigin = Boolean(origin && host && new URL(origin).host === host);
    } catch {
      sameOrigin = false;
    }
    const hasHeader = req.headers.get("x-persona-csrf") === "1" || pathname === "/api/track";
    if (!sameOrigin || !hasHeader) {
      return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
    }
  }

  const res = NextResponse.next({ request: req });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key && req.cookies.getAll().some((c) => c.name.startsWith("sb-"))) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value, options } of list) res.cookies.set(name, value, options);
        },
      },
    });
    await supabase.auth.getUser();
  }
  return res;
}

export const config = {
  matcher: ["/api/:path*", "/dashboard/:path*", "/edit/:path*", "/new", "/admin/:path*", "/deploy/:path*", "/login"],
};
