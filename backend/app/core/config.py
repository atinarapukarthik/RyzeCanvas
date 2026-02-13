"""
Core configuration module for RyzeCanvas Backend.
Loads and validates environment variables using pydantic-settings.
"""
from typing import List, Optional, Dict, Any
from pydantic import AnyHttpUrl, validator, model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application Metadata
    PROJECT_NAME: str = "RyzeCanvas"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security Configuration
    # Security Configuration
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Database Configuration
    DATABASE_URL: str
    
    # Frontend Configuration
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_CORS_ORIGINS: List[str] = []
    
    # AI Configuration
    AI_MODEL_PROVIDER: str = "openai"
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    
    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v, values):
        """
        Build CORS origins list.
        Always includes FRONTEND_URL and localhost defaults.
        """
        origins = []
        
        # Add explicitly defined origins
        if isinstance(v, str):
            import json
            try:
                origins.extend(json.loads(v))
            except json.JSONDecodeError:
                origins.append(v)
        elif isinstance(v, list):
            origins.extend(v)
            
        # Add FRONTEND_URL from env if available
        if "FRONTEND_URL" in values:
            origins.append(values["FRONTEND_URL"])
            
        # Add common defaults if empty
        if not origins:
            origins = ["http://localhost:5173", "http://localhost:3000"]
            
        return list(set(origins))  # Remove duplicates
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"
    }


# Global settings instance
settings = Settings()
