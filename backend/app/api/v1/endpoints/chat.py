"""
Chat API endpoint for RyzeCanvas.
Provides SSE (Server-Sent Events) streaming for real-time chat interactions.
Routes through the orchestrator for chat, plan, and generate modes.
"""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.models.user import User
from app.agent.orchestrator import orchestrate_chat, ChatRequest


router = APIRouter()


class ChatMessageInput(BaseModel):
    """A single message in the conversation history."""
    role: str = Field(..., description="Message role: 'user' or 'ai'")
    content: str = Field(..., description="Message content")


class ErrorContextItem(BaseModel):
    """Error context for AI to reference and fix."""
    id: str = Field(..., description="Error ID (referenced as @error_id)")
    type: str = Field(...,
                      description="Error type: 'runtime', 'build', 'type', 'lint', 'deployment'")
    message: str = Field(..., description="Error message")
    file: Optional[str] = Field(
        default=None, description="File where error occurred")
    line: Optional[int] = Field(default=None, description="Line number")
    code_snippet: Optional[str] = Field(
        default=None, description="Problematic code snippet")
    stack_trace: Optional[str] = Field(
        default=None, description="Full stack trace")
    context: Optional[str] = Field(
        default=None, description="Additional context about the error")


class ChatRequestBody(BaseModel):
    """Request body for the chat endpoint."""
    prompt: str = Field(..., min_length=1, description="User's message")
    mode: str = Field(
        default="chat", description="Mode: 'chat', 'plan', 'generate', 'plan_interactive', 'plan_implement', 'ui_composer'")
    provider: str = Field(default="gemini", description="AI provider")
    model: str = Field(default="gemini-2.5-flash",
                       description="Model identifier")
    conversation_history: List[ChatMessageInput] = Field(
        default_factory=list,
        description="Previous messages for context"
    )
    web_search_context: Optional[str] = Field(
        default=None,
        description="Web search results to include as context"
    )
    plan_answers: Optional[List[Dict[str, Any]]] = Field(
        default=None,
        description="Answers to plan questions (for plan_interactive mode)"
    )
    plan_data: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Structured plan data (for plan_implement mode)"
    )
    existing_code: Optional[str] = Field(
        default=None,
        description="Existing generated code context for iterative modifications"
    )
    theme_context: Optional[str] = Field(
        default=None,
        description="User's selected design theme for consistent styling in generated code"
    )
    # ── Error handling context ──
    error_context: Optional[List[ErrorContextItem]] = Field(
        default=None,
        description="List of errors for AI to reference (use @error_id in prompt to reference them)"
    )
    # ── Cloud-native context fields ──
    project_id: Optional[str] = Field(
        default=None,
        description="UUID of the project (for Supabase Storage routing)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "prompt": "Create a login form with email and password",
                "mode": "generate",
                "provider": "gemini",
                "model": "gemini-2.5-flash",
                "project_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "conversation_history": [
                    {"role": "user", "content": "I need a login page"},
                    {"role": "ai", "content": "I can help with that. What fields do you need?"},
                ],
            }
        }


@router.post("/stream")
async def chat_stream(
    body: ChatRequestBody,
    current_user: User = Depends(get_current_user),
):
    """
    Stream a chat response via Server-Sent Events (SSE).

    Supports multiple modes:
    - **chat**: Conversational responses with streaming tokens
    - **plan**: Architectural breakdown of the requested UI
    - **generate**: Full code generation pipeline using Artifacts

    Files are written to Supabase Storage at path:
    ``{user_id}/{project_id}/{file_path}``

    **Authentication:** Required (user_id derived from JWT)
    """
    if body.mode not in ("chat", "plan", "generate", "plan_interactive", "plan_implement", "ui_composer"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid mode '{body.mode}'. Must be 'chat', 'plan', 'generate', 'plan_interactive', 'plan_implement', or 'ui_composer'.",
        )

    chat_request = ChatRequest(
        prompt=body.prompt,
        mode=body.mode,
        provider=body.provider,
        model=body.model,
        conversation_history=[
            {"role": m.role, "content": m.content}
            for m in body.conversation_history
        ],
        web_search_context=body.web_search_context,
        plan_answers=body.plan_answers,
        plan_data=body.plan_data,
        existing_code=body.existing_code,
        theme_context=body.theme_context,
        error_context=[e.dict()
                       for e in body.error_context] if body.error_context else None,
        project_id=body.project_id,
        user_id=str(current_user.id),
    )

    return StreamingResponse(
        orchestrate_chat(chat_request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/message")
async def chat_message(
    body: ChatRequestBody,
    current_user: User = Depends(get_current_user),
):
    """
    Non-streaming chat endpoint. Collects the full response and returns it as JSON.
    Use /chat/stream for real-time streaming instead.

    **Requires:** Authentication
    """
    chat_request = ChatRequest(
        prompt=body.prompt,
        mode=body.mode,
        provider=body.provider,
        model=body.model,
        conversation_history=[
            {"role": m.role, "content": m.content}
            for m in body.conversation_history
        ],
        web_search_context=body.web_search_context,
        theme_context=body.theme_context,
        error_context=[e.dict() for e in body.error_context] if body.error_context else None,
        project_id=body.project_id,
        user_id=str(current_user.id),
    )

    import json

    steps = []
    tokens = []
    code = None
    errors = []
    done_meta = {}

    async for raw_event in orchestrate_chat(chat_request):
        if not raw_event.startswith("data: "):
            continue
        try:
            payload = json.loads(raw_event[6:].strip())
        except json.JSONDecodeError:
            continue

        evt = payload.get("event")
        data = payload.get("data")

        if evt == "step":
            steps.append(data)
        elif evt == "token":
            tokens.append(data)
        elif evt == "plan":
            pass
        elif evt == "code":
            code = data
        elif evt == "error":
            errors.append(data)
        elif evt == "done":
            done_meta = data if isinstance(data, dict) else {}

    return {
        "success": done_meta.get("success", len(errors) == 0),
        "mode": body.mode,
        "response": "".join(tokens),
        "steps": steps,
        "code": code,
        "errors": errors,
        **{k: v for k, v in done_meta.items() if k not in ("success", "mode")},
    }
