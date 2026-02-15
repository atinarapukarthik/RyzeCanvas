"""
AI Agent API endpoints for RyzeCanvas (Phase 4: LangGraph Orchestration).
Provides endpoints for UI generation using RAG + State Graph with validation loop.
"""
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.project import Project
from app.agent.graph import run_agent  # Phase 4: Use LangGraph orchestration
from app.core.component_library import ALLOWED_COMPONENTS
import json
from datetime import datetime
import httpx


router = APIRouter()


# Request/Response Schemas
class GenerateUIRequest(BaseModel):
    """Request schema for UI generation."""
    prompt: str = Field(...,
                        description="Natural language description of the UI", min_length=3)
    context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional context (theme preferences, existing components, etc.)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "prompt": "Create a login screen with email and password fields",
                "context": {
                    "theme": "dark",
                    "preferredColors": ["#3b82f6", "#10b981"]
                }
            }
        }


class GenerateUIResponse(BaseModel):
    """Response schema for UI generation."""
    success: bool
    code: str
    prompt: str
    message: str = "Code generated successfully"

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "prompt": "Create a login screen",
                "message": "Code generated successfully",
                "code": "import React from 'react';\n\nexport default function LoginPage() { ... }"
            }
        }


class SavePlanRequest(BaseModel):
    """Request schema for saving a generated plan to a project."""
    project_id: int = Field(..., description="ID of the project to update")
    code_json: Dict[str, Any] = Field(...,
                                      description="The generated UI plan to save")

    class Config:
        json_schema_extra = {
            "example": {
                "project_id": 1,
                "code_json": {
                    "components": [],
                    "layout": {"theme": "light"}
                }
            }
        }


class SavePlanResponse(BaseModel):
    """Response schema for save operation."""
    success: bool
    project_id: int
    message: str
    updated_at: datetime


# Endpoints

@router.post("/generate", response_model=GenerateUIResponse)
async def generate_ui(
    request: GenerateUIRequest,
):
    """
    Generate a UI plan from a natural language prompt using AI.

    **Phase 4 Enhancement:**
    - Uses LangGraph orchestration (Retrieve → Plan → Generate → Validate)
    - RAG-based component retrieval from vector store
    - Strict validation loop (max 3 retries) to prevent hallucinated components

    - **prompt**: Natural language description of the desired UI
    - **context**: Optional context for generation (theme, preferences, etc.)

    **Authentication:** Not required (public access)

    **Example:**
    ```json
    {
      "prompt": "Create a dashboard with user stats and recent activity"
    }
    ```

    **Returns:** Structured JSON UI plan with components and layout
    """
    try:
        # Run the LangGraph workflow
        result = await run_agent(request.prompt)

        # Check if generation was successful
        if not result.get("success"):
            # Failed after max retries
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Failed to generate valid UI plan after maximum retries",
                    "errors": result.get("errors", []),
                    "retries": result.get("retries", 0),
                    "hint": "Try simplifying your prompt or being more specific about which components to use"
                }
            )

        # Success - extract the validated code
        code = result["output"]
        retries = result.get("retries", 0)

        message = "Code generated successfully"
        if retries > 0:
            message += f" (validated after {retries} retries)"

        return GenerateUIResponse(
            success=True,
            prompt=request.prompt,
            code=code,
            message=message
        )

    except HTTPException:
        # Re-raise HTTP exceptions
        raise

    except ValueError as e:
        # Validation or parsing errors
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid generation request: {str(e)}"
        )

    except Exception as e:
        # Other errors (API key missing, network issues, etc.)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"UI generation failed: {str(e)}"
        )


@router.post("/save", response_model=SavePlanResponse)
async def save_plan(
    request: SavePlanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Save a generated UI plan to an existing project.

    - **project_id**: ID of the project to update
    - **code_json**: The UI plan to save (from /agent/generate)

    **Requires:** Authentication + Project Ownership

    **Security:** Only the project owner can save plans to their project.

    **Example:**
    ```json
    {
      "project_id": 1,
      "code_json": {
        "components": [...],
        "layout": {...}
      }
    }
    ```
    """
    try:
        if db is not None:
            # Fetch project with ownership check
            result = await db.execute(
                select(Project).where(
                    Project.id == request.project_id,
                    Project.user_id == current_user.id
                )
            )
            project = result.scalar_one_or_none()

            if not project:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found or you don't have permission to update it"
                )

            # Convert dict to JSON string for storage
            code_json_str = json.dumps(request.code_json)

            # Update project
            project.code_json = code_json_str
            project.updated_at = datetime.utcnow()

            await db.commit()
            await db.refresh(project)

            return SavePlanResponse(
                success=True,
                project_id=project.id,
                message=f"UI plan saved to project '{project.title}' successfully",
                updated_at=project.updated_at
            )
        else:
            # Supabase API Fallback
            from app.core.supabase import supabase
            # Check ownership
            response = supabase.table("projects") \
                .select("*") \
                .eq("id", request.project_id) \
                .eq("user_id", current_user.id) \
                .execute()
            
            if not response.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Project not found or you don't have permission to update it"
                )
            
            # Update project
            code_json_str = json.dumps(request.code_json)
            update_resp = supabase.table("projects") \
                .update({"code_json": code_json_str, "updated_at": datetime.utcnow().isoformat()}) \
                .eq("id", request.project_id) \
                .execute()
                
            if not update_resp.data:
                raise HTTPException(status_code=500, detail="Failed to update project in Supabase")
                
            updated_project = update_resp.data[0]
            return SavePlanResponse(
                success=True,
                project_id=updated_project["id"],
                message=f"UI plan saved successfully",
                updated_at=updated_project["updated_at"]
            )

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        if db:
            await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save plan: {str(e)}"
        )


@router.post("/generate-and-save", response_model=SavePlanResponse)
async def generate_and_save(
    prompt: str = Query(..., description="UI description"),
    project_id: int = Query(..., description="Project ID to save to"),
    context: Optional[Dict[str, Any]] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Convenience endpoint: Generate UI plan and immediately save to project.

    Combines /generate and /save in one call.

    **Phase 4:** Uses LangGraph orchestration with validation loop.

    **Query Parameters:**
    - **prompt**: Natural language UI description
    - **project_id**: ID of project to update
    - **context**: Optional generation context (JSON)

    **Example:**
    ```
    POST /agent/generate-and-save?prompt=Create a login screen&project_id=1
    ```
    """
    try:
        # Step 1: Generate UI plan using LangGraph
        result = await run_agent(prompt)

        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "message": "Failed to generate valid UI plan",
                    "errors": result.get("errors", []),
                    "retries": result.get("retries", 0)
                }
            )

        plan = result["output"]

        # Step 2: Save to project
        save_request = SavePlanRequest(
            project_id=project_id,
            code_json={"code": plan}
        )

        return await save_plan(save_request, db, current_user)

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Generate and save failed: {str(e)}"
        )


@router.get("/status")
async def agent_status():
    """
    Check AI agent status and configuration.

    **Phase 4:** Shows LangGraph orchestration and RAG status.

    **Authentication:** Not required (public access)

    Returns information about the configured AI provider, model, and RAG system.
    """
    from app.core.config import settings

    try:
        provider = settings.AI_MODEL_PROVIDER
        has_openai = bool(settings.OPENAI_API_KEY)
        has_anthropic = bool(settings.ANTHROPIC_API_KEY)
        has_gemini = bool(settings.GEMINI_API_KEY)

        # Try to initialize RAG to check status
        rag_status = "not_initialized"
        try:
            from app.agent.rag import get_rag
            rag = get_rag()
            rag_status = "operational" if rag.vectorstore else "error"
        except Exception:
            rag_status = "error"

        model_map = {
            "gemini": "gemini-2.5-flash",
            "openai": "gpt-4o",
            "anthropic": "claude-3-5-sonnet-20241022",
        }

        return {
            "status": "operational",
            "phase": "4 - LangGraph Orchestration + RAG",
            "provider": provider,
            "model": model_map.get(provider, provider),
            "temperature": 0.3,
            "available_components": len(ALLOWED_COMPONENTS),
            "api_key_configured": has_openai or has_anthropic or has_gemini,
            "openai_configured": has_openai,
            "anthropic_configured": has_anthropic,
            "gemini_configured": has_gemini,
            "rag_status": rag_status,
            "max_validation_retries": 3,
            "workflow": "Retrieve → Plan → Generate → Validate (with loop)"
        }

    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "api_key_configured": False
        }


@router.get("/components")
async def list_components():
    """
    List all available UI components and their templates.

    **Authentication:** Not required (public access)

    Returns the component library with examples for each component type.
    """
    from app.core.component_library import ALLOWED_COMPONENTS, COMPONENT_TEMPLATES

    return {
        "components": ALLOWED_COMPONENTS,
        "count": len(ALLOWED_COMPONENTS),
        "templates": COMPONENT_TEMPLATES
    }


@router.get("/models")
async def list_available_models():
    """
    List available AI models based on configured API keys.

    Checks which providers have valid API keys configured and returns
    the available models for each. For OpenRouter, fetches the actual
    model list from their API.

    **Authentication:** Not required (public access)
    """
    from app.core.config import settings

    providers = []
    all_models = []

    # Gemini models
    if settings.GEMINI_API_KEY:
        gemini_models = [
            {"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash",
                "provider": "gemini", "description": "Fast and efficient"},
            {"id": "gemini-1.5-pro", "name": "Gemini 1.5 Pro",
                "provider": "gemini", "description": "Most capable Gemini"},
            {"id": "gemini-2.0-flash-exp", "name": "Gemini 2.0 Flash (Exp)",
                "provider": "gemini", "description": "Next-gen fast model"},
        ]
        providers.append({"id": "gemini", "name": "Google Gemini",
                         "configured": True, "icon": "sparkles"})
        all_models.extend(gemini_models)

    # Anthropic/Claude models
    if settings.ANTHROPIC_API_KEY:
        claude_models = [
            {"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet 4",
                "provider": "claude", "description": "Latest balanced model"},
            {"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet",
                "provider": "claude", "description": "Fast and intelligent"},
            {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus",
                "provider": "claude", "description": "Most capable Claude"},
        ]
        providers.append(
            {"id": "claude", "name": "Anthropic Claude", "configured": True, "icon": "cpu"})
        all_models.extend(claude_models)

    # OpenAI models
    if settings.OPENAI_API_KEY:
        openai_models = [
            {"id": "gpt-4o", "name": "GPT-4o", "provider": "openai",
                "description": "Most capable OpenAI model"},
            {"id": "gpt-4o-mini", "name": "GPT-4o Mini",
                "provider": "openai", "description": "Fast and affordable"},
        ]
        providers.append({"id": "openai", "name": "OpenAI",
                         "configured": True, "icon": "brain"})
        all_models.extend(openai_models)

    # OpenRouter models - fetch from API if key is configured
    if settings.OPENROUTER_API_KEY:
        openrouter_models = []
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://openrouter.ai/api/v1/models",
                    headers={
                        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    models_data = data.get("data", [])
                    # Filter to popular/useful models and limit count
                    popular_prefixes = [
                        "anthropic/", "openai/", "google/", "meta-llama/",
                        "mistralai/", "deepseek/", "qwen/",
                    ]
                    for m in models_data:
                        model_id = m.get("id", "")
                        if any(model_id.startswith(p) for p in popular_prefixes):
                            openrouter_models.append({
                                "id": model_id,
                                "name": m.get("name", model_id),
                                "provider": "openrouter",
                                "description": f"Context: {m.get('context_length', 'N/A')} tokens",
                            })
                    # Sort by name and limit to 30
                    openrouter_models.sort(key=lambda x: x["name"])
                    openrouter_models = openrouter_models[:30]
        except Exception:
            # Fallback to static list if API call fails
            openrouter_models = [
                {"id": "anthropic/claude-3.5-sonnet",
                    "name": "Claude 3.5 Sonnet (via OR)", "provider": "openrouter", "description": "Via OpenRouter"},
                {"id": "openai/gpt-4o",
                    "name": "GPT-4o (via OR)", "provider": "openrouter", "description": "Via OpenRouter"},
                {"id": "google/gemini-2.5-flash-preview",
                    "name": "Gemini 2.5 Flash (via OR)", "provider": "openrouter", "description": "Via OpenRouter"},
                {"id": "meta-llama/llama-3-70b-instruct",
                    "name": "Llama 3 70B (via OR)", "provider": "openrouter", "description": "Via OpenRouter"},
                {"id": "deepseek/deepseek-chat",
                    "name": "DeepSeek Chat (via OR)", "provider": "openrouter", "description": "Via OpenRouter"},
            ]

        if openrouter_models:
            providers.append(
                {"id": "openrouter", "name": "OpenRouter", "configured": True, "icon": "globe"})
            all_models.extend(openrouter_models)

    # Ollama - check if running locally
    ollama_available = False
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                ollama_available = True
                ollama_data = resp.json()
                ollama_models_list = ollama_data.get("models", [])
                for m in ollama_models_list:
                    all_models.append({
                        "id": m.get("name", ""),
                        "name": m.get("name", "").split(":")[0].title() + " (Local)",
                        "provider": "ollama",
                        "description": "Running locally",
                    })
    except Exception:
        pass

    if ollama_available:
        providers.append(
            {"id": "ollama", "name": "Ollama (Local)", "configured": True, "icon": "zap"})

    return {
        "providers": providers,
        "models": all_models,
        "default_provider": settings.AI_MODEL_PROVIDER,
    }


@router.get("/web-search")
async def search_web(
    query: str = Query(..., min_length=3, description="Search query"),
):
    """
    Search the web using DuckDuckGo for information relevant to UI generation.

    **Authentication:** Not required (public access)

    - **query**: The search query (minimum 3 characters)

    Returns search results that can be used as context for code generation.
    """
    try:
        # DuckDuckGo API endpoint (free, no API key required)
        async with httpx.AsyncClient() as client:
            # Using DuckDuckGo's HTML API
            params = {
                "q": query,
                "format": "json",
            }

            headers = {
                "User-Agent": "RyzeCanvas"
            }

            response = await client.get(
                "https://api.duckduckgo.com/",
                params=params,
                headers=headers,
                timeout=10.0
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to search the web"
                )

            data = response.json()

            return {
                "success": True,
                "query": query,
                "results": {
                    "abstract": data.get("AbstractText", ""),
                    "related_topics": [
                        {
                            "name": topic.get("Name", ""),
                            "description": topic.get("Text", "")
                        }
                        for topic in data.get("RelatedTopics", [])[:5]
                    ],
                    "heading": data.get("Heading", "")
                }
            }

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail="Web search timed out"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Web search failed: {str(e)}"
        )


class FileUploadResponse(BaseModel):
    """Response for file upload."""
    success: bool
    filename: str
    size: int
    content_type: str


@router.post("/upload-file", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload a file (image, component code, design file) for UI generation context.

    **Requires:** Authentication

    Accepted file types:
    - Code: .js, .jsx, .ts, .tsx
    - Images: .png, .jpg, .jpeg
    - Design: .figma (metadata only)

    Returns file metadata that can be used with the UI generation.
    """
    # Restrict file types
    allowed_extensions = {'.js', '.jsx', '.ts',
                          '.tsx', '.png', '.jpg', '.jpeg', '.figma'}

    # Get file extension
    file_ext = None
    if '.' in file.filename:
        file_ext = '.' + file.filename.split('.')[-1].lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Accepted types: {', '.join(allowed_extensions)}"
        )

    # Check file size (limit to 5MB)
    content = await file.read()
    file_size = len(content)

    if file_size > 5 * 1024 * 1024:  # 5MB
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds 5MB limit"
        )

    return {
        "success": True,
        "filename": file.filename,
        "size": file_size,
        "content_type": file.content_type or "application/octet-stream"
    }


class TranscriptionResponse(BaseModel):
    """Response for audio transcription."""
    success: bool
    text: str
    language: Optional[str] = None


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(
    audio: UploadFile = File(...),
):
    """
    Transcribe audio using OpenAI's Whisper API.

    **Authentication:** Not required (public access)

    - **audio**: Audio file in WAV, MP3, or OGG format (max 25MB)

    Returns the transcribed text from the audio file.
    """
    from app.core.config import settings

    try:
        # Check if OpenAI API key is configured
        if not settings.OPENAI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OpenAI API key not configured for transcription"
            )

        # Read audio file
        content = await audio.read()
        file_size = len(content)

        # Check file size (OpenAI limit is 25MB)
        if file_size > 25 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Audio file exceeds 25MB limit"
            )

        # Use OpenAI Whisper API
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        # Create a file-like object from the audio bytes
        from io import BytesIO
        audio_file = BytesIO(content)
        audio_file.name = audio.filename or "audio.wav"

        # Call Whisper API
        transcript = await client.audio.transcriptions.create(
            model="whisper-1",
            file=(audio_file.name, audio_file,
                  audio.content_type or "audio/wav"),
        )

        return {
            "success": True,
            "text": transcript.text,
            "language": getattr(transcript, "language", None),
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {str(e)}"
        )
