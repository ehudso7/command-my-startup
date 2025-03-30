import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    
    // Parse request body
    const { name, type, size, url, project_id, command_id } = await request.json();
    
    // Save file metadata to database
    const { data, error } = await supabase
      .from('files')
      .insert({
        name,
        type,
        size,
        url,
        user_id: user.id,
        project_id: project_id || null,
        command_id: command_id || null
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ file: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save file metadata' },
      { status: 500 }
    );
  }
}
