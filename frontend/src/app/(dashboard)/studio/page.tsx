"use client";

import { useState, useRef, useEffect, Suspense, useCallback } from "react";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeComparison } from "@/components/ui/code-comparison";
import { PromptBox } from "@/components/ui/prompt-box";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { createProject, searchWeb, updateProject, streamChat, fetchProjects } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
    Zap, GitBranch, Monitor, Smartphone, GitFork, Download, Loader2,
    ChevronDown, ChevronRight, User, Bot, Search, MessageSquare, Lightbulb, Globe, Code2, Eye,
    FileCode, Pencil, Check, X, LogOut, FolderOpen, Clock, GitCommit,
    RotateCcw, Copy, Play, Save, Folder, File, FolderTree, GitCompare,
} from "lucide-react";
import { ProviderSelector, AIModel } from "@/components/ProviderSelector";

interface Message {
    role: 'user' | 'ai';
    content: string;
    steps?: string[];
    isSearching?: boolean;
    isThinking?: boolean;
    isCommit?: boolean;
    files?: { name: string; path: string; status: 'added' | 'modified' }[];
}

/**
 * Build a self-contained HTML page that renders the given React+Tailwind code
 * inside an iframe via srcdoc. Uses CDN-loaded React 18, ReactDOM, Babel, and Tailwind CSS.
 */
function buildPreviewHtml(code: string): string {
    // Extract the component name BEFORE transforming exports
    const fnMatch = code.match(/export\s+default\s+function\s+(\w+)/);
    const constMatch = code.match(/export\s+default\s+(\w+)\s*;?\s*$/m);
    const standaloneFn = code.match(/^function\s+(\w+)/m);
    const componentName = fnMatch?.[1] || constMatch?.[1] || standaloneFn?.[1] || 'App';

    // Clean code for browser execution:
    // 1. Remove import lines (they won't resolve in browser)
    // 2. Strip TypeScript-only syntax (interfaces, type aliases, generic type params)
    // 3. Handle exports properly
    const codeWithoutImports = code
        // Remove all import statements (single and multi-line)
        .replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
        .replace(/^import\s+['"].*?['"];?\s*$/gm, '')
        .replace(/^import\s+type\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
        // Remove TypeScript interface blocks (multi-line safe)
        .replace(/^(?:export\s+)?interface\s+\w+(?:\s+extends\s+\w+)?\s*\{[\s\S]*?\n\}/gm, '')
        // Remove TypeScript type aliases (multi-line safe)
        .replace(/^(?:export\s+)?type\s+\w+(?:<[^>]*>)?\s*=\s*[\s\S]*?;\s*$/gm, '')
        // Remove standalone type annotations on function params: (props: Type) → (props)
        .replace(/:\s*(?:React\.)?(?:FC|FunctionComponent|ComponentProps|HTMLAttributes|MouseEvent|ChangeEvent|FormEvent|KeyboardEvent|CSSProperties)(?:<[^>]*>)?/g, '')
        // Handle default export
        .replace(/^export\s+default\s+function\s+/m, 'function ')
        .replace(/^export\s+default\s+/m, 'const __DefaultExport__ = ')
        // Remove export keyword from named exports (keep the declaration)
        .replace(/^export\s+(function|const|let|var|class)\s+/gm, '$1 ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        #root { min-height: 100vh; }
    </style>
    <script>
        tailwind.config = {
            theme: { extend: {} }
        }
    </script>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel" data-type="module" data-presets="react,typescript">
        const { useState, useEffect, useRef, useMemo, useCallback, useContext, createContext,
                useReducer, useId, Fragment, forwardRef, memo, Suspense } = React;

        // Stub for lucide-react icons — render simple SVG placeholders
        const iconHandler = {
            get(target, prop) {
                if (prop === '__esModule') return false;
                return function LucideIcon(props) {
                    const size = props?.size || 24;
                    return React.createElement('svg', {
                        width: size, height: size, viewBox: '0 0 24 24',
                        fill: 'none', stroke: 'currentColor', strokeWidth: 2,
                        strokeLinecap: 'round', strokeLinejoin: 'round',
                        className: props?.className || '',
                        ...props,
                    }, React.createElement('circle', { cx: 12, cy: 12, r: 10 }));
                };
            }
        };
        const lucideReact = new Proxy({}, iconHandler);
        const { Menu, X, ChevronDown, ChevronRight, ChevronLeft, ChevronUp,
                Search, Heart, Star, ShoppingCart, User, Bell, Settings,
                Mail, Phone, MapPin, Calendar, Clock, Check, Plus, Minus,
                Edit, Trash, Eye, EyeOff, Lock, Unlock, Home, ArrowRight,
                ArrowLeft, ExternalLink, Download, Upload, Share, Filter,
                MoreHorizontal, MoreVertical, Sun, Moon, Github, Twitter,
                Linkedin, Facebook, Instagram, Youtube, Globe, Zap, Award,
                TrendingUp, BarChart, PieChart, Activity, AlertCircle, Info,
                HelpCircle, XCircle, CheckCircle, AlertTriangle, Loader2,
                RefreshCw, RotateCcw, Copy, Clipboard, Send, MessageSquare,
                Image, Camera, Video, Mic, Volume2, VolumeX, Wifi, WifiOff,
                Battery, Bluetooth, Monitor, Smartphone, Tablet, Laptop,
                Server, Database, Cloud, Code, Terminal, FileText, Folder,
                Archive, Box, Package, Gift, CreditCard, DollarSign, Percent,
                Tag, Bookmark, Flag, Hash, AtSign, Link, Paperclip, Scissors,
                Layers, Layout, Grid, List, Columns, Sidebar, PanelLeft,
                LogIn, LogOut, UserPlus, Users, Shield, Key, Play, Pause,
                SkipForward, SkipBack, Maximize, Minimize, Move, Trash2,
                Edit2, Edit3, Save, FilePlus, FolderPlus, FolderOpen,
                ChevronFirst, ChevronLast, ChevronsUpDown, ArrowUpDown
        } = lucideReact;

        // Stub for common UI component libraries (framer-motion, etc.)
        const motion = new Proxy({}, {
            get(target, prop) {
                return React.forwardRef(function MotionComponent(props, ref) {
                    const { initial, animate, exit, transition, whileHover, whileTap, variants, ...rest } = props;
                    return React.createElement(prop, { ...rest, ref });
                });
            }
        });
        const AnimatePresence = ({ children }) => children;

        ${codeWithoutImports}

        const AppComponent = typeof __DefaultExport__ !== 'undefined' ? __DefaultExport__ : ${componentName};
        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(AppComponent));
    </script>
</body>
</html>`;
}

/**
 * Represents a file in the generated project file tree.
 */
interface GeneratedFile {
    name: string;
    path: string;
    content: string;
    type: 'file' | 'folder';
    children?: GeneratedFile[];
}

/**
 * Parse generated code into a visual folder structure.
 * The main component goes into src/components/Generated.tsx
 * and we show the typical Next.js project structure around it.
 */
function buildFileTree(code: string): GeneratedFile[] {
    if (!code) return [];

    return [
        {
            name: 'src', path: 'src', type: 'folder', content: '', children: [
                {
                    name: 'app', path: 'src/app', type: 'folder', content: '', children: [
                        { name: 'layout.tsx', path: 'src/app/layout.tsx', type: 'file', content: 'import "./globals.css";\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="en">\n      <body>{children}</body>\n    </html>\n  );\n}' },
                        { name: 'page.tsx', path: 'src/app/page.tsx', type: 'file', content: 'import Generated from "@/components/Generated";\n\nexport default function Home() {\n  return <Generated />;\n}' },
                        { name: 'globals.css', path: 'src/app/globals.css', type: 'file', content: '@tailwind base;\n@tailwind components;\n@tailwind utilities;' },
                    ]
                },
                {
                    name: 'components', path: 'src/components', type: 'folder', content: '', children: [
                        { name: 'Generated.tsx', path: 'src/components/Generated.tsx', type: 'file', content: code },
                    ]
                },
            ]
        },
        { name: 'package.json', path: 'package.json', type: 'file', content: '{\n  "name": "ryzecanvas-app",\n  "version": "0.1.0",\n  "scripts": {\n    "dev": "next dev",\n    "build": "next build",\n    "start": "next start"\n  },\n  "dependencies": {\n    "next": "^15.0.0",\n    "react": "^19.0.0",\n    "react-dom": "^19.0.0",\n    "lucide-react": "^0.400.0"\n  },\n  "devDependencies": {\n    "tailwindcss": "^3.4.0",\n    "typescript": "^5.0.0",\n    "@types/react": "^19.0.0"\n  }\n}' },
        { name: 'tailwind.config.ts', path: 'tailwind.config.ts', type: 'file', content: 'import type { Config } from "tailwindcss";\n\nconst config: Config = {\n  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],\n  theme: { extend: {} },\n  plugins: [],\n};\n\nexport default config;' },
        { name: 'tsconfig.json', path: 'tsconfig.json', type: 'file', content: '{\n  "compilerOptions": {\n    "target": "es5",\n    "lib": ["dom", "es6"],\n    "jsx": "preserve",\n    "module": "esnext",\n    "moduleResolution": "bundler",\n    "paths": { "@/*": ["./src/*"] },\n    "strict": true\n  },\n  "include": ["src"],\n  "exclude": ["node_modules"]\n}' },
    ];
}

/**
 * Renders a file tree explorer sidebar. Click a file to view its code.
 */
function FileTreeView({ files, activeFile, onSelect, depth = 0 }: {
    files: GeneratedFile[];
    activeFile: string;
    onSelect: (file: GeneratedFile) => void;
    depth?: number;
}) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({ 'src': true, 'src/app': true, 'src/components': true });

    return (
        <div className="space-y-0.5">
            {files.map((file) => {
                const isFolder = file.type === 'folder';
                const isOpen = expanded[file.path] ?? false;
                const isActive = activeFile === file.path;

                return (
                    <div key={file.path}>
                        <button
                            onClick={() => {
                                if (isFolder) {
                                    setExpanded((prev) => ({ ...prev, [file.path]: !prev[file.path] }));
                                } else {
                                    onSelect(file);
                                }
                            }}
                            className={`w-full flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono rounded transition-colors ${isActive && !isFolder ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
                            style={{ paddingLeft: `${depth * 12 + 8}px` }}
                        >
                            {isFolder ? (
                                <>
                                    <ChevronRight className={`h-3 w-3 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                                    <Folder className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                                </>
                            ) : (
                                <>
                                    <span className="w-3" />
                                    <FileCode className={`h-3.5 w-3.5 shrink-0 ${file.name.endsWith('.tsx') || file.name.endsWith('.ts') ? 'text-blue-400' : file.name.endsWith('.css') ? 'text-pink-400' : file.name.endsWith('.json') ? 'text-yellow-400' : 'text-muted-foreground'}`} />
                                </>
                            )}
                            <span className="truncate">{file.name}</span>
                        </button>
                        {isFolder && isOpen && file.children && (
                            <FileTreeView files={file.children} activeFile={activeFile} onSelect={onSelect} depth={depth + 1} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function StudioContent() {
    const { user, isAuthenticated, logout } = useAuthStore();
    const { githubConnected, setGithubConnected, selectedModel, setSelectedModel, githubModal, setGithubModal } = useUIStore();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [messages, setMessages] = useState<Message[]>([
        { role: 'ai', content: 'Hello! I\'m Ryze. Describe the UI you want to build and I\'ll generate production-ready React + Tailwind CSS code. Try saying "Create a landing page" or "Build a dashboard".' },
    ]);
    const [projectName, setProjectName] = useState('Untitled Project');
    const [showNameInput, setShowNameInput] = useState(false);
    const [input, setInput] = useState('');
    const [generating, setGenerating] = useState(false);
    const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
    const [thinkingOpen, setThinkingOpen] = useState(false);
    const [searchingWeb, setSearchingWeb] = useState(false);
    const [webSearchEnabled, setWebSearchEnabled] = useState(false);
    const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'diff'>('preview');
    const [generatedCode, setGeneratedCode] = useState('');
    const [editableCode, setEditableCode] = useState('');
    const [previousCode, setPreviousCode] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [pushing, setPushing] = useState(false);
    const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
    const [chatMode, setChatMode] = useState<'chat' | 'plan'>('chat');
    const [framework, setFramework] = useState<'react' | 'nextjs'>('react');
    const [repoUrl, setRepoUrl] = useState('');
    const [chatCollapsed, setChatCollapsed] = useState(false);
    const [projectId, setProjectId] = useState<string>('');
    const [activeFile, setActiveFile] = useState<string>('src/components/Generated.tsx');
    const [viewingFileContent, setViewingFileContent] = useState<string>('');

    const chatEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const streamingMessageRef = useRef<string>('');

    // Load project from history if projectId is in URL
    useEffect(() => {
        const loadProjectId = searchParams.get('project');
        if (loadProjectId) {
            fetchProjects().then((projects) => {
                const project = projects.find((p) => p.id === loadProjectId);
                if (project && project.code) {
                    setGeneratedCode(project.code);
                    setEditableCode(project.code);
                    setProjectId(project.id);
                    setActiveTab('preview');
                    setMessages((m) => [...m, {
                        role: 'ai',
                        content: `Loaded project: **${project.title}**. You can preview it, edit the code, or ask me to modify it.`,
                    }]);
                }
            }).catch(() => {
                // Failed to load project
            });
        }
    }, [searchParams]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, thinkingSteps]);

    useEffect(() => {
        setEditableCode(generatedCode);
    }, [generatedCode]);

    // Track code changes for diff view
    useEffect(() => {
        if (generatedCode && previousCode && generatedCode !== previousCode) {
            // Code has been regenerated, optionally auto-show diff
            // setActiveTab('diff');
        }
    }, [generatedCode, previousCode]);

    const handleSend = async (promptMessage?: string) => {
        const prompt = promptMessage || input;
        if (!prompt.trim() || generating) return;
        setInput('');

        // Determine the orchestration mode
        const mode = chatMode === 'plan' ? 'plan' : 'chat';
        const isGenerateRequest = chatMode === 'chat' && (
            prompt.toLowerCase().includes('build') ||
            prompt.toLowerCase().includes('generate') ||
            prompt.toLowerCase().includes('create') ||
            prompt.toLowerCase().includes('make') ||
            prompt.toLowerCase().includes('design')
        );
        const orchestrationMode = isGenerateRequest ? 'generate' : mode;

        // Add user message
        setMessages((m) => [...m, {
            role: 'user',
            content: chatMode === 'plan' ? `[Plan] ${prompt}` : prompt,
        }]);
        setGenerating(true);
        setThinkingSteps([]);
        setThinkingOpen(true);
        streamingMessageRef.current = '';

        // Cancel any existing stream
        abortControllerRef.current?.abort();
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // Web search context
        let webSearchContext: string | undefined;
        if (webSearchEnabled) {
            setSearchingWeb(true);
            setThinkingSteps((s) => [...s, 'Searching the web...']);
            try {
                const searchResults = await searchWeb(prompt);
                setSearchingWeb(false);
                webSearchContext = searchResults.results?.abstract || '';
                if (webSearchContext) {
                    setMessages((m) => [...m, {
                        role: 'ai',
                        content: webSearchContext!,
                        isSearching: true,
                    }]);
                }
            } catch {
                setSearchingWeb(false);
                toast.warning("Web search failed, continuing without search results");
            }
        }

        // Build conversation history from messages
        const conversationHistory = messages.map((m) => ({
            role: m.role,
            content: m.content,
        }));

        // Add a placeholder AI message for streaming tokens
        const streamMsgIndex = { current: -1 };
        setMessages((m) => {
            streamMsgIndex.current = m.length;
            return [...m, { role: 'ai' as const, content: '', isThinking: true }];
        });

        try {
            await streamChat({
                prompt,
                mode: orchestrationMode,
                provider: selectedModel.provider,
                model: selectedModel.id,
                conversationHistory,
                webSearchContext,
                signal: abortController.signal,

                onStep: (step) => {
                    setThinkingSteps((s) => [...s, step]);
                },

                onToken: (token) => {
                    streamingMessageRef.current += token;
                    const currentText = streamingMessageRef.current;
                    setMessages((m) => {
                        const updated = [...m];
                        const idx = streamMsgIndex.current;
                        if (idx >= 0 && idx < updated.length) {
                            updated[idx] = { ...updated[idx], content: currentText, isThinking: false };
                        }
                        return updated;
                    });
                },

                onCode: (code) => {
                    const codeStr = typeof code === 'string' ? code : JSON.stringify(code, null, 2);

                    const isUpdate = !!generatedCode;

                    // Track previous code for diff view
                    if (generatedCode && !previousCode) {
                        setPreviousCode(generatedCode);
                    } else if (generatedCode && previousCode !== generatedCode) {
                        setPreviousCode(generatedCode);
                    }

                    setGeneratedCode(codeStr);
                    setActiveTab('preview');

                    // Add commit-type message showing file changes
                    const fileTree = buildFileTree(codeStr);
                    const flatFiles: { name: string; path: string; status: 'added' | 'modified' }[] = [];
                    const walkFiles = (files: GeneratedFile[]) => {
                        files.forEach(f => {
                            if (f.type === 'file') {
                                flatFiles.push({
                                    name: f.name,
                                    path: f.path,
                                    status: isUpdate ? 'modified' : 'added',
                                });
                            }
                            if (f.children) walkFiles(f.children);
                        });
                    };
                    walkFiles(fileTree);

                    setMessages((m) => [...m, {
                        role: 'ai',
                        content: isUpdate ? `Updated ${flatFiles.length} files` : `Generated ${flatFiles.length} files`,
                        isCommit: true,
                        files: flatFiles,
                    }]);

                    // Save or update the project
                    if (projectId) {
                        updateProject(projectId, { code_json: codeStr, description: prompt }).catch(() => {});
                    } else {
                        createProject(prompt, {
                            code: codeStr,
                            provider: selectedModel.provider,
                            model: selectedModel.id,
                        }).then((project) => {
                            setProjectId(project.id);
                        }).catch(() => {});
                    }
                },

                onError: (error) => {
                    toast.error("AI Error", { description: error });
                },

                onDone: (meta) => {
                    // Append completion info for generate mode
                    if (orchestrationMode === 'generate' && meta?.success) {
                        const retries = meta.retries || 0;
                        let suffix = `\n\nGenerated production-ready code using **${selectedModel.name}**`;
                        if (retries > 0) suffix += ` (fixed after ${retries} retries)`;
                        suffix += '. Check the Preview tab to see it live.';

                        streamingMessageRef.current += suffix;
                        const finalText = streamingMessageRef.current;
                        setMessages((m) => {
                            const updated = [...m];
                            const idx = streamMsgIndex.current;
                            if (idx >= 0 && idx < updated.length) {
                                updated[idx] = { ...updated[idx], content: finalText };
                            }
                            return updated;
                        });
                    }
                },
            });
        } catch (error: unknown) {
            if ((error as Error).name !== 'AbortError') {
                toast.error("Chat failed", {
                    description: error instanceof Error ? error.message : "An unknown error occurred",
                });
                setMessages((m) => {
                    const updated = [...m];
                    const idx = streamMsgIndex.current;
                    if (idx >= 0 && idx < updated.length) {
                        updated[idx] = {
                            ...updated[idx],
                            content: "Sorry, I encountered an error. Please check your API keys and try again.",
                            isThinking: false,
                        };
                    }
                    return updated;
                });
            }
        } finally {
            setGenerating(false);
            setThinkingOpen(false);
            setSearchingWeb(false);
            abortControllerRef.current = null;
        }
    };

    const handlePush = async () => {
        if (!githubConnected) {
            setGithubModal(true);
            return;
        }
        setPushing(true);
        toast.success('Pushed to GitHub');
        setPushing(false);
    };

    const handleConnectGithub = () => {
        if (!repoUrl.trim()) {
            toast.error('Please enter a repository URL');
            return;
        }
        setGithubConnected(true);
        setGithubModal(false);
        setRepoUrl('');
        toast.success('GitHub connected!', { description: repoUrl });
    };

    const handleSaveCode = async () => {
        setGeneratedCode(editableCode);
        setIsEditing(false);

        // Update the project in the backend if projectId exists, otherwise create one
        if (projectId) {
            try {
                await updateProject(projectId, { code_json: editableCode });
                toast.success('Code saved to project!');
            } catch (error) {
                toast.error('Failed to save code', { description: error instanceof Error ? error.message : "Unknown error" });
            }
        } else if (editableCode.trim()) {
            try {
                const project = await createProject('Manual edit', {
                    code: editableCode,
                    provider: selectedModel.provider,
                    model: selectedModel.id,
                });
                setProjectId(project.id);
                toast.success('Code saved as new project!');
            } catch (error) {
                toast.error('Failed to save code', { description: error instanceof Error ? error.message : "Unknown error" });
            }
        }
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(editableCode || generatedCode);
        toast.success('Copied to clipboard!');
    };

    const handleDownload = () => {
        const code = editableCode || generatedCode;
        if (!code) {
            toast.info('No code to download');
            return;
        }
        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Component.tsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Downloaded Component.tsx');
    };

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden font-sans">
            {/* Main Content */}
            <div className="flex-1 flex min-h-0 bg-secondary/10">
                {/* Chat Panel */}
                <div className={`${chatCollapsed ? 'w-12' : 'w-[440px]'} border-r border-border flex flex-col min-h-0 bg-background/50 backdrop-blur-sm transition-all duration-300`}>
                    {/* Chat/Plan toggle */}
                    <div className="flex items-center gap-2 px-4 h-10 border-b border-border shrink-0">
                        {chatCollapsed ? (
                            <button onClick={() => setChatCollapsed(false)} className="text-muted-foreground hover:text-foreground transition-colors" title="Expand chat">
                                <ChevronDown className="h-4 w-4 rotate-90" />
                            </button>
                        ) : (
                            <>
                                <div className="flex rounded-md bg-secondary/50 p-0.5">
                                    <button
                                        onClick={() => setChatMode('chat')}
                                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all ${chatMode === 'chat' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        <MessageSquare className="h-3 w-3" /> Chat
                                    </button>
                                    <button
                                        onClick={() => setChatMode('plan')}
                                        className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded transition-all ${chatMode === 'plan' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                            }`}
                                    >
                                        <Lightbulb className="h-3 w-3" /> Plan
                                    </button>
                                </div>
                                <div className="flex-1" />
                                <button
                                    onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                                    className={`px-2 py-1 text-xs rounded transition-all ${webSearchEnabled ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                    title="Toggle web search"
                                >
                                    <Globe className="h-3 w-3" />
                                </button>
                                <button onClick={() => setChatCollapsed(true)} className="text-muted-foreground hover:text-foreground transition-colors" title="Collapse chat">
                                    <ChevronDown className="h-4 w-4 -rotate-90" />
                                </button>
                            </>
                        )}
                    </div>

                    {/* Messages */}
                    {!chatCollapsed && (
                        <>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                                <AnimatePresence>
                                    {messages.map((msg, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                                        >
                                            {/* Commit-type file update message */}
                                            {msg.isCommit ? (
                                                <div className="w-full">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="h-6 w-6 rounded-full bg-success/10 flex items-center justify-center border border-success/20">
                                                            <GitCommit className="h-3.5 w-3.5 text-success" />
                                                        </div>
                                                        <span className="text-xs font-semibold text-foreground">{msg.content}</span>
                                                        <span className="text-[10px] text-muted-foreground ml-auto">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                    </div>
                                                    {msg.files && (
                                                        <div className="ml-8 space-y-0.5">
                                                            {msg.files.map((file) => (
                                                                <button
                                                                    key={file.path}
                                                                    onClick={() => {
                                                                        setActiveTab('code');
                                                                        setActiveFile(file.path);
                                                                        const tree = buildFileTree(generatedCode);
                                                                        const findFile = (files: GeneratedFile[]): string => {
                                                                            for (const f of files) {
                                                                                if (f.path === file.path) return f.content;
                                                                                if (f.children) {
                                                                                    const found = findFile(f.children);
                                                                                    if (found) return found;
                                                                                }
                                                                            }
                                                                            return '';
                                                                        };
                                                                        setViewingFileContent(findFile(tree));
                                                                    }}
                                                                    className="w-full flex items-center gap-2 px-2 py-1 text-[11px] font-mono rounded hover:bg-secondary/50 transition-colors text-left group"
                                                                >
                                                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${file.status === 'added' ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'}`}>
                                                                        {file.status === 'added' ? 'A' : 'M'}
                                                                    </span>
                                                                    <FileCode className={`h-3 w-3 shrink-0 ${file.name.endsWith('.tsx') || file.name.endsWith('.ts') ? 'text-blue-400' : file.name.endsWith('.css') ? 'text-pink-400' : file.name.endsWith('.json') ? 'text-yellow-400' : 'text-muted-foreground'}`} />
                                                                    <span className="text-muted-foreground group-hover:text-foreground truncate">{file.path}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                            /* Regular message */
                                            <>
                                            <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 border ${msg.role === 'ai' ? 'bg-primary/5 text-primary border-primary/20' : 'bg-secondary text-foreground border-border'
                                                }`}>
                                                {msg.role === 'ai' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                            </div>
                                            <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/10' : 'glass border-white/5'
                                                }`}>
                                                {msg.isSearching && (
                                                    <div className="flex items-center gap-1.5 text-xs text-primary mb-2">
                                                        <Search className="h-3 w-3" /> Web search results
                                                    </div>
                                                )}
                                                <div className="space-y-2 whitespace-pre-wrap">
                                                    {msg.content}
                                                </div>
                                            </div>
                                            </>
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {/* Thinking / Searching */}
                                {generating && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl p-3 border-primary/20">
                                        <button onClick={() => setThinkingOpen(!thinkingOpen)} className="flex items-center gap-2 text-sm w-full outline-none">
                                            {searchingWeb ? (
                                                <>
                                                    <Globe className="h-3.5 w-3.5 text-accent animate-glow-pulse" />
                                                    <span className="text-accent font-medium">Searching the web...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                                                    <span className="text-primary font-medium">Ryze is thinking...</span>
                                                </>
                                            )}
                                            <ChevronDown className={`h-3.5 w-3.5 ml-auto text-muted-foreground transition-transform ${thinkingOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        <AnimatePresence>
                                            {thinkingOpen && (
                                                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                                    <div className="pt-2 pl-6 space-y-1.5">
                                                        {thinkingSteps.map((step, i) => (
                                                            <motion.p
                                                                key={i}
                                                                initial={{ opacity: 0, x: -5 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                className="text-[11px] text-muted-foreground font-mono flex items-center gap-2"
                                                            >
                                                                <span className="h-1 w-1 rounded-full bg-primary/60 shrink-0" />
                                                                {step}
                                                            </motion.p>
                                                        ))}
                                                        {generating && (
                                                            <div className="flex gap-1 pt-1 ml-3">
                                                                {[0, 1, 2].map((i) => (
                                                                    <motion.span
                                                                        key={i}
                                                                        className="h-0.5 w-0.5 rounded-full bg-primary/40"
                                                                        animate={{ opacity: [0.3, 1, 0.3] }}
                                                                        transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input */}
                            <div className="p-3 border-t border-border bg-background">
                                <PromptBox
                                    onSend={(msg) => handleSend(msg)}
                                    placeholder={chatMode === 'plan' ? 'Ask for architectural advice...' : 'Describe what you want to build...'}
                                    className="bg-secondary/30 border-border/50"
                                />

                                {/* Chat Options: Plan Mode or Name Chat */}
                                {messages.length > 1 && (
                                    <div className="mt-3 flex gap-2 text-xs">
                                        <button
                                            onClick={() => setShowNameInput(!showNameInput)}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                                            title="Name this chat"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                            Name Chat
                                        </button>
                                        <button
                                            onClick={() => setChatMode(chatMode === 'chat' ? 'plan' : 'chat')}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                                            title={`Switch to ${chatMode === 'chat' ? 'plan' : 'chat'} mode`}
                                        >
                                            <Lightbulb className="h-3.5 w-3.5" />
                                            {chatMode === 'chat' ? 'Switch to Plan' : 'Switch to Chat'}
                                        </button>
                                    </div>
                                )}

                                {/* Name Chat Input */}
                                {showNameInput && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="mt-2 flex gap-2"
                                    >
                                        <input
                                            type="text"
                                            value={projectName}
                                            onChange={(e) => setProjectName(e.target.value)}
                                            placeholder="Enter chat name..."
                                            className="flex-1 bg-secondary/50 border border-border rounded-md px-2.5 py-1.5 text-xs outline-none focus:border-primary/50 transition-colors"
                                        />
                                        <button
                                            onClick={() => {
                                                setShowNameInput(false);
                                                toast.success(`Chat renamed to "${projectName}"`);
                                            }}
                                            className="px-2.5 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-md text-xs font-medium transition-colors"
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={() => setShowNameInput(false)}
                                            className="px-2 py-1.5 text-muted-foreground hover:text-foreground rounded-md text-xs transition-colors"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </motion.div>
                                )}

                                <p className="text-[9px] text-muted-foreground mt-2 text-center uppercase tracking-widest font-semibold opacity-60">
                                    {chatMode === 'plan' ? 'Plan mode active' : 'React + Tailwind CSS'}
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Preview / Code Panel */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Tabs + toolbar */}
                    <div className="flex items-center justify-between px-4 h-10 border-b border-border shrink-0 bg-background/50">
                        <div className="flex gap-1">
                            {([
                                { key: 'preview' as const, icon: Eye, label: 'Preview' },
                                { key: 'code' as const, icon: Code2, label: 'Code' },
                                { key: 'diff' as const, icon: GitCompare, label: 'Diff', disabled: !previousCode },
                            ]).map(({ key, icon: Icon, label, disabled = false }) => (
                                <button
                                    key={key}
                                    onClick={() => !disabled && setActiveTab(key)}
                                    disabled={disabled}
                                    title={disabled ? 'Code comparison not available yet' : undefined}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${disabled ? 'opacity-40 cursor-not-allowed' : activeTab === key ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                                        }`}
                                >
                                    <Icon className="h-3 w-3" /> {label}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => setDevice(device === 'desktop' ? 'mobile' : 'desktop')}>
                                {device === 'desktop' ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                            </Button>
                            <div className="h-4 w-px bg-border mx-1" />
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={handleDownload} title="Download code"><Download className="h-4 w-4" /></Button>

                            {activeTab === 'code' && (
                                <>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={handleCopyCode}><Copy className="h-4 w-4" /></Button>
                                    {!isEditing ? (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => setIsEditing(true)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-success" onClick={handleSaveCode}><Check className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-destructive" onClick={() => { setEditableCode(generatedCode); setIsEditing(false); }}><X className="h-4 w-4" /></Button>
                                        </>
                                    )}
                                </>
                            )}
                            <div className="h-4 w-px bg-border mx-1" />
                            <Button variant="glow" size="sm" className="h-8 text-xs px-4" onClick={handlePush} disabled={pushing}>
                                {pushing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <GitBranch className="mr-1.5 h-3.5 w-3.5" />}
                                Push to GitHub
                            </Button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 overflow-auto bg-[url('/grid-pattern.svg')] bg-[size:40px_40px] bg-fixed">
                        {activeTab === 'preview' && (
                            <div className={`mx-auto h-full rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 ${device === 'mobile' ? 'max-w-sm' : 'w-full'}`}>
                                {generatedCode ? (
                                    <div className="h-full flex flex-col">
                                        {/* Mock browser chrome */}
                                        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-sidebar/80">
                                            <div className="flex gap-1.5">
                                                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                                                <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                                                <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                                            </div>
                                            <div className="flex-1 flex justify-center">
                                                <span className="text-[10px] font-mono text-muted-foreground bg-secondary/80 px-4 py-0.5 rounded-full border border-border/40">ryzecanvas.local:3000</span>
                                            </div>
                                            <RotateCcw
                                                className="h-3 w-3 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                                onClick={() => {
                                                    // Force iframe reload by toggling code
                                                    const temp = generatedCode;
                                                    setGeneratedCode('');
                                                    setTimeout(() => setGeneratedCode(temp), 50);
                                                }}
                                            />
                                        </div>
                                        {/* Live preview iframe */}
                                        <div className="flex-1 overflow-hidden bg-white">
                                            <iframe
                                                srcDoc={buildPreviewHtml(generatedCode)}
                                                className="w-full h-full border-0 outline-none block"
                                                sandbox="allow-scripts"
                                                title="Live Preview"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center animate-fade-in">
                                        <div className="text-center group">
                                            <div className="h-16 w-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/10 group-hover:scale-110 transition-transform duration-500">
                                                <Play className="h-8 w-8 text-primary shadow-primary" />
                                            </div>
                                            <p className="text-sm font-semibold text-foreground">Awaiting Generation</p>
                                            <p className="text-[11px] text-muted-foreground/60 mt-1 max-w-[220px]">Describe what you want to build and I'll generate production-ready React + Tailwind code with a live preview.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'code' && (
                            <div className="glass-strong rounded-2xl overflow-hidden h-full flex shadow-2xl border-white/5">
                                {/* File Tree Sidebar */}
                                {generatedCode && (
                                    <div className="w-52 shrink-0 border-r border-white/5 bg-sidebar/60 overflow-y-auto py-2">
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 mb-1">
                                            <FolderTree className="h-3.5 w-3.5 text-primary" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Explorer</span>
                                        </div>
                                        <FileTreeView
                                            files={buildFileTree(generatedCode)}
                                            activeFile={activeFile}
                                            onSelect={(file) => {
                                                setActiveFile(file.path);
                                                setViewingFileContent(file.content);
                                            }}
                                        />
                                    </div>
                                )}
                                {/* Code Viewer */}
                                <div className="flex-1 flex flex-col min-w-0">
                                    <div className="flex items-center gap-2 px-4 h-10 border-b border-white/5 bg-sidebar/80 text-[11px] font-mono text-muted-foreground">
                                        <FileCode className="h-3.5 w-3.5 text-primary" />
                                        <span className="truncate">{activeFile.split('/').pop() || 'Component.tsx'}</span>
                                        {isEditing && activeFile === 'src/components/Generated.tsx' && (
                                            <span className="text-primary animate-pulse ml-auto flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> LIVE EDITING</span>
                                        )}
                                    </div>
                                    <div className="flex-1 overflow-auto bg-black/40">
                                        {isEditing && activeFile === 'src/components/Generated.tsx' ? (
                                            <textarea
                                                value={editableCode}
                                                onChange={(e) => setEditableCode(e.target.value)}
                                                className="w-full h-full p-6 bg-transparent border-0 shadow-none focus:ring-0 font-mono text-sm text-[hsl(var(--neon-text))] resize-none leading-relaxed outline-none"
                                            />
                                        ) : (
                                            <pre className="p-6 text-sm font-mono text-[hsl(var(--neon-text))] whitespace-pre-wrap leading-relaxed selection:bg-primary/30">
                                                {activeFile === 'src/components/Generated.tsx'
                                                    ? (generatedCode || '// Your generated React + Tailwind code will appear here...\n// Try: "Create a pricing page with three tiers"\n// Or: "Build a dashboard with sidebar navigation"')
                                                    : (viewingFileContent || '// Select a file from the tree to view its contents')
                                                }
                                            </pre>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'diff' && previousCode && (
                            <div className="w-full h-full flex flex-col">
                                <CodeComparison
                                    beforeCode={previousCode}
                                    afterCode={generatedCode}
                                    language="typescript"
                                    filename="Generated.tsx"
                                    beforeLabel="Before"
                                    afterLabel="After"
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* GitHub Connection Modal */}
            <AnimatePresence>
                {githubModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-md px-4"
                        onClick={() => setGithubModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="glass-strong rounded-2xl p-8 w-full max-w-md shadow-2xl border-primary/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <GitBranch className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold">Connect Repository</h3>
                                    <p className="text-xs text-muted-foreground">Automate your dev workflow with GitHub</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Repository URL</label>
                                    <Input
                                        value={repoUrl}
                                        onChange={(e) => setRepoUrl(e.target.value)}
                                        placeholder="https://github.com/user/project"
                                        className="bg-secondary/50 border-border/40 focus:border-primary/50"
                                    />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <Button variant="glow" className="flex-1 shadow-lg shadow-primary/20" onClick={handleConnectGithub}>
                                        Link Account
                                    </Button>
                                    <Button variant="outline-glow" onClick={() => setGithubModal(false)}>
                                        Close
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10">
                                <p className="text-[11px] leading-relaxed text-muted-foreground">
                                    <strong className="text-primary">Note:</strong> RyzeCanvas requires write access to create commits and manage pull requests on your behalf.
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default function Studio() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
        }>
            <StudioContent />
        </Suspense>
    );
}
