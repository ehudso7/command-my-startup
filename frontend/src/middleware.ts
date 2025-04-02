import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

// Mark this route as dynamic to handle cookies/auth
export const dynamic = 'force-dynamic';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Validate environment variables
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    console.error("Supabase environment variables not configured");
    return res;
  }

  try {
    // Create Supabase client with minimal configuration
    const supabase = createMiddlewareClient({ req, res });

    // Get session
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Session error:", error.message);
      return res;
    }

    // Route checks
    const isAuthRoute = req.nextUrl.pathname.startsWith("/auth");
    const isApiRoute = req.nextUrl.pathname.startsWith("/api");
    const isProtectedRoute =
      req.nextUrl.pathname.startsWith("/dashboard") ||
      req.nextUrl.pathname.startsWith("/projects") ||
      req.nextUrl.pathname.startsWith("/chat") ||
      req.nextUrl.pathname.startsWith("/settings");

    // Handle auth redirects
    if (isProtectedRoute && !session) {
      const redirectUrl = new URL("/auth/login", req.url);
      redirectUrl.searchParams.set("redirect", req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (isAuthRoute && session) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return res;
  } catch (error) {
    console.error("Middleware error:", error);
    return res;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
