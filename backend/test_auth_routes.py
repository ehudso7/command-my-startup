#!/usr/bin/env python3
"""
Test script for authentication routes
This script tests the authentication routes directly without using unittest/pytest
Run with: python test_auth_routes.py
"""

import requests
import json
import sys
from urllib.parse import urljoin

# Test configuration
BASE_URL = "http://localhost:8000"  # Update this if your server is running elsewhere
API_PATH = "/api/auth"

# Test user data
TEST_USER = {
    "email": "test@example.com",
    "full_name": "Test User",
    "password": "SecurePassword123!"
}

def print_response(response):
    """Pretty print a response"""
    print(f"Status Code: {response.status_code}")
    try:
        # Try to parse as JSON and pretty print
        print(json.dumps(response.json(), indent=2))
    except:
        # If not JSON, print as is
        print(response.text)
    print("-" * 50)

def test_register():
    """Test user registration"""
    url = urljoin(BASE_URL, f"{API_PATH}/register")
    print(f"\n🧪 Testing registration at {url}")
    
    response = requests.post(url, json=TEST_USER)
    print_response(response)
    return response.ok

def test_login():
    """Test user login"""
    url = urljoin(BASE_URL, f"{API_PATH}/login")
    print(f"\n🧪 Testing login at {url}")
    
    login_data = {
        "email": TEST_USER["email"],
        "password": TEST_USER["password"]
    }
    
    response = requests.post(url, json=login_data)
    print_response(response)
    
    if response.ok:
        try:
            # Extract token from response
            session_data = response.json().get("session", {})
            token = session_data.get("access_token")
            
            if token:
                print(f"✅ Successfully obtained access token")
                return token
        except:
            pass
            
    print(f"❌ Failed to obtain access token")
    return None

def test_logout(token=None):
    """Test user logout"""
    url = urljoin(BASE_URL, f"{API_PATH}/logout")
    print(f"\n🧪 Testing logout at {url}")
    
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    response = requests.post(url, headers=headers)
    print_response(response)
    return response.ok

def main():
    """Main test function"""
    print("🔐 Testing Authentication Routes 🔐")
    print(f"Base URL: {BASE_URL}")
    
    # Check if server is running
    try:
        health_check = requests.get(urljoin(BASE_URL, "/health"))
        if not health_check.ok:
            print(f"❌ Server health check failed: {health_check.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to server at {BASE_URL}")
        print("Make sure the server is running (uvicorn main:app --reload)")
        return False
        
    print("✅ Server is running")
    
    # Run tests
    register_ok = test_register()
    
    if register_ok:
        token = test_login()
        if token:
            test_logout(token)
    
    print("\n🏁 Test run completed")

if __name__ == "__main__":
    sys.exit(0 if main() else 1)