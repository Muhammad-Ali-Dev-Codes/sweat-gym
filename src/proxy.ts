import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

const publicRoutes = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];
const authRoutes = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email"];

/**
 * Mutating-request flood guard (server actions POST to page routes, API
 * routes POST to /api/*). Generous by design — it stops floods and runaway
 * loops, never normal usage. Keyed by client IP; behind a proxy the
 * x-forwarded-for hop is set by our own deployment platform.
 */
const MUTATION_LIMIT_PER_MINUTE = 240;
const MUTATION_WINDOW_MS = 60_000;

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function proxy(request: NextRequest) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next();
  }

  if (request.method === "POST") {
    const limit = rateLimit(
      `mutation:${clientIp(request)}`,
      MUTATION_LIMIT_PER_MINUTE,
      MUTATION_WINDOW_MS
    );
    if (!limit.ok) {
      const headers = { "Retry-After": String(limit.retryAfterSeconds) };
      const pathname = request.nextUrl.pathname;
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Too many requests" },
          { status: 429, headers }
        );
      }
      return new NextResponse("Too many requests", { status: 429, headers });
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // The protected server layout and API handlers perform the authoritative
  // auth check. Middleware only needs the local cookie session to avoid adding
  // a network auth round-trip before every page render.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const pathname = request.nextUrl.pathname;
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith("/auth/"));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isPublicRoute && !user) {
    // API callers get a machine-readable rejection, not an HTML redirect.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
