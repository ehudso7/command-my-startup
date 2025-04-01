#!/bin/bash
# Script to completely clean Next.js cache and node_modules

echo "🧹 Cleaning up Next.js project..."

# Remove build artifacts
echo "Removing .next directory..."
rm -rf .next

# Remove Node modules
echo "Removing node_modules directory..."
rm -rf node_modules

# Clear npm cache
echo "Clearing npm cache..."
npm cache clean --force

# Remove package-lock.json for fresh install
echo "Removing package-lock.json..."
rm -f package-lock.json

# Clean up potential temporary files
echo "Removing any temp files..."
rm -rf .cache .vercel/output .vercel/cache

# Clean up TypeScript build info
echo "Removing TypeScript build info..."
rm -f tsconfig.tsbuildinfo

# Clean up any potential swap files
echo "Removing swap files..."
find . -name "*.sw[a-p]" -delete

echo "✅ Cleanup complete! Run 'npm install' to reinstall dependencies."