# Command My Startup: Deployment Guide

This document provides detailed instructions for deploying the Command My Startup application, covering both frontend and backend components.

## Deployment Architecture

The application is deployed using the following architecture:
- **Frontend**: Next.js application hosted on Vercel
- **Backend**: FastAPI application hosted on Render
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **External Services**: OpenAI, Anthropic, Stripe

## Frontend Deployment (Vercel)

### Prerequisites
- Vercel account
- GitHub repository access
- Node.js 20.x or newer
- npm 10.x or newer

### Environment Variables
Set the following environment variables in your Vercel project settings:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_key
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Deployment Steps

1. **Clean the project and install dependencies:**
   ```bash
   cd frontend
   ./clear-cache.sh
   npm install
   ```

2. **Run a local build test:**
   ```bash
   npm run build
   ```

3. **Deploy to Vercel:**
   ```bash
   # Using Vercel CLI
   vercel --prod
   
   # Alternatively, connect your GitHub repository to Vercel
   # and deploy from the Vercel dashboard
   ```

### Troubleshooting Frontend Deployment Issues

If you encounter build errors during deployment, refer to the [Vercel Deployment Troubleshooting Guide](./VERCEL_DEPLOYMENT_TROUBLESHOOTING.md) which addresses common issues including:

- TailwindCSS module resolution errors
- Supabase dependency issues
- React version mismatches
- Server component serialization errors

## Backend Deployment (Render)

### Prerequisites
- Render.com account
- GitHub repository access
- Python 3.11 or newer

### Environment Variables
Set the following environment variables in your Render dashboard:

```
ENVIRONMENT=production
JWT_SECRET_KEY=your-secure-jwt-secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
ANTHROPIC_API_KEY=your-anthropic-key
OPENAI_API_KEY=your-openai-key
STRIPE_SECRET_KEY=sk_live_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
CORS_ORIGINS=https://your-frontend-domain.com
JWT_TOKEN_EXPIRE_MINUTES=60
```

### Deployment Steps

1. **Connect your GitHub repository to Render**
   - Create a new Web Service in Render
   - Select your GitHub repository
   - Configure settings according to render.yaml

2. **Manual Deployment through Render Dashboard**
   - Select your service
   - Use the "Manual Deploy" button and select "Deploy latest commit"

3. **Using Infrastructure as Code (IaC)**
   - Render supports blueprint files for configuration
   - The repository includes a `render.yaml` file with optimized settings

### Scaling Configuration

The backend is configured to auto-scale based on demand as defined in `render.yaml`:

```yaml
scaling:
  minInstances: 1
  maxInstances: 3
  targetMemoryPercent: 80
  targetCPUPercent: 70
```

## Database Setup (Supabase)

### Prerequisites
- Supabase account
- SQL knowledge for manual schema adjustments

### Setup Steps

1. **Create a new Supabase project**

2. **Run migration scripts**
   - The backend includes SQL migration scripts in the backend/migrations folder
   - Apply these in the Supabase SQL editor

3. **Configure authentication providers**
   - Enable Email/Password authentication
   - Set up OAuth providers if required

4. **Configure RLS (Row Level Security) policies**
   - Ensure proper security for production data

## Post-Deployment Verification

### Frontend Verification
- Check that authentication flows work
- Verify API connections to the backend
- Test Stripe payment integration
- Verify all main features (commands, chat, profile)

### Backend Verification
- Check the `/health` endpoint
- Verify authentication middleware is working
- Test external service connections
- Ensure proper error handling and logging

### Security Verification
- Verify CORS settings are properly configured
- Check JWT token generation and validation
- Verify environment variables are properly set
- Confirm proper data access controls

## Monitoring and Maintenance

### Frontend Monitoring
- Use Vercel Analytics
- Set up Sentry for error tracking

### Backend Monitoring
- Configure Render's built-in monitoring
- Set up notification alerts for service disruptions
- Monitor API rate limits and performance metrics

### Database Monitoring
- Set up Supabase database metrics
- Configure regular database backups

## Rollback Procedures

### Frontend Rollback
- In Vercel dashboard, go to Deployments
- Find the last working deployment
- Click "Promote to Production"

### Backend Rollback
- In Render dashboard, select your service
- Go to "Manual Deploy"
- Choose a previous working deployment to rollback

## Additional Resources
- [Vercel Deployment Troubleshooting Guide](./VERCEL_DEPLOYMENT_TROUBLESHOOTING.md)
- [Testing Strategy](./testing-strategy.md)
- [Project Documentation](./README-Documentation.md)