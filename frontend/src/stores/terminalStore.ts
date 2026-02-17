import { create } from "zustand";

export type LogLevel = "info" | "warn" | "error" | "success" | "command" | "install" | "file" | "phase";

export type ScaffoldPhase =
  | "dependencies"
  | "config"
  | "entry"
  | "app"
  | "source"
  | "install"
  | "devserver"
  | "build"
  | "lint"
  | "test"
  | "shell"
  | "thinking"
  | "complete";

export interface TerminalEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  message: string;
  detail?: string;
  phase?: ScaffoldPhase;
}

/**
 * Strip code blocks and raw code from terminal messages.
 * Terminal should only show human-readable progress text.
 */
function sanitizeTerminalMessage(message: string): string {
  // Remove markdown code blocks
  let clean = message.replace(/```[\s\S]*?```/g, "[code]");
  // Remove inline code that looks like full expressions
  clean = clean.replace(/`[^`]{50,}`/g, "[code]");
  // Remove XML-like artifact tags
  clean = clean.replace(/<ryze_artifact[\s\S]*?<\/ryze_artifact>/g, "");
  clean = clean.replace(/<ryze_action[\s\S]*?<\/ryze_action>/g, "");
  // Remove lines that look like raw code (import statements, JSX, etc.)
  clean = clean
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("import ") && trimmed.includes("from")) return false;
      if (trimmed.startsWith("export default")) return false;
      if (trimmed.startsWith("const ") && trimmed.includes("=>")) return false;
      if (trimmed.startsWith("<") && trimmed.endsWith("/>")) return false;
      return true;
    })
    .join("\n")
    .trim();
  return clean || message;
}

interface TerminalState {
  open: boolean;
  entries: TerminalEntry[];
  filter: LogLevel | "all";
  activePhase: ScaffoldPhase | null;
  projectId: string | null;
  onFixError: (() => void) | null;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setFilter: (level: LogLevel | "all") => void;
  addEntry: (level: LogLevel, message: string, detail?: string, phase?: ScaffoldPhase) => void;
  setPhase: (phase: ScaffoldPhase) => void;
  setProjectId: (id: string | null) => void;
  setOnFixError: (callback: (() => void) | null) => void;
  getLatestErrors: () => TerminalEntry[];
  clear: () => void;
  clearForProject: (projectId: string) => void;
}

let _seq = 0;

export const useTerminalStore = create<TerminalState>()((set, get) => ({
  open: false,
  entries: [],
  filter: "all",
  activePhase: null,
  projectId: null,
  onFixError: null,
  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (open) => set({ open }),
  setFilter: (filter) => set({ filter }),
  setPhase: (phase) => set({ activePhase: phase }),
  setProjectId: (id) => set({ projectId: id }),
  setOnFixError: (callback) => set({ onFixError: callback }),
  getLatestErrors: () => {
    const { entries } = get();
    return entries.filter((e) => e.level === "error").slice(-5);
  },
  addEntry: (level, message, detail, phase) =>
    set((s) => ({
      entries: [
        ...s.entries,
        {
          id: `t-${Date.now()}-${_seq++}`,
          timestamp: Date.now(),
          level,
          message: sanitizeTerminalMessage(message),
          detail: detail ? sanitizeTerminalMessage(detail) : undefined,
          phase: phase || s.activePhase || undefined,
        },
      ],
    })),
  clear: () => set({ entries: [], activePhase: null }),
  clearForProject: (projectId: string) => {
    const { projectId: currentId } = get();
    if (currentId !== projectId) {
      set({ entries: [], activePhase: null, projectId });
    }
  },
}));
