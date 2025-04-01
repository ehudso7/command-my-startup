# Command My Startup - Comprehensive Project Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Backend Framework](#backend-framework)
   - [FastAPI](#fastapi)
   - [Pydantic](#pydantic)
   - [Uvicorn](#uvicorn)
5. [Authentication & Database](#authentication--database)
   - [Supabase](#supabase)
   - [JWT](#jwt)
   - [Database Schema](#database-schema)
6. [AI Integration](#ai-integration)
   - [OpenAI](#openai)
   - [Anthropic](#anthropic)
7. [Frontend](#frontend)
   - [Next.js](#nextjs)
   - [React](#react)
   - [Tailwind CSS](#tailwind-css)
8. [Backend Structure](#backend-structure)
9. [Frontend Structure](#frontend-structure)
10. [API Documentation](#api-documentation)
11. [Deployment](#deployment)
12. [Development Setup](#development-setup)
13. [Testing](#testing)
14. [Security](#security)
15. [Performance Optimization](#performance-optimization)
16. [References & Resources](#references--resources)

## Project Overview

Command My Startup is a comprehensive platform that enables users to interact with AI models to execute commands and receive intelligent responses for startup-related tasks. The platform supports authentication, command history tracking, and integrates with various AI providers.

### Key Features

- User authentication and profile management
- AI command execution with OpenAI and Anthropic models
- Command history tracking and analytics
- API key management for programmatic access
- Subscription management via Stripe
- Referral system for user acquisition

## Architecture

The application follows a microservices-inspired architecture with a clear separation between frontend and backend components.

### System Architecture

- **Frontend**: Next.js application with React components and server-side API routes
- **Backend**: FastAPI application providing authentication, command processing, and data management
- **Database**: PostgreSQL via Supabase for data persistence
- **Authentication**: JWT-based auth with refresh token mechanism
- **AI Services**: Integration with OpenAI (GPT models) and Anthropic (Claude models)
- **Payment Processing**: Stripe for subscription management

## Technology Stack

### Backend

- **Framework**: FastAPI v0.100.0
- **ASGI Server**: Uvicorn v0.22.0
- **Data Validation**: Pydantic v2.1.0+
- **Authentication**: JWT (python-jose v3.3.0)
- **Database**: Supabase PostgreSQL
- **API Clients**:
  - OpenAI v1.14.0
  - Anthropic v0.8.0
- **Monitoring**: Prometheus Client v0.17.1
- **Rate Limiting**: Custom implementation with Redis (optional)

### Frontend

- **Framework**: Next.js v15.2.4
- **UI Library**: React v19.1.0
- **Styling**: Tailwind CSS v3.4.1
- **Form Handling**: react-hook-form v7.55.0 with zod validation
- **API Communication**: Fetch API with custom client
- **Authentication**: Supabase Auth with custom JWT implementation
- **Analytics**: Vercel Analytics

### Infrastructure

- **Hosting**: Render (Backend), Vercel (Frontend)
- **CI/CD**: GitHub Actions
- **Domain Management**: Vercel
- **Monitoring**: Sentry

## Backend Framework

### FastAPI

**Async Functionality**  
FastAPI natively supports async/await for I/O-bound operations (e.g., database calls, external APIs):

```python
@app.get("/items/{item_id}")
async def read_item(item_id: int):
    item = await fetch_item_from_db(item_id)  # Async DB call
    return item
```

**Dependency Injection**  
Used for shared logic such as authentication and database sessions:

```python
from fastapi import Depends

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/users")
async def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()
```

**Middleware**  
Example of rate limiting middleware:

```python
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host
    if await is_rate_limited(client_ip):
        raise HTTPException(status_code=429, detail="Too many requests")
    response = await call_next(request)
    return response
```

### Pydantic

**Data Validation**  
Define models with strict typing:

```python
from pydantic import BaseModel, EmailStr, Field

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
```

**Settings Management**  
Load environment variables:

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    
    supabase_url: Optional[str] = None
    supabase_key: Optional[str] = None

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
```

### Uvicorn

**Server Configuration**  
Running in development mode:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Production configuration:

```bash
uvicorn main:app --workers 4 --host 0.0.0.0 --port 8000
```

- `--workers`: Number of worker processes (typically 2-4 per CPU core)
- `--reload`: Auto-reload on code changes (development only)

## Authentication & Database

### Supabase

**Auth Flow**

1. Client-side registration:
```javascript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword',
  options: {
    data: {
      full_name: 'John Doe',
    }
  }
});
```

2. Client-side login:
```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword',
});
```

3. Server-side JWT verification:
```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from lib.supabase import get_supabase_client

security = HTTPBearer()

async def get_current_user(token: str = Depends(security)):
    supabase = get_supabase_client()
    try:
        user = supabase.auth.get_user(token.credentials)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
```

**Database Operations**

Querying data:
```python
data = supabase.table("users").select("*").eq("id", user_id).execute()
```

Inserting data:
```python
data = supabase.table("commands").insert({
    "user_id": user_id,
    "prompt": prompt,
    "response": response,
    "model": model
}).execute()
```

### JWT

**Token Generation**

```python
from datetime import datetime, timedelta
from jose import jwt

def create_access_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt
```

**Token Refresh Flow**

1. Client sends refresh token to refresh endpoint
2. Server validates refresh token and generates new access token
3. New tokens are set in HTTP-only cookies and/or returned in response

```python
@router.post("/refresh")
async def refresh_token(response: Response, refresh_token: str = Cookie(None)):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token required")
    
    try:
        payload = jwt.decode(refresh_token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
        
        access_token = create_access_token(
            data={"sub": user_id},
            expires_delta=timedelta(minutes=settings.jwt_access_token_expire_minutes)
        )
        
        # Set new access token in cookie
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=True,
            samesite="lax",
            max_age=settings.jwt_access_token_expire_minutes * 60
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
    except:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
```

### Database Schema

**Main Tables**

1. **Users**:
   - `id` (Primary Key)
   - `email`
   - `created_at`
   - `updated_at`
   - `full_name`
   - `referral_code`
   - `referred_by`

2. **Commands**:
   - `id` (Primary Key)
   - `user_id` (Foreign Key)
   - `prompt`
   - `response`
   - `model`
   - `created_at`
   - `tokens_used`

3. **API Keys**:
   - `id` (Primary Key)
   - `user_id` (Foreign Key)
   - `key` (Encrypted)
   - `name`
   - `created_at`
   - `last_used_at`

4. **Referrals**:
   - `id` (Primary Key)
   - `referrer_id` (Foreign Key)
   - `referred_email`
   - `referred_user_id` (Foreign Key)
   - `status`
   - `created_at`

## AI Integration

### OpenAI

**Chat Completion**  

```python
import openai
from openai import OpenAI

# Create client
client = OpenAI(api_key=settings.openai_api_key)

# Async wrapper for synchronous client
async def generate_with_openai(prompt: str, model: str = "gpt-3.5-turbo"):
    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as pool:
        response = await loop.run_in_executor(
            pool,
            lambda: client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}]
            )
        )
    
    return {
        "id": response.id,
        "content": response.choices[0].message.content,
        "model": model,
        "created_at": datetime.now().isoformat(),
        "tokens_used": response.usage.total_tokens,
    }
```

**Error Handling**

```python
try:
    response = client.chat.completions.create(
        model=model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response
except openai.APIError as e:
    logger.error(f"OpenAI API error: {e}")
    # Fallback logic
except openai.RateLimitError as e:
    logger.error(f"OpenAI rate limit exceeded: {e}")
    # Implement exponential backoff
```

### Anthropic

**Claude API Integration**

```python
import anthropic
from anthropic import Anthropic

# Create client
client = Anthropic(api_key=settings.anthropic_api_key)

# Async wrapper for synchronous client
async def generate_with_anthropic(prompt: str, model: str = "claude-3-haiku"):
    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as pool:
        response = await loop.run_in_executor(
            pool,
            lambda: client.messages.create(
                model=model,
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}]
            )
        )
    
    return {
        "id": response.id,
        "content": response.content[0].text,
        "model": model,
        "created_at": datetime.now().isoformat(),
        "tokens_used": response.usage.input_tokens + response.usage.output_tokens if hasattr(response, 'usage') else None,
    }
```

## Frontend

### Next.js

**App Router**

The application structure in Next.js 15:

```
app/
├── layout.tsx        # Root layout (applies to all pages)
├── page.tsx          # Home page
├── auth/
│   ├── login/
│   │   └── page.tsx  # Login page
│   └── signup/
│       └── page.tsx  # Signup page
└── dashboard/
    └── page.tsx      # Dashboard page
```

**API Routes**

```typescript
// app/api/auth/login/route.ts
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    
    // Call backend API
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return Response.json({ error: data.detail || "Login failed" }, { status: response.status });
    }
    
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
```

### React

**Hooks and Context**

Auth context example:

```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { loginUser, refreshAuthToken } from "@/lib/api/backend";

const AuthContext = createContext({
  user: null,
  signIn: async (email: string, password: string) => {},
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Initialize auth state
    async function getInitialSession() {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    }
    
    getInitialSession();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  async function signIn(email: string, password: string) {
    const { data, error } = await loginUser(email, password);
    if (error) throw error;
    return data;
  }
  
  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }
  
  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

**Server Components**

```typescript
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect("/auth/login");
  }
  
  const commands = await fetchUserCommands(session.user.id);
  
  return (
    <div>
      <h1>Dashboard</h1>
      <CommandList commands={commands} />
    </div>
  );
}
```

### Tailwind CSS

**Styling Components**

Custom button component:

```typescript
// components/ui/Button.tsx
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          {
            "bg-blue-600 text-white hover:bg-blue-700": variant === "primary",
            "bg-gray-100 text-gray-900 hover:bg-gray-200": variant === "secondary",
            "border border-gray-300 text-gray-700 hover:bg-gray-50": variant === "outline",
            "px-2 py-1 text-sm": size === "sm",
            "px-4 py-2": size === "md",
            "px-6 py-3 text-lg": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
export default Button;
```

## Backend Structure

### Directory Structure

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
├── config.py           # Application configuration
├── main.py             # Application entry point
└── requirements.txt    # Python dependencies
```

### Key Components

#### Configuration (config.py)

The `config.py` file uses Pydantic's BaseSettings for environment variable management. Important settings include:

- JWT configuration (secret key, algorithm, expiration)
- API keys for external services (Supabase, OpenAI, Anthropic, Stripe)
- Rate limiting parameters
- CORS settings

#### API Routes

1. **Authentication Routes** (`/auth`):
   - `/register` - User registration
   - `/login` - User login with token generation
   - `/logout` - User logout
   - `/refresh` - Refresh access token using refresh token

2. **Command Routes** (`/commands`):
   - POST `/` - Execute AI command and store result

3. **Profile Routes** (`/profile`):
   - GET `/` - Get user profile information
   - PUT `/` - Update user profile
   - GET `/api-keys` - List user's API keys
   - POST `/api-keys` - Create a new API key
   - DELETE `/api-keys/{key_id}` - Delete an API key

4. **History Routes** (`/history`):
   - GET `/` - Get command execution history
   - GET `/stats` - Get command usage statistics
   - GET `/{command_id}` - Get specific command details
   - DELETE `/{command_id}` - Delete command from history

### Middleware

- **Rate Limiter Middleware**: Limits request rates based on IP and/or user ID
- **Request Validation Middleware**: Validates incoming requests against schemas
- **Error Handler Middleware**: Provides consistent error responses

## Frontend Structure

### Directory Structure

```
frontend/
├── public/             # Static assets
├── src/
│   ├── app/            # Next.js App Router components and routes
│   │   ├── api/        # API route handlers
│   │   ├── auth/       # Authentication pages
│   │   ├── dashboard/  # Dashboard pages
│   │   └── layout.tsx  # Root layout
│   ├── components/     # Reusable React components
│   │   ├── chat/       # Chat interface components
│   │   ├── commands/   # Command-related components
│   │   ├── layout/     # Layout components
│   │   └── ui/         # UI components
│   ├── contexts/       # React contexts
│   ├── lib/            # Utility functions and client libraries
│   │   ├── ai/         # AI client functions
│   │   └── supabase/   # Supabase client configuration
│   ├── styles/         # Global styles
│   └── types/          # TypeScript type definitions
├── .env.development    # Development environment variables
├── next.config.js      # Next.js configuration
├── tailwind.config.js  # Tailwind CSS configuration
└── package.json        # Node.js dependencies
```

### Key Components

#### Authentication Context

The AuthContext provides authentication state and methods throughout the application. It handles:

- User registration
- Login/logout
- Token refresh
- Session persistence
- Profile management

#### API Client

The backend API client (`lib/api/backend.ts`) provides methods for communicating with the backend API, including:

- Authentication requests
- Command execution
- Profile management
- History retrieval

#### Command Execution

The command execution flow includes:

1. User input capture
2. API request to backend
3. Backend processing with AI models
4. Response rendering with Markdown

## API Documentation

### Authentication Endpoints

#### POST /auth/register

Register a new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "full_name": "John Doe"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "user_metadata": {
      "full_name": "John Doe"
    },
    "created_at": "2023-01-01T00:00:00Z"
  }
}
```

#### POST /auth/login

Log in a user and return session data.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "session": {
    "access_token": "jwt-token",
    "token_type": "bearer",
    "expires_in": 1800,
    "refresh_token": "refresh-token",
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "user_metadata": {
        "full_name": "John Doe"
      }
    }
  },
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "user_metadata": {
      "full_name": "John Doe"
    }
  }
}
```

#### POST /auth/logout

Log out a user by clearing the session cookie.

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

#### POST /auth/refresh

Refresh an access token using a refresh token.

**Request:**
```json
{
  "refresh_token": "refresh-token"
}
```

**Response:**
```json
{
  "message": "Token refreshed successfully",
  "access_token": "new-jwt-token",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### Command Endpoints

#### POST /commands

Execute an AI command.

**Request:**
```json
{
  "prompt": "Generate a marketing plan for my SaaS startup",
  "model": "gpt-4",
  "system_prompt": "You are a marketing expert helping startups.",
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**Response:**
```json
{
  "id": "cmd-123",
  "content": "# Marketing Plan for SaaS Startup\n\n...",
  "model": "gpt-4",
  "created_at": "2023-01-01T00:00:00Z",
  "tokens_used": 750
}
```

## Deployment

### Backend Deployment (Render)

The backend is deployed to Render using the `render.yaml` configuration file. Important settings include:

- Service type: Web Service
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Environment variables: See `.env.example`

### Frontend Deployment (Vercel)

The frontend is deployed to Vercel with the following configuration:

- Framework preset: Next.js
- Build command: `npm run build`
- Output directory: `.next`
- Environment variables: See `.env.example`

### CI/CD

GitHub Actions workflows automate testing and deployment:

- Backend tests run on pull requests and pushes to main
- Frontend tests run on pull requests and pushes to main
- Automatic deployment to Render and Vercel when merged to main

## Development Setup

### Prerequisites

- Node.js v20.x+
- npm v9.x+
- Python 3.9+
- pip

### Backend Setup

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

5. Run the development server
```bash
uvicorn main:app --reload
```

For a simplified development server:
```bash
python simple_server.py
```

### Frontend Setup

1. Navigate to the frontend directory
```bash
cd ../frontend
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env.local
# Edit .env.local with your actual credentials
```

4. Run the development server
```bash
npm run dev
```

5. For Hot Reload issues
```bash
./clear-cache.sh
```

## Testing

### Backend Testing

Tests are written using pytest and can be run with:

```bash
cd backend
source venv/bin/activate
pytest
```

### Frontend Testing

Tests are written using Jest and React Testing Library:

```bash
cd frontend
npm test
```

End-to-end tests use Cypress:

```bash
cd frontend
npm run cypress:open
```

## Security

### Authentication Security

- Passwords are hashed using bcrypt
- JWTs are signed with HS256 algorithm
- Cookies are HTTP-only, secure, and SameSite=Lax
- CORS is configured to restrict origins

### API Security

- Rate limiting prevents brute force and DoS attacks
- Input validation prevents injection attacks
- API keys are encrypted at rest

### CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Rate Limiting

```python
class RateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(
        self, 
        app,
        auth_routes_rpm: int = 20,
        command_routes_rpm: int = 30,
        general_routes_rpm: int = 60,
    ):
        super().__init__(app)
        self.auth_routes_rpm = auth_routes_rpm
        self.command_routes_rpm = command_routes_rpm
        self.general_routes_rpm = general_routes_rpm
        
        # Try to initialize Redis client
        try:
            if settings.redis_url:
                self.redis = redis.from_url(settings.redis_url)
                self.using_redis = True
            else:
                self.using_redis = False
                self.in_memory_store = {}
        except Exception as e:
            logger.warning(f"Error connecting to Redis: {e}. Using in-memory rate limiting.")
            self.using_redis = False
            self.in_memory_store = {}
    
    async def dispatch(self, request: Request, call_next):
        # Implement rate limiting logic
        # ...
```

## Performance Optimization

### Backend Optimizations

- Async request handling with FastAPI
- Database connection pooling
- Response caching
- Efficient token validation

### Frontend Optimizations

- Static site generation where possible
- Client-side caching
- Code splitting
- Lazy loading of components

### Caching

**Redis Implementation**

```python
import redis
from fastapi import Depends, HTTPException, Request, status
from functools import lru_cache

# Create Redis client
redis_client = redis.Redis(host=settings.redis_host, port=settings.redis_port)

async def get_cached_response(key: str):
    """Get cached response from Redis"""
    cached = await redis_client.get(key)
    if cached:
        return json.loads(cached)
    return None

async def cache_response(key: str, data: Any, expire: int = 300):
    """Cache response in Redis"""
    await redis_client.setex(key, expire, json.dumps(data))

@app.get("/cached-endpoint")
async def cached_endpoint(request: Request):
    cache_key = f"cache:{request.url.path}"
    
    # Try to get from cache
    cached = await get_cached_response(cache_key)
    if cached:
        return cached
    
    # Generate response
    data = await expensive_operation()
    
    # Cache for 5 minutes
    await cache_response(cache_key, data, expire=300)
    
    return data
```

## Testing Checklist

This section provides a comprehensive testing checklist to verify that all components of the system are working correctly. Follow these steps to ensure your deployment is error-free.

### Backend Testing Checklist

1. **Environment Setup Validation**

```bash
# Verify Python version (should be 3.9+)
python --version

# Verify virtual environment activation
which python
# Should show path to your venv

# Verify installed packages
pip list | grep -E 'fastapi|pydantic|uvicorn|supabase|openai|anthropic'
```

Expected output:
```
anthropic        0.8.0
fastapi          0.100.0
openai           1.14.0
pydantic         2.11.1
pydantic-core    2.33.0
pydantic-settings 2.8.1
uvicorn          0.22.0
```

2. **Configuration Validation**

```bash
# Check that your .env file contains all required variables
grep -E 'JWT_SECRET_KEY|SUPABASE_URL|SUPABASE_KEY|OPENAI_API_KEY' .env
```

All of these environment variables should be present.

3. **Start Backend Server**

```bash
# Start the development server
uvicorn main:app --reload
```

Expected output:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

4. **API Endpoint Testing**

Use these curl commands to test each endpoint:

```bash
# Health check endpoint
curl http://localhost:8001/health

# Register a new user (change email for testing)
curl -X POST http://localhost:8001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"securepassword","full_name":"Test User"}'

# Login
curl -X POST http://localhost:8001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"securepassword"}' \
  -c cookies.txt

# Test protected endpoint (get profile)
curl http://localhost:8001/api/profile \
  -H "Content-Type: application/json" \
  -b cookies.txt

# Execute command (requires authentication)
curl -X POST http://localhost:8001/api/commands \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"prompt":"Hello, how are you?","model":"gpt-3.5-turbo"}'

# Logout
curl -X POST http://localhost:8001/auth/logout \
  -b cookies.txt
```

5. **Check OpenAPI Documentation**

Open your browser to `http://localhost:8001/docs` to verify that the Swagger UI documentation is working and all endpoints are documented.

### Frontend Testing Checklist

1. **Environment Setup Validation**

```bash
# Verify Node.js version (should be 20.x+)
node --version

# Verify npm version (should be 9.x+)
npm --version

# Verify installed packages
npm list --depth=0 | grep -E 'next|react|tailwind'
```

2. **Configuration Validation**

```bash
# Check that .env.local contains the API URL
grep NEXT_PUBLIC_API_URL .env.local
```

3. **Start Frontend Development Server**

```bash
# Start the Next.js development server
npm run dev
```

Expected output:
```
> frontend@0.1.0 dev
> next dev

  ▲ Next.js 15.2.4
  - Local:        http://localhost:3000
  - Environments: .env.local

 ✓ Ready in XXXms
```

4. **UI Component Testing**

Open your browser to:
- `http://localhost:3000` - Home page
- `http://localhost:3000/auth/login` - Login page
- `http://localhost:3000/auth/signup` - Registration page

Test each page for:
- Proper rendering
- Form validation
- Error handling
- Navigation

5. **API Integration Testing**

Test the complete user flow:
1. Register a new account with a unique email
2. Log in with the created account
3. Submit a command on the dashboard
4. View command history
5. Log out

6. **Cross-browser Testing**

Test the application in multiple browsers:
- Chrome
- Firefox
- Safari
- Edge

### End-to-End Integration Testing

1. **Complete User Journey**

```bash
# Start both backend and frontend servers
# In one terminal:
cd backend
source venv/bin/activate
uvicorn main:app --reload

# In another terminal:
cd frontend
npm run dev
```

2. **Testing Backend-Frontend Integration**

- Register a new user through the UI
- Check the backend logs for registration request
- Test login and verify JWT cookie is set
- Execute a command and verify it's processed by the backend AI service
- Check that command history is correctly stored and displayed

## Validation Checklist

Use this checklist to ensure your deployment is configured correctly:

### Backend Validation

- [ ] Python 3.9+ is installed and working
- [ ] All required Python packages are installed with correct versions
- [ ] Environment variables are set correctly in .env file
- [ ] CORS is configured to allow requests from frontend origin
- [ ] Rate limiting is working but not too restrictive
- [ ] JWT token generation and validation works
- [ ] OpenAI and Anthropic API keys are valid
- [ ] Supabase connection is working
- [ ] All API endpoints return expected responses
- [ ] Error handling returns proper status codes and messages

### Frontend Validation

- [ ] Node.js 20.x+ and npm 9.x+ are installed
- [ ] All required npm packages are installed with correct versions
- [ ] Environment variables are set correctly in .env.local
- [ ] API URL is pointing to the correct backend
- [ ] Authentication flow works (register, login, logout, token refresh)
- [ ] UI renders correctly on different screen sizes
- [ ] Forms validate inputs correctly
- [ ] Error messages are displayed to the user
- [ ] Command execution and display works as expected
- [ ] Navigation between pages works correctly

## Troubleshooting

This section covers common issues and their solutions to help you resolve problems that may arise during development, testing, or deployment.

### Backend Issues

#### CORS Errors

**Symptoms:** Frontend receives CORS errors when calling backend API.

**Solution:**
```python
# In main.py, ensure CORS middleware is configured correctly:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### JWT Token Issues

**Symptoms:** Authentication works but user is logged out unexpectedly, or refresh token doesn't work.

**Solutions:**
1. Check that JWT secret key is consistent
2. Verify token expiration times (access token typically 15-30 minutes, refresh token 7 days)
3. Ensure cookies are being set with correct attributes:
```python
response.set_cookie(
    key="session_token",
    value=access_token,
    httponly=True,
    secure=settings.environment == "production",  # True in production
    samesite="lax",
    max_age=settings.jwt_access_token_expire_minutes * 60
)
```

#### Database Connection Issues

**Symptoms:** Database operations fail with connection errors.

**Solutions:**
1. Verify Supabase URL and key are correct in .env
2. Check network connectivity to Supabase
3. Ensure database tables exist and have correct schema
4. Look for rate limiting or quota issues in Supabase dashboard

#### AI API Issues

**Symptoms:** Command execution fails or times out.

**Solutions:**
1. Verify API keys for OpenAI/Anthropic are valid and not expired
2. Check API quotas and rate limits
3. Implement retry logic for transient errors:
```python
async def generate_with_retries(prompt, model, max_retries=3):
    for attempt in range(max_retries):
        try:
            return await generate_response(prompt, model)
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            logger.warning(f"Retry {attempt+1}/{max_retries} after error: {e}")
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
```

### Frontend Issues

#### Hot Reload Not Working

**Symptoms:** Changes to frontend code aren't reflected in browser.

**Solutions:**
1. Run the clear-cache script: `./clear-cache.sh`
2. Check for syntax errors in your code
3. Ensure you're not importing server components into client components
4. Try restarting the development server
5. Clear browser cache and cookies

#### Authentication Issues

**Symptoms:** Login works but user state isn't maintained or protected routes redirect to login.

**Solutions:**
1. Check browser storage and cookies to ensure tokens are stored
2. Verify AuthContext is properly providing auth state to components
3. Ensure token refresh is working before access token expires
4. Check for secure and httpOnly flags on cookies in production

#### API Connection Issues

**Symptoms:** Frontend can't connect to backend API.

**Solutions:**
1. Verify correct API URL in environment variables
2. Check network tab in browser dev tools for request/response details
3. Ensure backend server is running and accessible
4. Check for any proxy or CORS issues

#### Styling Issues

**Symptoms:** CSS/Tailwind styles not applying correctly.

**Solutions:**
1. Ensure Tailwind is configured correctly in `tailwind.config.js`
2. Check for proper class names and nesting
3. Clear browser cache
4. Verify PostCSS processing is working

## Setup on a Fresh Environment

Follow these steps to set up the project from scratch on a new environment. These instructions have been tested and verified to work on macOS, Linux, and Windows.

### Prerequisites Installation

#### macOS

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python
brew install python@3.11

# Install Node.js
brew install node@20

# Verify installations
python3 --version  # Should be 3.11.x
node --version     # Should be 20.x.x
npm --version      # Should be 9.x.x or higher
```

#### Linux (Ubuntu/Debian)

```bash
# Update package lists
sudo apt update

# Install Python
sudo apt install python3.11 python3.11-venv python3-pip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
python3 --version  # Should be 3.11.x
node --version     # Should be 20.x.x
npm --version      # Should be 9.x.x or higher
```

#### Windows

1. Install Python from [python.org](https://www.python.org/downloads/)
2. Install Node.js from [nodejs.org](https://nodejs.org/)
3. Open Command Prompt and verify installations:
```
python --version
node --version
npm --version
```

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/command-my-startup.git
cd command-my-startup/backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Edit the .env file with your actual credentials
# You'll need:
# - JWT_SECRET_KEY (generate with: openssl rand -hex 32)
# - SUPABASE_URL and SUPABASE_KEY from your Supabase project
# - OPENAI_API_KEY and/or ANTHROPIC_API_KEY from your accounts

# Start the development server
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

### Frontend Setup

```bash
# In a new terminal, navigate to the frontend directory
cd ../frontend

# Install dependencies
npm install

# Create environment file for development
cp env.example .env.development

# For production or local testing, create .env.local
cp env.example .env.local

# Edit the environment file with your backend API URL and other settings
# NEXT_PUBLIC_API_URL=http://localhost:8001

# Start the development server
npm run dev
```

#### Frontend Environment Files Explanation

Next.js uses different environment files for different scenarios:

- `.env.development` - Used during development (npm run dev)
- `.env.local` - Used for local testing, overrides other .env files
- `.env.production` - Used in production builds (not included in repo)

At minimum, you must configure the following variable:
```
NEXT_PUBLIC_API_URL=http://localhost:8001
```

The other variables in the example file are optional and can be added as needed for additional functionality.

### Verifying Setup

1. Backend API should be available at http://localhost:8001/docs
2. Frontend should be available at http://localhost:3000
3. Test registration and login functionality
4. Test command execution with a simple prompt

### Common Setup Issues

#### Backend Dependencies

If you encounter errors installing Python dependencies, try:
```bash
pip install --upgrade pip
pip install wheel
pip install -r requirements.txt
```

#### Frontend Dependencies

If npm install fails with dependency conflicts:
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### Port Conflicts

If ports 8001 or 3000 are already in use:
```bash
# For backend, use a different port:
uvicorn main:app --reload --host 0.0.0.0 --port 8002

# For frontend, use a different port:
npm run dev -- -p 3001
```

Remember to update your `.env.development` or `.env.local` to point to the new backend port if changed:
```
NEXT_PUBLIC_API_URL=http://localhost:8002
```

## References & Resources

### Official Documentation

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.io/docs)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference)
- [Stripe API Documentation](https://stripe.com/docs/api)

### Libraries and Tools

- [Pydantic](https://docs.pydantic.dev/)
- [React](https://reactjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [React Hook Form](https://react-hook-form.com/get-started)
- [Zod](https://github.com/colinhacks/zod)

### Best Practices

- [FastAPI Best Practices](https://github.com/zhanymkanov/fastapi-best-practices)
- [React Best Practices](https://reactjs.org/docs/thinking-in-react.html)
- [JWT Best Practices](https://auth0.com/blog/jwt-best-practices/)
- [API Security Best Practices](https://github.com/shieldfy/API-Security-Checklist)
- [Next.js Performance Optimization](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.