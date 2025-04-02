"use client";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { UploadProvider } from "@/contexts/UploadProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <UploadProvider>
            {children}
          </UploadProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}