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

interface TerminalState {
  open: boolean;
  entries: TerminalEntry[];
  filter: LogLevel | "all";
  activePhase: ScaffoldPhase | null;
  onFixError: (() => void) | null;
  toggle: () => void;
  setOpen: (open: boolean) => void;
  setFilter: (level: LogLevel | "all") => void;
  addEntry: (level: LogLevel, message: string, detail?: string, phase?: ScaffoldPhase) => void;
  setPhase: (phase: ScaffoldPhase) => void;
  setOnFixError: (callback: (() => void) | null) => void;
  getLatestErrors: () => TerminalEntry[];
  clear: () => void;
}

let _seq = 0;

export const useTerminalStore = create<TerminalState>()((set, get) => ({
  open: false,
  entries: [],
  filter: "all",
  activePhase: null,
  onFixError: null,
  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (open) => set({ open }),
  setFilter: (filter) => set({ filter }),
  setPhase: (phase) => set({ activePhase: phase }),
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
          message,
          detail,
          phase: phase || s.activePhase || undefined,
        },
      ],
    })),
  clear: () => set({ entries: [], activePhase: null }),
}));
