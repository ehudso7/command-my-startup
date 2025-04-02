import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Mark this route as dynamic to handle cookies/auth
export const dynamic = 'force-dynamic';

// Input validation schema
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

export async function POST(request: Request) {
  try {
    // Validate input
    const body = await request.json();
    const result = loginSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ 
        error: "Invalid input", 
        details: result.error.format() 
      }, { status: 400 });
    }
    
    const { email, password } = result.data;
    const supabase = createClient();
    
    // Try backend authentication first
    let backendData = null;
    let backendLoggedIn = false;

    try {
      const backendResponse = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      if (backendResponse.ok) {
        backendData = await backendResponse.json();
        backendLoggedIn = true;
        
        // Forward cookies from backend response
        const cookieHeader = backendResponse.headers.get('set-cookie');
        
        if (cookieHeader) {
          const response = NextResponse.json({
            message: "Login successful",
            session: backendData.session,
            user: backendData.user,
          });
          
          // Set the cookies directly
          response.headers.set('Set-Cookie', cookieHeader);
          return response;
        }
      }
    } catch (backendError) {
      // Continue with Supabase login
    }

    // Fall back to Supabase Auth if backend failed
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error && !backendLoggedIn) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Combine data from both auth systems if needed
    return NextResponse.json({
      message: "Login successful",
      session: data?.session || backendData?.session,
      user: data?.user || backendData?.user,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Authentication service error" },
      { status: 500 },
    );
  }
}
