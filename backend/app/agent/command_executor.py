"""
Command Executor for RyzeCanvas AI Agent.
Safely executes shell commands with output capture and timeout controls.
"""
import asyncio
import os
import platform
from typing import Tuple, Optional
from dataclasses import dataclass


@dataclass
class CommandResult:
    """Result of command execution."""
    command: str
    exit_code: int
    stdout: str
    stderr: str
    error: Optional[str] = None
    timeout: bool = False


# Security: Allowed commands whitelist
ALLOWED_COMMANDS = {
    # Node/npm commands
    "npm", "node", "npx", "yarn", "pnpm",
    # Build tools
    "vite", "next", "webpack", "tsc", "esbuild",
    # Testing
    "jest", "vitest", "playwright", "cypress",
    # Linting
    "eslint", "prettier", "stylelint",
    # Git
    "git",
    # File operations
    "ls", "dir", "cat", "type", "find", "tree", "grep", "mkdir",
    # System info
    "node", "npm", "python", "python3", "pip", "pwd"
}


def is_command_allowed(command: str) -> bool:
    """
    Check if a command is in the allowed whitelist.
    Prevents execution of dangerous commands.
    """
    # Extract the base command (first word)
    # Handle both unix-style (ls) and windows-style (dir)
    # Also handle compound commands like 'npm install'
    clean_cmd = command.strip().replace("&&", ";").split(";")[0].strip()
    base_cmd = clean_cmd.split()[0]

    # Remove path separators (e.g., ./npm, ../node)
    base_cmd = os.path.basename(base_cmd)

    # Remove Windows extensions
    base_cmd = base_cmd.replace(".exe", "").replace(
        ".cmd", "").replace(".bat", "")

    return base_cmd.lower() in ALLOWED_COMMANDS


async def execute_command(
    command: str,
    cwd: Optional[str] = None,
    timeout: int = 60,
) -> CommandResult:
    """
    Execute a shell command asynchronously with timeout and output capture.
    """
    # Default CWD to project workspace
    if cwd is None:
        # We target the workspace folder where generated apps live
        cwd = os.path.abspath(os.path.join(os.getcwd(), "..", "workspace"))
        if not os.path.exists(cwd):
            os.makedirs(cwd, exist_ok=True)

    # Determine shell based on platform
    is_windows = platform.system() == "Windows"

    # Command translation for Windows (Unix-isms to Windows equivalents)
    if is_windows:
        parts = command.strip().split()
        if parts:
            base = parts[0].lower()
            # Map common unix commands used by AI to PowerShell equivalents
            aliases = {
                "ls": "dir",
                "cat": "type",
                "rm": "del",
                "cp": "copy",
                "mv": "move",
                "pwd": "cd",
                "clear": "cls",
                "grep": "findstr"
            }
            if base in aliases:
                # Basic alias replacement
                command = aliases[base] + " " + " ".join(parts[1:])
        
        # On Windows, wrap everything in powershell for better behavior
        cmd_escaped = command.replace('"', '\\"')
        command = f'powershell -Command "{cmd_escaped}"'

    # Security check (check the translated/final command's base)
    try:
        if not is_command_allowed(command):
            # We check the original base too just in case
            if is_windows and "-Command" in command:
                # Extract from powershell wrapper
                parts = command.split("-Command")
                if len(parts) > 1:
                    cmd_payload = parts[-1].strip().strip('"')
                    if cmd_payload:
                        original_base = cmd_payload.split()[0]
                    else:
                        original_base = "unknown"
                else:
                    original_base = "unknown"
            else:
                original_base = command.split()[0] if command.strip() else "unknown"

            if not is_command_allowed(original_base):
                return CommandResult(
                    command=command,
                    exit_code=-1,
                    stdout="",
                    stderr="",
                    error=f"Command not allowed: {original_base}",
                    timeout=False
                )
    except Exception as e:
        logger.error(f"Security check failed: {e}")
        # If we can't parse it, block it for safety
        return CommandResult(
            command=command,
            exit_code=-1,
            stdout="",
            stderr="",
            error=f"Security parsing error: {str(e)}",
            timeout=False
        )

    try:
        # Use asyncio.create_subprocess_shell
        process = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=cwd,
        )

        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout
            )
            
            stdout = stdout_bytes.decode('utf-8', errors='replace').strip()
            stderr = stderr_bytes.decode('utf-8', errors='replace').strip()
            
            return CommandResult(
                command=command,
                exit_code=process.returncode or 0,
                stdout=stdout,
                stderr=stderr,
                timeout=False
            )

        except asyncio.TimeoutError:
            try:
                process.kill()
            except:
                pass
            return CommandResult(
                command=command,
                exit_code=-1,
                stdout="",
                stderr="",
                error=f"Timed out after {timeout}s",
                timeout=True
            )

    except Exception as e:
        return CommandResult(
            command=command,
            exit_code=-1,
            stdout="",
            stderr="",
            error=f"Execution failed: {str(e)}",
            timeout=False
        )


def format_command_output(result: CommandResult, max_lines: int = 50) -> str:
    """
    Format command execution result for AI consumption.
    Truncates long output to prevent token overflow.
    """
    lines = []

    lines.append(f"$ {result.command}")

    if result.error:
        lines.append(f"ERROR: {result.error}")
        return "\n".join(lines)

    if result.timeout:
        lines.append("⏱️ Command timed out")
        return "\n".join(lines)

    # Add stdout
    if result.stdout:
        stdout_lines = result.stdout.split('\n')
        if len(stdout_lines) > max_lines:
            lines.append("--- Output (truncated) ---")
            lines.extend(stdout_lines[:max_lines])
            lines.append(
                f"... ({len(stdout_lines) - max_lines} more lines omitted)")
        else:
            lines.extend(stdout_lines)

    # Add stderr if present
    if result.stderr and result.exit_code != 0:
        lines.append("--- Errors ---")
        stderr_lines = result.stderr.split('\n')
        if len(stderr_lines) > max_lines:
            lines.extend(stderr_lines[:max_lines])
            lines.append(
                f"... ({len(stderr_lines) - max_lines} more lines omitted)")
        else:
            lines.extend(stderr_lines)

    lines.append(f"Exit code: {result.exit_code}")

    return "\n".join(lines)


# Common commands helper
async def check_node_installed() -> bool:
    """Check if Node.js is installed."""
    result = await execute_command("node --version", timeout=5)
    return result.exit_code == 0


async def check_npm_installed() -> bool:
    """Check if npm is installed."""
    result = await execute_command("npm --version", timeout=5)
    return result.exit_code == 0


async def get_npm_version() -> Optional[str]:
    """Get installed npm version."""
    result = await execute_command("npm --version", timeout=5)
    if result.exit_code == 0:
        return result.stdout.strip()
    return None


async def get_node_version() -> Optional[str]:
    """Get installed Node.js version."""
    result = await execute_command("node --version", timeout=5)
    if result.exit_code == 0:
        return result.stdout.strip()
    return None
