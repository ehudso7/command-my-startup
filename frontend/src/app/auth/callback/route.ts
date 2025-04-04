import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Mark this route as dynamic to handle cookies/auth
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient();

    // Exchange the code for a session
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to dashboard
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
