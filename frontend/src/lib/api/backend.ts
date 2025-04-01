/**
 * Backend API client for communicating with our backend service
 */

import { supabase } from "@/lib/supabase/client";

// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Is token refresh in progress
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

// Response interfaces
export interface ApiResponse<T> {
  data?: T;
  error?: {
    message: string;
    status: number;
  };
}

export interface CommandResponse {
  id: string;
  content: string;
  model: string;
  created_at: string;
  tokens_used?: number;
}

/**
 * Refresh access token using refresh token
 */
async function refreshToken(): Promise<boolean> {
  // Use a single refresh operation if multiple requests need a refresh
  if (isRefreshing) {
    return refreshPromise as Promise<boolean>;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      // Get refresh token from Supabase
      const { data: sessionData } = await supabase.auth.getSession();
      const refreshToken = sessionData.session?.refresh_token;

      if (!refreshToken) {
        console.error("No refresh token available");
        return false;
      }

      // Call backend refresh endpoint
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include", // Include cookies
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (response.ok) {
        const refreshData = await response.json();
        console.log("Backend token refresh successful");

        // Update Supabase session with new token
        await supabase.auth.setSession({
          access_token: refreshData.access_token,
          refresh_token: refreshToken,
        });

        return true;
      }
      
      console.log("Backend token refresh failed, trying frontend API");
      
      // Try frontend API route as fallback
      const backupResponse = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!backupResponse.ok) {
        console.error("Failed to refresh token via frontend API");
        // If token refresh fails with both methods, try Supabase's built-in refresh
        const { error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error("All token refresh methods failed, signing out");
          await supabase.auth.signOut();
          return false;
        }
        
        console.log("Supabase token refresh successful");
        return true;
      }

      const backupData = await backupResponse.json();

      // Update Supabase session with new token
      await supabase.auth.setSession({
        access_token: backupData.access_token,
        refresh_token: refreshToken,
      });

      return true;
    } catch (error) {
      console.error("Error refreshing token:", error);
      return false;
    } finally {
      isRefreshing = false;
    }
  })();

  return refreshPromise;
}

/**
 * Make an authenticated API request with token refresh support
 */
async function apiRequest<T>(
  url: string,
  options: RequestInit,
  retries = 1
): Promise<ApiResponse<T>> {
  try {
    // Get current session
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      return {
        error: {
          message: "Not authenticated",
          status: 401,
        },
      };
    }

    // Add token to headers
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };

    // Make the request
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // Include cookies
    });

    // Handle 401 (Unauthorized) - possibly expired token
    if (response.status === 401 && retries > 0) {
      const success = await refreshToken();
      if (success) {
        // Retry the request with new token
        return apiRequest(url, options, retries - 1);
      }
    }

    // Parse response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: {
          message: errorData.error?.message || errorData.detail || "API request failed",
          status: response.status,
        },
      };
    }

    // Success
    const data = await response.json();
    return { data };
  } catch (error: any) {
    console.error("API request error:", error);
    return {
      error: {
        message: error.message || "Failed to make API request",
        status: 500,
      },
    };
  }
}

/**
 * Execute a command using the backend API
 */
export async function executeCommand(
  prompt: string,
  model: string,
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ApiResponse<CommandResponse>> {
  return apiRequest<CommandResponse>(
    `${API_URL}/api/commands`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        model,
        system_prompt: systemPrompt,
        temperature,
        max_tokens: maxTokens,
      }),
    }
  );
}

/**
 * Get user profile from the backend API
 */
export async function getUserProfile(): Promise<ApiResponse<any>> {
  const response = await apiRequest<{ profile: any }>(
    `${API_URL}/api/profile`,
    {
      method: "GET",
    }
  );

  if (response.data?.profile) {
    return { data: response.data.profile };
  }

  return response;
}

/**
 * Get API keys for the user
 */
export async function getApiKeys(): Promise<ApiResponse<any[]>> {
  return apiRequest<any[]>(`${API_URL}/api/profile/api-keys`, {
    method: "GET",
  });
}

/**
 * Create a new API key
 */
export async function createApiKey(name: string): Promise<ApiResponse<any>> {
  return apiRequest<any>(
    `${API_URL}/api/profile/api-keys?name=${encodeURIComponent(name)}`,
    {
      method: "POST",
    }
  );
}

/**
 * Delete an API key
 */
export async function deleteApiKey(keyId: string): Promise<ApiResponse<any>> {
  return apiRequest<any>(`${API_URL}/api/profile/api-keys/${keyId}`, {
    method: "DELETE",
  });
}

/**
 * Get command history
 */
export async function getCommandHistory(
  limit = 50,
  offset = 0,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<any[]>> {
  // Build query string
  let url = `${API_URL}/api/history?limit=${limit}&offset=${offset}`;
  if (startDate) url += `&start_date=${startDate}`;
  if (endDate) url += `&end_date=${endDate}`;

  return apiRequest<any[]>(url, {
    method: "GET",
  });
}

/**
 * Get usage statistics
 */
export async function getUsageStats(period: string = "week"): Promise<ApiResponse<any>> {
  return apiRequest<any>(`${API_URL}/api/history/stats?period=${period}`, {
    method: "GET",
  });
}

/**
 * Explicitly refresh the token (can be called when app loads)
 */
export async function refreshAuthToken(): Promise<boolean> {
  return refreshToken();
}

/**
 * Register a new user with the backend
 */
export async function registerUser(
  email: string,
  password: string,
  fullName: string
): Promise<ApiResponse<any>> {
  try {
    // First, try our backend API directly
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
      }),
      credentials: "include", // Include cookies in request
    });

    // Handle backend response
    if (response.ok) {
      const data = await response.json();
      console.log("Backend registration successful:", data);
      return { data };
    }
    
    // If backend registration fails, try our Next.js API route
    const backupResponse = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        fullName,
      }),
    });

    if (!backupResponse.ok) {
      const errorData = await backupResponse.json();
      return {
        error: {
          message: errorData.error || "Registration failed",
          status: backupResponse.status,
        }
      };
    }

    const data = await backupResponse.json();
    return { data };
  } catch (error: any) {
    console.error("Registration error:", error);
    return {
      error: {
        message: error.message || "Failed to register",
        status: 500,
      }
    };
  }
}

/**
 * Log in a user with the backend
 */
export async function loginUser(
  email: string,
  password: string
): Promise<ApiResponse<any>> {
  try {
    // First, try our backend API directly
    const response = await fetch(`${API_URL}/auth/login`, {
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

    // Handle backend response
    if (response.ok) {
      const data = await response.json();
      console.log("Backend login successful:", data);
      
      // Set session in Supabase if present
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }
      
      return { data };
    }
    
    // If backend login fails, try our Next.js API route
    const backupResponse = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
      credentials: "include", // Include cookies
    });

    if (!backupResponse.ok) {
      const errorData = await backupResponse.json().catch(() => ({}));
      return {
        error: {
          message: errorData.error?.message || errorData.detail || "Login failed",
          status: backupResponse.status,
        },
      };
    }

    const data = await backupResponse.json();

    // Set session in Supabase
    if (data.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    return { data };
  } catch (error: any) {
    console.error("Login error:", error);
    return {
      error: {
        message: error.message || "Failed to login",
        status: 500,
      }
    };
  }
}

/**
 * Log out a user from the backend
 */
export async function logoutUser(): Promise<ApiResponse<any>> {
  try {
    // Call backend logout
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include", // Include cookies
    });

    // Also sign out from Supabase
    await supabase.auth.signOut();

    if (!response.ok) {
      // Try frontend API route as fallback
      const backupResponse = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      
      if (!backupResponse.ok) {
        const errorData = await backupResponse.json().catch(() => ({}));
        return {
          error: {
            message: errorData.error?.message || errorData.detail || "Logout failed",
            status: backupResponse.status,
          },
        };
      }
      
      const backupData = await backupResponse.json();
      return { data: backupData };
    }

    const data = await response.json();
    return { data };
  } catch (error: any) {
    console.error("Error logging out:", error);
    // Try to sign out from Supabase anyway
    await supabase.auth.signOut();
    
    return {
      error: {
        message: error.message || "Failed to log out",
        status: 500,
      },
    };
  }
}