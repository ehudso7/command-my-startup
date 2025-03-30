import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';
import { sendMessage, hasModelAccess, AVAILABLE_MODELS } from '@/lib/ai/client';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Get user's subscription tier
    const { data: userProfile } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    
    const userTier = userProfile?.subscription_tier || 'free';
    
    // Parse request body
    const {
      conversationId,
      messages,
      model = 'gpt-3.5-turbo',
      temperature = 0.7,
      projectId,
    } = await request.json();
    
    // Check if user has access to the model
    if (!hasModelAccess(model, userTier as any)) {
      return NextResponse.json(
        { error: `Your subscription tier (${userTier}) does not have access to this model` },
        { status: 403 }
      );
    }
    
    // Check if conversation exists
    let actualConversationId = conversationId;
    
    if (!actualConversationId) {
      // Create a new conversation
      const { data: newConversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          project_id: projectId || null,
          title: messages[0]?.content.substring(0, 50) || 'New conversation',
        })
        .select()
        .single();
      
      if (conversationError) {
        return NextResponse.json(
          { error: conversationError.message },
          { status: 500 }
        );
      }
      
      actualConversationId = newConversation.id;
    }
    
    // Save user message to database
    const userMessageId = uuidv4();
    const { error: userMessageError } = await supabase
      .from('messages')
      .insert({
        id: userMessageId,
        conversation_id: actualConversationId,
        content: messages[messages.length - 1].content,
        sender: 'user',
      });
    
    if (userMessageError) {
      return NextResponse.json(
        { error: userMessageError.message },
        { status: 500 }
      );
    }
    
    // Call AI service
    const response = await sendMessage({
      messages,
      model,
      temperature,
      maxTokens: 2000,
      user: user.id,
    });
    
    // Save AI response to database
    const aiMessageId = uuidv4();
    const { error: aiMessageError } = await supabase
      .from('messages')
      .insert({
        id: aiMessageId,
        conversation_id: actualConversationId,
        content: response.content,
        sender: 'assistant',
        model: response.model,
        metadata: {
          tokens: response.usage,
          provider: response.provider,
        },
      });
    
    if (aiMessageError) {
      return NextResponse.json(
        { error: aiMessageError.message },
        { status: 500 }
      );
    }
    
    // Update conversation title if it's a new conversation
    if (!conversationId) {
      // Generate a title for the conversation
      const titleResponse = await sendMessage({
        messages: [
          { role: 'system', content: 'You are a helpful assistant. Generate a very short title (max 6 words) for this conversation based on the user\'s first message.' },
          { role: 'user', content: messages[messages.length - 1].content },
        ],
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 50,
        user: user.id,
      });
      
      await supabase
        .from('conversations')
        .update({ title: titleResponse.content.replace(/["']/g, '') })
        .eq('id', actualConversationId);
    }
    
    return NextResponse.json({
      id: response.id,
      conversationId: actualConversationId,
      content: response.content,
      model: response.model,
      usage: response.usage,
    });
  } catch (error: any) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
