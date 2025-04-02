#!/bin/bash
# Improved development script for Next.js hot reloading

# Clear .next directory to ensure a clean start
echo "🧹 Cleaning Next.js cache..."
rm -rf .next

# Set Fast Refresh environment variable explicitly
export FAST_REFRESH=true

# Start Next.js development server with optimized settings
echo "🚀 Starting Next.js development server with enhanced hot reloading..."
NODE_ENV=development NEXT_FAST_REFRESH=true next dev