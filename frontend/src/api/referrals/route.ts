import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Get user's referral code
    const { data: referralData, error: referralError } = await supabase
      .from("referrals")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (referralError && referralError.code !== "PGRST116") {
      return NextResponse.json(
        { error: referralError.message },
        { status: 500 },
      );
    }

    // If no referral code exists, create one
    if (!referralData) {
      const referralCode = generateReferralCode();

      const { data: newReferral, error: createError } = await supabase
        .from("referrals")
        .insert({
          user_id: user.id,
          code: referralCode,
          uses: 0,
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json(
          { error: createError.message },
          { status: 500 },
        );
      }

      return NextResponse.json({ referral: newReferral });
    }

    // Get referral uses
    const { data: referralUses, error: usesError } = await supabase
      .from("referral_uses")
      .select("*")
      .eq("referral_id", referralData.id);

    if (usesError) {
      return NextResponse.json({ error: usesError.message }, { status: 500 });
    }

    return NextResponse.json({
      referral: referralData,
      uses: referralUses || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get referral information" },
      { status: 500 },
    );
  }
}

// Helper function to generate a random referral code
function generateReferralCode() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
