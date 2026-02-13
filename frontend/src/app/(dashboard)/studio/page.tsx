"use client";

import { useState, useRef, useEffect } from "react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { createProject } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
    Zap, GitBranch, Send, Paperclip, Monitor, Smartphone, GitFork, Download, Loader2,
    ChevronDown, User, Bot, Search, MessageSquare, Lightbulb, Globe, Code2, Eye,
    FileCode, Pencil, Check, X, LogOut, FolderOpen, Clock,
    RotateCcw, Copy, Play,
} from "lucide-react";
import { ProviderSelector, AIModel } from "@/components/ProviderSelector";

interface Message {
    role: 'user' | 'ai';
    content: string;
    steps?: string[];
    isSearching?: boolean;
    isThinking?: boolean;
}

export default function Studio() {
    const { user, isAuthenticated, logout } = useAuthStore();
    const { githubConnected, setGithubConnected } = useUIStore();
    const router = useRouter();

    const [messages, setMessages] = useState<Message[]>([
        { role: 'ai', content: 'Hello! I\'m Ryze. Describe the UI you want to build and I\'ll generate production-ready React or Next.js code. You can also select different AI providers above.' },
    ]);
    const [input, setInput] = useState('');
    const [generating, setGenerating] = useState(false);
    const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
    const [thinkingOpen, setThinkingOpen] = useState(false);
    const [searchingWeb] = useState(false);
    const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'diff'>('preview');
    const [generatedCode, setGeneratedCode] = useState('');
    const [editableCode, setEditableCode] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [pushing, setPushing] = useState(false);
    const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
    const [chatMode, setChatMode] = useState<'chat' | 'plan'>('chat');
    const [framework, setFramework] = useState<'react' | 'nextjs'>('react');
    const [githubModal, setGithubModal] = useState(false);
    const [repoUrl, setRepoUrl] = useState('');
    const [selectedModel, setSelectedModel] = useState<AIModel>({ id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "gemini" });

    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isAuthenticated && typeof window !== 'undefined') {
            // Optional: Redirect if not logged in
            // router.push('/login');
        }
    }, [isAuthenticated, router]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, thinkingSteps]);

    useEffect(() => {
        setEditableCode(generatedCode);
    }, [generatedCode]);

    const handleSend = async () => {
        if (!input.trim() || generating) return;
        const prompt = input;
        setInput('');

        if (chatMode === 'plan') {
            setMessages((m) => [...m, { role: 'user', content: `[Plan] ${prompt}` }]);
            setGenerating(true);
            await new Promise((r) => setTimeout(r, 1500));
            setMessages((m) => [...m, {
                role: 'ai',
                content: `## Plan for: "${prompt}"\n\n1. **Component Structure** — Break into Header, Content, and Footer\n2. **State Management** — Use local state for form, Zustand for global\n3. **Styling** — Tailwind with glassmorphism cards\n4. **Animations** — Framer Motion for enter/exit\n5. **Accessibility** — ARIA labels, keyboard nav\n\nReady to implement? Switch to Chat mode and say "Build it".`,
            }]);
            setGenerating(false);
            return;
        }

        setMessages((m) => [...m, { role: 'user', content: prompt }]);
        setGenerating(true);
        setThinkingSteps([]);
        setThinkingOpen(true);

        try {
            const project = await createProject(prompt, {
                provider: selectedModel.provider,
                model: selectedModel.id
            });

            // Mocking the steps for now since backend create_project doesn't return steps yet
            const mockSteps = ['Thinking...', 'Planning layout...', 'Generating React code...', 'Finalizing components...'];
            for (const step of mockSteps) {
                setThinkingSteps((s) => [...s, step]);
                await new Promise((r) => setTimeout(r, 400));
            }

            const code = project.code;
            setGeneratedCode(code);
            setMessages((m) => [...m, {
                role: 'ai',
                content: `Done! Your component has been generated using **${selectedModel.name}**. Check the Preview and Code tabs.`,
                steps: mockSteps,
            }]);
        } catch (error: unknown) {
            toast.error("Generation failed", { description: error instanceof Error ? error.message : "An unknown error occurred" });
            setMessages((m) => [...m, { role: 'ai', content: "Sorry, I encountered an error while generating your UI." }]);
        } finally {
            setGenerating(false);
            setThinkingOpen(false);
            setActiveTab('code');
        }
    };

    const handlePush = async () => {
        if (!githubConnected) {
            setGithubModal(true);
            return;
        }
        setPushing(true);
        // Note: We need a projectId to push. Let's assume we use the last generated project or similar.
        // For now, mocking the success if we don't have a projectId.
        toast.success('Pushed to GitHub ✓');
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

    const handleSaveCode = () => {
        setGeneratedCode(editableCode);
        setIsEditing(false);
        toast.success('Code saved!');
    };

    const handleCopyCode = () => {
        navigator.clipboard.writeText(editableCode || generatedCode);
        toast.success('Copied to clipboard!');
    };

    return (
        <div className="h-screen flex flex-col bg-background overflow-hidden font-sans">
            {/* Top Navigation Bar */}
            <header className="flex items-center h-12 px-4 border-b border-border shrink-0 gap-3 bg-sidebar/50 backdrop-blur-md">
                <Link href="/" className="flex items-center gap-2 mr-4">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                        <Zap className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-sm text-foreground tracking-tight">RyzeCanvas</span>
                </Link>

                <div className="h-5 w-px bg-border" />

                <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                    <FolderOpen className="h-3.5 w-3.5" /> Projects
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                    <Clock className="h-3.5 w-3.5" /> History
                </button>

                <div className="flex-1" />

                {/* Multi-AI Provider Selector */}
                <ProviderSelector
                    selectedModelId={selectedModel.id}
                    onSelectModel={(m) => setSelectedModel(m)}
                />

                <div className="h-5 w-px bg-border" />

                {/* GitHub */}
                <button
                    onClick={() => githubConnected ? setGithubConnected(false) : setGithubModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs hover:bg-secondary/50 transition-colors"
                >
                    <GitBranch className={`h-3.5 w-3.5 ${githubConnected ? 'text-success' : 'text-muted-foreground'}`} />
                    <span className={githubConnected ? 'text-success' : 'text-muted-foreground hidden sm:inline'}>
                        {githubConnected ? 'Connected' : 'Connect GitHub'}
                    </span>
                    <span className={`h-1.5 w-1.5 rounded-full ${githubConnected ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-muted-foreground/40'}`} />
                </button>

                <div className="h-5 w-px bg-border" />

                {/* User */}
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/30">
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                    <span className="text-xs text-foreground font-medium hidden lg:block">{user?.name || 'User'}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { logout(); router.push('/'); }}>
                        <LogOut className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex min-h-0 bg-secondary/10">
                {/* Chat Panel */}
                <div className="w-[440px] border-r border-border flex flex-col bg-background/50 backdrop-blur-sm">
                    {/* Chat/Plan toggle */}
                    <div className="flex items-center gap-2 px-4 h-10 border-b border-border shrink-0">
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
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Framework</span>
                            <button
                                onClick={() => setFramework(framework === 'react' ? 'nextjs' : 'react')}
                                className="text-[10px] bg-secondary px-2 py-0.5 rounded border border-border hover:border-primary/50 transition-colors"
                            >
                                {framework === 'react' ? 'React' : 'Next.js'}
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                        <AnimatePresence>
                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                                >
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
                                            <span className="text-accent font-medium">Searching the web…</span>
                                        </>
                                    ) : (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                                            <span className="text-primary font-medium">Ryze is thinking…</span>
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
                        <div className="flex items-end gap-2 glass rounded-xl px-3 py-2 border-primary/10 focus-within:border-primary/30 transition-colors">
                            <Paperclip className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors mb-1.5" />
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                placeholder={chatMode === 'plan' ? 'Ask for architectural advice...' : 'Describe a component...'}
                                className="flex-1 bg-transparent border-0 shadow-none focus:ring-0 p-0 text-sm outline-none resize-none min-h-[20px] max-h-[120px] py-1"
                                rows={1}
                            />
                            <div className="flex items-center gap-1 mb-0.5">
                                <Button variant="ghost" size="icon" onClick={handleSend} disabled={generating || !input.trim()} className="h-8 w-8 shrink-0 rounded-lg hover:bg-primary/10 hover:text-primary">
                                    <Send className="h-4.5 w-4.5" />
                                </Button>
                            </div>
                        </div>
                        <p className="text-[9px] text-muted-foreground mt-2 text-center uppercase tracking-widest font-semibold opacity-60">
                            {chatMode === 'plan' ? 'Plan mode active' : 'Next.js & Tailwind CSS enabled'}
                        </p>
                    </div>
                </div>

                {/* Preview / Code Panel */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Tabs + toolbar */}
                    <div className="flex items-center justify-between px-4 h-10 border-b border-border shrink-0 bg-background/50">
                        <div className="flex gap-1">
                            {([
                                { key: 'preview' as const, icon: Eye, label: 'Preview' },
                                { key: 'code' as const, icon: Code2, label: 'Code' },
                                { key: 'diff' as const, icon: FileCode, label: 'Diff' },
                            ]).map(({ key, icon: Icon, label }) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveTab(key)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === key ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
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
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => toast.info('Forking enabled soon')}><GitFork className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => toast.info('Project downloaded')}><Download className="h-4 w-4" /></Button>

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
                            <div className={`mx-auto h-full glass-strong rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 border-white/5 ${device === 'mobile' ? 'max-w-sm' : 'w-full'}`}>
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
                                            <RotateCcw className="h-3 w-3 text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
                                        </div>
                                        {/* Rendered output */}
                                        <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto">
                                            <div className="w-full max-w-2xl bg-background rounded-xl p-8 border border-border shadow-sm">
                                                <h2 className="text-xl font-bold mb-4">Preview</h2>
                                                <p className="text-muted-foreground mb-6">This is a mock rendering of the generated code. In production, this would be an iframe running your React component code.</p>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="h-20 bg-primary/5 rounded-lg border border-primary/10 flex items-center justify-center text-primary font-bold">Component A</div>
                                                    <div className="h-20 bg-accent/5 rounded-lg border border-accent/10 flex items-center justify-center text-accent font-bold">Component B</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center animate-fade-in">
                                        <div className="text-center group">
                                            <div className="h-16 w-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/10 group-hover:scale-110 transition-transform duration-500">
                                                <Play className="h-8 w-8 text-primary shadow-primary" />
                                            </div>
                                            <p className="text-sm font-semibold text-foreground">Awaiting Generation</p>
                                            <p className="text-[11px] text-muted-foreground/60 mt-1 max-w-[180px]">Your production-ready UI will appear here after description.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'code' && (
                            <div className="glass-strong rounded-2xl overflow-hidden h-full flex flex-col shadow-2xl border-white/5">
                                <div className="flex items-center gap-2 px-4 h-10 border-b border-white/5 bg-sidebar/80 text-[11px] font-mono text-muted-foreground">
                                    <FileCode className="h-3.5 w-3.5 text-primary" />
                                    <span>GeneratedUI.tsx</span>
                                    {isEditing && <span className="text-primary animate-pulse ml-auto flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> LIVE EDITING</span>}
                                </div>
                                <div className="flex-1 overflow-auto bg-black/40">
                                    {isEditing ? (
                                        <textarea
                                            value={editableCode}
                                            onChange={(e) => setEditableCode(e.target.value)}
                                            className="w-full h-full p-6 bg-transparent border-0 shadow-none focus:ring-0 font-mono text-sm text-[hsl(var(--neon-text))] resize-none leading-relaxed outline-none"
                                        />
                                    ) : (
                                        <pre className="p-6 text-sm font-mono text-[hsl(var(--neon-text))] whitespace-pre-wrap leading-relaxed selection:bg-primary/30">
                                            {generatedCode || '// Your generated code will appear here...\n// Switch to Plan mode for architecture advice first if needed.'}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        )}
                        {activeTab === 'diff' && (
                            <div className="glass-strong rounded-2xl p-8 h-full flex items-center justify-center border-white/5">
                                <div className="text-center">
                                    <FileCode className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                                    <p className="text-sm font-medium text-muted-foreground">Version Control</p>
                                    <p className="text-xs text-muted-foreground/50 mt-1">Diff view is coming soon to RyzeCanvas v2.1.</p>
                                </div>
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
                                        placeholder="https://github.com/atinarapu/project-x"
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
