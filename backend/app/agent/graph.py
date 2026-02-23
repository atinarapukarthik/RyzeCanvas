async def run_agent(prompt: str):
    return {
        "success": True,
        "output": f"Mock UI for {prompt}",
        "retries": 0,
        "errors": []
    }
