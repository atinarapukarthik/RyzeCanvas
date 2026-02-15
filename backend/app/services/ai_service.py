import httpx
from typing import Optional
from app.core.config import settings


class AIService:
    @staticmethod
    async def generate_code(prompt: str, provider: str = "gemini", model: Optional[str] = None) -> str:
        """
        Generate React/Next.js code using the specified AI provider.
        """
        if provider == "gemini":
            return await AIService._generate_gemini(prompt, model or "gemini-2.5-flash")
        elif provider == "claude":
            return await AIService._generate_claude(prompt, model or "claude-3-5-sonnet-20240620")
        elif provider == "openrouter":
            return await AIService._generate_openrouter(prompt, model or "anthropic/claude-3.5-sonnet")
        elif provider == "ollama":
            # Use configured Ollama model from settings
            default_model = settings.OLLAMA_MODEL if hasattr(
                settings, 'OLLAMA_MODEL') else "codellama:7b"
            return await AIService._generate_ollama(prompt, model or default_model)
        else:
            # Fallback to a mock or default
            return f"/* Generated with {provider} */\nexport default function Component() {{ return <div>{prompt}</div> }}"

    @staticmethod
    async def _generate_gemini(prompt: str, model: str) -> str:
        if not settings.GEMINI_API_KEY:
            return "// Gemini API Key not set. Mocking output:\nexport default function Component() { return <div>Gemini Output</div> }"

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {
            "contents": [{
                "parts": [{"text": f"Generate a professional React component for: {prompt}. Return ONLY the code, no markdown blocks."}]
            }]
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, timeout=30.0)
            if resp.status_code == 200:
                data = resp.json()
                return data['candidates'][0]['content']['parts'][0]['text']
            return f"// Gemini Error: {resp.text}"

    @staticmethod
    async def _generate_claude(prompt: str, model: str) -> str:
        if not settings.ANTHROPIC_API_KEY:
            return "// Anthropic API Key not set."

        url = "https://api.anthropic.com/v1/messages"
        headers = {
            "x-api-key": settings.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        payload = {
            "model": model,
            "max_tokens": 4000,
            "messages": [{"role": "user", "content": prompt}]
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                return resp.json()['content'][0]['text']
            return f"// Claude Error: {resp.text}"

    @staticmethod
    async def _generate_openrouter(prompt: str, model: str) -> str:
        if not settings.OPENROUTER_API_KEY:
            return "// OpenRouter API Key not set."

        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "HTTP-Referer": "http://localhost:3000",  # Required for OpenRouter
            "X-Title": "RyzeCanvas"
        }
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}]
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                return resp.json()['choices'][0]['message']['content']
            return f"// OpenRouter Error: {resp.text}"

    @staticmethod
    async def _generate_ollama(prompt: str, model: str) -> str:
        """Generate code using local Ollama (GPU-accelerated CodeLlama)"""
        # Use the configured model from settings if not specified
        model_to_use = settings.OLLAMA_MODEL if hasattr(
            settings, 'OLLAMA_MODEL') else model

        url = f"{settings.OLLAMA_BASE_URL}/api/generate"

        # Enhanced prompt for better code generation with CodeLlama
        enhanced_prompt = f"""You are an expert React and Next.js developer. Generate clean, production-ready code.

Task: {prompt}

Requirements:
- Use TypeScript
- Use modern React best practices (hooks, functional components)
- Include proper prop types
- Add helpful comments
- Use Tailwind CSS for styling
- Return ONLY the code, no explanations or markdown blocks

Generate the code:"""

        payload = {
            "model": model_to_use,
            "prompt": enhanced_prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "top_p": 0.9,
                "num_ctx": 8192
            }
        }

        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(url, json=payload, timeout=120.0)
                if resp.status_code == 200:
                    result = resp.json()
                    return result.get('response', '// No response from Ollama')
                return f"// Ollama Error ({resp.status_code}): {resp.text}"
            except httpx.TimeoutException:
                return "// Ollama request timed out. Model might be loading..."
            except httpx.ConnectError:
                return f"// Failed to connect to Ollama at {settings.OLLAMA_BASE_URL}. Make sure Ollama is running."
            except Exception as e:
                return f"// Ollama error: {str(e)}"
