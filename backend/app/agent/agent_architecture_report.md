# RyzeCanvas Agent Architecture Report

This document outlines the core system prompt structure and the orchestration logic that powers **Ryze**, the AI engineering agent within RyzeCanvas.

## 1. System Prompt Architecture (`system_prompt.py`)

The system prompt is designed to be modular, providing specific personas and rules based on the active mode of interaction.

### Core Identity (`IDENTITY_CORE`)
- **Persona**: **Ryze**, a senior frontend architect and autonomous maintainer.
- **Goal**: Build stable, functional, and visually stunning applications (React + Tailwind CSS).
- **Environment**: Operates as a local agent with direct access to the project workspace and terminal.
- **Protocols**:
  - **Workspace Protocol**: Targets the specific application being built; maintains project health across turns.
  - **Debugging Protocol**: Action-oriented "Vibe Coding Loop" (Execute -> Monitor -> Locate -> Patch).
  - **Vibe Coding Standard**: Autonomous engineering (Search, Read, Analyze, Consistency Check, Fix, Validate).
  - **Type-First Development**: Prioritizes checking types before logic.

### Interaction Modes
Each mode has its own specialized system prompt:

| Mode | Purpose | Key Instructions |
| :--- | :--- | :--- |
| `CHAT` | Conversational help | Concise, direct, has terminal access for debugging, never outputs raw code unless requested via build keywords. |
| `PLAN` | Architecture breakdown | High-level breakdown: Layout, Components, Visual Theme, Tech Stack, UX Considerations. |
| `GENERATE-PLAN` | Planning for generation | Step-by-step structure without code: Understanding, Breakdown, Layout, Visual Style, Tools, Steps. |
| `GENERATE-STRUCTURED` | Code Project Mapping | Produces a JSON implementation plan (files, steps, libraries, skills). |
| `GENERATE-JSON` | UI Library Composer | Deterministic UI generation using a fixed component library (JSON output). |
| `EXPLAINER` | Design Philosophy | Explains *why* design decisions were made (UX focus, trade-offs). |
| `PLAN-QUESTIONS` | Interactive Clarification | Generates clarifying questions with options to narrow down user vision. |
| `PLAN-IMPLEMENT` | File-by-file Coder | Generates complete code for specific files while maintaining cross-file consistency. |

---

## 2. Orchestration Logic (`orchestrator.py`)

The `orchestrator.py` acts as the brain, routing user requests to specialized handlers and managing real-time communication via Server-Sent Events (SSE).

### Execution Pipeline
1.  **Context Gathering**: `_get_project_context()` scans the workspace (depth 3) and reads core files (`package.json`, `types.ts`, `api.ts`) to give the AI "sight."
2.  **LLM Selection**: `_get_llm()` initializes providers (Gemini, Claude, OpenAI, Ollama) based on configuration.
3.  **Streaming & Events**: Uses a rich set of SSE events to keep the UI interactive:
    - `step`: Current action description.
    - `token`: Live text streaming.
    - `code`: Live code updates in the editor.
    - `file_update`: Status of individual file writes.
    - `todo`: Implementation progress checklist.
    - `command`: Terminal output.
    - `web_search`: Live search results integration.

### Specialized Handlers

#### `_handle_chat` (ReAct Loop)
Implements an autonomous debugging loop:
- **Thought Extraction**: Identifies `<thought>` blocks for the UI.
- **Todo Management**: Parses `<todo>` tags into actionable items.
- **Web Search**: Automatically triggers searches via `<search_web>` tags.
- **Command Execution**: Runs terminal commands via `<execute_command>` and feeds output back to the model.
- **File Updates**: Surgically applies code fixes via `<update_files>` (JSON array).

#### `_handle_generate` (Professional Pipeline)
A 3-step sequence for building full features:
1.  **NL Planning**: Discusses the approach.
2.  **Structured JSON Plan**: Maps out the file structure and dependencies.
3.  **Implementation**: Hands off to `_handle_plan_implement` for file-by-file coding.

#### `_handle_plan_implement` (Reliability layer)
- **Library Simulation**: Visualizes dependency installation steps.
- **Consistency**: Feeds "already generated files" back into the prompt for subsequent files to ensure imports and types match across the whole project.
- **Workspace Sync**: Writes files to the local `../workspace/` directory immediately.

### Validation & Sanitization
- **`_clean_code_output`**: Extracts code from markdown fences and handles both single-file and multi-file JSON bundles.
- **`_validate_code`**: Ensures generated code has entry points (`App.tsx`), Tailwind configs, and valid component definitions.
- **`_sync_files_to_workspace`**: Safely writes files to the physical disk.
