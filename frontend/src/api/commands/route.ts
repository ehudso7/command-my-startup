import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Get commands for the user
    const { data: commands, error } = await supabase
      .from("commands")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ commands });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get commands" },
      { status: 500 },
    );
  }
}

export async function POST(_request: Request) {
  try {
    const supabase = createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get request body
    const body = await _request.json();
    const { name, description, trigger, action } = body;

    // Validate input
    if (!name || !trigger || !action) {
      return NextResponse.json(
        { error: "Name, trigger, and action are required" },
        { status: 400 },
      );
    }

    // Create command
    const { data: command, error } = await supabase
      .from("commands")
      .insert({
        user_id: user.id,
        name,
        description,
        trigger,
        action,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ command });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create command" },
      { status: 500 },
    );
  }
}
