from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import Counter, Histogram, make_asgi_app

# Create the FastAPI app
app = FastAPI(title="Command My Startup API", version="1.0.0")

# Prometheus metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP Requests',
    ['method', 'endpoint', 'status_code']
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP Request Latency',
    ['method', 'endpoint']
)

# Configure CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

@app.middleware("http")
async def monitor_requests(request, call_next):
    method = request.method
    path = request.url.path
    
    # Record request latency
    with REQUEST_LATENCY.labels(method=method, endpoint=path).time():
        response = await call_next(request)
    
    # Count requests
    REQUEST_COUNT.labels(method=method, endpoint=path, status_code=response.status_code).inc()
    
    return response

@app.get("/")
def read_root():
    return {"message": "Welcome to Command My Startup API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
