#!/bin/bash
# Script to prepare and build for Vercel deployment

echo "🧹 Cleaning up previous build artifacts..."
rm -rf .next
rm -rf node_modules/.cache

echo "📦 Installing dependencies..."
npm install

echo "🔍 Verifying dependencies for Tailwind and Supabase..."
npm list @tailwindcss/typography || npm install @tailwindcss/typography
npm list @supabase/auth-helpers-nextjs || npm install @supabase/auth-helpers-nextjs

echo "🔧 Setting environment variables for build..."
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1

echo "🚀 Building Next.js application..."
next build

echo "✅ Build completed!"