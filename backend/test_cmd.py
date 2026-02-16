import asyncio
from app.agent.command_executor import execute_command, format_command_output

async def test():
    print("Testing 'dir' command...")
    res = await execute_command("dir")
    print(format_command_output(res))
    
    print("\nTesting 'npm --version' command...")
    res = await execute_command("npm --version")
    print(format_command_output(res))

if __name__ == "__main__":
    asyncio.run(test())
