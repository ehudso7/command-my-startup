import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Import providers
import { Providers } from "./providers";
import { Analytics } from "@vercel/analytics/react";

// Use Inter font from Google
const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
        <Providers>
          {children}
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
