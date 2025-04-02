import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

// Mark this route as dynamic to handle cookies/auth
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("users")
      .select("referral_code")
      .eq("id", user.id)
      .single();

    let referralCode = profile?.referral_code;

    // If no referral code exists, generate one
    if (!referralCode) {
      // Generate a short, readable code
      referralCode =
        `${user.id.substring(0, 4)}-${uuidv4().substring(0, 6)}`.toLowerCase();

      // Save to database
      await supabase
        .from("users")
        .update({ referral_code: referralCode })
        .eq("id", user.id);
    }

    return NextResponse.json({ code: referralCode });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get referral code" },
      { status: 500 },
    );
  }
}
