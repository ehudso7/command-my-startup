import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";
import { sendMessage, hasModelAccess, AVAILABLE_MODELS } from "@/lib/ai/client";
import { executeCommand } from "@/lib/api";

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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

    // Get user's subscription tier
    const { data: userProfile } = await supabase
      .from("users")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    const userTier = userProfile?.subscription_tier || "free";

    // Parse request body
    const {
      conversationId,
      messages,
      model = "gpt-3.5-turbo",
      temperature = 0.7,
      projectId,
    } = await request.json();

    // Validate model
    const modelObj = AVAILABLE_MODELS.find(m => m.id === model);
    if (!modelObj) {
      return NextResponse.json(
        { error: "Invalid model specified" },
        { status: 400 },
      );
    }

    // Check if user has access to the model
    if (!hasModelAccess(model, userTier as any)) {
      return NextResponse.json(
        {
          error: `Your subscription tier (${userTier}) does not have access to this model`,
        },
        { status: 403 },
      );
    }

    // Check if conversation exists
    let actualConversationId = conversationId;

    if (!actualConversationId) {
      // Create a new conversation
      const { data: newConversation, error: conversationError } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          project_id: projectId || null,
          title: messages[messages.length - 1]?.content?.substring(0, 50) || "New conversation",
        })
        .select()
        .single();

      if (conversationError) {
        return NextResponse.json(
          { error: conversationError.message },
          { status: 500 },
        );
      }

      actualConversationId = newConversation.id;
    }

    // Save user message to database
    const userMessageId = uuidv4();
    const { error: userMessageError } = await supabase.from("messages").insert({
      id: userMessageId,
      conversation_id: actualConversationId,
      content: messages[messages.length - 1].content,
      sender: "user",
    });

    if (userMessageError) {
      return NextResponse.json(
        { error: userMessageError.message },
        { status: 500 },
      );
    }

    // Get system message
    const systemMessage = messages.find(msg => msg.role === "system")?.content || 
      `You are a helpful AI assistant for Command My Startup, a platform that helps entrepreneurs build and grow their businesses. 
      Provide clear, concise, and helpful responses. You can use markdown formatting in your responses.`;

    // Extract the latest user message
    const userMessage = messages[messages.length - 1].content;

    // Try to call our backend API first
    let backendResponse = null;
    let aiResponse = null;

    try {
      // Call our backend API
      const { data, error } = await executeCommand(
        userMessage,
        model,
        systemMessage,
        temperature,
        2000
      );

      if (data && !error) {
        backendResponse = data;
        console.log("Successfully used backend API for command", data);
      }
    } catch (backendError) {
      console.error("Error calling backend API:", backendError);
      // Fallback to direct AI service call
    }

    // If backend failed, fallback to direct AI service
    if (!backendResponse) {
      try {
        console.log("Using direct AI service as fallback");
        aiResponse = await sendMessage({
          messages,
          model,
          temperature,
          maxTokens: 2000,
          user: user.id,
        });
      } catch (error) {
        console.error("AI service error:", error);
        return NextResponse.json(
          { error: "Failed to communicate with AI service" },
          { status: 502 },
        );
      }
    }

    // Use the response from either backend or direct AI call
    const response = backendResponse || aiResponse;

    if (!response) {
      return NextResponse.json(
        { error: "Failed to generate response from any AI source" },
        { status: 500 },
      );
    }

    // Save AI response to database
    const aiMessageId = uuidv4();
    const { error: aiMessageError } = await supabase.from("messages").insert({
      id: aiMessageId,
      conversation_id: actualConversationId,
      content: response.content,
      sender: "assistant",
      model: response.model || model,
      metadata: {
        tokens_used: response.tokens_used || response.usage,
        source: backendResponse ? "backend" : "direct",
      },
    });

    if (aiMessageError) {
      return NextResponse.json(
        { error: aiMessageError.message },
        { status: 500 },
      );
    }

    // Update conversation title if it's a new conversation
    if (!conversationId) {
      try {
        // Try to use backend for title generation
        let titleContent = null;
        
        try {
          const { data } = await executeCommand(
            messages[messages.length - 1].content,
            "gpt-3.5-turbo",
            "Generate a very short title (max 6 words) for this conversation based on the user's message.",
            0.7,
            50
          );
          
          if (data) {
            titleContent = data.content;
          }
        } catch (e) {
          console.error("Error using backend for title generation:", e);
        }
        
        // Fallback to direct AI
        if (!titleContent) {
          const titleResponse = await sendMessage({
            messages: [
              {
                role: "system",
                content:
                  "Generate a very short title (max 6 words) for this conversation based on the user's message.",
              },
              { role: "user", content: messages[messages.length - 1].content },
            ],
            model: "gpt-3.5-turbo",
            temperature: 0.7,
            maxTokens: 50,
            user: user.id,
          });
          
          titleContent = titleResponse.content;
        }

        await supabase
          .from("conversations")
          .update({ title: titleContent.replace(/["']/g, "") })
          .eq("id", actualConversationId);
      } catch (error) {
        console.error("Failed to generate conversation title:", error);
        // Not critical, so we continue
      }
    }

    return NextResponse.json({
      id: response.id || aiMessageId,
      conversationId: actualConversationId,
      content: response.content,
      model: response.model || model,
      usage: response.tokens_used || response.usage,
    });
  } catch (error: any) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process chat request" },
      { status: 500 },
    );
  }
}
