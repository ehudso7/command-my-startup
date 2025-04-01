"use client";

// This is a workaround to make sure auth pages can use the AuthProvider without import issues

import { AuthProvider as OriginalAuthProvider } from "../contexts/AuthContext";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <OriginalAuthProvider>{children}</OriginalAuthProvider>;
}