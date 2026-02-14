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


class ChatRequestBody(BaseModel):
    """Request body for the chat endpoint."""
    prompt: str = Field(..., min_length=1, description="User's message")
    mode: str = Field(default="chat", description="Mode: 'chat', 'plan', or 'generate'")
    provider: str = Field(default="gemini", description="AI provider")
    model: str = Field(default="gemini-2.5-flash", description="Model identifier")
    conversation_history: List[ChatMessageInput] = Field(
        default_factory=list,
        description="Previous messages for context"
    )
    web_search_context: Optional[str] = Field(
        default=None,
        description="Web search results to include as context"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "prompt": "Create a login form with email and password",
                "mode": "generate",
                "provider": "gemini",
                "model": "gemini-2.5-flash",
                "conversation_history": [
                    {"role": "user", "content": "I need a login page"},
                    {"role": "ai", "content": "I can help with that. What fields do you need?"},
                ],
            }
        }


@router.post("/stream")
async def chat_stream(
    body: ChatRequestBody,
):
    """
    Stream a chat response via Server-Sent Events (SSE).

    Supports three modes:
    - **chat**: Conversational responses with streaming tokens
    - **plan**: Architectural breakdown of the requested UI
    - **generate**: Full LangGraph pipeline (Retrieve → Plan → Generate → Validate)

    The stream emits events of these types:
    - `step`: Progress update (e.g., "Retrieving context...")
    - `token`: Streaming text token for the response
    - `plan`: Complete plan text
    - `code`: Generated JSON (only in generate mode)
    - `error`: Error message
    - `done`: Stream complete with metadata

    **Authentication:** Not required (public access)
    """
    if body.mode not in ("chat", "plan", "generate"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid mode '{body.mode}'. Must be 'chat', 'plan', or 'generate'.",
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
    )

    import json

    steps = []
    tokens = []
    code = None
    errors = []
    done_meta = {}

    async for raw_event in orchestrate_chat(chat_request):
        # Parse the SSE data line
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
            pass  # full plan is the joined tokens
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
