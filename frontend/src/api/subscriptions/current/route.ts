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

    // Get the user's subscription
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select(
        `
        *,
        plans(*)
      `,
      )
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (subError && subError.code !== "PGRST116") {
      return NextResponse.json({ error: subError.message }, { status: 500 });
    }

    return NextResponse.json({
      subscription: subscription || null,
      has_active_subscription: !!subscription,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get subscription" },
      { status: 500 },
    );
  }
}
