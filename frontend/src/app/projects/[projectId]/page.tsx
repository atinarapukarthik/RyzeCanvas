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
    Folder,
    FileCode,
    Rocket,
    ExternalLink
} from 'lucide-react';
import { useOrchestrationSocket } from '@/hooks/use-orchestration-socket';
import { buildPreviewHtml } from '@/app/(dashboard)/studio/page';
import { Space_Grotesk, Inter } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });
const inter = Inter({ subsets: ['latin'] });

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
        startOrchestration,
    } = useOrchestrationSocket(projectId);

    // Auto-scroll terminal
    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [events]);

    const [hasStarted, setHasStarted] = useState(false);
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
    const currentFile = activeFiles[activeFileIndex] || null;

    // Build Folder Tree
    const fileTree = useMemo(() => {
        const tree: any = {};
        activeFiles.forEach((file, idx) => {
            const parts = file.name.split('/');
            let current = tree;
            parts.forEach((part, i) => {
                if (i === parts.length - 1) {
                    current[part] = { _type: 'file', idx, name: file.name };
                } else {
                    if (!current[part]) current[part] = {};
                    current = current[part];
                }
            });
        });
        return tree;
    }, [activeFiles]);

    const renderTree = (node: any, path: string = '') => {
        return Object.entries(node).map(([key, value]: [string, any]) => {
            if (value._type === 'file') {
                const isActive = activeFileIndex === value.idx;
                return (
                    <button
                        key={value.name}
                        onClick={() => setActiveFileIndex(value.idx)}
                        className={`flex items-center w-full text-left px-2 py-1 text-xs font-mono transition-colors rounded ${isActive ? 'bg-[#00f5ff]/20 text-[#00f5ff]' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'}`}
                    >
                        <FileCode className="w-3 h-3 mr-2 text-gray-500 shrink-0" />
                        <span className="truncate">{key}</span>
                    </button>
                );
            }
            return (
                <div key={path + key} className="ml-2">
                    <div className="flex items-center px-1 py-1 text-xs font-mono text-gray-300 font-bold mt-1">
                        <Folder className="w-3 h-3 mr-2 text-indigo-400 shrink-0" />
                        {key}
                    </div>
                    <div className="border-l border-gray-800 ml-2 pl-1">
                        {renderTree(value, path + key + '/')}
                    </div>
                </div>
            );
        });
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
                <button
                    onClick={() => startOrchestration(promptParam)}
                    className="flex items-center space-x-2 bg-[#00f5ff] text-[#0a0a0a] px-4 py-2 text-sm font-semibold rounded hover:bg-[#00d0d8] transition-colors focus:ring-2 focus:ring-[#00f5ff] focus:ring-offset-2 focus:ring-offset-[#0a0a0a]"
                    aria-label="Start Orchestration"
                >
                    <Play className="w-4 h-4" />
                    <span>Launch AI Orchestration</span>
                </button>
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

                        // Custom coloring rules based on status
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
                                        <div className={`absolute top-0 left-0 h-full bg-[#00f5ff] transition-all duration-700 ease-out`}
                                            style={{ width: NODES.findIndex(n => n.id === currentNode) > i ? '100%' : '0%' }}
                                        />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </section>

            {/* Main Dual-Pane & Terminal */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4 overflow-hidden">

                {/* Left Pane - File Explorer & Code Editor */}
                <div className="flex bg-[#1a1a1a] rounded overflow-hidden border border-gray-800 shadow-xl">

                    {/* File Explorer Sidebar */}
                    <div className="w-48 bg-[#0a0a0a] border-r border-gray-800 flex flex-col hidden md:flex shrink-0">
                        <div className="h-8 border-b border-gray-800 px-3 flex items-center text-xs font-mono text-gray-500 uppercase tracking-widest font-bold">
                            <FolderTree className="w-4 h-4 mr-2 text-indigo-400" /> Workspace
                        </div>
                        <div className="flex-1 overflow-auto p-2">
                            {activeFiles.length === 0 ? (
                                <div className="text-xs text-gray-600 italic text-center mt-4">No files generated</div>
                            ) : (
                                renderTree(fileTree)
                            )}
                        </div>
                    </div>

                    {/* Code Editor */}
                    <div className="flex-1 flex flex-col relative">
                        <div className="border-b border-gray-800 bg-[#0a0a0a] h-8 px-3 flex items-center">
                            {currentFile ? (
                                <span className="text-xs font-mono text-gray-300 flex items-center">
                                    <FileCode className="w-4 h-4 mr-2" /> {currentFile.name}
                                </span>
                            ) : (
                                <span className="text-xs font-mono text-gray-600">EDITOR</span>
                            )}
                        </div>
                        <div className="flex-1 overflow-auto p-4 bg-[#0a0a0a] font-mono text-xs text-gray-300 relative">
                            {currentFile ? (
                                <pre className="whitespace-pre-wrap leading-relaxed">{currentFile.content}</pre>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 text-center">
                                    <Code2 className="w-16 h-16 mb-4" />
                                    <p className={`text-xl ${spaceGrotesk.className}`}>AWAITING CODE INFUSION</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Pane - Build Preview & Terminal */}
                <div className="flex flex-col gap-4 overflow-hidden shadow-xl">

                    {/* Preview Sandbox */}
                    <div className="flex-1 bg-white rounded overflow-hidden relative border border-gray-800 flex flex-col">
                        <div className="h-8 bg-[#1a1a1a] border-b border-gray-800 flex items-center px-3 space-x-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <div className="ml-4 text-xs font-mono text-gray-400 flex items-center flex-1">
                                localhost:3000
                            </div>
                            <button
                                onClick={() => {
                                    if (currentFile) {
                                        const newWindow = window.open();
                                        if (newWindow) {
                                            newWindow.document.write(buildPreviewHtml(currentFile.content, files));
                                            newWindow.document.close();
                                        }
                                    }
                                }}
                                disabled={!currentFile || buildStatus !== 'PASS'}
                                className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Open in new tab"
                            >
                                <ExternalLink size={14} />
                            </button>
                        </div>
                        <div className="flex-1 bg-[#ffffff] relative flex flex-col">
                            {buildStatus === 'pending' || buildStatus === 'FAIL' ? (
                                <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-400 select-none">
                                    <Activity className="w-12 h-12 mb-4 animate-pulse opacity-50" />
                                    <p className="font-mono text-sm uppercase tracking-widest">{buildStatus === 'FAIL' ? 'BUILD FAILED - FIX REQUIRED' : 'WAITING FOR EVALUATOR PASS...'}</p>

                                    {buildErrors.length > 0 && (
                                        <div className="mt-4 p-4 border border-red-200 bg-red-50 text-red-600 rounded text-left max-w-md w-full ml-4 mr-4">
                                            <h4 className="font-bold text-sm mb-2 font-mono flex items-center"><TerminalSquare className="w-4 h-4 mr-2" /> COMPILER ERRORS</h4>
                                            <ul className="text-xs list-disc pl-4 font-mono space-y-1">
                                                {buildErrors.map((err, i) => <li key={i}>{err}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 relative">
                                    {/* Real-time Theme Rendering if passed */}
                                    {currentFile?.name?.endsWith('page.tsx') && buildStatus === 'PASS' && (
                                        <div className="w-full h-full min-h-screen bg-white">
                                            <iframe
                                                title="Preview"
                                                srcDoc={buildPreviewHtml(currentFile.content, files)}
                                                className="w-full h-full border-none pointer-events-auto"
                                                sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
                                            />
                                        </div>
                                    )}
                                    {!currentFile && (
                                        <div className="h-full flex items-center justify-center text-gray-400 font-mono bg-white">
                                            LIVE PREVIEW CONNECTED
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div >

                    {/* Terminal Feed */}
                    < div className="h-[35%] bg-[#0a0a0a] rounded border border-gray-800 flex flex-col shadow-inner" >
                        <div className="h-8 bg-[#1a1a1a] px-3 flex items-center justify-between border-b border-gray-800">
                            <div className="flex items-center text-xs font-mono text-[#00f5ff]">
                                <TerminalSquare className="w-4 h-4 mr-2" />
                                Antigravity Stream
                            </div>
                            <div className="flex space-x-2 hidden">
                                <div className="text-xs text-gray-500 font-mono pr-2">NODE OVERWATCH ONLINE</div>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto p-3 text-xs font-mono leading-relaxed space-y-1" ref={terminalRef}>
                            {events.map((ev, i) => (
                                <div key={i} className="flex">
                                    <span className="text-[#00f5ff] mr-2 w-16 opacity-50 shrink-0">
                                        {new Date().toISOString().substring(11, 19)}
                                    </span>
                                    <div className="flex-1">
                                        {ev.type === 'log' && <span className="text-gray-300">{ev.message}</span>}
                                        {ev.type === 'thinking' && <span className="text-green-400 italic">{"<Thinking> " + ev.process + " </Thinking>"}</span>}
                                        {ev.type === 'file_commit' && <span className="text-[#00f5ff]">→ Committed: {ev.fileName}</span>}
                                        {ev.type === 'build_status' && (
                                            <span className={ev.status === 'PASS' ? 'text-green-400 font-bold' : 'text-red-500 font-bold'}>
                                                [EVALUATOR {ev.status}] {ev.errors?.length ? `Found ${ev.errors.length} errors.` : ''}
                                            </span>
                                        )}
                                        {ev.type === 'debugger_patch' && (
                                            <div className="text-amber-400 mt-1 pb-1">
                                                <strong className="block mb-1">Applying Patch Constraints:</strong>
                                                <span className="block border-l-2 border-amber-500 pl-2 opacity-80">{ev.rationale}</span>
                                            </div>
                                        )}
                                        {ev.type === 'node_change' && (
                                            <div className="my-2 border-b border-gray-800 pb-1 w-full text-indigo-400 font-bold tracking-wider">
                                                <span className="uppercase text-[10px] bg-indigo-900/60 text-indigo-200 px-2 py-0.5 rounded mr-2">STATE TRANSFER</span>
                                                Activating {ev.node}
                                            </div>
                                        )}
                                        {ev.type === 'alert' && (
                                            <div className="text-red-500 font-bold bg-red-900/20 px-2 py-1 rounded inline-block my-1 border border-red-900">
                                                {ev.message}
                                            </div>
                                        )}
                                        {ev.type === 'terminal_cmd' && (
                                            <div className="text-emerald-400 font-mono bg-emerald-900/20 px-2 py-1 rounded my-1 border border-emerald-900/50">
                                                <span className="text-emerald-500 mr-1">$</span> {ev.command}
                                            </div>
                                        )}
                                        {ev.type === 'terminal_output' && (
                                            <div className={`font-mono text-[11px] px-2 py-1 rounded my-1 whitespace-pre-wrap max-h-32 overflow-auto ${ev.exit_code === 0 ? 'text-gray-400 bg-gray-900/40 border border-gray-800' : 'text-red-400 bg-red-900/20 border border-red-900/50'}`}>
                                                {ev.output}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {events.length === 0 && (
                                <div className="text-gray-600 italic">// the system is dormant. Launch to begin.</div>
                            )}
                        </div>
                    </div >

                </div >

            </div >

        </div >
    );
}
