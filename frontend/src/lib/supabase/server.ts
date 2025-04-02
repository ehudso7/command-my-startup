import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "@/types/supabase";

export function createClient() {
  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const cookieStore = cookies();

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ 
            name, 
            value, 
            ...options,
            // Convert MaxAge to seconds if provided
            ...(options?.maxAge && { maxAge: options.maxAge })
          });
        },
        remove(name, options) {
          cookieStore.set({ 
            name, 
            value: "", 
            ...options,
            maxAge: 0 
          });
        },
      },
    },
  );
}
