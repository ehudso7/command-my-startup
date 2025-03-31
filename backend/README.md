# Command My Startup - Backend API

FastAPI backend service for Command My Startup, providing authentication and AI command processing.

## Tech Stack

- FastAPI - Web framework
- Supabase - Auth and Database
- OpenAI - GPT API
- Anthropic - Claude API
- Stripe - Payment processing
- Prometheus - Metrics
- GitHub Actions - CI/CD

## Features

- **Authentication** - User registration, login, and JWT authentication
- **AI Command Processing** - Execute prompts with OpenAI and Anthropic models
- **User Profiles** - User profile management and API key generation
- **Command History** - Track and manage command executions
- **Metrics** - Prometheus metrics for monitoring
- **Request Validation** - Middleware for request validation and error handling
- **CI/CD** - GitHub Actions workflows for testing and deployment

## Getting Started

### Prerequisites

- Python 3.9+
- Pip

### Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/command-my-startup.git
cd command-my-startup/backend
```

2. Create and activate a virtual environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

### Running the server

For development:
```bash
uvicorn main:app --reload
```

For production:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

### API Documentation

Once the server is running, API documentation is available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Testing

Run tests with pytest:
```bash
pytest
```

Run linting:
```bash
black .
isort .
```

## Deployment

This project is configured for deployment on Render.com using the `render.yaml` file.

### Environment Variables

The following environment variables must be set in your deployment:

- `ENVIRONMENT` - Set to "production" for production deployment
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase API key
- `JWT_SECRET_KEY` - Secret key for JWT token generation
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key
- `STRIPE_API_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret

## CI/CD

This project uses GitHub Actions for continuous integration and deployment:

- **CI Workflow** - Runs tests and linting on every push and pull request
- **Security Scan** - Checks dependencies and scans for vulnerabilities
- **Deployment** - Automatically deploys to Render.com when changes are merged to main

## Project Structure

```
backend/
├── auth/               # Authentication utilities
├── lib/                # Shared libraries and clients
├── middleware/         # Custom middleware
├── models/             # Data models and schemas
├── routes/             # API routes and endpoints
│   ├── auth.py         # Authentication routes
│   ├── commands.py     # Command execution routes
│   ├── history.py      # Command history routes
│   └── profile.py      # User profile routes
├── tests/              # Test suite
│   ├── unit/           # Unit tests
│   └── integration/    # Integration tests
├── .env.example        # Example environment variables
├── .github/            # GitHub Actions workflows
├── config.py           # Application configuration
├── main.py             # Application entry point
├── render.yaml         # Render deployment configuration
├── requirements.txt    # Python dependencies
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Log in and get session tokens

### Commands

- `POST /api/commands` - Execute an AI command

### User Profile

- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile
- `GET /api/profile/api-keys` - Get user API keys
- `POST /api/profile/api-keys` - Create a new API key
- `DELETE /api/profile/api-keys/{key_id}` - Delete an API key

### Command History

- `GET /api/history` - Get command execution history
- `GET /api/history/stats` - Get command usage statistics
- `GET /api/history/{command_id}` - Get details of a specific command
- `DELETE /api/history/{command_id}` - Delete a command from history

## Frontend Integration

This backend is designed to work with the Next.js frontend located in the `frontend/` directory. It provides API endpoints that the frontend can consume for authentication, command execution, and more.