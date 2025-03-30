import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  // Get session
  const { data: { session } } = await supabase.auth.getSession();
  
  // Check auth status
  const isAuthRoute = req.nextUrl.pathname.startsWith('/auth');
  const isApiRoute = req.nextUrl.pathname.startsWith('/api');
  const isProtectedRoute = 
    req.nextUrl.pathname.startsWith('/dashboard') || 
    req.nextUrl.pathname.startsWith('/projects') || 
    req.nextUrl.pathname.startsWith('/chat') ||
    req.nextUrl.pathname.startsWith('/settings');
  
  // Handle auth redirects
  if (isProtectedRoute && !session) {
    // Redirect to login if trying to access protected route without session
    const redirectUrl = new URL('/auth/login', req.url);
    redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }
  
  if (isAuthRoute && session) {
    // Redirect to dashboard if trying to access auth route with session
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  return res;
}

// Only run middleware on specific paths
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)',
  ],
};
