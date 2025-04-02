"use client";

import { createContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Session, User, Provider } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAuthToken,
  getUserProfile,
} from "@/lib/api";
import { AuthContextType, UserProfile } from "@/lib/auth/types";

// Auth refresh interval in milliseconds (10 minutes)
const TOKEN_REFRESH_INTERVAL = 10 * 60 * 1000;

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  signUp: async () => ({ data: null, error: null }),
  signIn: async () => ({ data: null, error: null }),
  signInWithProvider: async () => ({ data: null, error: null }),
  signOut: async () => {},
  resetPassword: async () => {},
  updateProfile: async () => {},
  refreshSession: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await getUserProfile();
      if (profileData) {
        setProfile(profileData);
        return;
      }

      const { data: supabaseProfile } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      setProfile(supabaseProfile);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  useEffect(() => {
    async function getInitialSession() {
      try {
        setIsLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          return;
        }

        if (session) {
          setSession(session);
          setUser(session.user);
          await refreshSession();
          await fetchUserProfile(session.user.id);
        }
      } catch (error) {
        console.error("Error in getInitialSession:", error);
      } finally {
        setIsLoading(false);
      }
    }

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setProfile(null);
        }

        setIsLoading(false);
      }
    );

    const refreshInterval = setInterval(() => {
      if (session) refreshSession();
    }, TOKEN_REFRESH_INTERVAL);

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, []);

  async function signUp(email: string, password: string, fullName: string) {
    setIsLoading(true);
    try {
      const { data, error } = await registerUser(email, password, fullName);
      if (error) throw error;

      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      router.push("/auth/verify");
      return { data, error: null };
    } catch (error: any) {
      console.error("Registration error:", error);
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    setIsLoading(true);
    try {
      const { data, error } = await loginUser(email, password);
      if (error) throw error;

      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      router.push("/");
      return { data, error: null };
    } catch (error: any) {
      console.error("Login error:", error);
      return { data: null, error };
    } finally {
      setIsLoading(false);
    }
  }

  async function signInWithProvider(provider: Provider) {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({ provider });
      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      console.error("OAuth login error:", error);
      return { data: null, error };
    }
  }

  async function signOut() {
    try {
      await logoutUser();
      setSession(null);
      setUser(null);
      setProfile(null);
      router.push("/auth/signin");
    } catch (error: any) {
      console.error("Sign-out error:", error);
    }
  }

  async function resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } catch (error: any) {
      console.error("Password reset error:", error);
    }
  }

  async function updateProfile(updatedProfile: Partial<UserProfile>) {
    try {
      const { error } = await supabase
        .from("users")
        .update(updatedProfile)
        .eq("id", user?.id ?? "");
      if (error) throw error;

      await fetchUserProfile(user?.id ?? "");
    } catch (error: any) {
      console.error("Profile update error:", error);
    }
  }

  async function refreshSession() {
    try {
      const { data, error } = await refreshAuthToken();
      if (error) throw error;

      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        setSession(data.session);
        setUser(data.session.user);
      }
    } catch (error: any) {
      console.error("Session refresh error:", error);
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

export { AuthContext };

