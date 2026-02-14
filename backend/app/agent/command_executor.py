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
    "ls", "dir", "cat", "type", "find", "tree",
    # System info
    "node", "npm", "python", "python3", "pip"
}


def is_command_allowed(command: str) -> bool:
    """
    Check if a command is in the allowed whitelist.
    Prevents execution of dangerous commands.
    """
    # Extract the base command (first word)
    base_cmd = command.strip().split()[0]

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

    Args:
        command: Shell command to execute
        cwd: Working directory (defaults to current directory)
        timeout: Max execution time in seconds (default: 60)

    Returns:
        CommandResult with stdout, stderr, exit code, and errors
    """
    # Security check
    if not is_command_allowed(command):
        return CommandResult(
            command=command,
            exit_code=-1,
            stdout="",
            stderr="",
            error=f"Command not allowed for security reasons: {command.split()[0]}"
        )

    # Determine shell based on platform
    is_windows = platform.system() == "Windows"
    shell = is_windows

    try:
        # Create subprocess
        process = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=cwd,
            shell=shell,
        )

        # Wait for completion with timeout
        try:
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout
            )

            stdout = stdout_bytes.decode('utf-8', errors='replace').strip()
            stderr = stderr_bytes.decode('utf-8', errors='replace').strip()
            exit_code = process.returncode or 0

            return CommandResult(
                command=command,
                exit_code=exit_code,
                stdout=stdout,
                stderr=stderr,
                timeout=False
            )

        except asyncio.TimeoutError:
            # Kill the process on timeout
            try:
                process.kill()
                await process.wait()
            except Exception:
                pass

            return CommandResult(
                command=command,
                exit_code=-1,
                stdout="",
                stderr="",
                error=f"Command timed out after {timeout} seconds",
                timeout=True
            )

    except Exception as e:
        return CommandResult(
            command=command,
            exit_code=-1,
            stdout="",
            stderr="",
            error=f"Execution error: {str(e)}"
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
