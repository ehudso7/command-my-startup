#!/bin/bash
# Optimized script for reliable Vercel deployment

echo "🚀 Starting Vercel deployment preparation..."

# Step 1: Clean the environment completely
echo "🧹 Cleaning build environment..."
chmod +x ./clear-cache.sh
./clear-cache.sh

# Step 2: Install dependencies with clean installation
echo "📦 Installing dependencies..."
npm install

# Step 3: Apply route fixes
echo "🔧 Applying route fixes..."
chmod +x ./fix-routes.sh
./fix-routes.sh

# Step 4: Apply CSS fixes
echo "🎨 Applying CSS fixes..."
node ./fix-vercel-css.js

# Step 5: Run the optimized build script locally to verify
echo "🔨 Testing build locally..."
chmod +x ./vercel-build.sh
./vercel-build.sh

# Step 6: Deploy to Vercel
echo "🚀 Ready to deploy to Vercel!"
echo "Run 'vercel --prod' to deploy to production"
echo "Or push your changes to GitHub for automatic deployment"

echo "✅ Deployment preparation completed!"