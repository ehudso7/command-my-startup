import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    
    const supabase = createClient();
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`
    });
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Password reset email sent. Please check your inbox.'
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Password reset failed' },
      { status: 500 }
    );
  }
}
