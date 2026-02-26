"""API v1 router configuration."""
from fastapi import APIRouter
from app.api.v1.endpoints import auth, projects, admin, agent, audio, orchestration

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(agent.router, prefix="/agent", tags=["AI Agent"])
api_router.include_router(audio.router, prefix="/audio", tags=["Audio Transcription"])
api_router.include_router(orchestration.router, prefix="/orchestration", tags=["Orchestration"])
