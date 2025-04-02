
"use client";

// Simplified providers wrapper for production build
import { Analytics } from "@vercel/analytics/react";
import { ReactNode } from "react";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <>
      {children}
      <Analytics />
    </>
  );
}