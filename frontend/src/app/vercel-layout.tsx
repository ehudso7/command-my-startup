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
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Inter', sans-serif" }}>
        <Providers>
          {children}
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}