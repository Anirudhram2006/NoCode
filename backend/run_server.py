"""Run the FastAPI backend with stable defaults.

Usage:
    python run_server.py
"""

import os

import uvicorn


if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)
