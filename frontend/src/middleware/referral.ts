import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/auth-helpers-nextjs";

export async function referralMiddleware(req: NextRequest) {
  // Check for referral code
  const { searchParams } = new URL(req.url);
  const refCode = searchParams.get("ref");

  if (!refCode) {
    return null; // No referral code, continue
  }

  // Store referral code in cookies for later use during signup
  const response = NextResponse.next();
  response.cookies.set("referral_code", refCode, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
