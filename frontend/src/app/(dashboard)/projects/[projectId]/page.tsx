'use client';

import React, { useMemo, useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
    Play,
    TerminalSquare,
    Activity,
    ShieldCheck,
    Wrench,
    BrainCircuit,
    Code2,
    ListTodo,
    AlertTriangle,
    FolderTree,
    FileCode,
    Rocket,
    ExternalLink,
    RefreshCw,
    Monitor,
    Globe,
    Sparkles,
    Loader2
} from 'lucide-react';
import { useOrchestrationSocket } from '@/hooks/use-orchestration-socket';
import { buildPreviewHtml } from '@/lib/preview-builder';
import { Space_Grotesk, Inter, JetBrains_Mono } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });
const inter = Inter({ subsets: ['latin'] });
const jetBrainsMono = JetBrains_Mono({ subsets: ['latin'] });

const NODES = [
    { id: 'Architect', label: 'Architect', icon: BrainCircuit },
    { id: 'Librarian', label: 'Librarian', icon: FolderTree },
    { id: 'DevOps', label: 'DevOps', icon: Rocket },
    { id: 'TodoManager', label: 'TodoManager', icon: ListTodo },
    { id: 'CodeSmith', label: 'CodeSmith', icon: Code2 },
    { id: 'Evaluator', label: 'Evaluator', icon: ShieldCheck },
    { id: 'Debugger', label: 'Debugger', icon: Wrench },
];

export default function ProjectDashboard() {
    const params = useParams();
    const searchParams = useSearchParams();
    const projectId = params?.projectId as string;
    const promptParam = searchParams.get('prompt') || '';
    const terminalRef = useRef<HTMLDivElement>(null);

    const {
        events,
        currentNode,
        files,
        buildStatus,
        buildErrors,
        healingPulse,
        circuitBreakerAlert,
        isConnected,
        isRunning,
        startOrchestration,
    } = useOrchestrationSocket(projectId);

    // Auto-scroll terminal
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [events]);

    const [hasStarted, setHasStarted] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
    const [chatInput, setChatInput] = useState('');

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    const handleReportBug = () => {
        const bugDesc = window.prompt("Describe the bug for the AI to fix:");
        if (bugDesc) {
            startOrchestration(`FIX BUG: ${bugDesc}\n\nExisting files are provided in context.`);
        }
    };

    const handleChatSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        startOrchestration(chatInput.trim());
        setChatInput('');
    };

    useEffect(() => {
        if (promptParam && !hasStarted && events.length === 0) {
            setHasStarted(true);
            startOrchestration(promptParam);
        }
    }, [promptParam, startOrchestration, hasStarted, events.length]);

    const activeFiles = useMemo(() => {
        return Object.entries(files).map(([name, content]) => ({ name, content })).sort((a, b) => a.name.localeCompare(b.name));
    }, [files]);

    const [activeFileIndex, setActiveFileIndex] = useState(0);

    // Auto-select the best preview file (prefer page.tsx, then index.tsx, then first .tsx)
    useEffect(() => {
        if (activeFiles.length === 0) return;
        const pageIdx = activeFiles.findIndex(f => f.name.endsWith('page.tsx') || f.name.endsWith('index.tsx'));
        if (pageIdx !== -1) {
            setActiveFileIndex(pageIdx);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFiles.length]);

    const currentFile = activeFiles[activeFileIndex] || null;

    // Determine if the current file can be previewed as an iframe
    const isPreviewable = currentFile && (
        currentFile.name.endsWith('.tsx') ||
        currentFile.name.endsWith('.jsx') ||
        currentFile.name.endsWith('.html')
    );



    // Open in new tab using Blob URL (works without popup blockers)
    const openInNewTab = () => {
        if (!currentFile) return;
        const html = buildPreviewHtml(currentFile.content, files);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (!win) {
            // Fallback: write HTML directly
            const fallbackWin = window.open('', '_blank');
            if (fallbackWin) {
                fallbackWin.document.write(html);
                fallbackWin.document.close();
                URL.revokeObjectURL(url);
            }
        } else {
            // Revoke after a short delay to allow loading
            setTimeout(() => URL.revokeObjectURL(url), 5000);
        }
    };

    return (
        <div className={`flex flex-col h-full bg-[#0a0a0a] text-[#ffffff] p-4 ${inter.className}`}>
            {/* Header and Controls */}
            <header className="flex justify-between items-center mb-6 px-2">
                <div>
                    <h1 className={`text-2xl font-bold tracking-tight text-[#ffffff] ${spaceGrotesk.className}`}>
                        Orchestration Workspace
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Project ID: {projectId}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleReportBug}
                        className="flex items-center space-x-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-4 py-2 text-sm font-semibold rounded hover:bg-amber-500/20 transition-all"
                    >
                        <AlertTriangle className="w-4 h-4" />
                        <span>Report Bug to AI</span>
                    </button>
                    <button
                        onClick={() => startOrchestration(promptParam)}
                        disabled={isRunning}
                        className="flex items-center space-x-2 bg-[#00f5ff] text-[#0a0a0a] px-4 py-2 text-sm font-semibold rounded hover:bg-[#00d0d8] transition-colors focus:ring-2 focus:ring-[#00f5ff] focus:ring-offset-2 focus:ring-offset-[#0a0a0a] shadow-[0_0_15px_rgba(0,245,255,0.3)] disabled:opacity-50"
                        aria-label="Start Orchestration"
                    >
                        {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        <span>{isRunning ? 'Orchestrating...' : 'Launch AI Orchestration'}</span>
                    </button>
                </div>
            </header>

            {/* Stepper & Alert Strip */}
            <section className="mb-6 space-y-4">
                {circuitBreakerAlert && (
                    <div className="bg-red-900 border border-red-500 text-red-100 p-4 rounded-md flex items-center shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                        <AlertTriangle className="w-6 h-6 mr-3 text-red-500" />
                        <div>
                            <strong className={`block text-lg font-bold ${spaceGrotesk.className}`}>CIRCUIT BREAKER OPEN</strong>
                            <span className="text-sm font-light">Structural Redesign Tripped. Constraints unresolvable via local refactor. Escalating back to Architect.</span>
                        </div>
                    </div>
                )}

                {/* Real-Time Stepper */}
                <div className="flex items-center bg-[#1a1a1a] border border-gray-800 rounded p-4 overflow-hidden relative shadow-lg">
                    {healingPulse && (
                        <div className="absolute inset-0 border-2 border-amber-500 rounded animate-pulse pointer-events-none opacity-50" />
                    )}
                    {NODES.map((node, i) => {
                        const Icon = node.icon;
                        const isCurrent = currentNode === node.id;

                        const isHealing = node.id === 'Debugger' && healingPulse;
                        let iconColor = 'text-gray-500';
                        let bgColor = 'bg-gray-800';

                        if (isCurrent) {
                            if (isHealing) {
                                iconColor = 'text-amber-500';
                                bgColor = 'bg-amber-900/40 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.5)]';
                            } else {
                                iconColor = 'text-[#0a0a0a]';
                                bgColor = 'bg-[#00f5ff] shadow-[0_0_10px_rgba(0,245,255,0.8)]';
                            }
                        } else if (node.id === 'Evaluator' && buildStatus === 'FAIL') {
                            iconColor = 'text-red-500';
                        } else if (node.id === 'Evaluator' && buildStatus === 'PASS') {
                            iconColor = 'text-green-500';
                        }

                        return (
                            <React.Fragment key={node.id}>
                                <div className={`flex flex-col items-center justify-center transition-all duration-300 w-24 h-24 rounded-lg relative ${bgColor} ${isCurrent ? 'scale-110 z-10' : ''}`}>
                                    <Icon className={`w-8 h-8 mb-2 ${iconColor} transition-colors`} />
                                    <span className={`text-xs font-bold font-mono tracking-tight ${isCurrent ? (isHealing ? 'text-amber-500' : 'text-[#0a0a0a]') : 'text-gray-400'}`}>
                                        {node.label}
                                    </span>
                                </div>
                                {i < NODES.length - 1 && (
                                    <div className="flex-1 h-px bg-gray-700 relative mx-2">
                                        <div className="absolute top-0 left-0 h-full bg-[#00f5ff] transition-all duration-700 ease-out"
                                            style={{ width: NODES.findIndex(n => n.id === currentNode) > i ? '100%' : '0%' }}
                                        />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </section>

            {/* Main Workspace (3rd Gen Layout) */}
            <div className="flex-1 grid grid-cols-12 gap-4 overflow-hidden mb-2">

                {/* ── Column 1: Explorer ── */}
                <aside className="col-span-2 bg-[#0d0d12] rounded-xl border border-white/[0.08] flex flex-col overflow-hidden shadow-lg">
                    <div className="h-10 bg-[#12121a] border-b border-white/[0.08] flex items-center px-4 gap-2">
                        <FolderTree className="w-4 h-4 text-[#00f5ff]/60" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">Explorer</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {activeFiles.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center p-4">
                                <Code2 className="w-8 h-8 mb-2" />
                                <p className="text-[10px] uppercase">No files generated</p>
                            </div>
                        ) : (
                            <div className="space-y-0.5">
                                {activeFiles.map((file, idx) => (
                                    <button
                                        key={file.name}
                                        onClick={() => setActiveFileIndex(idx)}
                                        className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-mono truncate transition-all flex items-center gap-2 ${activeFileIndex === idx
                                            ? 'bg-[#00f5ff]/10 text-[#00f5ff] border border-[#00f5ff]/20'
                                            : 'text-white/40 hover:bg-white/5 hover:text-white/70'
                                            }`}
                                    >
                                        <FileCode className="w-3.5 h-3.5 shrink-0" />
                                        {file.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </aside>

                {/* ── Column 2: Stage (Toggleable) ── */}
                <main className="col-span-6 flex flex-col gap-4 overflow-hidden">
                    <div className="flex bg-[#0d0d12] rounded-xl border border-white/[0.08] p-1 w-fit shrink-0">
                        <button
                            onClick={() => setViewMode('preview')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'preview'
                                ? 'bg-[#00f5ff] text-[#0a0a0a]'
                                : 'text-white/40 hover:bg-white/5'
                                }`}
                        >
                            <Monitor className="w-4 h-4" />
                            Preview
                        </button>
                        <button
                            onClick={() => setViewMode('code')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'code'
                                ? 'bg-[#00f5ff] text-[#0a0a0a]'
                                : 'text-white/40 hover:bg-white/5'
                                }`}
                        >
                            <Code2 className="w-4 h-4" />
                            Code
                        </button>
                    </div>

                    <div className="flex-1 bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-800 shadow-2xl relative flex flex-col">
                        {viewMode === 'code' ? (
                            <>
                                <div className="h-10 bg-[#12121a] border-b border-gray-800 px-4 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-2">
                                        <FileCode className="w-4 h-4 text-[#00f5ff]" />
                                        <span className="text-xs font-mono text-gray-300">
                                            {currentFile ? currentFile.name : 'No file selected'}
                                        </span>
                                    </div>
                                    {currentFile && (
                                        <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-white/30 font-mono">
                                            {currentFile.content.split('\n').length} lines
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 overflow-auto bg-[#0a0a0a] relative">
                                    {currentFile ? (
                                        <pre className={`p-6 text-[11px] leading-relaxed text-gray-300 whitespace-pre ${jetBrainsMono.className}`}>
                                            {currentFile.content}
                                        </pre>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 text-center">
                                            <Code2 className="w-16 h-16 mb-4" />
                                            <p className={`text-xl ${spaceGrotesk.className}`}>AWAITING CODE INFUSION</p>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="h-10 bg-[#12121a] border-b border-gray-800 flex items-center px-4 space-x-3 shrink-0">
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                                    </div>
                                    <div className="flex-1 ml-4 bg-[#0a0a0a] border border-white/[0.05] rounded px-3 py-1 flex items-center gap-2">
                                        <Globe className="w-3 h-3 text-white/20" />
                                        <span className="text-[10px] font-mono text-white/40 truncate">
                                            app://generated-app/{currentFile?.name || ''}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={handleRefresh} disabled={!currentFile} className="p-1.5 text-white/40 hover:text-[#00f5ff] hover:bg-white/5 rounded transition-all disabled:opacity-20"><RefreshCw className="w-3.5 h-3.5" /></button>
                                        <button onClick={openInNewTab} disabled={!currentFile} className="p-1.5 text-white/40 hover:text-[#00f5ff] hover:bg-white/5 rounded transition-all disabled:opacity-20"><ExternalLink className="w-3.5 h-3.5" /></button>
                                    </div>
                                </div>
                                <div className="flex-1 bg-white relative">
                                    {isPreviewable ? (
                                        <iframe
                                            key={`${currentFile!.name}-${Object.keys(files).length}-${refreshKey}`}
                                            title="Live Preview"
                                            srcDoc={buildPreviewHtml(currentFile!.content, files)}
                                            className="w-full h-full border-none"
                                            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                                        />
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-[#0a0a0a] text-center p-8">
                                            <Activity className="w-12 h-12 mb-4 opacity-20 animate-pulse" />
                                            <p className="text-sm font-mono opacity-60 uppercase tracking-widest">
                                                {activeFiles.length === 0 ? 'AWAITING GENERATION...' : 'SELECT PREVIEWABLE FILE'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </main>

                {/* ── Column 3: Feed & Neural Controls ── */}
                <aside className="col-span-4 flex flex-col gap-4 overflow-hidden">
                    <div className="flex-1 bg-[#0d0d12] rounded-xl border border-white/[0.08] flex flex-col overflow-hidden shadow-lg">
                        <div className="h-10 bg-[#12121a] border-b border-white/[0.08] flex items-center justify-between px-4 shrink-0">
                            <div className="flex items-center gap-2">
                                <TerminalSquare className="w-4 h-4 text-[#00f5ff]" />
                                <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">Neural Feed</span>
                            </div>
                            {isRunning && (
                                <span className="flex items-center gap-1.5 text-[10px] text-amber-500 font-bold animate-pulse">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    ACTIVE
                                </span>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px]" ref={terminalRef}>
                            {events.map((ev, i) => (
                                <div key={i} className="flex gap-3">
                                    <span className="text-white/10 shrink-0 w-14 text-right">{String(i).padStart(3, '0')}</span>
                                    <div className="flex-1 text-white/60">
                                        {ev.type === 'log' && <span>{ev.message}</span>}
                                        {ev.type === 'thinking' && <span className="text-emerald-500/70 italic">◈ {ev.process}</span>}
                                        {ev.type === 'file_commit' && <span className="text-[#00f5ff]">→ Commit <span className="text-white font-bold">{ev.fileName}</span></span>}
                                        {ev.type === 'node_change' && (
                                            <div className="text-indigo-400 font-bold py-1 border-y border-white/5 my-1">
                                                <span className="text-[9px] bg-indigo-500/20 px-1.5 py-0.5 rounded mr-2 uppercase">Node</span>
                                                {ev.node}
                                            </div>
                                        )}
                                        {ev.type === 'alert' && <div className="text-red-400 font-bold bg-red-500/10 p-2 rounded border border-red-500/20">{ev.message}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AI Channel (Chat) */}
                    <div className="h-44 bg-[#121216] rounded-xl border border-[#00f5ff]/20 flex flex-col overflow-hidden p-4">
                        <div className="flex items-center gap-2 mb-2 text-[#00f5ff]">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Aigent Signal</span>
                        </div>
                        <form onSubmit={handleChatSubmit} className="flex-1 flex flex-col gap-3">
                            <textarea
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(e); } }}
                                placeholder="Refine design, fix logic..."
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 text-xs focus:ring-1 focus:ring-[#00f5ff] outline-none resize-none placeholder:text-white/20 text-white/80"
                            />
                            <button
                                type="submit"
                                disabled={isRunning || !chatInput.trim()}
                                className="bg-[#00f5ff] text-[#0a0a0a] px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-[#00d0d8] transition-all disabled:opacity-50"
                            >
                                SEND SIGNAL
                            </button>
                        </form>
                    </div>
                </aside>
            </div>
        </div>
    );
}
