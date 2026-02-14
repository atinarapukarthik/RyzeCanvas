"use client";

import { useState, useRef, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeComparison } from "@/components/ui/code-comparison";
import { PromptBox } from "@/components/ui/prompt-box";
import { useUIStore } from "@/stores/uiStore";
import { createProject, searchWeb, updateProject, streamChat, fetchProjects } from "@/lib/api";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
    GitBranch, Monitor, Smartphone, Download, Loader2,
    ChevronDown, ChevronRight, User, Bot, Search, Globe, Code2, Eye,
    FileCode, Pencil, Check, X, FolderOpen, Clock, GitCommit,
    RotateCcw, Copy, Play, Folder, FolderTree, GitCompare,
    Rocket, CircleCheck, CircleDot, Package, Terminal, ArrowRight,
    CheckCircle, Hash, Sparkles, ListTodo, ExternalLink, AlertTriangle, Lightbulb,
} from "lucide-react";

interface Message {
    role: 'user' | 'ai';
    content: string;
    steps?: string[];
    isSearching?: boolean;
    isThinking?: boolean;
    isCommit?: boolean;
    isPlanQuestions?: boolean;
    isPlanReady?: boolean;
    isImplementing?: boolean;
    files?: { name: string; path: string; status: 'added' | 'modified' }[];
    questions?: PlanQuestion[];
    plan?: PlanData;
    implementationStatus?: ImplementationStatus;
}

interface ArchivedChat {
    key: string;
    timestamp: string;
    projectName: string;
    contextId: string;
    code?: string;
    prompt?: string;
}

interface PlanQuestion {
    id: string;
    question: string;
    options: string[];
    selectedOption?: number;
    customAnswer?: string;
}

interface PlanFile {
    name: string;
    path: string;
    description: string;
}

interface PlanSkill {
    id: string;
    name: string;
    icon: string;
}

interface PlanData {
    title: string;
    description: string;
    files: PlanFile[];
    skills: PlanSkill[];
    steps: string[];
    libraries: string[];
}

interface ImplementationTodo {
    id: string;
    label: string;
    status: 'pending' | 'in_progress' | 'completed';
}

interface FileUpdateStatus {
    path: string;
    name: string;
    status: 'pending' | 'writing' | 'completed';
    code?: string;
}

interface ImplementationStatus {
    phase: 'installing' | 'creating' | 'done';
    todos: ImplementationTodo[];
    installingLibraries: { name: string; status: 'pending' | 'installing' | 'installed' }[];
    fileUpdates: FileUpdateStatus[];
    currentFileIndex: number;
}

/**
 * Build a self-contained HTML page that renders the given React+Tailwind code
 * inside an iframe via srcdoc. Uses CDN-loaded React 18, ReactDOM, Babel, and Tailwind CSS.
 *
 * When `allFiles` is provided (multi-file project), inlines all component files
 * so cross-file references (e.g. HeroSection imported in App.tsx) resolve at runtime.
 */
function buildPreviewHtml(code: string, allFiles?: Record<string, string>): string {
    // ── Multi-file merge ──
    // When the AI generates a multi-file project, App.tsx may reference HeroSection, Footer,
    // Navbar, etc. from separate files. We inline them all into a single preview.
    let mergedCode = code;

    if (allFiles && Object.keys(allFiles).length > 0) {
        const componentFiles: { path: string; code: string }[] = [];
        const mainFilePaths = ['src/App.tsx', 'src/App.jsx', 'app/page.tsx', 'app/page.jsx'];

        for (const [filePath, fileCode] of Object.entries(allFiles)) {
            if (
                (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) &&
                !mainFilePaths.includes(filePath) &&
                !filePath.includes('main.tsx') &&
                !filePath.includes('main.jsx') &&
                !filePath.includes('layout.tsx') &&
                typeof fileCode === 'string' &&
                (fileCode.includes('function ') || fileCode.includes('const ') || fileCode.includes('export'))
            ) {
                componentFiles.push({ path: filePath, code: fileCode });
            }
        }

        const mainFile =
            allFiles['src/App.tsx'] ||
            allFiles['src/App.jsx'] ||
            allFiles['app/page.tsx'] ||
            allFiles['app/page.jsx'] ||
            code;

        if (componentFiles.length > 0) {
            const parts = componentFiles.map((f) => f.code);
            parts.push(mainFile);
            mergedCode = parts.join('\n\n');
        } else {
            mergedCode = mainFile;
        }
    }

    // Extract the component name from the LAST default export (the main App)
    const lines = mergedCode.split('\n');
    let componentName = 'App';
    for (let i = lines.length - 1; i >= 0; i--) {
        const fnM = lines[i].match(/export\s+default\s+function\s+(\w+)/);
        if (fnM) { componentName = fnM[1]; break; }
        const constM = lines[i].match(/export\s+default\s+(\w+)\s*;?\s*$/);
        if (constM) { componentName = constM[1]; break; }
    }
    if (componentName === 'App') {
        const standaloneFn = mergedCode.match(/^function\s+(\w+)/m);
        if (standaloneFn) componentName = standaloneFn[1];
    }

    // Clean code for browser execution:
    // Babel standalone with TypeScript preset handles all TS syntax (types, interfaces, generics).
    // We only need to handle imports (unresolvable in browser) and exports (need to identify the root component).

    // Scan for imports to auto-stub missing libraries (e.g., react-icons, recharts, framer-motion)
    const importedNames = new Set<string>();
    const importRegex = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
    const defaultImportRegex = /import\s+(?:type\s+)?(\w+)\s+from\s+['"]([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(mergedCode)) !== null) {
        const [, names, module] = match;
        if (module !== 'react' && module !== 'react-dom') {
            names.split(',').forEach(n => {
                const alias = n.trim().split(' as ')[1]?.trim() || n.trim();
                // Avoid stubbing "lucide-react" exports as they are handled by the proxy
                if (alias) importedNames.add(alias);
            });
        }
    }
    while ((match = defaultImportRegex.exec(mergedCode)) !== null) {
        const [, name, module] = match;
        if (module !== 'react' && module !== 'react-dom') {
            importedNames.add(name);
        }
    }

    const codeWithoutImports = mergedCode
        // Remove all import statements (single-line and multi-line)
        .replace(/^import[\s\S]*?from\s*['"][^'"]*['"];?\s*$/gm, '')
        .replace(/^import\s*['"][^'"]*['"];?\s*$/gm, '')
        // Handle default exports:
        // 1. `export default function Foo` → `function Foo` (keep the declaration)
        .replace(/^export\s+default\s+function\s+/gm, 'function ')
        // 2. `export default Foo;` (standalone name reference) → remove entirely
        //    The component is already defined above by its function/const declaration.
        .replace(/^export\s+default\s+[A-Z]\w*\s*;?\s*$/gm, '')
        // 3. `export default <expression>` (arrow fn, class expr, etc.) → assign to a var
        .replace(/^export\s+default\s+/gm, 'const __DefaultExport__ = ')
        // Remove export keyword from named exports (keep the declaration)
        .replace(/^export\s+(function|const|let|var|class)\s+/gm, '$1 ')
        // ── TypeScript pre-stripping (safety net before Babel) ──
        // Remove `type X = ...` and `interface X { ... }` declarations entirely
        .replace(/^(?:export\s+)?type\s+\w+(?:<[^>]*>)?\s*=\s*[^;]*;?\s*$/gm, '')
        .replace(/^(?:export\s+)?interface\s+\w+(?:\s+extends\s+\w+)?(?:<[^>]*>)?\s*\{[^}]*\}\s*$/gm, '')
        // Remove type annotations from variable declarations: `const x: Type = ...` → `const x = ...`
        .replace(/(?<=[(\s,])(\w+)\s*:\s*(?:string|number|boolean|any|void|null|undefined|never|unknown|object|React\.\w+|Array<[^>]*>|Record<[^>]*>|\w+(?:\[\])?)\s*(?=[=,)\n])/g, '$1 ')
        // Remove generic type parameters from function calls: fn<Type>(...) → fn(...)
        .replace(/(?<=\w)<(?:string|number|boolean|any|[A-Z]\w*)(?:\s*,\s*(?:string|number|boolean|any|[A-Z]\w*))*>\s*(?=\()/g, '')
        // Remove `as Type` type assertions
        .replace(/\s+as\s+(?:const|string|number|boolean|any|unknown|\w+(?:\[\])?)\b/g, '')
        // Remove standalone `type` imports that might have been partially stripped
        .replace(/^import\s+type\b[^;]*;?\s*$/gm, '');

    // Scan user code for declared names to avoid duplicate identifier errors with icon stubs
    const declaredNames = new Set<string>();
    const declRegex = /(?:^|\s)(?:function|const|let|var|class)\s+(\w+)/gm;
    let declMatch;
    while ((declMatch = declRegex.exec(codeWithoutImports)) !== null) {
        declaredNames.add(declMatch[1]);
    }

    const allIconNames = [
        'Menu', 'X', 'ChevronDown', 'ChevronRight', 'ChevronLeft', 'ChevronUp',
        'Search', 'Heart', 'Star', 'ShoppingCart', 'User', 'Bell', 'Settings',
        'Mail', 'Phone', 'MapPin', 'Calendar', 'Clock', 'Check', 'Plus', 'Minus',
        'Edit', 'Trash', 'Eye', 'EyeOff', 'Lock', 'Unlock', 'Home', 'ArrowRight',
        'ArrowLeft', 'ExternalLink', 'Download', 'Upload', 'Share', 'Filter',
        'MoreHorizontal', 'MoreVertical', 'Sun', 'Moon', 'Github', 'Twitter',
        'Linkedin', 'Facebook', 'Instagram', 'Youtube', 'Globe', 'Zap', 'Award',
        'TrendingUp', 'BarChart', 'PieChart', 'Activity', 'AlertCircle', 'Info',
        'HelpCircle', 'XCircle', 'CheckCircle', 'AlertTriangle', 'Loader2',
        'RefreshCw', 'RotateCcw', 'Copy', 'Clipboard', 'Send', 'MessageSquare',
        'Image', 'Camera', 'Video', 'Mic', 'Volume2', 'VolumeX', 'Wifi', 'WifiOff',
        'Battery', 'Bluetooth', 'Monitor', 'Smartphone', 'Tablet', 'Laptop',
        'Server', 'Database', 'Cloud', 'Code', 'Terminal', 'FileText', 'Folder',
        'Archive', 'Box', 'Package', 'Gift', 'CreditCard', 'DollarSign', 'Percent',
        'Tag', 'Bookmark', 'Flag', 'Hash', 'AtSign', 'Link', 'Paperclip', 'Scissors',
        'Layers', 'Layout', 'Grid', 'List', 'Columns', 'Sidebar', 'PanelLeft',
        'LogIn', 'LogOut', 'UserPlus', 'Users', 'Shield', 'Key', 'Play', 'Pause',
        'SkipForward', 'SkipBack', 'Maximize', 'Minimize', 'Move', 'Trash2',
        'Edit2', 'Edit3', 'Save', 'FilePlus', 'FolderPlus', 'FolderOpen',
        'ChevronFirst', 'ChevronLast', 'ChevronsUpDown', 'ArrowUpDown',
    ];
    const safeIcons = allIconNames.filter(name => !declaredNames.has(name));
    const iconDestructuring = safeIcons.length > 0
        ? `const { ${safeIcons.join(', ')} } = lucideReact;`
        : '// All icon names conflict with user code — icons available via lucideReact proxy';

    const reactGlobals = new Set(['useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'useContext', 'createContext', 'useReducer', 'useId', 'Fragment', 'forwardRef', 'memo', 'Suspense']);
    const stubsToGenerate = Array.from(importedNames).filter(n => !reactGlobals.has(n) && !allIconNames.includes(n) && !declaredNames.has(n));
    const importStubs = stubsToGenerate.length > 0
        ? stubsToGenerate.map(n => `const ${n} = React.forwardRef((props, ref) => React.createElement('div', { ...props, ref }, props.children));`).join('\n')
        : '';

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
        ${iconDestructuring}
        
        // Auto-generated stubs for missing imports
        ${importStubs}

        // Catch-all stubs for missing icon/Icon variables often used in AI code maps
        if (typeof icon === 'undefined') {
            var icon = (props) => React.createElement('div', { ...props }, 'Icon');
        }
        if (typeof Icon === 'undefined') {
            var Icon = (props) => React.createElement('div', { ...props }, 'Icon');
        }
        if (typeof id === 'undefined') {
            var id = 'id-' + Math.random().toString(36).substr(2, 9);
        }
        if (typeof key === 'undefined') {
            var key = 'key-' + Math.random().toString(36).substr(2, 9);
        }
        if (typeof price === 'undefined') {
            var price = '$0.00';
        }
        if (typeof item === 'undefined') {
            var item = {};
        }
        if (typeof t === 'undefined') {
            var t = (s) => s;
        }
        if (typeof feature === 'undefined') {
            var feature = { title: 'Feature', description: 'Description' };
        }

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
    <script>
        // Error detection for AI-generated code
        window.addEventListener('error', function(event) {
            window.parent.postMessage({
                type: 'preview-error',
                error: {
                    message: event.message,
                    source: event.filename,
                    line: event.lineno,
                    column: event.colno,
                    stack: event.error?.stack
                }
            }, '*');
        });

        window.addEventListener('unhandledrejection', function(event) {
            window.parent.postMessage({
                type: 'preview-error',
                error: {
                    message: event.reason?.message || String(event.reason),
                    stack: event.reason?.stack
                }
            }, '*');
        });
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
 * Parse a flat file map (path → content) into a nested folder tree.
 * Falls back to wrapping a single code string in a default structure.
 */
function buildFileTree(code: string, allFiles?: Record<string, string>): GeneratedFile[] {
    if (!code && (!allFiles || Object.keys(allFiles).length === 0)) return [];

    // If we have actual generated files from plan_implement, build tree from those
    if (allFiles && Object.keys(allFiles).length > 0) {
        return buildTreeFromPaths(allFiles);
    }

    // Fallback: single component mode — wrap in minimal structure
    return [
        {
            name: 'src', path: 'src', type: 'folder', content: '', children: [
                {
                    name: 'components', path: 'src/components', type: 'folder', content: '', children: [
                        { name: 'Generated.tsx', path: 'src/components/Generated.tsx', type: 'file', content: code },
                    ]
                },
            ]
        },
    ];
}

/**
 * Build a nested folder tree from a flat map of file paths → code content.
 */
function buildTreeFromPaths(files: Record<string, string>): GeneratedFile[] {
    const root: GeneratedFile[] = [];

    const sortedPaths = Object.keys(files).sort();

    for (const filePath of sortedPaths) {
        const parts = filePath.split('/');
        let currentLevel = root;

        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const currentPath = parts.slice(0, i + 1).join('/');
            const isFile = i === parts.length - 1;

            const existing = currentLevel.find((f) => f.name === part);

            if (isFile) {
                if (!existing) {
                    currentLevel.push({
                        name: part,
                        path: currentPath,
                        type: 'file',
                        content: files[filePath],
                    });
                }
            } else {
                if (existing && existing.type === 'folder') {
                    currentLevel = existing.children || [];
                } else {
                    const folder: GeneratedFile = {
                        name: part,
                        path: currentPath,
                        type: 'folder',
                        content: '',
                        children: [],
                    };
                    currentLevel.push(folder);
                    currentLevel = folder.children!;
                }
            }
        }
    }

    return root;
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
    const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
        // Auto-expand top-level folders
        const initial: Record<string, boolean> = {};
        files.forEach((f) => {
            if (f.type === 'folder') initial[f.path] = true;
            f.children?.forEach((c) => {
                if (c.type === 'folder') initial[c.path] = true;
            });
        });
        return initial;
    });

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
    const { githubConnected, setGithubConnected, selectedModel, githubModal, setGithubModal } = useUIStore();
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
    const [repoUrl, setRepoUrl] = useState('');
    const [chatCollapsed, setChatCollapsed] = useState(false);
    const [projectId, setProjectId] = useState<string>('');
    const [sessionId, setSessionId] = useState<string>(() => {
        // Recover sessionId from sessionStorage so state persists across page reloads
        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem('ryze-current-session-id');
            if (stored) return stored;
        }
        const newId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('ryze-current-session-id', newId);
        }
        return newId;
    });
    const [activeFile, setActiveFile] = useState<string>('src/components/Generated.tsx');
    const [viewingFileContent, setViewingFileContent] = useState<string>('');
    const [planQuestions, setPlanQuestions] = useState<PlanQuestion[]>([]);
    const [planData, setPlanData] = useState<PlanData | null>(null);
    const [isAnsweringQuestions, setIsAnsweringQuestions] = useState(false);
    const [implementationStatus, setImplementationStatus] = useState<ImplementationStatus | null>(null);
    const [isImplementing, setIsImplementing] = useState(false);
    const [currentPreviewFile, setCurrentPreviewFile] = useState<string>('');
    const [allGeneratedFiles, setAllGeneratedFiles] = useState<Record<string, string>>({});
    const [previousAllFiles] = useState<Record<string, string>>({});
    const [diffFile, setDiffFile] = useState<string>('');
    const [previewRoute, setPreviewRoute] = useState<string>('');
    const [routeSearchOpen, setRouteSearchOpen] = useState(false);
    const [routeSearchQuery, setRouteSearchQuery] = useState('');
    const [iframeKey, setIframeKey] = useState(0);
    const [previewError, setPreviewError] = useState<{ message: string; stack?: string } | null>(null);
    const [errorModalOpen, setErrorModalOpen] = useState(false);
    const [archivesModalOpen, setArchivesModalOpen] = useState(false);
    const [archivedChats, setArchivedChats] = useState<ArchivedChat[]>([]);
    const [historySource, setHistorySource] = useState<'archives' | 'projects'>('archives');

    const chatEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const streamingMessageRef = useRef<string>('');
    const initialPromptSentRef = useRef<boolean>(false);
    const handleSendRef = useRef<((msg?: string) => Promise<void>) | null>(null);
    const routeSearchRef = useRef<HTMLDivElement>(null);

    const getContextId = useCallback(() => projectId || sessionId, [projectId, sessionId]);

    const migrateSessionToProject = useCallback((newProjectId: string) => {
        const oldContextId = sessionId;
        const newContextId = newProjectId;

        // Migrate chat history
        const oldHistory = localStorage.getItem(`ryze-chat-history-${oldContextId}`);
        if (oldHistory) {
            localStorage.setItem(`ryze-chat-history-${newContextId}`, oldHistory);
            localStorage.removeItem(`ryze-chat-history-${oldContextId}`);
        }

        // Migrate generated code
        const oldCode = localStorage.getItem(`ryze-generated-code-${oldContextId}`);
        if (oldCode) {
            localStorage.setItem(`ryze-generated-code-${newContextId}`, oldCode);
            localStorage.removeItem(`ryze-generated-code-${oldContextId}`);
        }

        // Migrate project name
        const oldName = localStorage.getItem(`ryze-project-name-${oldContextId}`);
        if (oldName) {
            localStorage.setItem(`ryze-project-name-${newContextId}`, oldName);
            localStorage.removeItem(`ryze-project-name-${oldContextId}`);
        }
    }, [sessionId]);

    // Load project from history if projectId is in URL
    useEffect(() => {
        const loadProjectId = searchParams.get('project');
        const promptParam = searchParams.get('prompt');

        // If there's a prompt but no project, this is a NEW session - clear old data and generate new session ID
        if (promptParam && !loadProjectId) {
            // Generate a new session ID for this fresh session
            const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            setSessionId(newSessionId);
            sessionStorage.setItem('ryze-current-session-id', newSessionId);

            // Clear ONLY global localStorage keys (not project-specific ones)
            localStorage.removeItem('ryze-chat-history');
            localStorage.removeItem('ryze-generated-code');
            localStorage.removeItem('ryze-project-name');

            // Reset to initial state
            setMessages([{ role: 'ai', content: 'Hello! I\'m Ryze. Describe the UI you want to build and I\'ll generate production-ready React + Tailwind CSS code. Try saying "Create a landing page" or "Build a dashboard".' }]);
            setGeneratedCode('');
            setEditableCode('');
            setProjectName('Untitled Project');
            setProjectId('');
            setAllGeneratedFiles({});
            setPlanData(null);
            setPlanQuestions([]);
            return;
        }

        if (loadProjectId) {
            fetchProjects().then((projects) => {
                const project = projects.find((p) => p.id === loadProjectId);
                if (project && project.code) {
                    setProjectId(project.id);
                    setProjectName(project.title || 'Untitled Project');
                    setActiveTab('preview');

                    // Detect if code_json is a multi-file JSON project or single-file code
                    let parsedFiles: Record<string, string> | null = null;
                    try {
                        const parsed = JSON.parse(project.code);
                        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                            // Check if keys look like file paths
                            const keys = Object.keys(parsed);
                            const hasFilePaths = keys.some(k => k.includes('.') || k.includes('/'));
                            if (hasFilePaths && keys.length >= 2) {
                                parsedFiles = parsed;
                            }
                        }
                    } catch {
                        // Not JSON — it's single-file code
                    }

                    if (parsedFiles) {
                        // Multi-file project: restore allGeneratedFiles and use App.tsx for preview
                        setAllGeneratedFiles(parsedFiles);
                        const mainFile =
                            parsedFiles['src/App.tsx'] ||
                            parsedFiles['src/App.jsx'] ||
                            parsedFiles['app/page.tsx'] ||
                            Object.values(parsedFiles).find(v => v.includes('export default')) ||
                            Object.values(parsedFiles)[0];
                        setGeneratedCode(mainFile || '');
                        setEditableCode(mainFile || '');
                    } else {
                        // Single-file code
                        setGeneratedCode(project.code);
                        setEditableCode(project.code);
                    }

                    // Load project-specific conversation history from localStorage
                    const projectHistoryKey = `ryze-chat-history-${project.id}`;
                    const savedMessages = localStorage.getItem(projectHistoryKey);

                    if (savedMessages) {
                        try {
                            const parsed = JSON.parse(savedMessages);
                            if (Array.isArray(parsed) && parsed.length > 1) {
                                setMessages(parsed);
                            } else {
                                // Fallback to default message with project loaded notice
                                setMessages([
                                    { role: 'ai', content: 'Hello! I\'m Ryze. Describe the UI you want to build and I\'ll generate production-ready React + Tailwind CSS code. Try saying "Create a landing page" or "Build a dashboard".' },
                                    {
                                        role: 'ai',
                                        content: `Loaded project: **${project.title}**. You can preview it, edit the code, or ask me to modify it.`,
                                    }
                                ]);
                            }
                        } catch {
                            // Invalid JSON, use default
                            setMessages([
                                { role: 'ai', content: 'Hello! I\'m Ryze. Describe the UI you want to build and I\'ll generate production-ready React + Tailwind CSS code. Try saying "Create a landing page" or "Build a dashboard".' },
                                {
                                    role: 'ai',
                                    content: `Loaded project: **${project.title}**. You can preview it, edit the code, or ask me to modify it.`,
                                }
                            ]);
                        }
                    } else {
                        setMessages([
                            { role: 'ai', content: 'Hello! I\'m Ryze. Describe the UI you want to build and I\'ll generate production-ready React + Tailwind CSS code. Try saying "Create a landing page" or "Build a dashboard".' },
                            {
                                role: 'ai',
                                content: `Loaded project: **${project.title}**. You can preview it, edit the code, or ask me to modify it.`,
                            }
                        ]);
                    }
                }
            }).catch(() => {
                // Failed to load project
            });
        }
    }, [searchParams]);

    // Load chat history from localStorage on mount (only if not a new session and no project loaded)
    useEffect(() => {
        const promptParam = searchParams.get('prompt');
        const loadProjectId = searchParams.get('project');

        // Skip loading if this is a new session or if a project was already loaded
        if (promptParam && !loadProjectId) {
            return;
        }

        // Skip if a project is already loaded (handled by previous effect)
        if (loadProjectId) {
            return;
        }

        // On plain reload (no URL params), try to recover active project from sessionStorage
        const storedProjectId = typeof window !== 'undefined' ? sessionStorage.getItem('ryze-current-project-id') : null;
        if (storedProjectId && !projectId) {
            // Reload project from DB
            fetchProjects().then((projects) => {
                const project = projects.find((p) => p.id === storedProjectId);
                if (project && project.code) {
                    setProjectId(project.id);
                    setProjectName(project.title || 'Untitled Project');

                    // Parse multi-file project
                    let parsedFiles: Record<string, string> | null = null;
                    try {
                        const parsed = JSON.parse(project.code);
                        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                            const keys = Object.keys(parsed);
                            if (keys.some(k => k.includes('.') || k.includes('/')) && keys.length >= 2) {
                                parsedFiles = parsed;
                            }
                        }
                    } catch { /* single-file */ }

                    if (parsedFiles) {
                        setAllGeneratedFiles(parsedFiles);
                        const mainFile = parsedFiles['src/App.tsx'] || parsedFiles['src/App.jsx'] || parsedFiles['app/page.tsx'] || Object.values(parsedFiles)[0];
                        setGeneratedCode(mainFile || '');
                        setEditableCode(mainFile || '');
                    } else {
                        setGeneratedCode(project.code);
                        setEditableCode(project.code);
                    }
                    setActiveTab('preview');
                }
            }).catch(() => { });
        }

        // Try to load from context-specific localStorage for continuing sessions
        const contextId = getContextId();
        const savedMessages = localStorage.getItem(`ryze-chat-history-${contextId}`);
        const savedCode = localStorage.getItem(`ryze-generated-code-${contextId}`);
        const savedProjectName = localStorage.getItem(`ryze-project-name-${contextId}`);

        if (savedMessages) {
            try {
                const parsed = JSON.parse(savedMessages);
                if (Array.isArray(parsed) && parsed.length > 1) {
                    setMessages(parsed);
                }
            } catch {
                // Invalid JSON in localStorage
            }
        }

        if (savedCode) {
            setGeneratedCode(savedCode);
            setEditableCode(savedCode);
        }

        // Restore multi-file project files
        const savedAllFiles = localStorage.getItem(`ryze-all-files-${contextId}`);
        if (savedAllFiles) {
            try {
                const parsed = JSON.parse(savedAllFiles);
                if (typeof parsed === 'object' && parsed !== null) {
                    setAllGeneratedFiles(parsed);
                }
            } catch {
                // Invalid JSON
            }
        }

        if (savedProjectName) {
            setProjectName(savedProjectName);
        }
    }, [searchParams, projectId, getContextId]);

    // Persist projectId to sessionStorage so it survives page reloads
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (projectId) {
                sessionStorage.setItem('ryze-current-project-id', projectId);
            } else {
                sessionStorage.removeItem('ryze-current-project-id');
            }
        }
    }, [projectId, getContextId]);

    // Save chat history to localStorage whenever messages change (project-scoped)
    useEffect(() => {
        if (messages.length > 1) { // Don't save if only welcome message
            const contextId = getContextId();

            // Save only essential message data to reduce storage
            const essentialMessages = messages.map(m => ({
                role: m.role,
                content: m.content,
                // Omit large/temporary fields
            }));
            try {
                localStorage.setItem(`ryze-chat-history-${contextId}`, JSON.stringify(essentialMessages));
            } catch {
                // Storage quota exceeded - archive old data
                console.warn('localStorage quota exceeded, archiving...');
                const timestamp = new Date().toISOString();
                const archiveKey = `ryze-chat-archive-${timestamp}`;
                localStorage.setItem(archiveKey, JSON.stringify({ messages: essentialMessages, timestamp, contextId }));
                const archives = JSON.parse(localStorage.getItem('ryze-chat-archives-list') || '[]');
                archives.push({ key: archiveKey, timestamp, projectName: projectName || 'Auto-archived', contextId });
                localStorage.setItem('ryze-chat-archives-list', JSON.stringify(archives));
                // Clear current to make space
                localStorage.removeItem(`ryze-chat-history-${contextId}`);
            }
        }
    }, [messages, projectId, sessionId, projectName, getContextId]);

    // Save generated code to localStorage (project-scoped)
    useEffect(() => {
        if (generatedCode) {
            const contextId = getContextId();
            localStorage.setItem(`ryze-generated-code-${contextId}`, generatedCode);
        }
    }, [generatedCode, projectId, sessionId, getContextId]);

    // Save all generated files to localStorage (project-scoped) for multi-file projects
    useEffect(() => {
        if (Object.keys(allGeneratedFiles).length > 0) {
            const contextId = getContextId();
            try {
                localStorage.setItem(`ryze-all-files-${contextId}`, JSON.stringify(allGeneratedFiles));
            } catch {
                // Storage quota exceeded — skip
            }
        }
    }, [allGeneratedFiles, projectId, sessionId, getContextId]);

    // Save project name to localStorage (project-scoped)
    useEffect(() => {
        if (projectName !== 'Untitled Project') {
            const contextId = getContextId();
            localStorage.setItem(`ryze-project-name-${contextId}`, projectName);
        }
    }, [projectName, projectId, sessionId, getContextId]);

    // Load prompt and mode from Dashboard
    useEffect(() => {
        const promptParam = searchParams.get('prompt');
        const modeParam = searchParams.get('mode');
        const webSearchParam = searchParams.get('webSearch');

        if (modeParam === 'plan' || modeParam === 'build') {
            setChatMode(modeParam === 'plan' ? 'plan' : 'chat');
        }

        if (webSearchParam === 'true') {
            setWebSearchEnabled(true);
        }

        if (promptParam && !initialPromptSentRef.current) {
            setInput(promptParam);
            initialPromptSentRef.current = true;
        }
    }, [searchParams]);

    // Auto-send the initial prompt from Dashboard
    useEffect(() => {
        const promptParam = searchParams.get('prompt');
        if (promptParam && input === promptParam && !generating && initialPromptSentRef.current) {
            // Trigger send after a small delay to ensure state is settled
            const timer = setTimeout(() => {
                if (input.trim()) {
                    handleSendRef.current?.(input);
                    // Clear URL params so reload doesn't re-send the prompt
                    router.replace('/studio', { scroll: false });
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [input, generating, searchParams, router]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, thinkingSteps]);

    useEffect(() => {
        setEditableCode(generatedCode);
    }, [generatedCode, setEditableCode]);

    // Close route search dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (_e: MouseEvent) => {
            if (routeSearchRef.current && !routeSearchRef.current.contains(_e.target as Node)) {
                setRouteSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Listen for errors from preview iframe — set error state but don't auto-open modal
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'preview-error') {
                const error = event.data.error;
                setPreviewError(error);
                // Don't auto-open modal — show subtle error badge instead
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Clear error when code changes
    useEffect(() => {
        setPreviewError(null);
        setErrorModalOpen(false);
    }, [generatedCode, previewRoute]);

    // Track code changes for diff view
    useEffect(() => {
        if (generatedCode && previousCode && generatedCode !== previousCode) {
            // Code has been regenerated, optionally auto-show diff
            // setActiveTab('diff');
        }
    }, [generatedCode, previousCode]);

    const handleSend = useCallback(async (promptMessage?: string) => {
        const prompt = promptMessage || input;
        if (!prompt.trim() || generating) return;
        setInput('');

        // Check if this is a new session from dashboard (has prompt param but no project param)
        const promptParam = searchParams.get('prompt');
        const loadProjectId = searchParams.get('project');
        const isNewSession = promptParam && !loadProjectId;

        // Determine the orchestration mode
        // Plan mode → use plan_interactive for question-based flow
        const mode = chatMode === 'plan' ? 'plan_interactive' : 'chat';

        // For new sessions, default to 'generate' mode for production-ready code
        // Otherwise check for generate keywords
        const isGenerateRequest = isNewSession || (chatMode === 'chat' && (
            prompt.toLowerCase().includes('build') ||
            prompt.toLowerCase().includes('generate') ||
            prompt.toLowerCase().includes('create') ||
            prompt.toLowerCase().includes('make') ||
            prompt.toLowerCase().includes('design')
        ));
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
        // For new sessions, only include the welcome message to ensure fresh start
        const conversationHistory = isNewSession
            ? [{ role: 'ai' as const, content: 'Hello! I\'m Ryze. Describe the UI you want to build and I\'ll generate production-ready React + Tailwind CSS code. Try saying "Create a landing page" or "Build a dashboard".' }]
            : messages.map((m) => ({
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
            // Pass existing code context so the AI can reason about modifications
            const existingCodeContext = generatedCode || (Object.keys(allGeneratedFiles).length > 0
                ? JSON.stringify(allGeneratedFiles)
                : undefined);

            await streamChat({
                prompt,
                mode: orchestrationMode,
                provider: selectedModel.provider,
                model: selectedModel.id,
                conversationHistory,
                webSearchContext,
                existingCode: existingCodeContext,
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

                onQuestions: (questionsData) => {
                    const questions: PlanQuestion[] = (questionsData.questions || []).map((q: PlanQuestion) => ({
                        id: q.id,
                        question: q.question,
                        options: [...q.options, ''], // 4th slot for custom input
                    }));
                    setPlanQuestions(questions);
                    setIsAnsweringQuestions(true);
                    // Replace the thinking placeholder with the questions message
                    setMessages((m) => {
                        const updated = [...m];
                        const idx = streamMsgIndex.current;
                        if (idx >= 0 && idx < updated.length) {
                            updated[idx] = {
                                ...updated[idx],
                                content: 'I have a few questions to create the best plan for you:',
                                isThinking: false,
                                isPlanQuestions: true,
                                questions,
                            };
                        }
                        return updated;
                    });
                },

                onPlanReady: (plan) => {
                    setPlanData(plan);
                    setMessages((m) => [...m, {
                        role: 'ai',
                        content: '',
                        isPlanReady: true,
                        plan,
                    }]);
                },

                onCode: (code) => {
                    const codeStr = typeof code === 'string' ? code : JSON.stringify(code, null, 2);

                    // Track previous code for diff view
                    if (generatedCode && !previousCode) {
                        setPreviousCode(generatedCode);
                    } else if (generatedCode && previousCode !== generatedCode) {
                        setPreviousCode(generatedCode);
                    }

                    setGeneratedCode(codeStr);
                    setActiveTab('preview');
                    // Commit message will be added in onDone when we know full file count
                },

                onInstall: (statuses) => {
                    setImplementationStatus((prev) => prev ? { ...prev, installingLibraries: statuses, phase: 'installing' } : null);
                },

                onFileUpdate: (statuses) => {
                    setImplementationStatus((prev) => prev ? { ...prev, fileUpdates: statuses, phase: 'creating' } : null);
                    // Store completed files and show latest in preview
                    const completedFiles = statuses.filter((s: FileUpdateStatus) => s.status === 'completed' && s.code);
                    if (completedFiles.length > 0) {
                        const newFiles: Record<string, string> = {};
                        completedFiles.forEach((f: FileUpdateStatus) => { newFiles[f.path] = f.code!; });
                        setAllGeneratedFiles((prev) => ({ ...prev, ...newFiles }));
                        const latestFile = completedFiles[completedFiles.length - 1];
                        setCurrentPreviewFile(latestFile.code!);
                        setActiveTab('preview');
                    }
                },

                onTodo: (todos) => {
                    setImplementationStatus((prev) => ({
                        phase: prev?.phase || 'creating',
                        todos,
                        installingLibraries: prev?.installingLibraries || [],
                        fileUpdates: prev?.fileUpdates || [],
                        currentFileIndex: prev?.currentFileIndex || 0,
                    }));
                },

                onCommand: (result) => {
                    // Display command execution result in the thinking steps
                    const commandOutput = `$ ${result.command}\n${result.formatted || result.stdout || result.error || ''}`;
                    setThinkingSteps((s) => [...s, commandOutput]);

                    // Also append to the streaming message for visibility
                    if (result.formatted) {
                        streamingMessageRef.current += `\n\n\`\`\`bash\n${result.formatted}\n\`\`\`\n`;
                        const currentText = streamingMessageRef.current;
                        setMessages((m) => {
                            const updated = [...m];
                            const idx = streamMsgIndex.current;
                            if (idx >= 0 && idx < updated.length) {
                                updated[idx] = { ...updated[idx], content: currentText };
                            }
                            return updated;
                        });
                    }
                },

                onLogAnalysis: (analysis) => {
                    // Display log analysis in the streaming message
                    if (analysis.analysis) {
                        streamingMessageRef.current += `\n\n### 📊 Log Analysis\n\n${analysis.analysis}\n`;
                        const currentText = streamingMessageRef.current;
                        setMessages((m) => {
                            const updated = [...m];
                            const idx = streamMsgIndex.current;
                            if (idx >= 0 && idx < updated.length) {
                                updated[idx] = { ...updated[idx], content: currentText };
                            }
                            return updated;
                        });
                    }
                },

                onError: (error) => {
                    toast.error("AI Error", { description: error });
                },

                onDone: (meta) => {
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

                        // Handle multi-file project structure
                        const allFiles: Record<string, string> = meta.all_files || {};
                        if (Object.keys(allFiles).length > 0) {
                            setAllGeneratedFiles((prev) => ({ ...prev, ...allFiles }));
                        }

                        // Add commit-type message showing file changes
                        const isUpdate = !!generatedCode && generatedCode !== (typeof meta.all_files === 'object' ? '' : generatedCode);
                        const filesForTree = Object.keys(allFiles).length > 0 ? allFiles : undefined;
                        const codeForSave = generatedCode || '';
                        const fileTree = buildFileTree(codeForSave, filesForTree);
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
                            content: `Generated ${flatFiles.length} files`,
                            isCommit: true,
                            files: flatFiles,
                        }]);

                        // Save or update the project
                        const saveCode = Object.keys(allFiles).length > 0
                            ? JSON.stringify(allFiles)
                            : codeForSave;
                        if (projectId) {
                            updateProject(projectId, { code_json: saveCode, description: prompt }).catch(() => { });
                        } else {
                            createProject(prompt, {
                                code: saveCode,
                                provider: selectedModel.provider,
                                model: selectedModel.id,
                            }).then((project) => {
                                migrateSessionToProject(project.id);
                                setProjectId(project.id);
                            }).catch(() => { });
                        }
                    }

                    // Handle plan_implement completion
                    if (meta?.mode === 'plan_implement' && meta?.success) {
                        setIsImplementing(false);
                        setImplementationStatus((prev) => prev ? { ...prev, phase: 'done' } : null);
                        if (meta.all_files) {
                            setAllGeneratedFiles((prev) => ({ ...prev, ...meta.all_files }));
                        }
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
    }, [input, generating, searchParams, chatMode, selectedModel, messages, generatedCode, previousCode, projectId, migrateSessionToProject, allGeneratedFiles, webSearchEnabled]);

    // Set the handleSend ref for auto-sending from Dashboard
    useEffect(() => {
        handleSendRef.current = handleSend;
    }, [handleSend]);

    // Handle submitting answers to plan questions
    const handleSubmitAnswers = async () => {
        if (!planQuestions.length) return;

        // Build answers from selected options
        const answers = planQuestions.map((q) => {
            let answer = '';
            if (q.selectedOption !== undefined && q.selectedOption < 3) {
                answer = q.options[q.selectedOption];
            } else if (q.customAnswer) {
                answer = q.customAnswer;
            } else {
                answer = q.options[0]; // default to first option
            }
            return { question: q.question, answer };
        });

        setIsAnsweringQuestions(false);

        // Add a message showing the user's answers
        const answersText = answers.map((a) => `**${a.question}**\n→ ${a.answer}`).join('\n\n');
        setMessages((m) => [...m, {
            role: 'user',
            content: answersText,
        }]);

        // Get the original prompt from the first user message
        const originalPrompt = messages.find((m) => m.role === 'user')?.content?.replace('[Plan] ', '') || '';

        setGenerating(true);
        setThinkingSteps([]);
        setThinkingOpen(true);

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const streamMsgIndex = { current: -1 };
        setMessages((m) => {
            streamMsgIndex.current = m.length;
            return [...m, { role: 'ai' as const, content: '', isThinking: true }];
        });

        try {
            await streamChat({
                prompt: originalPrompt,
                mode: 'plan_interactive',
                provider: selectedModel.provider,
                model: selectedModel.id,
                planAnswers: answers,
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

                onPlanReady: (plan) => {
                    setPlanData(plan);
                    // Replace thinking with plan-ready message
                    setMessages((m) => {
                        const updated = [...m];
                        const idx = streamMsgIndex.current;
                        if (idx >= 0 && idx < updated.length) {
                            updated[idx] = {
                                ...updated[idx],
                                content: '',
                                isThinking: false,
                                isPlanReady: true,
                                plan,
                            };
                        }
                        return updated;
                    });
                },

                onCommand: (result) => {
                    const commandOutput = `$ ${result.command}\n${result.formatted || result.stdout || result.error || ''}`;
                    setThinkingSteps((s) => [...s, commandOutput]);
                },

                onLogAnalysis: (analysis) => {
                    if (analysis.analysis) {
                        streamingMessageRef.current += `\n\n### 📊 Log Analysis\n\n${analysis.analysis}\n`;
                        const currentText = streamingMessageRef.current;
                        setMessages((m) => {
                            const updated = [...m];
                            const idx = streamMsgIndex.current;
                            if (idx >= 0 && idx < updated.length) {
                                updated[idx] = { ...updated[idx], content: currentText };
                            }
                            return updated;
                        });
                    }
                },

                onError: (error) => {
                    toast.error("AI Error", { description: error });
                },

                onDone: () => { },
            });
        } catch (error: unknown) {
            if ((error as Error).name !== 'AbortError') {
                toast.error("Plan generation failed");
            }
        } finally {
            setGenerating(false);
            setThinkingOpen(false);
        }
    };

    // Handle implementing the plan
    const handleImplementPlan = async () => {
        if (!planData) return;

        // Transition from Plan Mode to Build Mode
        setChatMode('chat');

        setIsImplementing(true);
        setGenerating(true);
        setThinkingSteps([]);
        setThinkingOpen(true);

        // Initialize implementation status
        setImplementationStatus({
            phase: 'installing',
            todos: planData.steps.map((step, i) => ({
                id: `step-${i}`,
                label: step,
                status: 'pending' as const,
            })),
            installingLibraries: planData.libraries.map((lib) => ({
                name: lib,
                status: 'pending' as const,
            })),
            fileUpdates: planData.files.map((f) => ({
                path: f.path,
                name: f.name,
                status: 'pending' as const,
            })),
            currentFileIndex: 0,
        });

        // Add implementing message
        setMessages((m) => [...m, {
            role: 'ai',
            content: 'Starting implementation...',
            isImplementing: true,
        }]);

        const originalPrompt = messages.find((m) => m.role === 'user')?.content?.replace('[Plan] ', '') || '';

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            await streamChat({
                prompt: originalPrompt,
                mode: 'plan_implement',
                provider: selectedModel.provider,
                model: selectedModel.id,
                planData,
                signal: abortController.signal,

                onStep: (step) => {
                    setThinkingSteps((s) => [...s, step]);
                },

                onInstall: (statuses) => {
                    setImplementationStatus((prev) => prev ? { ...prev, installingLibraries: statuses, phase: 'installing' } : null);
                },

                onFileUpdate: (statuses) => {
                    setImplementationStatus((prev) => prev ? { ...prev, fileUpdates: statuses, phase: 'creating' } : null);
                    const completedFiles = statuses.filter((s: FileUpdateStatus) => s.status === 'completed' && s.code);
                    if (completedFiles.length > 0) {
                        const newFiles: Record<string, string> = {};
                        completedFiles.forEach((f: FileUpdateStatus) => { newFiles[f.path] = f.code!; });
                        setAllGeneratedFiles((prev) => ({ ...prev, ...newFiles }));
                        const latestFile = completedFiles[completedFiles.length - 1];
                        setCurrentPreviewFile(latestFile.code);
                        setActiveTab('preview');
                    }
                },

                onTodo: (todos) => {
                    setImplementationStatus((prev) => ({
                        phase: prev?.phase || 'creating',
                        todos,
                        installingLibraries: prev?.installingLibraries || [],
                        fileUpdates: prev?.fileUpdates || [],
                        currentFileIndex: prev?.currentFileIndex || 0,
                    }));
                },

                onCommand: (result) => {
                    const commandOutput = `$ ${result.command}\n${result.formatted || result.stdout || result.error || ''}`;
                    setThinkingSteps((s) => [...s, commandOutput]);
                },

                onLogAnalysis: (analysis) => {
                    if (analysis.analysis) {
                        // Add log analysis as a thinking step for plan_implement
                        setThinkingSteps((s) => [...s, `📊 Log Analysis: ${analysis.analysis}`]);
                    }
                },

                onCode: (code) => {
                    const codeStr = typeof code === 'string' ? code : JSON.stringify(code, null, 2);
                    if (generatedCode && previousCode !== generatedCode) {
                        setPreviousCode(generatedCode);
                    }
                    setGeneratedCode(codeStr);
                    setActiveTab('preview');
                },

                onError: (error) => {
                    toast.error("Implementation Error", { description: error });
                },

                onDone: (meta) => {
                    setIsImplementing(false);
                    setImplementationStatus((prev) => prev ? { ...prev, phase: 'done' } : null);

                    if (meta?.success) {
                        // Store all generated files
                        const allFiles: Record<string, string> = meta.all_files || {};
                        if (Object.keys(allFiles).length > 0) {
                            setAllGeneratedFiles((prev) => ({ ...prev, ...allFiles }));
                        }

                        // Add commit summary message
                        const fileList = Object.keys(allFiles).map((path) => ({
                            name: path.split('/').pop() || path,
                            path,
                            status: 'added' as const,
                        }));

                        setMessages((m) => [...m, {
                            role: 'ai',
                            content: `Implementation complete! Created ${meta.files_generated || fileList.length} files`,
                            isCommit: true,
                            files: fileList,
                        }]);

                        // Save project
                        const mainCode = generatedCode || String(Object.values(allFiles)[0] || '');
                        if (mainCode) {
                            if (projectId) {
                                updateProject(projectId, { code_json: mainCode }).catch(() => { });
                            } else {
                                createProject(originalPrompt, {
                                    code: mainCode,
                                    provider: selectedModel.provider,
                                    model: selectedModel.id,
                                }).then((project) => {
                                    // Migrate localStorage from sessionId to projectId
                                    migrateSessionToProject(project.id);
                                    setProjectId(project.id);
                                }).catch(() => { });
                            }
                        }
                    }
                },
            });
        } catch (error: unknown) {
            if ((error as Error).name !== 'AbortError') {
                toast.error("Implementation failed");
            }
        } finally {
            setGenerating(false);
            setThinkingOpen(false);
            setIsImplementing(false);
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

    const handleFixError = () => {
        if (!previewError) return;

        setErrorModalOpen(false);

        // Extract the specific error (e.g., "Header is not defined")
        const errorMatch = previewError.message.match(/(\w+) is not defined/);
        const componentName = errorMatch ? errorMatch[1] : 'component';

        // Create a fix prompt
        const fixPrompt = `Fix this error in the generated code: "${previewError.message}".

The component "${componentName}" is being used but not defined. Please:
1. Define the ${componentName} component inline in the same file
2. Or use lowercase HTML elements instead (e.g., <${componentName.toLowerCase()}> instead of <${componentName} />)
3. Make sure all custom components are self-contained in a single file

Current error details:
${previewError.stack || previewError.message}`;

        // Populate the prompt input and trigger send
        if (handleSendRef.current) {
            handleSendRef.current(fixPrompt);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background overflow-hidden font-sans">
            {/* Main Content */}
            <div className="flex-1 flex min-h-0 bg-secondary/10">
                {/* Chat Panel */}
                <div className={`${chatCollapsed ? 'w-12' : 'w-[440px]'} border-r border-border flex flex-col min-h-0 bg-background/50 backdrop-blur-sm transition-all duration-300`}>
                    {/* Header with mode badge */}
                    <div className="flex items-center justify-between px-4 h-10 border-b border-border shrink-0">
                        {chatCollapsed ? (
                            <button onClick={() => setChatCollapsed(false)} className="text-muted-foreground hover:text-foreground transition-colors mx-auto" title="Expand chat">
                                <ChevronDown className="h-4 w-4 rotate-90" />
                            </button>
                        ) : (
                            <>
                                {/* Mode Badge */}
                                <div className="flex items-center gap-2">
                                    <motion.div
                                        key={chatMode}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${chatMode === 'plan'
                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            }`}
                                    >
                                        {chatMode === 'plan' ? (
                                            <Lightbulb className="h-3 w-3" />
                                        ) : (
                                            <Rocket className="h-3 w-3" />
                                        )}
                                        {chatMode === 'plan' ? 'Plan Mode' : 'Build Mode'}
                                    </motion.div>

                                    {/* Web Search Badge */}
                                    {webSearchEnabled && (
                                        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-blue-500/10 text-blue-400 border-blue-500/20">
                                            <Globe className="h-3 w-3" />
                                            Web
                                        </div>
                                    )}

                                    {/* Model Badge */}
                                    <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border bg-white/5 text-muted-foreground border-border/50 max-w-[120px]">
                                        <Sparkles className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{selectedModel?.name || 'Model'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Archive current chat and start new? (Previous chat will be saved)')) {
                                                const currentContextId = getContextId();

                                                // Archive current conversation
                                                const timestamp = new Date().toISOString();
                                                const archiveKey = `ryze-chat-archive-${timestamp}`;
                                                const archive = {
                                                    messages,
                                                    code: generatedCode,
                                                    projectName,
                                                    timestamp,
                                                    contextId: currentContextId,
                                                };
                                                localStorage.setItem(archiveKey, JSON.stringify(archive));

                                                // Get list of archives
                                                const archives = JSON.parse(localStorage.getItem('ryze-chat-archives-list') || '[]');
                                                archives.push({ key: archiveKey, timestamp, projectName, contextId: currentContextId });
                                                localStorage.setItem('ryze-chat-archives-list', JSON.stringify(archives));

                                                // Clear project-specific localStorage
                                                localStorage.removeItem(`ryze-chat-history-${currentContextId}`);
                                                localStorage.removeItem(`ryze-generated-code-${currentContextId}`);
                                                localStorage.removeItem(`ryze-project-name-${currentContextId}`);

                                                // Generate new session ID for fresh start
                                                const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                                                setSessionId(newSessionId);
                                                setProjectId('');

                                                // Reset current chat
                                                setMessages([{ role: 'ai', content: 'Hello! I\'m Ryze. Describe the UI you want to build and I\'ll generate production-ready React + Tailwind CSS code. Try saying "Create a landing page" or "Build a dashboard".' }]);
                                                setGeneratedCode('');
                                                setEditableCode('');
                                                setAllGeneratedFiles({});
                                                setPlanData(null);
                                                setPlanQuestions([]);
                                                setProjectName('Untitled Project');
                                                toast.success('Chat archived! Starting fresh.');
                                            }
                                        }}
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                        title="Archive and start new chat"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            // Load archives list
                                            const archives = JSON.parse(localStorage.getItem('ryze-chat-archives-list') || '[]');
                                            setArchivedChats(archives);
                                            setHistorySource('archives');
                                            setArchivesModalOpen(true);
                                        }}
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                        title="View archived chats"
                                    >
                                        <FolderOpen className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => setChatCollapsed(true)} className="text-muted-foreground hover:text-foreground transition-colors" title="Collapse chat">
                                        <ChevronDown className="h-4 w-4 -rotate-90" />
                                    </button>
                                </div>
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
                                                                        // Look up content from allGeneratedFiles first, then from file tree
                                                                        if (allGeneratedFiles[file.path]) {
                                                                            setViewingFileContent(allGeneratedFiles[file.path]);
                                                                        } else {
                                                                            const tree = buildFileTree(generatedCode, Object.keys(allGeneratedFiles).length > 0 ? allGeneratedFiles : undefined);
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
                                                                        }
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

                                            ) : msg.isPlanQuestions ? (
                                                /* Plan Questions UI */
                                                <div className="w-full">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="h-7 w-7 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                                            <Lightbulb className="h-4 w-4 text-amber-400" />
                                                        </div>
                                                        <span className="text-sm font-semibold text-foreground">{msg.content}</span>
                                                    </div>
                                                    <div className="space-y-4 ml-2">
                                                        {(msg.questions || planQuestions).map((q, qIdx) => (
                                                            <motion.div
                                                                key={q.id}
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                transition={{ delay: qIdx * 0.1 }}
                                                                className="glass rounded-xl p-3 border border-white/5"
                                                            >
                                                                <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                                                                    <Hash className="h-3 w-3 text-amber-400" />
                                                                    {q.question}
                                                                </p>
                                                                <div className="space-y-1.5">
                                                                    {q.options.slice(0, 3).map((option, optIdx) => (
                                                                        <button
                                                                            key={optIdx}
                                                                            onClick={() => {
                                                                                setPlanQuestions((prev) =>
                                                                                    prev.map((pq) =>
                                                                                        pq.id === q.id
                                                                                            ? { ...pq, selectedOption: optIdx, customAnswer: undefined }
                                                                                            : pq
                                                                                    )
                                                                                );
                                                                            }}
                                                                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-left transition-all ${planQuestions.find((pq) => pq.id === q.id)?.selectedOption === optIdx
                                                                                ? 'bg-primary/15 text-primary border border-primary/30 shadow-sm'
                                                                                : 'bg-secondary/30 text-muted-foreground hover:bg-secondary/60 hover:text-foreground border border-transparent'
                                                                                }`}
                                                                        >
                                                                            <div className={`h-3.5 w-3.5 rounded-full border-2 shrink-0 flex items-center justify-center ${planQuestions.find((pq) => pq.id === q.id)?.selectedOption === optIdx
                                                                                ? 'border-primary'
                                                                                : 'border-muted-foreground/30'
                                                                                }`}>
                                                                                {planQuestions.find((pq) => pq.id === q.id)?.selectedOption === optIdx && (
                                                                                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                                                )}
                                                                            </div>
                                                                            {option}
                                                                        </button>
                                                                    ))}
                                                                    {/* Custom input option (4th) */}
                                                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${planQuestions.find((pq) => pq.id === q.id)?.selectedOption === 3
                                                                        ? 'bg-primary/15 border border-primary/30'
                                                                        : 'bg-secondary/30 border border-transparent'
                                                                        }`}>
                                                                        <button
                                                                            onClick={() => {
                                                                                setPlanQuestions((prev) =>
                                                                                    prev.map((pq) =>
                                                                                        pq.id === q.id
                                                                                            ? { ...pq, selectedOption: 3 }
                                                                                            : pq
                                                                                    )
                                                                                );
                                                                            }}
                                                                            className="shrink-0"
                                                                        >
                                                                            <div className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center ${planQuestions.find((pq) => pq.id === q.id)?.selectedOption === 3
                                                                                ? 'border-primary'
                                                                                : 'border-muted-foreground/30'
                                                                                }`}>
                                                                                {planQuestions.find((pq) => pq.id === q.id)?.selectedOption === 3 && (
                                                                                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                                                )}
                                                                            </div>
                                                                        </button>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Your own answer..."
                                                                            value={planQuestions.find((pq) => pq.id === q.id)?.customAnswer || ''}
                                                                            onFocus={() => {
                                                                                setPlanQuestions((prev) =>
                                                                                    prev.map((pq) =>
                                                                                        pq.id === q.id
                                                                                            ? { ...pq, selectedOption: 3 }
                                                                                            : pq
                                                                                    )
                                                                                );
                                                                            }}
                                                                            onChange={(e) => {
                                                                                setPlanQuestions((prev) =>
                                                                                    prev.map((pq) =>
                                                                                        pq.id === q.id
                                                                                            ? { ...pq, customAnswer: e.target.value, selectedOption: 3 }
                                                                                            : pq
                                                                                    )
                                                                                );
                                                                            }}
                                                                            className="flex-1 bg-transparent border-0 text-[11px] text-foreground placeholder:text-muted-foreground/50 outline-none"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                    {isAnsweringQuestions && (
                                                        <motion.button
                                                            initial={{ opacity: 0, y: 5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: 0.3 }}
                                                            onClick={handleSubmitAnswers}
                                                            disabled={generating}
                                                            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                                                        >
                                                            <Sparkles className="h-4 w-4" />
                                                            Generate Plan
                                                        </motion.button>
                                                    )}
                                                </div>

                                            ) : msg.isPlanReady && msg.plan ? (
                                                /* Plan Display with Implement Button */
                                                <div className="w-full">
                                                    <div className="glass rounded-xl border border-primary/20 overflow-hidden">
                                                        {/* Plan Header */}
                                                        <div className="px-4 py-3 border-b border-white/5 bg-primary/5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                                                                    <ListTodo className="h-4 w-4 text-primary" />
                                                                </div>
                                                                <div>
                                                                    <h3 className="text-sm font-bold text-foreground">{msg.plan.title}</h3>
                                                                    <p className="text-[10px] text-muted-foreground">{msg.plan.description}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Files List */}
                                                        <div className="px-4 py-3 border-b border-white/5">
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Files to create</p>
                                                            <div className="space-y-1">
                                                                {msg.plan.files.map((file, fIdx) => (
                                                                    <motion.div
                                                                        key={file.path}
                                                                        initial={{ opacity: 0, x: -10 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        transition={{ delay: fIdx * 0.05 }}
                                                                        className="flex items-center gap-2 px-2 py-1 rounded-md text-[11px] font-mono bg-secondary/20"
                                                                    >
                                                                        <FileCode className={`h-3 w-3 shrink-0 ${file.name.endsWith('.tsx') || file.name.endsWith('.ts') ? 'text-blue-400' : file.name.endsWith('.css') ? 'text-pink-400' : 'text-muted-foreground'}`} />
                                                                        <span className="text-foreground">{file.path}</span>
                                                                        <span className="text-muted-foreground/50 ml-auto text-[9px] truncate max-w-[120px]">{file.description}</span>
                                                                    </motion.div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Skills */}
                                                        {msg.plan.skills && msg.plan.skills.length > 0 && (
                                                            <div className="px-4 py-3 border-b border-white/5">
                                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">AI Skills</p>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {msg.plan.skills.map((skill) => (
                                                                        <span key={skill.id} className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                                                                            <Sparkles className="h-2.5 w-2.5" />
                                                                            {skill.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Steps */}
                                                        <div className="px-4 py-3 border-b border-white/5">
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Implementation Steps</p>
                                                            <div className="space-y-1.5">
                                                                {msg.plan.steps.map((step, sIdx) => (
                                                                    <div key={sIdx} className="flex items-start gap-2 text-[11px]">
                                                                        <span className="h-4 w-4 rounded-full bg-secondary/50 flex items-center justify-center shrink-0 text-[9px] font-bold text-muted-foreground mt-0.5">
                                                                            {sIdx + 1}
                                                                        </span>
                                                                        <span className="text-muted-foreground">{step}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Libraries */}
                                                        {msg.plan.libraries && msg.plan.libraries.length > 0 && (
                                                            <div className="px-4 py-3 border-b border-white/5">
                                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Dependencies</p>
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {msg.plan.libraries.map((lib) => (
                                                                        <span key={lib} className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono bg-secondary/40 text-muted-foreground border border-white/5">
                                                                            <Package className="h-2.5 w-2.5" />
                                                                            {lib}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Implement Button */}
                                                        <div className="px-4 py-3">
                                                            <button
                                                                onClick={handleImplementPlan}
                                                                disabled={isImplementing || generating}
                                                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-sm font-bold hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {isImplementing ? (
                                                                    <>
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                        Implementing...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Rocket className="h-4 w-4" />
                                                                        Implement Plan
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                            ) : msg.isImplementing ? (
                                                /* Implementation Status */
                                                <div className="w-full">
                                                    {implementationStatus && (
                                                        <div className="glass rounded-xl border border-primary/10 overflow-hidden">
                                                            {/* Implementation Header */}
                                                            <div className="px-4 py-2.5 border-b border-white/5 bg-primary/5 flex items-center gap-2">
                                                                {implementationStatus.phase === 'done' ? (
                                                                    <CheckCircle className="h-4 w-4 text-success" />
                                                                ) : (
                                                                    <Loader2 className="h-4 w-4 text-primary animate-spin" />
                                                                )}
                                                                <span className="text-xs font-semibold text-foreground">
                                                                    {implementationStatus.phase === 'installing' ? 'Installing dependencies...' :
                                                                        implementationStatus.phase === 'creating' ? 'Creating files...' :
                                                                            'Implementation complete!'}
                                                                </span>
                                                            </div>

                                                            {/* Todo List */}
                                                            {implementationStatus.todos.length > 0 && (
                                                                <div className="px-4 py-2.5 border-b border-white/5">
                                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Progress</p>
                                                                    <div className="space-y-1">
                                                                        {implementationStatus.todos.map((todo) => (
                                                                            <div key={todo.id} className="flex items-center gap-2 text-[11px]">
                                                                                {todo.status === 'completed' ? (
                                                                                    <CircleCheck className="h-3.5 w-3.5 text-success shrink-0" />
                                                                                ) : todo.status === 'in_progress' ? (
                                                                                    <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                                                                                ) : (
                                                                                    <CircleDot className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />
                                                                                )}
                                                                                <span className={todo.status === 'completed' ? 'text-success/80 line-through' : todo.status === 'in_progress' ? 'text-primary font-medium' : 'text-muted-foreground'}>
                                                                                    {todo.label}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Library Installation */}
                                                            {implementationStatus.installingLibraries.length > 0 && (
                                                                <div className="px-4 py-2.5 border-b border-white/5">
                                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                                                                        <Terminal className="h-3 w-3" />
                                                                        Dependencies
                                                                    </p>
                                                                    <div className="space-y-1">
                                                                        {implementationStatus.installingLibraries.map((lib) => (
                                                                            <div key={lib.name} className="flex items-center gap-2 text-[11px] font-mono">
                                                                                {lib.status === 'installed' ? (
                                                                                    <Check className="h-3 w-3 text-success shrink-0" />
                                                                                ) : lib.status === 'installing' ? (
                                                                                    <Loader2 className="h-3 w-3 text-amber-400 animate-spin shrink-0" />
                                                                                ) : (
                                                                                    <Package className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                                                                                )}
                                                                                <span className={lib.status === 'installed' ? 'text-success/80' : lib.status === 'installing' ? 'text-amber-400' : 'text-muted-foreground/50'}>
                                                                                    {lib.name}
                                                                                </span>
                                                                                {lib.status === 'installing' && (
                                                                                    <motion.div
                                                                                        className="ml-auto h-1 w-12 bg-secondary/50 rounded-full overflow-hidden"
                                                                                        initial={{ opacity: 0 }}
                                                                                        animate={{ opacity: 1 }}
                                                                                    >
                                                                                        <motion.div
                                                                                            className="h-full bg-amber-400 rounded-full"
                                                                                            initial={{ width: '0%' }}
                                                                                            animate={{ width: '100%' }}
                                                                                            transition={{ duration: 0.5 }}
                                                                                        />
                                                                                    </motion.div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* File Updates */}
                                                            {implementationStatus.fileUpdates.length > 0 && (
                                                                <div className="px-4 py-2.5">
                                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                                                                        <FolderOpen className="h-3 w-3" />
                                                                        Files
                                                                    </p>
                                                                    <div className="space-y-1">
                                                                        {implementationStatus.fileUpdates.map((file) => (
                                                                            <div key={file.path} className="flex items-center gap-2 text-[11px] font-mono">
                                                                                {file.status === 'completed' ? (
                                                                                    <Check className="h-3 w-3 text-success shrink-0" />
                                                                                ) : file.status === 'writing' ? (
                                                                                    <Loader2 className="h-3 w-3 text-blue-400 animate-spin shrink-0" />
                                                                                ) : (
                                                                                    <FileCode className="h-3 w-3 text-muted-foreground/30 shrink-0" />
                                                                                )}
                                                                                <span className={file.status === 'completed' ? 'text-foreground' : file.status === 'writing' ? 'text-blue-400' : 'text-muted-foreground/50'}>
                                                                                    {file.path}
                                                                                </span>
                                                                                {file.status === 'writing' && (
                                                                                    <motion.div
                                                                                        className="ml-auto flex gap-0.5"
                                                                                        initial={{ opacity: 0 }}
                                                                                        animate={{ opacity: 1 }}
                                                                                    >
                                                                                        {[0, 1, 2].map((dotI) => (
                                                                                            <motion.span
                                                                                                key={dotI}
                                                                                                className="h-1 w-1 rounded-full bg-blue-400"
                                                                                                animate={{ opacity: [0.3, 1, 0.3] }}
                                                                                                transition={{ repeat: Infinity, duration: 0.8, delay: dotI * 0.2 }}
                                                                                            />
                                                                                        ))}
                                                                                    </motion.div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
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
                                    onSend={(msg, mode, options) => {
                                        if (mode === 'plan') setChatMode('plan');
                                        else setChatMode('chat');
                                        if (options?.webSearch !== undefined) setWebSearchEnabled(options.webSearch);
                                        handleSend(msg);
                                    }}
                                    onModeChange={(mode) => setChatMode(mode === 'plan' ? 'plan' : 'chat')}
                                    onWebSearchChange={(enabled) => setWebSearchEnabled(enabled)}
                                    placeholder={chatMode === 'plan' ? 'Ask for architectural advice...' : 'Describe what you want to build...'}
                                    className="bg-secondary/30 border-border/50"
                                    showModelSelector={true}
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
                                    {chatMode === 'plan' ? 'Plan mode' : 'Build mode'} · {selectedModel?.name || 'AI'}{webSearchEnabled ? ' · Web search on' : ''}
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Preview / Code Panel */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Tabs + toolbar */}
                    <div className="flex items-center justify-between px-4 h-10 border-b border-border shrink-0 bg-background/50">
                        <div className="flex items-center gap-1">
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
                                    className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${disabled ? 'opacity-40 cursor-not-allowed' : activeTab === key ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                                        }`}
                                >
                                    <Icon className="h-3 w-3" /> {label}
                                    {key === 'preview' && previewError && (
                                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive animate-pulse" title="Preview has errors" />
                                    )}
                                </button>
                            ))}

                            {/* Route search + reload + open in new tab (visible on preview tab) */}
                            {activeTab === 'preview' && (generatedCode || Object.keys(allGeneratedFiles).length > 0) && (
                                <>
                                    <div className="h-4 w-px bg-border mx-1.5" />
                                    <div ref={routeSearchRef} className="relative">
                                        <button
                                            onClick={() => setRouteSearchOpen(!routeSearchOpen)}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-mono rounded-md bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-all border border-border/50 min-w-[160px] max-w-[280px]"
                                        >
                                            <Search className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                                            <span className="truncate">
                                                {previewRoute
                                                    ? `/${previewRoute}`
                                                    : Object.keys(allGeneratedFiles).length > 0
                                                        ? `/${Object.keys(allGeneratedFiles)[0] || ''}`
                                                        : '/index'}
                                            </span>
                                            <ChevronDown className={`h-3 w-3 shrink-0 ml-auto transition-transform ${routeSearchOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {routeSearchOpen && (
                                            <div className="absolute top-full left-0 mt-1 w-72 bg-background border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                                                <div className="p-2 border-b border-border">
                                                    <input
                                                        type="text"
                                                        placeholder="Search routes..."
                                                        value={routeSearchQuery}
                                                        onChange={(e) => setRouteSearchQuery(e.target.value)}
                                                        className="w-full px-2.5 py-1.5 text-[11px] font-mono bg-secondary/30 border border-border/50 rounded-md outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground/50"
                                                        autoFocus
                                                    />
                                                </div>
                                                <div className="max-h-48 overflow-y-auto py-1">
                                                    {/* Default main preview */}
                                                    {generatedCode && (
                                                        <button
                                                            onClick={() => {
                                                                setPreviewRoute('');
                                                                setRouteSearchOpen(false);
                                                                setRouteSearchQuery('');
                                                            }}
                                                            className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono hover:bg-secondary/50 transition-colors text-left ${!previewRoute ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                                                        >
                                                            <Eye className="h-3 w-3 shrink-0" />
                                                            <span>/index (main)</span>
                                                        </button>
                                                    )}
                                                    {/* Generated file routes */}
                                                    {Object.keys(allGeneratedFiles)
                                                        .filter(path => path.toLowerCase().includes(routeSearchQuery.toLowerCase()))
                                                        .map((path) => (
                                                            <button
                                                                key={path}
                                                                onClick={() => {
                                                                    setPreviewRoute(path);
                                                                    setRouteSearchOpen(false);
                                                                    setRouteSearchQuery('');
                                                                    setIframeKey(k => k + 1);
                                                                }}
                                                                className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-mono hover:bg-secondary/50 transition-colors text-left ${previewRoute === path ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                                                            >
                                                                <FileCode className={`h-3 w-3 shrink-0 ${path.endsWith('.tsx') || path.endsWith('.ts') ? 'text-blue-400' : path.endsWith('.css') ? 'text-pink-400' : 'text-muted-foreground'}`} />
                                                                <span className="truncate">/{path}</span>
                                                            </button>
                                                        ))}
                                                    {Object.keys(allGeneratedFiles).filter(p => p.toLowerCase().includes(routeSearchQuery.toLowerCase())).length === 0 && !generatedCode && (
                                                        <p className="px-3 py-2 text-[11px] text-muted-foreground/50 text-center">No routes found</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 rounded-md"
                                        onClick={() => setIframeKey(k => k + 1)}
                                        title="Reload preview"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 rounded-md"
                                        onClick={() => {
                                            const previewCode = previewRoute && allGeneratedFiles[previewRoute]
                                                ? allGeneratedFiles[previewRoute]
                                                : generatedCode;
                                            if (previewCode) {
                                                const html = buildPreviewHtml(previewCode, allGeneratedFiles);
                                                const blob = new Blob([html], { type: 'text/html' });
                                                const url = URL.createObjectURL(blob);
                                                window.open(url, '_blank');
                                            }
                                        }}
                                        title="Open in new tab"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </Button>
                                </>
                            )}
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
                                {(generatedCode || (previewRoute && allGeneratedFiles[previewRoute])) ? (
                                    <div className="h-full overflow-hidden bg-white rounded-2xl flex flex-col">
                                        {/* Subtle error banner — click to see details or fix */}
                                        {previewError && (
                                            <button
                                                onClick={() => setErrorModalOpen(true)}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 border-b border-destructive/20 text-destructive text-xs font-medium hover:bg-destructive/15 transition-colors shrink-0 w-full text-left"
                                            >
                                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                                <span className="truncate">{previewError.message}</span>
                                                <span className="ml-auto text-[10px] text-destructive/60 shrink-0">Click to fix</span>
                                            </button>
                                        )}
                                        <iframe
                                            key={iframeKey}
                                            srcDoc={buildPreviewHtml(
                                                previewRoute && allGeneratedFiles[previewRoute]
                                                    ? allGeneratedFiles[previewRoute]
                                                    : generatedCode,
                                                allGeneratedFiles
                                            )}
                                            className="w-full flex-1 border-0 outline-none block"
                                            sandbox="allow-scripts allow-same-origin"
                                            title="Live Preview"
                                        />
                                    </div>
                                ) : isImplementing && currentPreviewFile ? (
                                    /* Live code preview during implementation */
                                    <div className="h-full overflow-auto bg-[#0d1117] rounded-2xl p-4">
                                        <pre className="text-[11px] font-mono text-green-400/90 leading-relaxed whitespace-pre-wrap">
                                            <motion.span
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                key={currentPreviewFile.slice(0, 50)}
                                            >
                                                {currentPreviewFile}
                                            </motion.span>
                                        </pre>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center animate-fade-in">
                                        <div className="text-center group">
                                            <div className="h-16 w-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/10 group-hover:scale-110 transition-transform duration-500">
                                                <Play className="h-8 w-8 text-primary shadow-primary" />
                                            </div>
                                            <p className="text-sm font-semibold text-foreground">Awaiting Generation</p>
                                            <p className="text-[11px] text-muted-foreground/60 mt-1 max-w-[220px]">Describe what you want to build and I&apos;ll generate production-ready React + Tailwind code with a live preview.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'code' && (
                            <div className="glass-strong rounded-2xl overflow-hidden h-full flex shadow-2xl border-white/5">
                                {/* File Tree Sidebar */}
                                {(generatedCode || Object.keys(allGeneratedFiles).length > 0) && (
                                    <div className="w-52 shrink-0 border-r border-white/5 bg-sidebar/60 overflow-y-auto py-2">
                                        <div className="flex items-center gap-1.5 px-3 py-1.5 mb-1">
                                            <FolderTree className="h-3.5 w-3.5 text-primary" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Explorer</span>
                                        </div>
                                        <FileTreeView
                                            files={buildFileTree(generatedCode, Object.keys(allGeneratedFiles).length > 0 ? allGeneratedFiles : undefined)}
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
                                                {viewingFileContent
                                                    || allGeneratedFiles[activeFile]
                                                    || (activeFile === 'src/components/Generated.tsx' ? generatedCode : '')
                                                    || '// Select a file from the tree to view its contents'
                                                }
                                            </pre>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'diff' && previousCode && (
                            <div className="w-full h-full flex flex-col">
                                {/* File routes navigation */}
                                {Object.keys(allGeneratedFiles).length > 0 && (
                                    <div className="flex items-center justify-center gap-1 py-2 px-4 bg-background/80 border-b border-white/5 rounded-t-2xl flex-wrap">
                                        {Object.keys(allGeneratedFiles).map((path) => (
                                            <button
                                                key={path}
                                                onClick={() => setDiffFile(path)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono rounded-md transition-all ${diffFile === path
                                                    ? 'bg-primary/15 text-primary border border-primary/30'
                                                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 border border-transparent'
                                                    }`}
                                            >
                                                <FileCode className={`h-3 w-3 shrink-0 ${path.endsWith('.tsx') || path.endsWith('.ts') ? 'text-blue-400' : path.endsWith('.css') ? 'text-pink-400' : path.endsWith('.json') ? 'text-yellow-400' : 'text-muted-foreground'}`} />
                                                {path.split('/').pop()}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <div className="flex-1">
                                    <CodeComparison
                                        beforeCode={diffFile ? (previousAllFiles[diffFile] || '') : previousCode}
                                        afterCode={diffFile ? (allGeneratedFiles[diffFile] || '') : generatedCode}
                                        language="typescript"
                                        filename={diffFile ? (diffFile.split('/').pop() || 'file') : 'Generated.tsx'}
                                        beforeLabel="Before"
                                        afterLabel="After"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
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

                {/* Error Modal */}
                {errorModalOpen && previewError && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-md px-4"
                        onClick={() => setErrorModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="glass-strong rounded-2xl p-8 w-full max-w-2xl shadow-2xl border-destructive/20"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start gap-4 mb-6">
                                <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center border border-destructive/20 shrink-0">
                                    <AlertTriangle className="h-6 w-6 text-destructive" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold text-foreground">Preview Error Detected</h3>
                                    <p className="text-xs text-muted-foreground mt-1">The AI-generated code has a runtime error that needs to be fixed.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Error Message */}
                                <div className="glass rounded-xl p-4 border border-destructive/20 bg-destructive/5">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Error Message</p>
                                    <p className="text-sm font-mono text-destructive break-words">{previewError.message}</p>
                                </div>

                                {/* Stack Trace (if available) */}
                                {previewError.stack && (
                                    <div className="glass rounded-xl p-4 border border-border/50 bg-secondary/10 max-h-48 overflow-auto">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Stack Trace</p>
                                        <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap break-words">{previewError.stack}</pre>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-2">
                                    <Button
                                        variant="default"
                                        className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/20"
                                        onClick={handleFixError}
                                    >
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Fix Error with AI
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setErrorModalOpen(false)}
                                    >
                                        Close
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-6 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                                <p className="text-[11px] leading-relaxed text-muted-foreground">
                                    <strong className="text-amber-500">Tip:</strong> The AI will analyze the error and regenerate the code with the fix applied. You can also manually edit the code in the Code tab.
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* Archives Modal */}
                {archivesModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/60 backdrop-blur-md px-4"
                        onClick={() => setArchivesModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="glass-strong rounded-2xl p-8 w-full max-w-2xl shadow-2xl border-primary/10 max-h-[80vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-start gap-4 mb-6">
                                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                                    {historySource === 'projects' ? (
                                        <Clock className="h-6 w-6 text-primary" />
                                    ) : (
                                        <FolderOpen className="h-6 w-6 text-primary" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-bold text-foreground">
                                        {historySource === 'projects' ? 'Project History' : 'Archived Conversations'}
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {historySource === 'projects' ? 'Load a previous project' : 'Restore a previous chat session'}
                                    </p>
                                </div>
                            </div>

                            {archivedChats.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center py-12">
                                    <div className="text-center">
                                        {historySource === 'projects' ? (
                                            <Clock className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                                        ) : (
                                            <FolderOpen className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                                        )}
                                        <p className="text-sm text-muted-foreground">
                                            {historySource === 'projects' ? 'No projects yet' : 'No archived chats yet'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-auto space-y-2">
                                    {archivedChats.map((archive) => (
                                        <div
                                            key={archive.key}
                                            className="glass rounded-xl p-4 border border-border/50 hover:border-primary/50 transition-all group"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-foreground truncate">
                                                        {archive.projectName || 'Untitled Project'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {new Date(archive.timestamp).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            // Check if it's a localStorage archive or database project
                                                            const archived = localStorage.getItem(archive.key);
                                                            if (archived) {
                                                                // localStorage archive
                                                                const data = JSON.parse(archived);
                                                                setMessages(data.messages || []);
                                                                setGeneratedCode(data.code || '');
                                                                setEditableCode(data.code || '');
                                                                setProjectName(data.projectName || 'Untitled Project');
                                                            } else if (archive.code) {
                                                                // Database project
                                                                setGeneratedCode(archive.code);
                                                                setEditableCode(archive.code);
                                                                setProjectName(archive.projectName || 'Untitled Project');
                                                                setProjectId(archive.key);
                                                                setActiveTab('preview');
                                                                setMessages([
                                                                    { role: 'ai', content: 'Hello! I\'m Ryze. Describe the UI you want to build and I\'ll generate production-ready React + Tailwind CSS code. Try saying "Create a landing page" or "Build a dashboard".' },
                                                                    { role: 'user', content: archive.prompt || 'Previous project' },
                                                                    { role: 'ai', content: `Loaded project: **${archive.projectName}**. You can preview it, edit the code, or ask me to modify it.` }
                                                                ]);
                                                            }
                                                            setArchivesModalOpen(false);
                                                            toast.success('Project loaded!');
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <ArrowRight className="h-4 w-4 mr-1" />
                                                        {archive.code ? 'Load' : 'Restore'}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            if (window.confirm('Delete this item?')) {
                                                                if (localStorage.getItem(archive.key)) {
                                                                    // localStorage archive
                                                                    localStorage.removeItem(archive.key);
                                                                    const updatedList = archivedChats.filter(a => a.key !== archive.key);
                                                                    setArchivedChats(updatedList);
                                                                    localStorage.setItem('ryze-chat-archives-list', JSON.stringify(updatedList));
                                                                    toast.success('Archive deleted');
                                                                } else {
                                                                    // Database project - just remove from view
                                                                    const updatedList = archivedChats.filter(a => a.key !== archive.key);
                                                                    setArchivedChats(updatedList);
                                                                    toast.info('Removed from history view');
                                                                }
                                                            }
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4 mt-4 border-t border-border/50">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setArchivesModalOpen(false)}
                                >
                                    Close
                                </Button>
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
