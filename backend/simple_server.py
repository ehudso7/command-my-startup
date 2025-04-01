"""
Simple test server for deployment validation
"""
from fastapi import FastAPI
import uvicorn

app = FastAPI(title="Simple Test API")

@app.get("/")
def read_root():
    return {"message": "API is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/info")
def get_info():
    import sys
    import platform
    
    return {
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "platform": platform.platform(),
        "packages": [
            {"name": "fastapi", "version": "installed"},
            {"name": "uvicorn", "version": "installed"},
        ]
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)