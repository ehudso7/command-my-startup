#!/bin/bash
# Special development script focused on homepage hot reloading

# Clear .next directory to ensure a clean start
echo "🧹 Cleaning Next.js cache..."
rm -rf .next

# Install any missing dependencies silently
echo "📦 Ensuring dependencies are installed..."
npm install @supabase/auth-helpers-nextjs @tailwindcss/typography --no-fund --no-audit --loglevel=error

# Set Fast Refresh environment variables
export FAST_REFRESH=true
export NEXT_FASTREFRESH=true
export NODE_ENV=development

# Starting the dev server with focus on homepage
echo "🚀 Starting Next.js with optimized settings for homepage development..."
NODE_OPTIONS="--max-old-space-size=4096 --no-warnings" \
  NEXT_PUBLIC_FOCUS_PAGE="/src/app/page.tsx" \
  NEXT_TELEMETRY_DISABLED=1 \
  next dev