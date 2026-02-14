"""
RyzeCanvas Backend - Main Application Entry Point.
FastAPI application with JWT authentication and CORS configuration.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.init_db import init_db
from app.api.v1 import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Runs initialization tasks on startup.
    """
    # Initialize database on startup
    print("[STARTUP] Starting RyzeCanvas Backend...")
    try:
        await init_db()
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        print("[WARN] Server is starting without a database connection. Please check your DATABASE_URL in .env")
    yield
    print("[SHUTDOWN] Shutting down RyzeCanvas Backend...")


# Create FastAPI application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="RyzeCanvas Backend API with Custom JWT Authentication",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
async def root():
    """Root endpoint - API health check."""
    return {
        "message": "Welcome to RyzeCanvas API",
        "version": settings.VERSION,
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.VERSION}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
