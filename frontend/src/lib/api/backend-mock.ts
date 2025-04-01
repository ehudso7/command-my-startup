/**
 * Mock backend API client for deployment builds
 */

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
 * Mock function to refresh auth token
 */
export async function refreshAuthToken(): Promise<boolean> {
  console.log("[MOCK] Refreshing auth token");
  return true;
}

/**
 * Mock function to execute a command
 */
export async function executeCommand(
  prompt: string,
  model: string,
  systemPrompt?: string,
  temperature?: number,
  maxTokens?: number
): Promise<ApiResponse<CommandResponse>> {
  console.log("[MOCK] Executing command:", prompt);
  return {
    data: {
      id: "mock-command-id",
      content: "This is a mock response for: " + prompt,
      model: model || "mock-model",
      created_at: new Date().toISOString(),
      tokens_used: 42,
    },
  };
}

/**
 * Mock function to get user profile
 */
export async function getUserProfile(): Promise<ApiResponse<any>> {
  console.log("[MOCK] Getting user profile");
  return {
    data: {
      id: "mock-user-id",
      email: "user@example.com",
      full_name: "Mock User",
      subscription_tier: "free",
    },
  };
}

/**
 * Mock function to get API keys
 */
export async function getApiKeys(): Promise<ApiResponse<any[]>> {
  console.log("[MOCK] Getting API keys");
  return {
    data: [],
  };
}

/**
 * Mock function to create an API key
 */
export async function createApiKey(name: string): Promise<ApiResponse<any>> {
  console.log("[MOCK] Creating API key:", name);
  return {
    data: {
      id: "mock-key-id",
      name,
      key: "cms_mock_api_key",
      created_at: new Date().toISOString(),
    },
  };
}

/**
 * Mock function to delete an API key
 */
export async function deleteApiKey(keyId: string): Promise<ApiResponse<any>> {
  console.log("[MOCK] Deleting API key:", keyId);
  return {
    data: { success: true },
  };
}

/**
 * Mock function to get command history
 */
export async function getCommandHistory(
  limit = 50,
  offset = 0,
  startDate?: string,
  endDate?: string
): Promise<ApiResponse<any[]>> {
  console.log("[MOCK] Getting command history");
  return {
    data: [],
  };
}

/**
 * Mock function to get usage stats
 */
export async function getUsageStats(period: string = "week"): Promise<ApiResponse<any>> {
  console.log("[MOCK] Getting usage stats for period:", period);
  return {
    data: {
      total_commands: 0,
      total_tokens: 0,
      commands_by_day: [],
    },
  };
}

/**
 * Mock function to register a user
 */
export async function registerUser(
  email: string,
  password: string,
  fullName: string
): Promise<ApiResponse<any>> {
  console.log("[MOCK] Registering user:", email);
  return {
    data: {
      user: {
        id: "mock-user-id",
        email,
      },
      session: null,
    },
  };
}

/**
 * Mock function to log in a user
 */
export async function loginUser(
  email: string,
  password: string
): Promise<ApiResponse<any>> {
  console.log("[MOCK] Logging in user:", email);
  return {
    data: {
      user: {
        id: "mock-user-id",
        email,
      },
      session: {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
      },
    },
  };
}

/**
 * Mock function to log out a user
 */
export async function logoutUser(): Promise<ApiResponse<any>> {
  console.log("[MOCK] Logging out user");
  return {
    data: { success: true },
  };
}