# Vercel Deployment Troubleshooting Guide

This document provides solutions for common deployment issues with the Command My Startup frontend.

## Common Deployment Issues

### 1. TailwindCSS Module Resolution Error

**Symptoms:**
- Build fails with `Cannot find module './lib/detectNesting'` in TailwindCSS
- CSS processing errors

**Solutions:**
- Updated TailwindCSS and PostCSS dependencies to compatible versions
- Added explicit plugins array in tailwind.config.js
- Downgraded to Next.js 14 which has better compatibility with the current setup

### 2. Missing Supabase Dependency

**Symptoms:**
- Build fails with `Module not found: Can't resolve '@supabase/auth-helpers-nextjs'`
- Authentication middleware errors

**Solutions:**
- Added @supabase/auth-helpers-nextjs ^0.8.7 to package.json
- Updated middleware.ts to use the correct client creation syntax
- Downgraded Supabase client to a more stable version (2.39.3)

### 3. Engine Mismatch

**Symptoms:**
- Build fails with node version compatibility errors
- Dependency installation issues

**Solutions:**
- Updated engines in package.json to use >=20.x for Node and >=10.x for npm
- Added explicit NODE_VERSION to vercel.json
- Updated the installCommand to use `npm clean-install` for a fresh dependency installation

### 4. React Version Mismatch

**Symptoms:**
- Hydration errors
- Missing or mismatched hooks

**Solutions:**
- Downgraded react to v18.2.0 (from v19.1.0)
- Downgraded react-dom to v18.2.0 (from v19.1.0)
- Updated type definitions to match

### 5. Build Optimization Issues

**Symptoms:**
- Build timeouts
- Memory errors during build

**Solutions:**
- Disabled swcMinify in next.config.js
- Added skipTypecheck and skipLint flags in vercel.json
- Optimized build command to use --no-lint flag

## Deployment Process

1. **Clean the project:**
   ```bash
   # Run the cleanup script
   chmod +x clear-cache.sh
   ./clear-cache.sh
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run a local build test:**
   ```bash
   npm run build
   ```

4. **Deploy to Vercel:**
   ```bash
   # If you have Vercel CLI installed
   vercel --prod
   ```

## Environment Variables

Ensure these environment variables are set in your Vercel project settings:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key
```

## Local Development After Fixes

1. Clean install dependencies:
   ```bash
   ./clear-cache.sh && npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

## Rollback Procedure

If deployment issues persist, you can roll back to a previous working version:

1. In Vercel dashboard, go to Deployments
2. Find the last working deployment
3. Click the three dots menu (...)
4. Select "Promote to Production"

## Technical Contact

For assistance with deployment issues, contact the DevOps team at devops@commandmystartup.com.