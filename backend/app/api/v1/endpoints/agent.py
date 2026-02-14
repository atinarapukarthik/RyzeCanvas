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
    prompt: str = Field(..., description="Natural language description of the UI", min_length=3)
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
    plan: Dict[str, Any]
    prompt: str
    message: str = "UI plan generated successfully"
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "prompt": "Create a login screen",
                "message": "UI plan generated successfully",
                "plan": {
                    "components": [
                        {
                            "id": "card_login",
                            "type": "Card",
                            "props": {"title": "Login"},
                            "position": {"x": 760, "y": 300}
                        }
                    ],
                    "layout": {
                        "theme": "light",
                        "grid": True
                    }
                }
            }
        }


class SavePlanRequest(BaseModel):
    """Request schema for saving a generated plan to a project."""
    project_id: int = Field(..., description="ID of the project to update")
    code_json: Dict[str, Any] = Field(..., description="The generated UI plan to save")
    
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
    current_user: User = Depends(get_current_user)
):
    """
    Generate a UI plan from a natural language prompt using AI.
    
    **Phase 4 Enhancement:**
    - Uses LangGraph orchestration (Retrieve → Plan → Generate → Validate)
    - RAG-based component retrieval from vector store
    - Strict validation loop (max 3 retries) to prevent hallucinated components
    
    - **prompt**: Natural language description of the desired UI
    - **context**: Optional context for generation (theme, preferences, etc.)
    
    **Requires:** Authentication
    
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
        
        # Success - extract the validated plan
        plan = result["output"]
        retries = result.get("retries", 0)
        
        message = f"Generated {len(plan.get('components', []))} components successfully"
        if retries > 0:
            message += f" (validated after {retries} retries)"
        
        return GenerateUIResponse(
            success=True,
            prompt=request.prompt,
            plan=plan,
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
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    
    except Exception as e:
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
            code_json=plan
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
async def agent_status(current_user: User = Depends(get_current_user)):
    """
    Check AI agent status and configuration.
    
    **Phase 4:** Shows LangGraph orchestration and RAG status.
    
    **Requires:** Authentication
    
    Returns information about the configured AI provider, model, and RAG system.
    """
    import os
    
    try:
        provider = os.getenv("AI_MODEL_PROVIDER", "openai")
        has_openai = bool(os.getenv("OPENAI_API_KEY"))
        has_anthropic = bool(os.getenv("ANTHROPIC_API_KEY"))
        
        # Try to initialize RAG to check status
        rag_status = "not_initialized"
        try:
            from app.agent.rag import get_rag
            rag = get_rag()
            rag_status = "operational" if rag.vectorstore else "error"
        except Exception:
            rag_status = "error"
        
        return {
            "status": "operational",
            "phase": "4 - LangGraph Orchestration + RAG",
            "provider": provider,
            "model": "gpt-4o" if provider == "openai" else "claude-3-5-sonnet-20241022",
            "temperature": 0.3,
            "available_components": len(ALLOWED_COMPONENTS),
            "api_key_configured": has_openai or has_anthropic,
            "openai_configured": has_openai,
            "anthropic_configured": has_anthropic,
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
async def list_components(current_user: User = Depends(get_current_user)):
    """
    List all available UI components and their templates.

    **Requires:** Authentication

    Returns the component library with examples for each component type.
    """
    from app.core.component_library import ALLOWED_COMPONENTS, COMPONENT_TEMPLATES

    return {
        "components": ALLOWED_COMPONENTS,
        "count": len(ALLOWED_COMPONENTS),
        "templates": COMPONENT_TEMPLATES
    }


@router.post("/web-search")
async def search_web(
    query: str = Query(..., min_length=3, description="Search query"),
    current_user: User = Depends(get_current_user)
):
    """
    Search the web using DuckDuckGo for information relevant to UI generation.

    **Requires:** Authentication

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
    allowed_extensions = {'.js', '.jsx', '.ts', '.tsx', '.png', '.jpg', '.jpeg', '.figma'}

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
