"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null;
  isLoading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithProvider: (
    provider: "google" | "github" | "microsoft",
  ) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  refreshSession: () => Promise<void>;
}

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  signUp: async () => {},
  signIn: async () => {},
  signInWithProvider: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  updateProfile: async () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initialize auth state
  useEffect(() => {
    async function getInitialSession() {
      try {
        setIsLoading(true);

        // Get the current session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          return;
        }

        if (session) {
          setSession(session);
          setUser(session.user);

          // Fetch user profile
          const { data: profile } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();

          setProfile(profile);
        }
      } catch (error) {
        console.error("Error in getInitialSession:", error);
      } finally {
        setIsLoading(false);
      }
    }

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Fetch updated profile
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", session.user.id)
          .single();

        setProfile(profile);
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Sign up with email and password
  async function signUp(email: string, password: string, fullName: string) {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      // Navigate to verification page
      router.push("/auth/verify");
    } catch (error: any) {
      console.error("Error signing up:", error);
      throw new Error(error.message || "An error occurred during sign up");
    } finally {
      setIsLoading(false);
    }
  }

  // Sign in with email and password
  async function signIn(email: string, password: string) {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Navigate to dashboard
      router.push("/dashboard");
    } catch (error: any) {
      console.error("Error signing in:", error);
      throw new Error(error.message || "An error occurred during sign in");
    } finally {
      setIsLoading(false);
    }
  }

  // Sign in with third-party provider
  async function signInWithProvider(
    // Use type assertion to make TypeScript happy
    provider: "google" | "github" | "microsoft", 
  ) {
    // Cast the provider to Supabase's Provider type
    const supabaseProvider = provider as any; // This is a workaround for type compatibility
    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: supabaseProvider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Error signing in with provider:", error);
      throw new Error(error.message || "An error occurred during sign in");
    } finally {
      setIsLoading(false);
    }
  }

  // Sign out
  async function signOut() {
    try {
      setIsLoading(true);

      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      // Reset states
      setSession(null);
      setUser(null);
      setProfile(null);

      // Navigate to home page
      router.push("/");
    } catch (error: any) {
      console.error("Error signing out:", error);
      throw new Error(error.message || "An error occurred during sign out");
    } finally {
      setIsLoading(false);
    }
  }

  // Reset password
  async function resetPassword(email: string) {
    try {
      setIsLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Error resetting password:", error);
      throw new Error(
        error.message || "An error occurred during password reset",
      );
    } finally {
      setIsLoading(false);
    }
  }

  // Update user profile
  async function updateProfile(data: any) {
    try {
      setIsLoading(true);

      // Update auth metadata if needed
      if (data.full_name || data.avatar_url) {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            full_name: data.full_name,
            avatar_url: data.avatar_url,
          },
        });

        if (metadataError) throw metadataError;
      }

      // Update profile in database
      const { error: profileError } = await supabase
        .from("users")
        .update(data)
        .eq("id", user?.id);

      if (profileError) throw profileError;

      // Fetch updated profile
      const { data: updatedProfile } = await supabase
        .from("users")
        .select("*")
        .eq("id", user?.id)
        .single();

      setProfile(updatedProfile);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      throw new Error(
        error.message || "An error occurred during profile update",
      );
    } finally {
      setIsLoading(false);
    }
  }

  // Refresh session
  async function refreshSession() {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.refreshSession();

      if (error) throw error;

      setSession(data.session);
      setUser(data.session?.user ?? null);
    } catch (error: any) {
      console.error("Error refreshing session:", error);
      throw new Error(
        error.message || "An error occurred while refreshing session",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isLoading,
        signUp,
        signIn,
        signInWithProvider,
        signOut,
        resetPassword,
        updateProfile,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
