"""
Tests for the RequestValidationMiddleware implementation
"""
import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from starlette.middleware import Middleware
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route
import logging

from middleware.request_validator import RequestValidationMiddleware

# Disable logging for tests
logging.disable(logging.CRITICAL)

def create_app_with_middleware():
    """Create a FastAPI app with the RequestValidationMiddleware"""
    async def home(request):
        return JSONResponse({"message": "Hello, World!"})
        
    async def commands(request):
        return JSONResponse({"message": "Commands endpoint"})
        
    async def echo_headers(request):
        headers = {k: v for k, v in request.headers.items()}
        return JSONResponse({"headers": headers})
        
    async def test_api_key(request):
        if hasattr(request.state, "user_id"):
            return JSONResponse({
                "authenticated": True,
                "user_id": request.state.user_id,
                "key_id": request.state.api_key_id
            })
        return JSONResponse({"authenticated": False})
        
    routes = [
        Route("/", home),
        Route("/api/commands", commands),
        Route("/api/commands/test", test_api_key),
        Route("/echo-headers", echo_headers),
    ]
    
    middleware = [
        Middleware(RequestValidationMiddleware)
    ]
    
    app = Starlette(routes=routes, middleware=middleware)
    return app

@pytest.fixture
def client():
    """Create a test client for the API"""
    app = create_app_with_middleware()
    return TestClient(app)

def test_middleware_basic_request(client):
    """Test that the middleware handles basic requests"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello, World!"}
    
    # Check custom headers
    assert "x-request-id" in response.headers
    assert "x-process-time" in response.headers

def test_middleware_commands_endpoint(client):
    """Test that the middleware handles commands endpoint"""
    response = client.get("/api/commands")
    assert response.status_code == 200
    assert response.json() == {"message": "Commands endpoint"}

def test_middleware_api_key_validation(client, monkeypatch):
    """Test API key validation"""
    # Mock the validate_api_key method to return a successful result
    async def mock_validate_api_key(*args, **kwargs):
        return True, "test-user-id", "test-key-id"
    
    # Patch the validate_api_key method
    monkeypatch.setattr(
        "middleware.request_validator.RequestValidationMiddleware.validate_api_key",
        mock_validate_api_key
    )
    
    response = client.get(
        "/api/commands/test", 
        headers={"x-api-key": "cms_test_api_key"}
    )
    
    assert response.status_code == 200
    assert response.json() == {
        "authenticated": True,
        "user_id": "test-user-id",
        "key_id": "test-key-id"
    }

def test_middleware_error_handling(client):
    """Test middleware error handling"""
    # Create a route that will raise an exception
    async def error_route(scope, receive, send):
        raise ValueError("Test error")
    
    # Add the error route to the app
    app = create_app_with_middleware()
    app.router.routes.append(Route("/error", error_route))
    
    # Create a new client with the updated app
    client = TestClient(app)
    
    # Make a request to the error route
    response = client.get("/error")
    
    # Should return a 500 error
    assert response.status_code == 500
    assert "detail" in response.json()

def test_middleware_request_id_generation(client):
    """Test that each request gets a unique request ID"""
    # Make two requests and check that the request IDs are different
    response1 = client.get("/echo-headers")
    response2 = client.get("/echo-headers")
    
    assert "x-request-id" in response1.headers
    assert "x-request-id" in response2.headers
    assert response1.headers["x-request-id"] != response2.headers["x-request-id"]