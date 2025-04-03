import logging
import os
import uvicorn
from fastapi import FastAPI

app = FastAPI(title="Simple Test API")

@app.get("/")
def read_root():
    return {"message": "API is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/info")
def get_info():
    import platform
    import sys

    return {
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "platform": platform.platform(),
        "packages": [
            {"name": "fastapi", "version": "installed"},
            {"name": "uvicorn", "version": "installed"},
        ],
    }

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")  # Binding to 0.0.0.0 for Render
    port = int(os.getenv("PORT", 8000))  # Default to 8000 if no PORT environment variable
    uvicorn.run(app, host=host, port=port)

