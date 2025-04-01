# Deployment Guide for Command My Startup

This document outlines the steps needed to deploy the Command My Startup platform.

## Prerequisites

Before deployment, ensure you have:

1. A Supabase account and project set up
2. OpenAI API key
3. Anthropic API key (optional)
4. Stripe account and API keys
5. Vercel account
6. Render.com account

## Backend Deployment (Render.com)

### Step 1: Create the Supabase Database

1. Log into your Supabase account
2. Create a new project
3. Run the database initialization scripts from `backend/db/init.sql`
4. Create a service role API key with the necessary permissions

### Step 2: Configure Render Service

1. Log into Render.com
2. Connect your GitHub repository
3. Create a new Web Service:
   - Name: command-my-startup-api
   - Root Directory: ./
   - Build Command: `cd backend && pip install -r requirements.txt`
   - Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Plan: Standard

4. Set the following environment variables:
   - ENVIRONMENT: production
   - PYTHONPATH: .
   - SUPABASE_URL: (from Supabase)
   - SUPABASE_KEY: (from Supabase)
   - JWT_SECRET_KEY: (generate a secure random string)
   - JWT_TOKEN_EXPIRE_MINUTES: 60
   - OPENAI_API_KEY: (from OpenAI)
   - ANTHROPIC_API_KEY: (from Anthropic)
   - STRIPE_API_KEY: (from Stripe)
   - STRIPE_WEBHOOK_SECRET: (from Stripe)
   - CORS_ORIGINS: comma-separated list of allowed origins
   - RATE_LIMIT_AUTH: 10
   - RATE_LIMIT_COMMAND: 20
   - RATE_LIMIT_GENERAL: 30

5. Configure auto-scaling:
   - Min Instances: 1
   - Max Instances: 3
   - Target Memory: 80%
   - Target CPU: 70%

### Step 3: Set Up Monitoring

1. Configure Health Checks
   - Path: /health
   - Interval: 1 minute
   - Timeout: 5 seconds
   - Grace Period: 30 seconds

2. Set up Log Drains (optional)
   - Connect to your logging service of choice

## Frontend Deployment (Vercel)

### Step 1: Set Up Vercel Project

1. Log into Vercel
2. Import your GitHub repository
3. Configure the project:
   - Framework Preset: Next.js
   - Root Directory: frontend
   - Build Command: npm run build
   - Install Command: npm ci
   - Output Directory: .next

4. Set the following environment variables:
   - NEXT_PUBLIC_API_URL: (your Render backend URL)
   - NEXT_PUBLIC_SUPABASE_URL: (from Supabase)
   - NEXT_PUBLIC_SUPABASE_ANON_KEY: (from Supabase)
   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: (from Stripe)
   - NEXT_PUBLIC_VERCEL_ANALYTICS_ID: (from Vercel Analytics)
   - NEXT_PUBLIC_SENTRY_DSN: (from Sentry)
   - SENTRY_AUTH_TOKEN: (from Sentry)
   - SENTRY_PROJECT: (your Sentry project name)
   - SENTRY_ORG: (your Sentry organization)

### Step 2: Domain Configuration

1. Add your custom domain in Vercel
2. Configure DNS settings with your provider
3. Set up SSL certificate (automatic with Vercel)

### Step 3: Analytics and Monitoring

1. Enable Vercel Analytics
2. Connect Sentry for error monitoring
3. Set up custom alerting if needed

## CI/CD Pipeline

The GitHub Actions workflow in `.github/workflows/ci.yml` will:

1. Run backend tests
2. Run frontend tests
3. Perform security scanning
4. Deploy to production when changes are pushed to the production branch

Ensure you've set the following GitHub repository secrets:

- SNYK_TOKEN: For security scanning
- RENDER_SERVICE_ID: Your Render service ID
- RENDER_API_KEY: Your Render API key
- VERCEL_TOKEN: Your Vercel API token
- VERCEL_ORG_ID: Your Vercel organization ID
- VERCEL_PROJECT_ID: Your Vercel project ID

## Post-Deployment Verification

After deployment, verify the following:

1. Backend health check endpoint is responding
2. Frontend loads correctly
3. Authentication works
4. API calls from frontend to backend succeed
5. Stripe integration works for payments
6. AI service connections are working

## Rollback Procedure

If deployment fails:

1. For backend: Revert to previous deployment in Render dashboard
2. For frontend: Revert to previous deployment in Vercel dashboard
3. If database changes need to be reverted, use the rollback scripts in `backend/db/rollback/`
4. If all else fails, redeploy the last stable git tag

## Contact Information

For deployment issues, contact:
- DevOps Lead: devops@commandmystartup.com
- Backend Lead: backend@commandmystartup.com
- Frontend Lead: frontend@commandmystartup.com