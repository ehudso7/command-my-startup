import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Backend API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Mark this route as dynamic to handle cookies/auth
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const supabase = createClient();
    
    // First, try to login with our backend API
    let backendData = null;
    let backendLoggedIn = false;

    try {
      const backendResponse = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
        credentials: "include", // Include cookies in the request and response
      });

      if (backendResponse.ok) {
        backendData = await backendResponse.json();
        console.log("User logged in with backend successfully", backendData);
        backendLoggedIn = true;
        
        // Forward cookies from backend response to the client
        const cookieHeaders = backendResponse.headers.getSetCookie?.() || 
                             backendResponse.headers.get('set-cookie');
        
        if (cookieHeaders) {
          const response = NextResponse.json({
            message: "Login successful",
            session: backendData.session,
            user: backendData.user,
          });
          
          // Copy cookies from backend to response
          for (const cookie of cookieHeaders) {
            response.headers.append('Set-Cookie', cookie);
          }
          
          return response;
        }
      } else {
        const errorText = await backendResponse.text();
        console.error(`Failed to login with backend: ${errorText}. Status: ${backendResponse.status}. Falling back to Supabase.`);
      }
    } catch (backendError) {
      console.error("Error connecting to backend:", backendError);
      // Continue with Supabase login
    }

    // Also sign in with Supabase Auth as a fallback or parallel auth system
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error && !backendLoggedIn) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Merge data from backend and Supabase
    const resultData = {
      message: "Login successful",
      session: data?.session || backendData?.session,
      user: data?.user || backendData?.user,
    };

    return NextResponse.json(resultData);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Login failed" },
      { status: 500 },
    );
  }
}
