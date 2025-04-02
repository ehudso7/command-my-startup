import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Define schema for login request
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const result = loginSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.format() },
        { status: 400 }
      );
    }
    
    const { email, password } = result.data;
    const supabase = createClient();
    
    // Attempt authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.log(`Login failed for ${email}: ${error.message}`);
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    // Return success response with user and session data
    return NextResponse.json({ 
      user: data.user,
      session: data.session
    });
  } catch (error: any) {
    console.error('Unexpected error during login:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to log in' },
      { status: 500 }
    );
  }
}
