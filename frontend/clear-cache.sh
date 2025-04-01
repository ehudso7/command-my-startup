#!/bin/bash

# Stop any running Next.js dev server
echo "Stopping any running Next.js processes..."
pkill -f "next dev" || echo "No Next.js processes found"

# Clear Next.js cache
echo "Clearing Next.js cache..."
rm -rf .next
rm -rf node_modules/.cache

# Clear browser cache for localhost:3000
echo "Please clear your browser cache for localhost:3000"

# Install dependencies
echo "Reinstalling dependencies..."
npm install

# Start dev server
echo "Starting dev server..."
npm run dev:clear