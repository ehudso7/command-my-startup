# Command My Startup (CMS)

Command My Startup is an AI-driven platform that helps entrepreneurs build and manage startups with natural language commands.

## Architecture

The platform consists of:

1. **Frontend**: Next.js application hosted on Vercel
2. **Backend**: FastAPI service hosted on Render
3. **Database**: Supabase (PostgreSQL)
4. **AI Services**: Integration with OpenAI and Anthropic
5. **Payments**: Stripe integration

## Development Setup

### Prerequisites

- Node.js (v20.x)
- Python 3.11+
- Supabase account
- OpenAI API key and/or Anthropic API key
- Stripe test account

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your own values
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local  # Edit with your own values
npm run dev
```

## Production Deployment

See the [Deployment Guide](DEPLOYMENT.md) for detailed instructions on how to deploy to production environments.

## Branch Structure

- `main` - Development branch
- `production` - Production-ready code
- `feature/*` - Feature branches (merge to main when complete)

## Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

## Documentation

- [API Documentation](https://api.commandmystartup.com/docs)
- [Deployment Guide](DEPLOYMENT.md)
- [Production Checklist](PRODUCTION_CHECKLIST.md)

## License

Proprietary - All rights reserved.