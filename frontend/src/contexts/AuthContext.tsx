"use client";

import {
  createContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAuthToken,
  getUserProfile,
} from "@/lib/api";
import { AuthContextType } from "@/lib/auth/types";

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

          // Try to refresh the token to ensure it's still valid
          const refreshed = await refreshAuthToken();
          
          if (!refreshed) {
            // If refresh fails, try again with Supabase
            try {
              const { data: refreshData } = await supabase.auth.refreshSession();
              if (refreshData.session) {
                setSession(refreshData.session);
                setUser(refreshData.session.user);
              }
            } catch (refreshError) {
              console.error("Error refreshing with Supabase:", refreshError);
            }
          }

          // Fetch user profile from backend
          const { data: profileData, error: profileError } = await getUserProfile();
          
          if (profileData) {
            setProfile(profileData);
          } else {
            // Fallback to Supabase
            const { data: supabaseProfile } = await supabase
              .from("users")
              .select("*")
              .eq("id", session.user.id)
              .single();

            setProfile(supabaseProfile);
          }
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
        // Fetch updated profile from backend
        const { data: profileData } = await getUserProfile();
        
        if (profileData) {
          setProfile(profileData);
        } else {
          // Fallback to Supabase
          const { data: supabaseProfile } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.user.id)
            .single();

          setProfile(supabaseProfile);
        }
      } else {
        setProfile(null);
      }

      setIsLoading(false);
    });

    // Set up a timer to refresh the token periodically
    const refreshInterval = setInterval(() => {
      if (session) {
        refreshAuthToken().catch(error => {
          console.error("Auto refresh token error:", error);
        });
      }
    }, 10 * 60 * 1000); // Refresh every 10 minutes

    // Cleanup subscription and interval on unmount
    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  // Sign up with email and password
  async function signUp(email: string, password: string, fullName: string) {
    try {
      setIsLoading(true);

      // Register with our backend
      const { data, error } = await registerUser(email, password, fullName);

      if (error) {
        throw new Error(error.message);
      }

      console.log("Registration successful:", data);

      // Supabase auth is handled inside registerUser function now
      // It will be done as a fallback if backend registration fails

      // Check if we need to update the session after registration
      if (data?.session) {
        // Set session in Supabase if not already set
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      } else if (data?.user) {
        // If we got a user but no session, make sure the user is aware they need to verify
        console.log("User registered but needs verification:", data.user);
      }

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

      // Login with our backend
      const { data, error } = await loginUser(email, password);

      if (error) {
        throw new Error(error.message);
      }

      // Update state with the new session
      if (data.session) {
        // Session is already set in Supabase by loginUser function
        
        // Get the user info
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          setSession(session);
          setUser(session.user);
        }

        // Fetch user profile
        const { data: profileData } = await getUserProfile();
        if (profileData) {
          setProfile(profileData);
        }
      }

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

      // Logout from our backend
      await logoutUser();

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
      const { data: profileData } = await getUserProfile();
      if (profileData) {
        setProfile(profileData);
      } else {
        // Fallback to Supabase
        const { data: updatedProfile } = await supabase
          .from("users")
          .select("*")
          .eq("id", user?.id)
          .single();

        setProfile(updatedProfile);
      }
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

      // Try to refresh with our backend first
      const success = await refreshAuthToken();

      if (!success) {
        // If our backend refresh fails, try with Supabase
        const { data, error } = await supabase.auth.refreshSession();

        if (error) throw error;

        setSession(data.session);
        setUser(data.session?.user ?? null);
      } else {
        // Get the updated session from Supabase
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          setSession(session);
          setUser(session.user);
        }
      }
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

// Export just the context and provider
export { AuthContext }
