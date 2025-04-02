import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Mark this route as dynamic to handle cookies/auth
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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
    const body = await request.json();
    const { message, conversationId } = body;

    // Here you would add your AI chat logic
    // For example, calling an AI service like OpenAI

    // Save message to database
    const { data: newMessage, error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        content: message,
        role: "user",
      })
      .select()
      .single();

    if (messageError) {
      return NextResponse.json(
        { error: messageError.message },
        { status: 500 },
      );
    }

    // Placeholder for AI response
    const aiResponse = "This is a placeholder AI response.";

    // Save AI response to database
    const { data: aiMessage, error: aiError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        content: aiResponse,
        role: "assistant",
      })
      .select()
      .single();

    if (aiError) {
      return NextResponse.json({ error: aiError.message }, { status: 500 });
    }

    return NextResponse.json({
      userMessage: newMessage,
      aiMessage: aiMessage,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process chat" },
      { status: 500 },
    );
  }
}
