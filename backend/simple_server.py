import uvicorn
from fastapi import FastAPI
import os

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
    host = os.getenv("HOST", "127.0.0.1")  # Default to localhost if not specified
    uvicorn.run(app, host=host, port=8000)

