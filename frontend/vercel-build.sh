#!/bin/bash
# Optimized lightweight build script for Vercel deployment

echo "🧹 Cleaning build environment..."
rm -rf .next
rm -rf node_modules/.cache

echo "💡 Setting resource-saving environment variables..."
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
export NEXT_SHARP_PATH="/tmp/node_modules/sharp"
export NODE_OPTIONS="--max-old-space-size=3072"

echo "📦 Installing dependencies..."
npm install

echo "🔍 Ensuring critical packages are available..."
npm install --no-save @tailwindcss/typography@0.5.10
npm install --no-save @supabase/auth-helpers-nextjs@0.8.7
npm install --no-save critters@0.0.20

echo "🛠️ Applying dynamic route fixes..."
chmod +x ./fix-routes.sh && ./fix-routes.sh

echo "🛠️ Applying CSS fixes..."
node ./fix-vercel-css.js

echo "🚀 Building with optimized settings..."
NODE_OPTIONS="--max-old-space-size=3072" next build

echo "✅ Build completed!"