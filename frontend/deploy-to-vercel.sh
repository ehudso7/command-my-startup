#!/bin/bash
# Comprehensive script to fix and deploy to Vercel

echo "🚀 Starting Vercel deployment preparation..."

# Clean the environment
echo "🧹 Cleaning build environment..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .vercel

# Save original files
echo "💾 Backing up original files..."
cp src/app/layout.tsx src/app/layout.tsx.bak
cp src/app/globals.css src/app/globals.css.bak
cp next.config.js next.config.js.bak

# Replace with simplified versions
echo "🔄 Replacing with simplified versions..."
cp src/app/vercel-layout.tsx src/app/layout.tsx
cp src/app/vercel-globals.css src/app/globals.css
cp vercel-production.js next.config.js

# Create simplified vercel.json
echo "📝 Creating simplified vercel.json..."
cat > vercel.json << 'EOF'
{
  "framework": "nextjs",
  "buildCommand": "npm install && npm run build",
  "installCommand": "npm install",
  "devCommand": "npm run dev",
  "outputDirectory": ".next"
}
EOF

# Install minimal dependencies
echo "📦 Installing minimal dependencies..."
npm install --no-save next@latest react@latest react-dom@latest @vercel/analytics

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

# Restore original files
echo "🔄 Restoring original files..."
mv src/app/layout.tsx.bak src/app/layout.tsx
mv src/app/globals.css.bak src/app/globals.css
mv next.config.js.bak next.config.js

echo "✅ Deployment process completed!"