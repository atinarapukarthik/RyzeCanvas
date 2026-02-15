"""
Test script for Ollama integration with RyzeCanvas backend.
Run this to verify CodeLlama 7B is working with your FastAPI backend.
"""
from app.core.config import settings
from app.services.ai_service import AIService
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


async def test_ollama():
    print("=" * 60)
    print("RyzeCanvas - Ollama Integration Test")
    print("=" * 60)
    print()

    # Show configuration
    print("Configuration:")
    print(f"  AI Provider: {settings.AI_MODEL_PROVIDER}")
    print(f"  Ollama URL:  {settings.OLLAMA_BASE_URL}")
    print(f"  Ollama Model: {settings.OLLAMA_MODEL}")
    print()

    # Test prompt
    test_prompt = "Create a simple React button component with hover effects"
    print(f"Test Prompt: {test_prompt}")
    print()
    print("Generating code...")
    print("-" * 60)

    try:
        # Generate code using Ollama
        result = await AIService.generate_code(
            prompt=test_prompt,
            provider="ollama",
            model=settings.OLLAMA_MODEL
        )

        print()
        print("Generated Code:")
        print("=" * 60)
        print(result)
        print("=" * 60)
        print()

        if "Failed to connect" in result or "Error" in result:
            print("❌ Test FAILED - Check if Ollama is running")
            print()
            print("Make sure Ollama is running:")
            print("  Windows: Check if ollama.exe is running in Task Manager")
            print("  Or run: ollama serve")
        else:
            print("✅ Test PASSED - Ollama is working!")
            print()
            print("Your GPU-accelerated CodeLlama 7B is ready!")

    except Exception as e:
        print(f"❌ Test FAILED with exception: {e}")
        print()
        print("Troubleshooting:")
        print("1. Make sure Ollama is running")
        print("2. Check that CodeLlama 7B is installed: ollama list")
        print("3. Verify GPU is being used: nvidia-smi -l 1")

if __name__ == "__main__":
    asyncio.run(test_ollama())
