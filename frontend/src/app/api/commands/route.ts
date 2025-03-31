import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";
import { sendMessage } from "@/lib/ai/client";

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

    // Parse request body
    const { projectId, prompt, model = "gpt-4o" } = await request.json();

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

    // Save command to database
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

    // Create system prompt
    const systemPrompt = `You are an AI assistant for Command My Startup, a platform that helps entrepreneurs build and grow their businesses. 
    You are responsible for understanding and executing natural language commands from users.
    Focus on providing actionable steps, clear explanations, and useful resources.
    For technical tasks, provide code snippets or detailed implementation guides when appropriate.
    Format your response in markdown for readability.`;

    // Call AI service
    const response = await sendMessage({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      model,
      temperature: 0.7,
      maxTokens: 4000,
      user: user.id,
    });

    // Update command with response
    const { error: updateError } = await supabase
      .from("commands")
      .update({
        response: response.content,
        status: "completed",
        metadata: {
          tokens: response.usage,
          provider: response.provider,
        },
      })
      .eq("id", commandId);

    if (updateError) {
      console.error("Error updating command:", updateError);
    }

    return NextResponse.json({
      id: commandId,
      content: response.content,
      model: response.model,
      usage: response.usage,
    });
  } catch (error: any) {
    console.error("Command execution error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process command" },
      { status: 500 },
    );
  }
}
