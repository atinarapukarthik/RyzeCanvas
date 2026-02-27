"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useTerminalStore, LogLevel, ScaffoldPhase, TerminalEntry } from "@/stores/terminalStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Terminal as TerminalIcon,
  Trash2,
  Copy,
  Check,
  Package,
  Settings,
  FileCode,
  Layout,
  Code2,
  Download,
  Play,
  Hammer,
  Search,
  TestTube,
  Zap,
  Brain,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LEVEL_CONFIG: Record<LogLevel, { label: string; color: string; badge: string }> = {
  command: { label: "CMD", color: "text-blue-400", badge: "bg-blue-500/15 text-blue-400 border-blue-500/20" },
  install: { label: "PKG", color: "text-cyan-400", badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20" },
  file: { label: "FILE", color: "text-violet-400", badge: "bg-violet-500/15 text-violet-400 border-violet-500/20" },
  info: { label: "INFO", color: "text-zinc-400", badge: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" },
  success: { label: "OK", color: "text-green-400", badge: "bg-green-500/15 text-green-400 border-green-500/20" },
  warn: { label: "WARN", color: "text-yellow-400", badge: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20" },
  error: { label: "ERR", color: "text-red-400", badge: "bg-red-500/15 text-red-400 border-red-500/20" },
  phase: { label: "PHASE", color: "text-amber-400", badge: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
};

const PHASE_CONFIG: Record<ScaffoldPhase, { label: string; icon: typeof Package; color: string }> = {
  dependencies: { label: "Dependencies", icon: Package, color: "text-amber-400" },
  config: { label: "Config Files", icon: Settings, color: "text-orange-400" },
  entry: { label: "Entry Points", icon: FileCode, color: "text-sky-400" },
  app: { label: "App Shell", icon: Layout, color: "text-indigo-400" },
  source: { label: "Source Files", icon: Code2, color: "text-violet-400" },
  install: { label: "Installing Packages", icon: Download, color: "text-cyan-400" },
  devserver: { label: "Dev Server", icon: Play, color: "text-green-400" },
  build: { label: "Build", icon: Hammer, color: "text-yellow-400" },
  lint: { label: "Lint", icon: Search, color: "text-blue-400" },
  test: { label: "Tests", icon: TestTube, color: "text-pink-400" },
  shell: { label: "Shell", icon: Zap, color: "text-zinc-400" },
  thinking: { label: "Thinking", icon: Brain, color: "text-purple-400" },
  complete: { label: "Complete", icon: CheckCircle2, color: "text-green-400" },
};

const FILTER_OPTIONS: { value: LogLevel | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "command", label: "Commands" },
  { value: "install", label: "Packages" },
  { value: "file", label: "Files" },
  { value: "error", label: "Errors" },
];

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** Group entries by phase for structured display */
interface PhaseGroup {
  phase: ScaffoldPhase;
  entries: TerminalEntry[];
}

function groupByPhase(entries: TerminalEntry[]): (TerminalEntry | PhaseGroup)[] {
  const result: (TerminalEntry | PhaseGroup)[] = [];
  let currentGroup: PhaseGroup | null = null;

  for (const entry of entries) {
    if (entry.phase) {
      if (currentGroup && currentGroup.phase === entry.phase) {
        currentGroup.entries.push(entry);
      } else {
        if (currentGroup) result.push(currentGroup);
        currentGroup = { phase: entry.phase, entries: [entry] };
      }
    } else {
      if (currentGroup) {
        result.push(currentGroup);
        currentGroup = null;
      }
      result.push(entry);
    }
  }

  if (currentGroup) result.push(currentGroup);
  return result;
}

function isPhaseGroup(item: TerminalEntry | PhaseGroup): item is PhaseGroup {
  return "phase" in item && "entries" in item;
}

function PhaseHeader({ phase, count }: { phase: ScaffoldPhase; count: number }) {
  const config = PHASE_CONFIG[phase];
  const Icon = config.icon;
  return (
    <div className="flex items-center gap-2 py-1.5 px-1 -mx-1 mt-1.5 first:mt-0">
      <div className={cn("flex items-center gap-1.5", config.color)}>
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-semibold">{config.label}</span>
      </div>
      <span className="text-[10px] text-zinc-600">{count} {count === 1 ? "item" : "items"}</span>
      <div className="flex-1 h-px bg-white/[0.04] ml-1" />
    </div>
  );
}

function EntryRow({ entry }: { entry: TerminalEntry; indented?: boolean }) {
  const cfg = LEVEL_CONFIG[entry.level] || LEVEL_CONFIG.info;
  return (
    <div className="group flex items-start gap-2 py-[3px] hover:bg-white/[0.02] rounded-sm px-1 -mx-1">
      <span className="text-[10px] text-zinc-600 shrink-0 pt-[2px] tabular-nums">
        {formatTime(entry.timestamp)}
      </span>
      <span
        className={cn(
          "text-[9px] font-bold uppercase shrink-0 px-1.5 py-px rounded border mt-[1px]",
          cfg.badge
        )}
      >
        {cfg.label}
      </span>
      <div className="min-w-0 flex-1">
        <span className={cn("break-all", cfg.color)}>{entry.message}</span>
        {entry.detail && (
          <pre className="text-[11px] text-zinc-500 mt-0.5 whitespace-pre-wrap break-all">
            {entry.detail}
          </pre>
        )}
      </div>
    </div>
  );
}

export function TerminalPanel() {
  const { entries, filter, setFilter, clear, onFixError } = useTerminalStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const filtered = filter === "all" ? entries : entries.filter((e) => e.level === filter);
  const errCount = entries.filter((e) => e.level === "error").length;

  // Group filtered entries by phase for structured view
  const grouped = useMemo(() => groupByPhase(filtered), [filtered]);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filtered.length]);

  const handleCopy = () => {
    const text = filtered
      .map((e) => {
        const cfg = LEVEL_CONFIG[e.level] || LEVEL_CONFIG.info;
        return `[${formatTime(e.timestamp)}] [${cfg.label}] ${e.message}${e.detail ? "\n" + e.detail : ""}`;
      })
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Stats
  const fileCount = entries.filter((e) => e.level === "file").length;
  const cmdCount = entries.filter((e) => e.level === "command").length;

  return (
    <div className="flex flex-col h-full bg-[#0d1117] text-zinc-300 font-mono text-[12px] leading-relaxed select-text">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 h-9 shrink-0 border-b border-white/[0.06] bg-[#161b22]">
        <div className="flex items-center gap-2">
          <TerminalIcon className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Terminal</span>
          <div className="flex items-center gap-1.5 ml-2">
            {fileCount > 0 && (
              <span className="text-[10px] text-violet-400/70">
                {fileCount} files
              </span>
            )}
            {cmdCount > 0 && (
              <span className="text-[10px] text-blue-400/70">
                {cmdCount} cmds
              </span>
            )}
            {errCount > 0 && (
              <span className="text-[10px] text-red-400/70">
                {errCount} errors
              </span>
            )}
            {entries.length === 0 && (
              <span className="text-[10px] text-zinc-600">idle</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* @ Fix Error button — shown before filter tabs */}
          {errCount > 0 && onFixError && (
            <button
              onClick={onFixError}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition-all bg-red-500/15 text-red-400 border border-red-500/25 hover:bg-red-500/25 hover:text-red-300 animate-pulse hover:animate-none"
              title="Send errors to AI for fixing"
            >
              <Sparkles className="h-2.5 w-2.5" />
              <span>@</span> Fix
            </button>
          )}
          {errCount > 0 && onFixError && (
            <div className="h-3.5 w-px bg-white/[0.06] mx-0.5" />
          )}
          {/* Filter chips */}
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                filter === value
                  ? "bg-primary/20 text-primary"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
              )}
            >
              {label}
            </button>
          ))}
          <div className="h-3.5 w-px bg-white/[0.06] mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
            onClick={handleCopy}
            title="Copy logs"
          >
            {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-zinc-300"
            onClick={clear}
            title="Clear terminal"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Log entries - grouped by phase */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-2">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-zinc-600">
              <div className="text-center space-y-1">
                <TerminalIcon className="h-5 w-5 mx-auto opacity-40" />
                <p className="text-[11px]">No output yet</p>
                <p className="text-[10px] text-zinc-700">Generate code to see terminal activity</p>
              </div>
            </div>
          ) : (
            grouped.map((item, idx) => {
              if (isPhaseGroup(item)) {
                return (
                  <div key={`phase-${item.phase}-${idx}`}>
                    <PhaseHeader phase={item.phase} count={item.entries.length} />
                    <div className="pl-2 border-l border-white/[0.04] ml-1.5 space-y-px">
                      {item.entries.map((entry) => (
                        <EntryRow key={entry.id} entry={entry} indented />
                      ))}
                    </div>
                  </div>
                );
              }
              return <EntryRow key={item.id} entry={item} />;
            })
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
