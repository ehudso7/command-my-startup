import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Command input parameters
export interface CommandInput {
  prompt: string;
  model: string;
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
}

// Command response structure
export interface CommandResponse {
  id: string;
  content: string;
  model: string;
  created_at: string;
  tokens_used: number;
}

// Return type for the hook
export interface UseCommandsReturn {
  execute: (input: CommandInput) => Promise<CommandResponse | null>;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

export function useCommands(): UseCommandsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();

  // Reset error state
  const reset = () => setError(null);

  // Execute a command
  const execute = async (input: CommandInput): Promise<CommandResponse | null> => {
    if (!session) {
      setError('Authentication required');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/commands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute command';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    execute,
    isLoading,
    error,
    reset
  };
}
