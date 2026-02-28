"""
Command Executor for RyzeCanvas AI Agent.
Provides safe, sandboxed terminal access with output capture and timeout controls.

This module is the bridge between the AI orchestration and the real OS terminal.
It allows agents to run npm install, npm build, linting, and other project
management commands in a controlled, whitelisted manner.
"""
import asyncio
import os
import platform
import logging
from typing import Tuple, Optional, List
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class CommandResult:
    """Result of command execution."""
    command: str
    exit_code: int
    stdout: str
    stderr: str
    error: Optional[str] = None
    timeout: bool = False

    @property
    def success(self) -> bool:
        return self.exit_code == 0 and not self.timeout and not self.error


# Security: Allowed commands whitelist
ALLOWED_COMMANDS = {
    # Node/npm commands
    "npm", "node", "npx", "yarn", "pnpm", "bun",
    # Build tools
    "vite", "next", "webpack", "tsc", "esbuild", "turbo", "swc",
    # Testing
    "jest", "vitest", "playwright", "cypress",
    # Linting & Formatting
    "eslint", "prettier", "stylelint", "biome",
    # Git (limited to safe operations)
    "git",
    # File operations (read-only / structural)
    "ls", "dir", "cat", "type", "find", "tree", "grep", "mkdir",
    # System info
    "python", "python3", "pip", "pip3", "pwd",
    # PowerShell basics
    "powershell", "cmd",
}


def is_command_allowed(command: str) -> bool:
    """
    Check if a command is in the allowed whitelist.
    Prevents execution of dangerous commands like rm -rf, del /s, format, etc.
    """
    # Extract the base command (first word)
    clean_cmd = command.strip().replace("&&", ";").split(";")[0].strip()
    if not clean_cmd:
        return False

    base_cmd = clean_cmd.split()[0]

    # Remove path separators (e.g., ./npm, ../node, C:\\npm)
    base_cmd = os.path.basename(base_cmd)

    # Remove Windows extensions
    base_cmd = base_cmd.replace(".exe", "").replace(
        ".cmd", "").replace(".bat", "")

    return base_cmd.lower() in ALLOWED_COMMANDS


async def execute_command(
    command: str,
    cwd: Optional[str] = None,
    timeout: int = 120,
    env: Optional[dict] = None,
) -> CommandResult:
    """
    Execute a shell command asynchronously with timeout and output capture.

    Args:
        command: The shell command to execute.
        cwd: Working directory (defaults to workspace).
        timeout: Max seconds to wait before killing the process.
        env: Optional environment variables to merge with the current env.
    """
    # Default CWD to project workspace
    if cwd is None:
        cwd = os.path.abspath(os.path.join(os.getcwd(), "..", "workspace"))
        if not os.path.exists(cwd):
            os.makedirs(cwd, exist_ok=True)

    # Determine shell based on platform
    is_windows = platform.system() == "Windows"

    # Command translation for Windows
    if is_windows:
        parts = command.strip().split()
        if parts:
            base = parts[0].lower()
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
                command = aliases[base] + " " + " ".join(parts[1:])

        # On Windows, wrap in powershell for consistent behavior
        cmd_escaped = command.replace('"', '\\"')
        command = f'powershell -Command "{cmd_escaped}"'

    # Security check
    try:
        if not is_command_allowed(command):
            if is_windows and "-Command" in command:
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
        return CommandResult(
            command=command,
            exit_code=-1,
            stdout="",
            stderr="",
            error=f"Security parsing error: {str(e)}",
            timeout=False
        )

    # Build environment
    run_env = os.environ.copy()
    if env:
        run_env.update(env)

    try:
        process = await asyncio.create_subprocess_shell(
            command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=cwd,
            env=run_env,
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
            except Exception:
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


# ──────────────────────────────────────────────────
# High-Level Project Management Helpers
# ──────────────────────────────────────────────────

async def check_node_installed() -> bool:
    """Check if Node.js is installed by looking it up in PATH directly."""
    import shutil
    # Fast path: check PATH without spawning a subprocess (which fails on
    # some Windows environments when the venv PATH doesn't include Node)
    if shutil.which("node"):
        return True
    # Slow path: actually run node --version as a subprocess fallback
    try:
        result = await execute_command("node --version", timeout=10)
        return bool(result.success and result.stdout.strip().startswith("v"))
    except Exception:
        return False


async def check_npm_installed() -> bool:
    """Check if npm is installed."""
    result = await execute_command("npm --version", timeout=10)
    return result.success


async def get_npm_version() -> Optional[str]:
    """Get installed npm version."""
    result = await execute_command("npm --version", timeout=10)
    if result.success:
        return result.stdout.strip()
    return None


async def get_node_version() -> Optional[str]:
    """Get installed Node.js version."""
    result = await execute_command("node --version", timeout=10)
    if result.success:
        return result.stdout.strip()
    return None


async def npm_install(workspace_root: str) -> CommandResult:
    """
    Run `npm install` inside the given workspace.
    Uses a generous timeout since npm install can be slow.
    """
    return await execute_command(
        "npm install --legacy-peer-deps",
        cwd=workspace_root,
        timeout=180  # 3 minutes for npm install
    )


async def npm_build(workspace_root: str) -> CommandResult:
    """
    Run `npm run build` inside the given workspace.
    This is the ultimate validation — if next build passes, the project is real.
    """
    return await execute_command(
        "npm run build",
        cwd=workspace_root,
        timeout=180  # 3 minutes for build
    )


async def npm_lint(workspace_root: str) -> CommandResult:
    """
    Run `npm run lint` inside the given workspace.
    """
    return await execute_command(
        "npm run lint",
        cwd=workspace_root,
        timeout=60
    )


async def verify_project_health(workspace_root: str) -> dict:
    """
    Run a comprehensive health check on the generated project.
    Returns a dictionary with results for each check.
    """
    from typing import Any

    results: dict[str, Any] = {
        "node_available": False,
        "npm_available": False,
        "install_result": None,
        "build_result": None,
        "overall_status": "UNKNOWN",
        "errors": [],
    }

    # Check prerequisites
    results["node_available"] = await check_node_installed()
    results["npm_available"] = await check_npm_installed()

    if not results["node_available"]:
        results["errors"].append("Node.js is not installed or not in PATH")
        results["overall_status"] = "FAIL"
        return results

    if not results["npm_available"]:
        results["errors"].append("npm is not installed or not in PATH")
        results["overall_status"] = "FAIL"
        return results

    # Check that package.json exists
    pkg_path = os.path.join(workspace_root, "package.json")
    if not os.path.exists(pkg_path):
        results["errors"].append("package.json not found — Librarian may have failed")
        results["overall_status"] = "FAIL"
        return results

    # npm install
    install_res = await npm_install(workspace_root)
    results["install_result"] = {
        "success": install_res.success,
        "exit_code": install_res.exit_code,
        "error": install_res.error or (install_res.stderr if install_res.exit_code != 0 else None),
    }

    if not install_res.success:
        results["errors"].append(f"npm install failed: {install_res.error or install_res.stderr[:500]}")
        results["overall_status"] = "FAIL"
        return results

    # npm build
    build_res = await npm_build(workspace_root)
    results["build_result"] = {
        "success": build_res.success,
        "exit_code": build_res.exit_code,
        "stdout": build_res.stdout[-500:] if build_res.stdout else "",
        "error": build_res.error or (build_res.stderr if build_res.exit_code != 0 else None),
    }

    if not build_res.success:
        results["errors"].append(f"npm run build failed: {build_res.error or build_res.stderr[:500]}")
        results["overall_status"] = "FAIL"
        return results

    results["overall_status"] = "PASS"
    return results
