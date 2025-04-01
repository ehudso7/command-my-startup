import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";
import { executeCommand } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    // Get current user and session
    const {
      data: { user, session },
    } = await supabase.auth.getUser();

    if (!user || !session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const { projectId, prompt, model = "gpt-3.5-turbo", systemPrompt, temperature, maxTokens } = await request.json();

    // Validate project if provided
    if (projectId) {
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .eq("owner_id", user.id)
        .single();

      if (projectError) {
        return NextResponse.json(
          { error: "Project not found or access denied" },
          { status: 404 },
        );
      }
    }

    // Save command to database with pending status
    const commandId = uuidv4();
    const { error: commandError } = await supabase.from("commands").insert({
      id: commandId,
      project_id: projectId || null,
      user_id: user.id,
      prompt,
      status: "processing",
      model,
    });

    if (commandError) {
      return NextResponse.json(
        { error: commandError.message },
        { status: 500 },
      );
    }

    // Create default system prompt if none provided
    const defaultSystemPrompt = systemPrompt || 
      `You are an AI assistant for Command My Startup, a platform that helps entrepreneurs build and grow their businesses. 
      You are responsible for understanding and executing natural language commands from users.
      Focus on providing actionable steps, clear explanations, and useful resources.
      For technical tasks, provide code snippets or detailed implementation guides when appropriate.
      Format your response in markdown for readability.`;

    // Call backend API instead of directly calling AI services
    const { data: responseData, error: apiError } = await executeCommand(
      prompt,
      model,
      defaultSystemPrompt,
      temperature || 0.7,
      maxTokens || 4000
    );

    if (apiError) {
      // Update command with error status
      await supabase
        .from("commands")
        .update({
          status: "failed",
          metadata: {
            error: apiError.message
          },
        })
        .eq("id", commandId);

      return NextResponse.json(
        { error: apiError.message },
        { status: apiError.status || 500 },
      );
    }

    // Update command with response from backend
    const { error: updateError } = await supabase
      .from("commands")
      .update({
        response: responseData?.content,
        status: "completed",
        metadata: {
          tokens_used: responseData?.tokens_used,
          model: responseData?.model,
        },
      })
      .eq("id", commandId);

    if (updateError) {
      console.error("Error updating command:", updateError);
    }

    return NextResponse.json({
      id: commandId,
      content: responseData?.content,
      model: responseData?.model,
      created_at: responseData?.created_at,
      tokens_used: responseData?.tokens_used
    });
  } catch (error: any) {
    console.error("Command execution error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process command" },
      { status: 500 },
    );
  }
}
