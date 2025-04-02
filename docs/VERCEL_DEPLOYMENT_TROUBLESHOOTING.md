# Vercel Deployment Troubleshooting Guide

This document provides comprehensive solutions for deployment issues with the Command My Startup frontend on Vercel.

## Quick Fix Instructions

For an immediate fix to deployment issues, run the following commands:

```bash
cd frontend
chmod +x deploy-to-vercel.sh
./deploy-to-vercel.sh
vercel --prod
```

This script applies all the fixes documented in this guide automatically.

## Common Deployment Issues

### 1. TailwindCSS and Font Module Issues

**Symptoms:**
- Build fails with `Cannot find module './lib/detectNesting'` in TailwindCSS
- Font loading errors with next/font/google
- CSS processing errors with optimizeCss

**Solutions:**
- Use standard web fonts via HTML link tags instead of next/font/google
- Pin TailwindCSS to version 3.3.6 and PostCSS to 8.4.32
- Add @tailwindcss/typography as a direct dependency with version 0.5.10
- Add critters version 0.0.20 for CSS optimization
- Disable experimental.optimizeCss in next.config.js
- Update fontFamily in tailwind.config.js to use 'Inter' directly
- Run fix-vercel-css.js script to patch font module issues

### 2. Next.js Version and Configuration

**Symptoms:**
- Build fails with various Next.js errors 
- Server component serialization issues
- API route cookie handling problems

**Solutions:**
- Downgrade Next.js from 15.2.4 to 14.1.0
- Update serverComponentsExternalPackages to serverExternalPackages
- Remove swcMinify: true which causes build failures
- Add NODE_OPTIONS="--max-old-space-size=3072" to increase memory
- Add dynamic export to all API routes with fix-routes.sh

### 3. React Version Compatibility

**Symptoms:**
- Hydration errors
- Component rendering issues
- Hook dependency warnings

**Solutions:**
- Pin React and React DOM to exact version 18.2.0
- Add resolutions and overrides in package.json
- Update TypeScript types to match React version
- Use suppressHydrationWarning in html tag

### 4. Dependency Management

**Symptoms:**
- Conflicting dependencies
- npm ERR! code ERESOLVE
- Missing peer dependencies

**Solutions:**
- Use npm clean-install instead of npm install
- Add explicit resolutions for key packages
- Pin all critical dependencies to exact versions
- Use overrides to enforce version consistency
- Add missing dependencies like critters

### 5. Build Process Optimization

**Symptoms:**
- Build timeouts
- Memory errors during build
- CSS processing failures

**Solutions:**
- Create optimized vercel-build.sh script
- Set NODE_OPTIONS="--max-old-space-size=3072" in vercel.json
- Use clear-cache.sh to completely clean the environment
- Skip lint and type checks during build
- Implement progressive CSS optimization

## Systematic Deployment Process

Follow this systematic process to ensure successful deployments:

1. **Clean the environment:**
   ```bash
   ./clear-cache.sh
   ```

2. **Apply dependency fixes:**
   ```bash
   # Use package.json from our fixes branch
   git checkout vercel-deployment-fix -- package.json
   npm clean-install
   ```

3. **Apply configuration fixes:**
   ```bash
   # Use configuration from our fixes branch
   git checkout vercel-deployment-fix -- next.config.js
   git checkout vercel-deployment-fix -- vercel.json
   ```

4. **Run fix scripts:**
   ```bash
   # Fix font and CSS issues
   node ./fix-vercel-css.js
   
   # Fix route handling
   chmod +x ./fix-routes.sh
   ./fix-routes.sh
   ```

5. **Test build locally:**
   ```bash
   # Use optimized build script
   chmod +x ./vercel-build.sh
   ./vercel-build.sh
   ```

6. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

## Configuration Files Reference

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  poweredByHeader: false,
  staticPageGenerationTimeout: 120,
  env: {
    // Environment variables here
  },
  output: 'standalone',
  serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],
  experimental: {
    optimizeCss: false,
    scrollRestoration: true,
  },
  images: {
    unoptimized: false,
    remotePatterns: [],
  },
};

module.exports = nextConfig;
```

### vercel.json

```json
{
  "framework": "nextjs",
  "buildCommand": "chmod +x ./vercel-build.sh && ./vercel-build.sh",
  "installCommand": "npm clean-install",
  "devCommand": "npm run dev",
  "outputDirectory": ".next",
  "regions": ["iad1"],
  "env": {
    "NODE_ENV": "production",
    "NEXT_TELEMETRY_DISABLED": "1",
    "NODE_OPTIONS": "--max-old-space-size=3072",
    "NEXT_SHARP_PATH": "/tmp/node_modules/sharp"
  },
  "build": {
    "env": {
      "NODE_VERSION": "20.x"
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

## Environment Variables

Ensure these environment variables are set in your Vercel project settings:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key
```

## Rollback Procedure

If deployment issues persist, you can roll back to a previous working version:

1. In Vercel dashboard, go to Deployments
2. Find the last working deployment
3. Click the three dots menu (...)
4. Select "Promote to Production"

## Additional Resources

- [Deploy the vercel-deployment-fix branch](https://vercel.com/docs/cli/deploy)
- [Vercel Build Step documentation](https://vercel.com/docs/deployments/builds/build-steps)
- [Next.js Deployment documentation](https://nextjs.org/docs/deployment)
- [Comprehensive deployment fixes snapshot](../docs/snapshots/DEPLOYMENT_FIXES_SNAPSHOT.md)

## Technical Contact

For assistance with deployment issues, contact the DevOps team at devops@commandmystartup.com.