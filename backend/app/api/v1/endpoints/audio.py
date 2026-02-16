from fastapi import APIRouter, File, UploadFile, Depends, WebSocket
from pydantic import BaseModel
import shutil
import tempfile
import os
import asyncio
from app.core.audio_processor import audio_processor

router = APIRouter()

class TranscriptionResponse(BaseModel):
    text: str
    language: str
    segments: list
    language_probability: float = 0.0

@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(audio: UploadFile = File(...)):
    """Transcribes an uploaded audio file using faster-whisper."""
    
    # Save uploaded file temporarily for processing (faster-whisper needs path)
    suffix = os.path.splitext(audio.filename)[1] if audio.filename else ".webm"
    if not suffix: suffix = ".webm"
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_audio:
        shutil.copyfileobj(audio.file, temp_audio)
        temp_audio_path = temp_audio.name

    try:
        # Transcribe using the singleton processor instance
        result = audio_processor.transcribe(temp_audio_path)
        
        return {
            "text": result.get("text", ""),
            "language": result.get("language", "unknown"),
            "segments": result.get("segments", []),
            "language_probability": result.get("language_probability", 0.0)
        }
    except Exception as e:
        print(f"Transcription error: {e}")
        return {"text": "", "language": "error", "segments": [], "language_probability": 0.0}
    finally:
        if os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
            except:
                pass

@router.websocket("/live")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive binary audio chunk (e.g. from MediaRecorder)
            data = await websocket.receive_bytes()
            
            # Save chunk to temp file
            # Ideally use a rolling buffer or streaming, but simple temp file per chunk works for now for "live" feel
            with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as temp_audio:
                temp_audio.write(data)
                temp_audio_path = temp_audio.name
            
            try:
                # Transcribe chunk
                # Note: This processes each chunk independently. Context is not maintained perfectly.
                result = audio_processor.transcribe(temp_audio_path)
                
                if result.get("text"):
                    await websocket.send_json({
                        "text": result.get("text", ""),
                        "language": result.get("language", "unknown"),
                        "is_final": True # simpler logic for independent chunks
                    })
            except Exception as e:
                print(f"WebSocket transcription error: {e}")
                await websocket.send_json({"error": str(e)})
            finally:
                if os.path.exists(temp_audio_path):
                    try:
                        os.remove(temp_audio_path)
                    except:
                        pass
    except Exception:
        pass # Client disconnected
