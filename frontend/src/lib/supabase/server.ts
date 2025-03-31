import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  // Synchronously get cookies - not Promise in newer Next.js
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          // Using synchronous cookieStore API
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          // @ts-ignore - Next.js types don't match Supabase expectations
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          // @ts-ignore - Next.js types don't match Supabase expectations
          cookieStore.set({ name, value: "", ...options });
        },
      },
    },
  );
}
