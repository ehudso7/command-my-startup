'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from 'react';
import { useMedia } from 'react-use';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  // State to store the current theme preference
  const [theme, setTheme] = useState<Theme>('system');
  // State to store what theme is actually being applied (after resolving 'system' preference)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  
  // Check if the user's system prefers dark mode
  const prefersDarkMode = useMedia('(prefers-color-scheme: dark)', false);
  
  // Initialize theme from localStorage if available
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
    }
  }, []);
  
  // Update the resolved theme whenever theme or system preference changes
  useEffect(() => {
    if (theme === 'system') {
      setResolvedTheme(prefersDarkMode ? 'dark' : 'light');
    } else {
      setResolvedTheme(theme);
    }
  }, [theme, prefersDarkMode]);
  
  // Update the document's class list and store preference
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const root = document.documentElement;
    
    // Remove both theme classes
    root.classList.remove('light', 'dark');
    // Add the appropriate theme class
    root.classList.add(resolvedTheme);
    
    // Store the preference in localStorage
    localStorage.setItem('theme', theme);
  }, [theme, resolvedTheme]);
  
  // Create the context value
  const contextValue = {
    theme,
    resolvedTheme,
    setTheme: (newTheme: Theme) => {
      setTheme(newTheme);
    },
  };
  
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use the theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}
