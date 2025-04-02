import type { Metadata } from "next";
import "./globals.css";

// Import providers
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/react";

// Metadata
export const metadata: Metadata = {
  title: "Command My Startup",
  description:
    "AI-driven platform to build and manage startups with natural language commands",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body style={{ fontFamily: "'Inter', sans-serif" }}>
        <Providers>
          {children}
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}

