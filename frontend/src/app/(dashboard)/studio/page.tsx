"use client";

import { useState, useRef, useEffect, Suspense, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeComparison } from "@/components/ui/code-comparison";
import { PromptBox } from "@/components/ui/prompt-box";
import { DynamicRenderer } from "@/components/DynamicRenderer";
import { TerminalPanel } from "@/components/TerminalPanel";
import { useUIStore } from "@/stores/uiStore";
import { useTerminalStore, ScaffoldPhase } from "@/stores/terminalStore";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { createProject, searchWeb, updateProject, streamChat, fetchProjects, fetchProject } from "@/lib/api";
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
export interface PreviewThemeColors {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    surface?: string;
    text?: string;
}

export function buildPreviewHtml(
    code: string,
    allFiles?: Record<string, string>,
    themeColors?: PreviewThemeColors
): string {
    // ── Multi-file Detection & Parsing ──
    let files = allFiles || {};

    // If no structured files are provided but the code looks like a multi-file dump (comments like // filename)
    // parse it into individual files.
    if (Object.keys(files).length === 0 && (code.match(/(?:^|\n)\/\/\s+[\w\-\/]+\.(?:tsx|ts|jsx|js|css|json)/) || code.includes('// tsconfig.json'))) {
        const parsedFiles: Record<string, string> = {};
        const lines = code.split('\n');
        let currentFile = '';
        let currentContent: string[] = [];

        for (const line of lines) {
            const match = line.match(/^(?:\/\/|###)\s+([a-zA-Z0-9_\-\/]+\.(?:tsx|ts|jsx|js|css|json|html|md))$/);
            if (match) {
                if (currentFile) {
                    parsedFiles[currentFile] = currentContent.join('\n').trim();
                }
                currentFile = match[1].trim();
                currentContent = [];
            } else {
                if (currentFile || line.trim()) { // Skip leading garbage
                    currentContent.push(line);
                }
            }
        }
        if (currentFile) {
            parsedFiles[currentFile] = currentContent.join('\n').trim();
        }

        if (Object.keys(parsedFiles).length > 0) {
            files = parsedFiles;
        }
    }

    // ── Multi-file merge ──
    // When the AI generates a multi-file project, App.tsx may reference HeroSection, Footer,
    // Navbar, etc. from separate files. We inline them all into a single preview.
    let mergedCode = code;

    if (files && Object.keys(files).length > 0) {
        const componentFiles: { path: string; code: string }[] = [];
        const mainFilePaths = [
            'src/App.tsx', 'src/App.jsx',
            'app/page.tsx', 'app/page.jsx',
            'src/pages/index.tsx', 'src/pages/index.jsx',
            'pages/index.tsx', 'pages/index.jsx'
        ];

        for (const [filePath, fileCode] of Object.entries(files)) {
            const lowerPath = filePath.toLowerCase();
            if (
                (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) &&
                !mainFilePaths.includes(filePath) &&
                !lowerPath.includes('main.tsx') &&
                !lowerPath.includes('main.jsx') &&
                !lowerPath.includes('_document.tsx') &&
                !lowerPath.includes('_app.tsx') &&
                typeof fileCode === 'string' &&
                (fileCode.includes('function ') || fileCode.includes('const ') || fileCode.includes('export'))
            ) {
                componentFiles.push({ path: filePath, code: fileCode });
            }
        }

        // Determine the entry point
        const mainFile =
            files['src/App.tsx'] ||
            files['src/App.jsx'] ||
            files['app/page.tsx'] ||
            files['app/page.jsx'] ||
            files['src/pages/index.tsx'] ||
            files['src/pages/index.jsx'] ||
            files['pages/index.tsx'] ||
            files['pages/index.jsx'] ||
            Object.values(files).find(v => v.includes('export default function App') || v.includes('export default function Home')) ||
            code;

        if (componentFiles.length > 0) {
            // Sort: Layout-like files first so they are defined before App uses them
            componentFiles.sort((a, b) => {
                const aIsLayout = a.path.toLowerCase().includes('layout');
                const bIsLayout = b.path.toLowerCase().includes('layout');
                if (aIsLayout && !bIsLayout) return -1;
                if (!aIsLayout && bIsLayout) return 1;
                return 0;
            });
            const parts = componentFiles.map((f) => f.code);
            parts.push(mainFile);
            mergedCode = parts.join('\n\n');
        } else {
            mergedCode = mainFile;
        }
    }

    // Detect if the code is likely JSON (e.g. tsconfig.json, package.json)
    // Only if it's NOT just the start of a multi-file bundle we just parsed
    // And if it doesn't look like React code
    const strippedForCheck = mergedCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '').trim();
    if (
        (strippedForCheck.startsWith('{') || strippedForCheck.startsWith('[')) &&
        !mergedCode.includes('import React') &&
        !mergedCode.includes('export default') &&
        !mergedCode.includes('className=')
    ) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>body { background: #1e1e1e; color: #d4d4d4; font-family: monospace; padding: 20px; white-space: pre-wrap; }</style>
</head>
<body>${mergedCode}</body>
</html>`;
    }

    // Extract the component name from the LAST default export (the main App)
    const lines = mergedCode.split('\n');
    let componentName = 'App';
    for (let i = lines.length - 1; i >= 0; i--) {
        const fnM = lines[i].match(/export\s+default\s+function\s+(\w+)/);
        if (fnM) { componentName = fnM[1]; break; }
        const constM = lines[i].match(/export\s+default\s+(\w+)\s*;?\s*$/);
        if (constM) { componentName = constM[1]; break; }
        const classM = lines[i].match(/export\s+default\s+class\s+(\w+)/);
        if (classM) { componentName = classM[1]; break; }
    }
    if (componentName === 'App') {
        // Try arrow function / const component: const App = () => ...
        const arrowFn = mergedCode.match(/(?:export\s+)?const\s+(App|Home|Page|Main)\s*(?::\s*React\.FC)?\s*=/);
        if (arrowFn) {
            componentName = arrowFn[1];
        } else {
            const standaloneFn = mergedCode.match(/^function\s+(\w+)/m);
            if (standaloneFn) componentName = standaloneFn[1];
        }
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
        // Remove all import statements (single-line and multi-line) - allow leading whitespace
        .replace(/^\s*import[\s\S]*?from\s*['"][^'"]*['"];?\s*$/gm, '')
        .replace(/^\s*import\s*['"][^'"]*['"];?\s*$/gm, '')
        // Handle default exports:
        // 1. `export default function Foo` → `function Foo` (keep the declaration)
        .replace(/^\s*export\s+default\s+function\s+/gm, 'function ')
        // 2. `export default Foo;` (standalone name reference) → remove entirely
        //    The component is already defined above by its function/const declaration.
        .replace(/^\s*export\s+default\s+[A-Z]\w*\s*;?\s*$/gm, '')
        // 3. `export default <expression>` (arrow fn, class expr, etc.) → assign to a var
        .replace(/^\s*export\s+default\s+/gm, 'const __DefaultExport__ = ')
        // Remove export keyword from named exports (keep the declaration)
        .replace(/^\s*export\s+(function|const|let|var|class)\s+/gm, '$1 ')
        // ── TypeScript pre-stripping (safety net before Babel) ──
        // Remove `type X = ...` and `interface X { ... }` declarations entirely
        // Handle MULTI-LINE type aliases: `type X = { ... };` spanning multiple lines
        .replace(/^\s*(?:export\s+)?type\s+\w+(?:<[^>]*>)?\s*=\s*\{[\s\S]*?\};?\s*$/gm, '')
        // Single-line type aliases
        .replace(/^\s*(?:export\s+)?type\s+\w+(?:<[^>]*>)?\s*=\s*[^;{]*;?\s*$/gm, '')
        // Handle MULTI-LINE interfaces: `interface X { ... }` spanning multiple lines
        .replace(/^\s*(?:export\s+)?interface\s+\w+(?:\s+extends\s+[\w,\s]+)?(?:<[^>]*>)?\s*\{[\s\S]*?\}\s*$/gm, '')
        // Remove "use client" / "use server" directives (Next.js only)
        .replace(/^\s*["']use (?:client|server)["'];?\s*$/gm, '')
        // Remove type annotations from variable declarations: `const x: Type = ...` → `const x = ...`
        .replace(/(?<=[(\s,])(\w+)\s*:\s*(?:string|number|boolean|any|void|null|undefined|never|unknown|object|React\.\w+(?:<[^>]*>)?|Array<[^>]*>|Record<[^>]*>|Partial<[^>]*>|Omit<[^>]*>|Pick<[^>]*>|\w+(?:\[\])?)\s*(?=[=,)\n])/g, '$1 ')
        // Remove full type annotations on function params including inline object types: 
        // `(props: { title: string; onClick: () => void })` → `(props)`
        .replace(/(\w+)\s*:\s*\{[^}]*\}/g, '$1')
        // Remove generic type parameters from function declarations: function foo<T>(...) → function foo(...)
        .replace(/<[A-Z]\w*(?:\s+extends\s+[^>]+)?(?:\s*,\s*[A-Z]\w*(?:\s+extends\s+[^>]+)?)*>\s*(?=\()/g, '')
        // Remove generic type parameters from function calls: fn<Type>(...) → fn(...)
        .replace(/(?<=\w)<(?:string|number|boolean|any|[A-Z]\w*)(?:\s*,\s*(?:string|number|boolean|any|[A-Z]\w*))*>\s*(?=\()/g, '')
        // Remove `as Type` type assertions (including complex ones like `as const`)
        .replace(/\s+as\s+(?:const|string|number|boolean|any|unknown|\w+(?:<[^>]*>)?(?:\[\])?)\b/g, '')
        // Remove React.FC<...> type annotation: `const App: React.FC<Props> = ` → `const App = `
        .replace(/:\s*React\.FC(?:<[^>]*>)?\s*(?==)/g, ' ')
        // Remove `: Props` type annotations on const arrow function components
        .replace(/:\s*(?:React\.)?(?:FC|FunctionComponent|ComponentProps|HTMLAttributes)(?:<[^>]*>)?\s*(?==)/g, ' ')
        // Remove return type annotations on functions: `function foo(): Type {` → `function foo() {`
        .replace(/\)\s*:\s*(?:void|string|number|boolean|any|null|undefined|never|unknown|React\.(?:ReactNode|ReactElement|JSX\.Element)|JSX\.Element|\w+(?:<[^>]*>)?(?:\[\])?)\s*(?=\{)/g, ') ')
        // Remove return type annotations: `): Promise<Type>` → `)`
        .replace(/\)\s*:\s*Promise<[^>]*>\s*(?=\{)/g, ') ')
        // Remove type parameters on useState/useRef: `useState<Type>(` → `useState(`
        .replace(/(?<=useState|useRef|useCallback|useMemo|useContext|useReducer)<[^>]+>/g, '')
        // Remove non-null assertions: `value!.prop` → `value.prop`, `value!` → `value`
        .replace(/!(?=\.|\[|\))/g, '')
        // Remove `satisfies Type` expressions
        .replace(/\s+satisfies\s+\w+(?:<[^>]*>)?/g, '')
        // Remove `readonly` modifier from properties
        .replace(/\breadonly\s+(?=\w)/g, '')
        // Remove `keyof typeof` expressions
        .replace(/\bkeyof\s+typeof\s+\w+/g, 'string')
        // Remove `is Type` type predicates in function returns: `): value is Type {` → `) {`
        .replace(/\)\s*:\s*\w+\s+is\s+\w+(?:<[^>]*>)?\s*(?=\{)/g, ') ')
        // Remove enum declarations and replace with const objects
        .replace(/^\s*(?:export\s+)?(?:const\s+)?enum\s+(\w+)\s*\{([^}]*)\}/gm, (_, name, body) => {
            const entries = body.split(',').map((e: string) => {
                const trimmed = e.trim();
                if (!trimmed) return '';
                const parts = trimmed.split('=');
                const key = parts[0].trim();
                const val = parts.length > 1 ? parts[1].trim() : `'${key}'`;
                return `${key}: ${val}`;
            }).filter(Boolean).join(', ');
            return `const ${name} = { ${entries} };`;
        })
        // Remove standalone `type` imports that might have been partially stripped
        .replace(/^\s*import\s+type\b[^;]*;?\s*$/gm, '')

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
    // Exclude icon names that clash with inline stubs (e.g., Link from react-router-dom, Navigate, etc.)
    const inlineStubNames = new Set([
        'Link', 'NavLink', 'Navigate', 'Outlet', 'Route', 'Routes', 'Router',
        'BrowserRouter', 'HashRouter', 'MemoryRouter',
    ]);
    const safeIcons = allIconNames.filter(name => !declaredNames.has(name) && !inlineStubNames.has(name));
    const iconDestructuring = safeIcons.length > 0
        ? `const { ${safeIcons.join(', ')} } = lucideReact;`
        : '// All icon names conflict with user code — icons available via lucideReact proxy';

    const reactGlobals = new Set(['useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'useContext', 'createContext', 'useReducer', 'useId', 'Fragment', 'forwardRef', 'memo', 'Suspense']);

    // Libraries we provide via CDN or inline stubs — don't generate generic stubs
    const cdnProvided = new Set([
        'clsx',
        'useForm', 'useController', 'useFieldArray', 'useWatch', 'FormProvider', 'useFormContext',
        // react-router-dom (stubbed inline)
        'BrowserRouter', 'HashRouter', 'MemoryRouter', 'Router', 'Routes', 'Route',
        'Link', 'NavLink', 'Navigate', 'Outlet',
        'useNavigate', 'useLocation', 'useParams', 'useSearchParams', 'useMatch', 'useRoutes',
        // framer-motion (stubbed inline)
        'motion', 'AnimatePresence',
        // axios, socket.io (stubbed inline)
        'axios', 'io',
    ]);

    const stubsToGenerate = Array.from(importedNames).filter(n =>
        !reactGlobals.has(n) &&
        !allIconNames.includes(n) &&
        !declaredNames.has(n) &&
        !cdnProvided.has(n)
    );
    // Hook-aware stubs: names starting with "use" get function stubs, not component stubs
    const importStubs = stubsToGenerate.length > 0
        ? stubsToGenerate.map(n => {
            if (n.startsWith('use')) {
                return `const ${n} = (...args) => { const [s, ss] = React.useState(args[0]); return typeof args[0] === 'undefined' ? [s, ss] : s; };`;
            }
            return `const ${n} = React.forwardRef((props, ref) => React.createElement('div', { ...props, ref }, props.children));`;
        }).join('\n')
        : '';

    // Extract CSS from generated files and inject into the preview
    let inlineCss = '';
    if (files && Object.keys(files).length > 0) {
        for (const [filePath, fileCode] of Object.entries(files)) {
            if (filePath.endsWith('.css') && typeof fileCode === 'string') {
                // Strip Tailwind directives that are already handled by the CDN
                const strippedCss = fileCode
                    .replace(/@tailwind\s+\w+;?\s*/g, '')
                    .replace(/@import\s+[^;]+;?\s*/g, '')
                    .replace(/@apply\s+([^;]+);/g, (_, classes) => {
                        // Convert simple @apply to approximate inline styles
                        // This is a best-effort conversion for preview
                        return `/* @apply ${classes} */`;
                    })
                    .trim();
                if (strippedCss) {
                    inlineCss += `\n/* === ${filePath} === */\n${strippedCss}\n`;
                }
            }
        }
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin="anonymous"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin="anonymous"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js" crossorigin="anonymous"></script>
    <script src="https://unpkg.com/clsx/dist/clsx.min.js" crossorigin="anonymous"></script>
    <script src="https://unpkg.com/react-hook-form@7/dist/index.umd.js" crossorigin="anonymous"></script>
    ${(() => {
            // Extract Google Fonts from generated index.html if present
            const indexHtml = files?.['index.html'] || '';
            const fontLinks = indexHtml.match(/<link[^>]*fonts\.googleapis\.com[^>]*>/gi) || [];
            // Also check the font from theme
            const themeFont = themeColors ? (() => {
                // Common font mappings to Google Fonts URLs
                const fontMap: Record<string, string> = {
                    'inter': 'Inter:wght@300;400;500;600;700',
                    'poppins': 'Poppins:wght@300;400;500;600;700',
                    'jetbrains mono': 'JetBrains+Mono:wght@300;400;500;600;700',
                    'merriweather': 'Merriweather:wght@300;400;700',
                    'plus jakarta sans': 'Plus+Jakarta+Sans:wght@300;400;500;600;700',
                    'roboto': 'Roboto:wght@300;400;500;700',
                    'open sans': 'Open+Sans:wght@300;400;500;600;700',
                    'montserrat': 'Montserrat:wght@300;400;500;600;700',
                    'lato': 'Lato:wght@300;400;700',
                    'raleway': 'Raleway:wght@300;400;500;600;700',
                    'nunito': 'Nunito:wght@300;400;500;600;700',
                    'playfair display': 'Playfair+Display:wght@400;500;600;700',
                    'source code pro': 'Source+Code+Pro:wght@300;400;500;600;700',
                    'fira code': 'Fira+Code:wght@300;400;500;600;700',
                    'space grotesk': 'Space+Grotesk:wght@300;400;500;600;700',
                };
                return fontMap;
            })() : null;
            return fontLinks.join('\n    ') + (fontLinks.length === 0 && themeFont ? '' : '');
        })()}
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600;700&family=Merriweather:wght@300;400;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <style>
        body { margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        #root { min-height: 100vh; }
        /* Custom animation keyframes for AI-generated code */
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 5px rgba(99,102,241,0.3); } 50% { box-shadow: 0 0 20px rgba(99,102,241,0.6); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        .animate-fadeIn { animation: fadeIn 0.6s ease-out forwards; }
        .animate-slideUp { animation: slideUp 0.8s ease-out forwards; }
        .animate-slideDown { animation: slideDown 0.6s ease-out forwards; }
        .animate-slideInLeft { animation: slideInLeft 0.6s ease-out forwards; }
        .animate-slideInRight { animation: slideInRight 0.6s ease-out forwards; }
        .animate-scaleIn { animation: scaleIn 0.5s ease-out forwards; }
        .animate-gradient { animation: gradient 6s ease infinite; background-size: 200% 200%; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .animate-shimmer { animation: shimmer 2s linear infinite; background-size: 200% 100%; }
        /* Smooth scroll */
        html { scroll-behavior: smooth; }
        /* Glow utility */
        .glow { filter: drop-shadow(0 0 10px currentColor); }
        ${inlineCss}
    </style>
    <script>
        if (typeof tailwind !== 'undefined') { tailwind.config = {
            safelist: [
                {pattern: /bg-theme-(primary|secondary|accent|background|surface|text)/},
                {pattern: /text-theme-(primary|secondary|accent|background|surface|text)/},
                {pattern: /border-theme-(primary|secondary|accent|background|surface|text)/},
                {pattern: /ring-theme-(primary|secondary|accent)/},
                {pattern: /from-theme-(primary|secondary|accent)/},
                {pattern: /to-theme-(primary|secondary|accent)/},
                {pattern: /via-theme-(primary|secondary|accent)/},
                {pattern: /shadow-theme-(primary|secondary|accent)/},
                {pattern: /animate-(fadeIn|slideUp|slideDown|slideInLeft|slideInRight|scaleIn|gradient|float|pulse-glow|shimmer)/},
                'backdrop-blur-xl', 'backdrop-blur-lg', 'backdrop-blur-md',
                'font-sans', 'font-mono', 'font-serif', 'font-display', 'font-jakarta',
            ],
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'system-ui', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace'],
                        serif: ['Merriweather', 'serif'],
                        display: ['Poppins', 'sans-serif'],
                        jakarta: ['Plus Jakarta Sans', 'sans-serif'],
                    },
                    ${themeColors ? `colors: {
                        theme: {
                            primary: '${themeColors.primary || '#6366f1'}',
                            secondary: '${themeColors.secondary || '#8b5cf6'}',
                            accent: '${themeColors.accent || '#06b6d4'}',
                            background: '${themeColors.background || '#09090b'}',
                            surface: '${themeColors.surface || '#18181b'}',
                            text: '${themeColors.text || '#fafafa'}',
                        },` : 'colors: {'}
                    },
                    animation: {
                        'fadeIn': 'fadeIn 0.6s ease-out forwards',
                        'slideUp': 'slideUp 0.8s ease-out forwards',
                        'slideDown': 'slideDown 0.6s ease-out forwards',
                        'slideInLeft': 'slideInLeft 0.6s ease-out forwards',
                        'slideInRight': 'slideInRight 0.6s ease-out forwards',
                        'scaleIn': 'scaleIn 0.5s ease-out forwards',
                        'gradient': 'gradient 6s ease infinite',
                        'float': 'float 3s ease-in-out infinite',
                        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                        'shimmer': 'shimmer 2s linear infinite',
                    },
                    keyframes: {
                        fadeIn: { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
                        slideUp: { from: { opacity: 0, transform: 'translateY(30px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
                        gradient: { '0%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' }, '100%': { backgroundPosition: '0% 50%' } },
                        float: { '0%, 100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-10px)' } },
                    },
                },
            },
        }; }
    </script>
    <script>
        // Intercept navigation to prevent recursive app loading
        window.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link) {
                const href = link.getAttribute('href');
                // Ignore hash links, empty links, or javascript links
                if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
                    return;
                }

                if (link.href) {
                    try {
                        const url = new URL(link.href);
                        // If it's a local link (same origin), intercept it
                        if (url.origin === window.location.origin) {
                            e.preventDefault();
                            console.log('[Preview] Intercepted navigation to:', url.pathname);
                            window.parent.postMessage({
                                type: 'preview-navigation',
                                path: url.pathname
                            }, '*');
                        }
                    } catch (err) {
                        console.error('Navigation intercept error:', err);
                    }
                }
            }
        }, true);

        // Error detection for AI-generated code - MUST be first to catch early errors
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
</head>
<body>
    <div id="root"></div>
    <script type="text/plain" id="app-code">
        const { useState, useEffect, useRef, useMemo, useCallback, useContext, createContext,
                useReducer, useId, Fragment, forwardRef, memo, Suspense } = React;

        // Prevent "exports is not defined" errors for CommonJS code
        var exports = {};
        var module = { exports: exports };

        // Map CDN globals to local scope
        const clsx = window.clsx;
        const { useForm, useController, useFieldArray, useWatch, FormProvider, useFormContext } = window.ReactHookForm || {};

        // Stub for lucide-react icons — render proper SVG outlines for common icons
        const lucideIconPaths = {
            Menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
            X: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
            ChevronDown: '<polyline points="6 9 12 15 18 9"/>',
            ChevronRight: '<polyline points="9 18 15 12 9 6"/>',
            ChevronLeft: '<polyline points="15 18 9 12 15 6"/>',
            ChevronUp: '<polyline points="18 15 12 9 6 15"/>',
            Search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
            Heart: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
            Star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
            ShoppingCart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
            User: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
            Bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
            Settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
            Mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
            Phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
            MapPin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
            Check: '<polyline points="20 6 9 17 4 12"/>',
            Plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
            Minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
            ArrowRight: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
            ArrowLeft: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
            ExternalLink: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
            Home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
            Zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
            Award: '<circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>',
            TrendingUp: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
            Globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
            Code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
            Shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
            Eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
            Lock: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
            CheckCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
            Play: '<polygon points="5 3 19 12 5 21 5 3"/>',
            Send: '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
            Filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
            BarChart: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
            Clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
            Calendar: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
            Download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
            Upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
            Loader2: '<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>',
            DollarSign: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
            CreditCard: '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
            Users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        };
        const iconHandler = {
            get(target, prop) {
                if (prop === '__esModule') return false;
                return function LucideIcon(props) {
                    const size = props?.size || 24;
                    const pathData = lucideIconPaths[prop] || '<circle cx="12" cy="12" r="10"/>';
                    const svgEl = React.createElement('svg', {
                        width: size, height: size, viewBox: '0 0 24 24',
                        fill: 'none', stroke: 'currentColor', strokeWidth: 2,
                        strokeLinecap: 'round', strokeLinejoin: 'round',
                        className: props?.className || '',
                        style: props?.style,
                        onClick: props?.onClick,
                        dangerouslySetInnerHTML: { __html: pathData },
                    });
                    return svgEl;
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
        // Additional common variable stubs for AI-generated code
        if (typeof primary === 'undefined') {
            var primary = true;
        }
        if (typeof isPrimary === 'undefined') {
            var isPrimary = true;
        }
        if (typeof name === 'undefined') {
            var name = 'Name';
        }
        if (typeof label === 'undefined') {
            var label = 'Label';
        }
        if (typeof title === 'undefined') {
            var title = 'Title';
        }
        if (typeof description === 'undefined') {
            var description = 'Description';
        }
        if (typeof value === 'undefined') {
            var value = '';
        }
        if (typeof data === 'undefined') {
            var data = [];
        }
        if (typeof items === 'undefined') {
            var items = [];
        }
        if (typeof index === 'undefined') {
            var index = 0;
        }
        if (typeof image === 'undefined') {
            var image = 'https://placehold.co/400x300';
        }
        if (typeof href === 'undefined') {
            var href = '#';
        }
        if (typeof color === 'undefined') {
            var color = '#6366f1';
        }
        if (typeof type === 'undefined') {
            var type = 'default';
        }
        if (typeof size === 'undefined') {
            var size = 'md';
        }
        if (typeof active === 'undefined') {
            var active = false;
        }
        if (typeof isActive === 'undefined') {
            var isActive = false;
        }
        if (typeof open === 'undefined') {
            var open = false;
        }
        if (typeof isOpen === 'undefined') {
            var isOpen = false;
        }
        if (typeof selected === 'undefined') {
            var selected = null;
        }
        if (typeof loading === 'undefined') {
            var loading = false;
        }
        if (typeof isLoading === 'undefined') {
            var isLoading = false;
        }
        if (typeof error === 'undefined') {
            var error = null;
        }
        if (typeof className === 'undefined') {
            var className = '';
        }
        if (typeof variant === 'undefined') {
            var variant = 'default';
        }
        if (typeof plan === 'undefined') {
            var plan = { name: 'Plan', price: '$0', features: [] };
        }
        if (typeof testimonial === 'undefined') {
            var testimonial = { text: 'Great product!', author: 'User', role: 'Customer' };
        }
        if (typeof rating === 'undefined') {
            var rating = 5;
        }
        if (typeof count === 'undefined') {
            var count = 0;
        }
        if (typeof total === 'undefined') {
            var total = 0;
        }
        if (typeof category === 'undefined') {
            var category = 'General';
        }
        if (typeof product === 'undefined') {
            var product = { name: 'Product', price: '$0.00', image: 'https://placehold.co/200x200' };
        }
        if (typeof handleClick === 'undefined') {
            var handleClick = () => {};
        }
        if (typeof onClick === 'undefined') {
            var onClick = () => {};
        }
        if (typeof onChange === 'undefined') {
            var onChange = () => {};
        }
        if (typeof onSubmit === 'undefined') {
            var onSubmit = (e) => { if (e && e.preventDefault) e.preventDefault(); };
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

        // ── react-router-dom stub (hash-based routing for preview) ──
        const __RouterContext__ = React.createContext({ path: '/', navigate: () => {}, params: {} });
        function BrowserRouter({ children }) {
            const [path, setPath] = React.useState(window.location.hash.slice(1) || '/');
            React.useEffect(() => {
                const onHash = () => setPath(window.location.hash.slice(1) || '/');
                window.addEventListener('hashchange', onHash);
                return () => window.removeEventListener('hashchange', onHash);
            }, []);
            const navigate = React.useCallback((to) => {
                if (typeof to === 'number') { window.history.go(to); return; }
                window.location.hash = to;
            }, []);
            return React.createElement(__RouterContext__.Provider, { value: { path, navigate, params: {} } }, children);
        }
        const HashRouter = BrowserRouter;
        const MemoryRouter = BrowserRouter;
        const Router = BrowserRouter;
        function Routes({ children }) {
            const { path } = React.useContext(__RouterContext__);
            const childArray = React.Children.toArray(children);
            for (const child of childArray) {
                if (child?.props?.index && path === '/') return child.props.element || child.props.children || null;
                if (child?.props?.path) {
                    const routePath = child.props.path;
                    if (routePath === '*' || routePath === path || path.startsWith(routePath + '/') || routePath === '/') {
                        if (routePath === '/' && path !== '/' && !child.props.index) continue;
                        return child.props.element || child.props.children || null;
                    }
                }
            }
            // Fallback: try wildcard or first route
            const wildcard = childArray.find(c => c?.props?.path === '*');
            if (wildcard) return wildcard.props.element || wildcard.props.children || null;
            if (childArray.length > 0) return childArray[0].props?.element || childArray[0].props?.children || null;
            return null;
        }
        function Route({ element, children }) { return element || children || null; }
        function Link({ to, children, className, style, onClick, ...rest }) {
            return React.createElement('a', {
                href: '#' + (to || '/'), className, style, ...rest,
                onClick: (e) => { if (onClick) onClick(e); }
            }, children);
        }
        function NavLink({ to, children, className, style, ...rest }) {
            const { path } = React.useContext(__RouterContext__);
            const isActive = path === to || (to !== '/' && path.startsWith(to));
            const cls = typeof className === 'function' ? className({ isActive }) : className;
            const stl = typeof style === 'function' ? style({ isActive }) : style;
            return React.createElement(Link, { to, className: cls, style: stl, ...rest }, children);
        }
        function Navigate({ to }) {
            const { navigate } = React.useContext(__RouterContext__);
            React.useEffect(() => { if (to) navigate(to); }, [to]);
            return null;
        }
        function Outlet() { return null; }
        function useNavigate() { return React.useContext(__RouterContext__).navigate; }
        function useLocation() {
            const { path } = React.useContext(__RouterContext__);
            return { pathname: path, search: '', hash: '', state: null, key: 'default' };
        }
        function useParams() { return React.useContext(__RouterContext__).params; }
        function useSearchParams() { return [new URLSearchParams(), () => {}]; }
        function useMatch() { return null; }
        function useRoutes(routes) { return null; }

        // ── Common library stubs ──
        // axios
        const __mockResponse__ = { data: {}, status: 200, headers: {} };
        const __mockPromise__ = Promise.resolve(__mockResponse__);
        const axios = { get: () => __mockPromise__, post: () => __mockPromise__, put: () => __mockPromise__, delete: () => __mockPromise__, patch: () => __mockPromise__, create: () => axios, defaults: { headers: { common: {} } }, interceptors: { request: { use: () => {} }, response: { use: () => {} } } };
        // socket.io-client
        const io = () => ({ on: () => {}, emit: () => {}, off: () => {}, disconnect: () => {}, connect: () => {}, connected: false });

        ${codeWithoutImports}

        // Resolve the root component to mount. Priority:
        // 1. __DefaultExport__ (set by stripping "export default <expr>")
        // 2. The detected componentName from the source
        // 3. Common fallback names: App, Home, Page, Main
        // 4. The first defined function component we can find
        const __resolveAppComponent__ = () => {
            if (typeof __DefaultExport__ !== 'undefined') return __DefaultExport__;
            if (typeof ${componentName} !== 'undefined') return ${componentName};
            if (typeof App !== 'undefined') return App;
            if (typeof Home !== 'undefined') return Home;
            if (typeof Page !== 'undefined') return Page;
            if (typeof Main !== 'undefined') return Main;
            // Last resort: render a meaningful error
            return () => React.createElement('div', {
                style: { padding: 40, textAlign: 'center', color: '#888', fontFamily: 'sans-serif' }
            }, 'No root component found. Make sure your code has an export default.');
        };
        const AppComponent = __resolveAppComponent__();
        const container = document.getElementById('root');
        
        // Robust mounting that supports both React 18 and legacy versions
        try {
            if (ReactDOM.createRoot) {
                const root = ReactDOM.createRoot(container);
                root.render(React.createElement(AppComponent));
            } else {
                ReactDOM.render(React.createElement(AppComponent), container);
            }
        } catch (err) {
            console.error('Mount error:', err);
            // Report the detailed error to parent — this bypasses cross-origin "Script error."
            // because we catch it directly in the same-origin script context.
            window.parent.postMessage({
                type: 'preview-error',
                error: {
                    message: err?.message || String(err),
                    stack: err?.stack,
                    source: 'app-mount',
                }
            }, '*');
            if (container) {
                container.innerHTML = '<div style="color:red;padding:20px">Failed to mount application. See console for details.</div>';
            }
        }
    </script>

    <!-- Programmatic Babel transform with error recovery -->
    <script>
    (function() {
        var codeEl = document.getElementById('app-code');
        if (!codeEl) return;
        var code = codeEl.textContent;

        // Aggressive TypeScript cleanup for Babel recovery
        function aggressiveStrip(src) {
            return src
                // Remove function return types: ): Type { → ) {
                .replace(/\\)\\s*:\\s*[A-Z][\\w.]*(?:<[^>]*>)?(?:\\[\\])?\\s*(?=\\{)/g, ') ')
                .replace(/\\)\\s*:\\s*(?:void|string|number|boolean|any|null|undefined|never|unknown)\\s*(?=\\{)/g, ') ')
                .replace(/\\)\\s*:\\s*Promise<[^>]*>\\s*(?=\\{)/g, ') ')
                // Remove parameter type annotations: (x: Type) → (x)
                .replace(/(\\w+)\\s*:\\s*(?:string|number|boolean|any|void|null|undefined|never|unknown|object)(?:\\[\\])?/g, '$1')
                .replace(/(\\w+)\\s*:\\s*[A-Z]\\w*(?:<[^>]*>)?(?:\\[\\])?(?=\\s*[,)=])/g, '$1')
                // Remove remaining generic brackets on functions
                .replace(/<[A-Z]\\w*(?:\\s+extends\\s+[^>]+)?(?:\\s*,\\s*[A-Z]\\w*(?:\\s+extends\\s+[^>]+)?)*>\\s*(?=\\()/g, '')
                // Remove as expressions
                .replace(/\\s+as\\s+(?:const|string|number|boolean|any|unknown|\\w+(?:<[^>]*>)?(?:\\[\\])?)\\b/g, '')
                // Remove satisfies
                .replace(/\\s+satisfies\\s+\\w+(?:<[^>]*>)?/g, '')
                // Remove non-null assertions
                .replace(/!(?=\\.|\\[|\\))/g, '')
                // Remove remaining standalone type/interface blocks
                .replace(/^\\s*(?:export\\s+)?type\\s+\\w+[^=]*=\\s*[^;]*;?\\s*$/gm, '')
                .replace(/^\\s*(?:export\\s+)?interface\\s+\\w+[\\s\\S]*?\\}\\s*$/gm, '');
        }

        function tryTransform(src, label) {
            try {
                var result = Babel.transform(src, {
                    presets: ['env', 'react', 'typescript'],
                    filename: 'app.tsx',
                });
                return result.code;
            } catch (e) {
                console.warn('[Babel ' + label + ']', e.message);
                return null;
            }
        }

        // Attempt 1: Direct transform
        var compiled = tryTransform(code, 'attempt 1');

        // Attempt 2: Aggressive TS stripping then retry
        if (!compiled) {
            console.warn('[Preview] Babel failed on original code. Attempting aggressive TS cleanup...');
            var cleaned = aggressiveStrip(code);
            compiled = tryTransform(cleaned, 'attempt 2 (stripped)');
        }

        if (compiled) {
            try {
                (0, eval)(compiled);
            } catch (e) {
                console.error('[Preview] Runtime error after Babel compile:', e);
                window.parent.postMessage({
                    type: 'preview-error',
                    error: { message: e.message, stack: e.stack, source: 'app-runtime' }
                }, '*');
            }
        } else {
            // Both attempts failed — report the error
            var errorMsg = 'Babel could not compile the generated code after cleanup attempts.';
            console.error('[Preview]', errorMsg);
            window.parent.postMessage({
                type: 'preview-error',
                error: { message: errorMsg, source: 'babel-compile' }
            }, '*');
            var container = document.getElementById('root');
            if (container) {
                container.innerHTML = '<div style="color:#ff6b6b;padding:20px;font-family:monospace;">Compilation Error: TypeScript syntax could not be processed. The AI will attempt to fix this automatically.</div>';
            }
        }
    })();
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

export interface StudioContentProps {
    initialProjectId?: string;
    initialPrompt?: string;
    initialMode?: string;
}

export function StudioContent({ initialProjectId, initialPrompt, initialMode }: StudioContentProps = {}) {
    const { githubConnected, setGithubConnected, selectedModel, githubModal, setGithubModal, designTheme } = useUIStore();
    const terminalStore = useTerminalStore();
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
    const [previewError, setPreviewError] = useState<{ message: string; stack?: string; source?: string; line?: number; column?: number } | null>(null);
    const [errorModalOpen, setErrorModalOpen] = useState(false);

    const autoFixAttemptsRef = useRef(0);

    const isAutoFixingRef = useRef(false);
    const autoFixTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [archivesModalOpen, setArchivesModalOpen] = useState(false);
    const [archivedChats, setArchivedChats] = useState<ArchivedChat[]>([]);
    const [historySource, setHistorySource] = useState<'archives' | 'projects'>('archives');

    const chatEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const streamingMessageRef = useRef<string>('');
    const generatingRef = useRef(false);
    const initialPromptSentRef = useRef<boolean>(false);
    const initialPromptFiredRef = useRef<boolean>(false);
    const handleSendRef = useRef<((msg?: string, mode?: "plan" | "build" | "chat") => Promise<void>) | null>(null);
    const routeSearchRef = useRef<HTMLDivElement>(null);

    // ── Performance: keep `messages` in a ref so `handleSend` doesn't need it as
    // a dependency. `handleSend` only reads messages to build conversationHistory,
    // so a ref (always-current snapshot) avoids recreating the 600-line callback
    // on every single message state update (which happens every 60ms during streaming).
    const messagesRef = useRef(messages);
    useEffect(() => { messagesRef.current = messages; }, [messages]);

    // ── Performance: token batching for streaming ──
    // Instead of calling setMessages on EVERY token (causes full re-render each time),
    // we batch tokens and flush at ~60ms intervals (≈16fps — smooth enough for text).
    const tokenFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tokenStreamMsgIdxRef = useRef<number>(-1);
    const flushTokenBuffer = useCallback(() => {
        const currentText = streamingMessageRef.current;
        const idx = tokenStreamMsgIdxRef.current;
        if (idx < 0) return;
        setMessages((m) => {
            const updated = [...m];
            if (idx >= 0 && idx < updated.length) {
                updated[idx] = { ...updated[idx], content: currentText, isThinking: false };
            }
            return updated;
        });
    }, []);

    // ── Performance: debounced localStorage saves ──
    const localStorageSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Performance: deferred preview HTML build timer ──
    const previewBuildTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Cleanup: abort all in-flight work when component unmounts (e.g. logout navigation) ──
    useEffect(() => {
        return () => {
            abortControllerRef.current?.abort();
            if (tokenFlushTimerRef.current) clearTimeout(tokenFlushTimerRef.current);
            if (localStorageSaveTimerRef.current) clearTimeout(localStorageSaveTimerRef.current);
            if (autoFixTimerRef.current) clearTimeout(autoFixTimerRef.current);
            if (previewBuildTimerRef.current) clearTimeout(previewBuildTimerRef.current);
        };
    }, []);

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

    // Load project from history if projectId is in URL or prop
    useEffect(() => {
        // Don't overwrite state while AI generation is in progress
        if (generatingRef.current) return;

        const loadProjectId = initialProjectId || searchParams.get('project');
        const promptParam = initialPrompt || searchParams.get('prompt');

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
            // If we already have data for this project (e.g. from a previous
            // StudioContent instance that just navigated here), skip the fetch.
            // The localStorage effects below will restore the state.
            const contextId = loadProjectId;
            const alreadyCached = localStorage.getItem(`ryze-generated-code-${contextId}`)
                || localStorage.getItem(`ryze-all-files-${contextId}`);
            if (alreadyCached && projectId === loadProjectId) {
                // Data is already in state from the previous mount — nothing to do
                return;
            }

            // Use direct fetch for single project instead of fetching all
            fetchProject(loadProjectId).then((project) => {
                if (project && project.code) {
                    setProjectId(project.id);
                    setProjectName(project.title || 'Untitled Project');
                    setActiveTab('preview');

                    // Clear terminal for this project scope
                    terminalStore.clearForProject(project.id);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, initialProjectId, initialPrompt]);

    // Load chat history from localStorage on mount (only if not a new session and no project loaded)
    useEffect(() => {
        // Don't overwrite state while AI generation is in progress
        if (generatingRef.current) return;

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

                    // Clear terminal for this project scope
                    terminalStore.clearForProject(project.id);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // DEBOUNCED: during streaming, messages change on every token flush (~16fps).
    // We delay the save by 2s so we only write once after a burst of updates.
    useEffect(() => {
        if (messages.length <= 1) return; // Don't save if only welcome message

        if (localStorageSaveTimerRef.current) clearTimeout(localStorageSaveTimerRef.current);
        localStorageSaveTimerRef.current = setTimeout(() => {
            const contextId = getContextId();
            const essentialMessages = messages.map(m => ({
                role: m.role,
                content: m.content,
            }));
            try {
                localStorage.setItem(`ryze-chat-history-${contextId}`, JSON.stringify(essentialMessages));
            } catch {
                console.warn('localStorage quota exceeded, archiving...');
                const timestamp = new Date().toISOString();
                const archiveKey = `ryze-chat-archive-${timestamp}`;
                localStorage.setItem(archiveKey, JSON.stringify({ messages: essentialMessages, timestamp, contextId }));
                const archives = JSON.parse(localStorage.getItem('ryze-chat-archives-list') || '[]');
                archives.push({ key: archiveKey, timestamp, projectName: projectName || 'Auto-archived', contextId });
                localStorage.setItem('ryze-chat-archives-list', JSON.stringify(archives));
                localStorage.removeItem(`ryze-chat-history-${contextId}`);
            }
        }, 2000);

        return () => {
            if (localStorageSaveTimerRef.current) clearTimeout(localStorageSaveTimerRef.current);
        };
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
        const promptParam = initialPrompt || searchParams.get('prompt');
        const modeParam = initialMode || searchParams.get('mode');
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
    }, [searchParams, initialPrompt, initialMode]);

    // Auto-send the initial prompt from Dashboard
    useEffect(() => {
        const promptParam = initialPrompt || searchParams.get('prompt');
        if (promptParam && input === promptParam && !generating && initialPromptSentRef.current && !initialPromptFiredRef.current) {
            // Trigger send after a small delay to ensure state is settled
            const timer = setTimeout(() => {
                // Double-check: prevent duplicate fires even across re-renders
                if (input.trim() && !initialPromptFiredRef.current && !generatingRef.current) {
                    initialPromptFiredRef.current = true;
                    handleSendRef.current?.(input);
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [input, generating, searchParams, router, initialPrompt, initialProjectId]);

    // Debounce scroll-into-view during streaming to avoid layout thrashing
    const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        scrollTimerRef.current = setTimeout(() => {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
        return () => { if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current); };
    }, [messages, thinkingSteps]);

    useEffect(() => {
        setEditableCode(generatedCode);
    }, [generatedCode, setEditableCode]);

    // Keep generatingRef in sync so event listeners can read current value
    useEffect(() => { generatingRef.current = generating; }, [generating]);

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
    // Listen for preview messages (errors, navigation)
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'preview-error') {
                // Ignore errors while actively generating — the preview may load
                // partial/incomplete code mid-stream, producing false positives
                // like "App is not defined".
                if (generatingRef.current) return;

                const error = event.data.error;
                setPreviewError(error);

                // Build a clear, detailed error message for the terminal
                const locationInfo = [
                    error.source ? `File: ${error.source}` : null,
                    error.line ? `Line: ${error.line}` : null,
                    error.column ? `Col: ${error.column}` : null,
                ].filter(Boolean).join(' | ');

                const errorMessage = locationInfo
                    ? `Preview Error: ${error.message} (${locationInfo})`
                    : `Preview Error: ${error.message}`;

                const errorDetail = [
                    error.stack || null,
                    locationInfo ? `\nLocation: ${locationInfo}` : null,
                ].filter(Boolean).join('\n');

                terminalStore.addEntry('error', errorMessage, errorDetail || undefined);
            }
            if (event.data?.type === 'preview-navigation') {
                const path = event.data.path; // e.g., "/about" or "/"

                // transform /about -> pages/about, app/about, etc.
                const searchPath = path.startsWith('/') ? path.substring(1) : path;

                // 1. Exact match (rare for file paths vs routes)
                if (allGeneratedFiles[searchPath]) {
                    setPreviewRoute(searchPath);
                    return;
                }

                // 2. Simple fuzzy search
                // e.g. /about -> src/pages/About.tsx
                const found = Object.keys(allGeneratedFiles).find(p => {
                    const normalized = p.toLowerCase();
                    const search = searchPath.toLowerCase();
                    return normalized.includes(search) &&
                        (normalized.endsWith('.tsx') || normalized.endsWith('.jsx'));
                });

                if (found) {
                    setPreviewRoute(found);
                    setIframeKey(k => k + 1); // Force reload
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [allGeneratedFiles, terminalStore]); // minimal deps to keep listener fresh

    // Clear error when code changes (including file updates from auto-fix)
    useEffect(() => {
        setPreviewError(null);
        setErrorModalOpen(false);
    }, [generatedCode, previewRoute, allGeneratedFiles]);

    // Auto-fix: If preview errors appear shortly after generation completes, auto-fix them.
    // Uses refs for guards (not state) because the setTimeout callback runs later and
    // React state may still be batched/stale, causing the counter check to pass twice.
    useEffect(() => {
        if (!previewError || generating || isAutoFixingRef.current || autoFixAttemptsRef.current >= 3) return;

        // Skip auto-fix if the error has no useful details (cross-origin "Script error.")
        // The AI can't meaningfully fix an error it can't see.
        if (previewError.message === 'Script error.' && !previewError.source && !previewError.stack) return;

        if (autoFixTimerRef.current) clearTimeout(autoFixTimerRef.current);
        // Increased delay to 8 seconds to allow files to finish writing to storage
        // and DB cache to be updated before the next request reads them.
        autoFixTimerRef.current = setTimeout(() => {
            // Re-check guards using refs (synchronous, never stale)
            if (!previewError || generatingRef.current || isAutoFixingRef.current || autoFixAttemptsRef.current >= 3) return;

            // Lock immediately via refs before any async work
            isAutoFixingRef.current = true;
            autoFixAttemptsRef.current += 1;



            terminalStore.addEntry('info', `Detected runtime error. Auto-fixing (attempt ${autoFixAttemptsRef.current}/3)...`);

            // Build a detailed, targeted error-fix prompt.
            // Include the list of project files so the AI knows which files exist.
            const fileList = Object.keys(allGeneratedFiles);
            const fileListStr = fileList.length > 0
                ? `\n\nProject files: ${fileList.join(', ')}`
                : '';

            // Provide specific guidance based on the error type
            let errorGuidance = '';
            const errMsg = previewError.message.toLowerCase();
            if (errMsg.includes('is not defined')) {
                const match = previewError.message.match(/(\w+) is not defined/);
                const undefinedVar = match ? match[1] : 'unknown';
                errorGuidance = `\n\nDIAGNOSIS: Variable "${undefinedVar}" is used but not declared. Common causes:\n- Missing import statement\n- Destructured prop/object property used as a standalone variable\n- Conditional expression using a prop name directly (e.g., {${undefinedVar} && ...} instead of {props.${undefinedVar} && ...})\n- Variable declared inside a different scope\n\nFix: declare "${undefinedVar}" with const/let, or add it as a prop parameter, or add optional chaining.`;
            } else if (errMsg.includes('unexpected token') || errMsg.includes('syntaxerror')) {
                errorGuidance = '\n\nDIAGNOSIS: Syntax error — likely TypeScript syntax that the browser cannot parse. Common causes:\n- TypeScript generics like <T extends ...> in arrow functions (use function keyword instead)\n- Type annotations that weren\'t stripped\n- Enum declarations (use const objects instead)\n\nFix: simplify TypeScript syntax, remove type annotations, convert enums to const objects.';
            } else if (errMsg.includes('cannot read properties of') || errMsg.includes('cannot read property')) {
                errorGuidance = '\n\nDIAGNOSIS: Accessing property on null/undefined. Common causes:\n- Array.map() called on undefined variable\n- Accessing nested property without null check\n\nFix: add optional chaining (?.), nullish coalescing (??), or initialize with default values.';
            }

            const fixPrompt = `Fix this runtime error. Do NOT regenerate the entire application. Only fix the specific broken file(s).

ERROR:
${previewError.message}
${previewError.source ? `Source File: ${previewError.source}` : ''}
${previewError.line ? `Line: ${previewError.line}${previewError.column ? `, Column: ${previewError.column}` : ''}` : ''}
${previewError.stack ? `Stack: ${previewError.stack}` : ''}
${errorGuidance}${fileListStr}

INSTRUCTIONS:
1. Read the <current-project-files> in the system context carefully.
2. Find the exact file and line that caused the error.
3. Return ONLY the fixed file(s) as a <ryze_artifact> block.
4. **OUTPUT THE ENTIRE FILE** from first line to last line. The system will REJECT fixes that are drastically smaller than the original file. If the original file has 200 lines, your fix must also have ~200 lines.
5. Do NOT change files that are working correctly.
6. Make sure all variables are properly declared before use.
7. Use defensive coding: optional chaining (?.), null checks, default values.
8. Do NOT use TypeScript generics with extends in arrow functions. Use function keyword instead.
9. Do NOT use enum declarations — use const objects. Do NOT use type annotations on parameters.`;
            handleSendRef.current?.(fixPrompt, 'chat');
        }, 8000);

        return () => {
            if (autoFixTimerRef.current) clearTimeout(autoFixTimerRef.current);
        };
    }, [previewError, generating, allGeneratedFiles, terminalStore]);

    // Reset auto-fix counter only when the USER initiates a new generation
    // (not when auto-fix itself triggers a chat request, which also sets generating=true).
    useEffect(() => {
        if (generating && !isAutoFixingRef.current) {
            autoFixAttemptsRef.current = 0;
        }
        // When generation finishes, reset isAutoFixing so the effect can re-evaluate.
        if (!generating && isAutoFixingRef.current) {
            isAutoFixingRef.current = false;
        }
    }, [generating]);

    // Detect if the generated code is a UI Plan (JSON)
    const uiPlan = useMemo(() => {
        try {
            let cleanCode = generatedCode.trim();
            // Remove markdown code blocks if present
            if (cleanCode.startsWith('```json')) {
                cleanCode = cleanCode.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (cleanCode.startsWith('```')) {
                cleanCode = cleanCode.replace(/^```\w*\s*/, '').replace(/\s*```$/, '');
            }

            const parsed = JSON.parse(cleanCode);
            if (parsed.components && Array.isArray(parsed.components) && parsed.layout) {
                return parsed;
            }
        } catch { }
        return null;
    }, [generatedCode]);

    // Track code changes for diff view
    useEffect(() => {
        if (generatedCode && previousCode && generatedCode !== previousCode) {
            // Code has been regenerated, optionally auto-show diff
            // setActiveTab('diff');
        }
    }, [generatedCode, previousCode]);

    const handleSend = useCallback(async (promptMessage?: string, modeArg?: "plan" | "build" | "chat") => {
        const prompt = promptMessage || input;
        // Use ref for guard check — state is batched and can be stale if
        // handleSend is called twice before React re-renders.
        if (!prompt.trim() || generatingRef.current) return;
        // Set ref immediately so concurrent calls are blocked synchronously
        generatingRef.current = true;
        setInput('');

        // Check if this is a new session from dashboard (has prompt param but no project param)
        const promptParam = initialPrompt || searchParams.get('prompt');
        const loadProjectId = initialProjectId || searchParams.get('project');
        const isNewSession = (promptParam && !loadProjectId) || (!projectId && !loadProjectId);

        // Determine the orchestration mode
        // CRITICAL: If modeArg is explicitly 'chat' (e.g. for error fixing), ALWAYS respect it.
        // Never override to 'generate' — that causes full regeneration and cascading errors.
        let mode: 'chat' | 'plan_interactive' | 'generate' = chatMode === 'plan' ? 'plan_interactive' : 'chat';
        if (modeArg === 'chat') mode = 'chat';
        if (modeArg === 'plan') mode = 'plan_interactive';

        // Only use 'generate' mode for actual new generation requests, NOT when mode is explicitly set
        const isGenerateRequest = !modeArg && (isNewSession || (chatMode === 'chat' && (
            prompt.toLowerCase().includes('build') ||
            prompt.toLowerCase().includes('generate') ||
            prompt.toLowerCase().includes('create') ||
            prompt.toLowerCase().includes('make') ||
            prompt.toLowerCase().includes('design')
        ))) && chatMode !== 'plan';

        const orchestrationMode = isGenerateRequest ? 'generate' : mode;

        // Determine if this is an auto-fix request (don't show code in user message)
        const isFixRequest = modeArg === 'chat' && prompt.includes('Fix this runtime error');

        // Add user message — for fix requests, show a clean message instead of the full prompt
        setMessages((m) => [...m, {
            role: 'user',
            content: isFixRequest
                ? 'Fix the runtime error in the generated code.'
                : (chatMode === 'plan' ? `[Plan] ${prompt}` : prompt),
        }]);
        setGenerating(true);
        setThinkingSteps([]);
        setThinkingOpen(true);
        streamingMessageRef.current = '';

        // Cancel any existing stream
        abortControllerRef.current?.abort();
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        // Web search context — SKIP for fix requests (code context in URL causes 414 errors)
        let webSearchContext: string | undefined;
        if (webSearchEnabled && !isFixRequest) {
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

        // AUTO-INJECT ERROR CONTEXT
        // If there is a visible preview error, append it to the prompt context so the AI knows.
        if (previewError) {
            console.log("Injecting preview error into context:", previewError);
            // We don't change the UI message (user shouldn't see ugly error dumps), 
            // but we send it to the backend.
            // We can use the 'webSearchContext' field as a generic context carrier if needed, 
            // or just append to the prompt sent to streamChat (but not displayed).
            // Let's hide it in the specialized context or just append effectively.
            // Best approach: Add it to the 'existingCode' context or similar.
        }

        // Build conversation history from messages (read via ref to avoid dep)
        // For new sessions, only include the welcome message to ensure fresh start
        const conversationHistory = isNewSession
            ? [{ role: 'ai' as const, content: 'Hello! I\'m Ryze. Describe the UI you want to build and I\'ll generate production-ready React + Tailwind CSS code. Try saying "Create a landing page" or "Build a dashboard".' }]
            : messagesRef.current.map((m) => ({
                role: m.role,
                content: m.content,
            }));

        // Add a placeholder AI message for streaming tokens
        const streamMsgIndex = { current: -1 };
        setMessages((m) => {
            streamMsgIndex.current = m.length;
            tokenStreamMsgIdxRef.current = m.length;
            return [...m, { role: 'ai' as const, content: '', isThinking: true }];
        });
        // declared here so finally can update the route after streaming completes.
        let activeProjectId = projectId;

        try {
            // Pass existing code context so the AI can reason about modifications
            // Structure it as readable file listings instead of raw JSON
            let existingCodeContext: string | undefined;
            if (Object.keys(allGeneratedFiles).length > 0) {
                const fileParts: string[] = [];
                for (const [filePath, code] of Object.entries(allGeneratedFiles)) {
                    fileParts.push(`--- FILE: ${filePath} ---\n${code}\n--- END FILE ---`);
                }
                existingCodeContext = fileParts.join('\n\n');
            } else if (generatedCode) {
                existingCodeContext = generatedCode;
            }

            // CRITICAL: If there is a runtime error visible in the preview,
            // ALERT the AI about it so it can fix it.
            if (previewError) {
                // Include recent terminal errors for added context
                const recentErrors = terminalStore.getLatestErrors();
                const terminalContext = recentErrors.length > 0
                    ? `\nRecent terminal errors:\n${recentErrors.map((e) => `- ${e.message}${e.detail ? `\n  ${e.detail}` : ''}`).join('\n')}`
                    : '';

                const errorAlert = `\n\n<active_runtime_error>
The user's application is currently crashing with this error:
Error: ${previewError.message}
${previewError.source ? `Source: ${previewError.source}` : ''}
${previewError.line ? `Line: ${previewError.line}${previewError.column ? `, Column: ${previewError.column}` : ''}` : ''}
${previewError.stack ? `Stack: ${previewError.stack}` : ''}
${terminalContext}

Fix this error in your next response.
</active_runtime_error>`;
                if (existingCodeContext) {
                    existingCodeContext += errorAlert;
                } else {
                    existingCodeContext = errorAlert;
                }
            }

            // Build theme context string from the user's selected design theme
            const themeCtx = designTheme
                ? `Theme: "${designTheme.name}"
Description: ${designTheme.description}
Visual Style: ${designTheme.style}
Font: ${designTheme.font}

COLOR MAP (use these NAMED THEME CLASSES — they are pre-registered in tailwind.config and guaranteed to work):
- primary: ${designTheme.colors.primary} → bg-theme-primary, text-theme-primary, border-theme-primary
- secondary: ${designTheme.colors.secondary} → bg-theme-secondary, text-theme-secondary
- accent: ${designTheme.colors.accent} → text-theme-accent, bg-theme-accent
- background: ${designTheme.colors.background} → bg-theme-background
- surface: ${designTheme.colors.surface} → bg-theme-surface
- text: ${designTheme.colors.text} → text-theme-text
For opacity variants, use arbitrary hex: bg-[${designTheme.colors.primary}]/20, shadow-[0_0_15px_${designTheme.colors.primary}]

DESIGN REQUIREMENTS:
1. Apply the Visual Style description above to EVERY component — this defines the look and feel.
2. Use pre-defined animation classes (already available — do NOT define @keyframes): animate-fadeIn, animate-slideUp, animate-slideDown, animate-scaleIn, animate-float, animate-gradient, animate-pulse-glow.
3. Cards: hover:scale-105 hover:-translate-y-1 transition-all duration-300. Stagger with style={{ animationDelay: '0.2s' }}.
4. Buttons: bg-theme-primary hover:opacity-90 transition-all duration-300 hover:shadow-lg.
5. Use pre-loaded fonts: font-sans (Inter), font-display (Poppins), font-mono (JetBrains Mono), font-serif (Merriweather), font-jakarta (Plus Jakarta Sans).
6. Add glow/shadow effects matching the theme: shadow-[0_0_15px_${designTheme.colors.primary}] on key CTAs.
7. Hero sections: animate-fadeIn on headline, animate-slideUp on CTA.
8. All interactive elements MUST have hover/focus states with smooth transitions.`
                : undefined;

            // Create project eagerly BEFORE generation starts so files are stored
            // under the correct project path in Supabase Storage.
            if (!activeProjectId && orchestrationMode === 'generate' && !isFixRequest) {
                // Fresh generation — discard previous project's files/errors so
                // the AI doesn't try to fix errors that belong to another project.
                existingCodeContext = undefined;
                setPreviewError(null);
                setAllGeneratedFiles({});
                setGeneratedCode('');

                if (autoFixTimerRef.current) {
                    clearTimeout(autoFixTimerRef.current);
                    autoFixTimerRef.current = null;
                }

                try {
                    const project = await createProject(prompt, {
                        code: '// Generating...',
                        provider: selectedModel.provider,
                        model: selectedModel.id,
                    });
                    activeProjectId = project.id;
                    migrateSessionToProject(project.id);
                    setProjectId(project.id);
                    // NOTE: Do NOT router.replace here — navigating before the stream
                    // completes will unmount this component and kill the SSE connection.
                    // The route is updated in the finally block after generation finishes.
                } catch (e) {
                    console.warn('Early project creation failed, continuing without project_id:', e);
                }
            }

            // Build structured error context for the backend's error_context field
            let structuredErrors: { id: string; type: string; message: string; file?: string; line?: number; stack_trace?: string }[] | undefined;
            if (previewError) {
                structuredErrors = [{
                    id: 'runtime-1',
                    type: 'runtime',
                    message: previewError.message,
                    ...(previewError.source ? { file: previewError.source } : {}),
                    ...(previewError.line ? { line: previewError.line } : {}),
                    ...(previewError.stack ? { stack_trace: previewError.stack } : {}),
                }];
                // Also include recent terminal errors
                const recentTerminalErrors = terminalStore.getLatestErrors();
                for (let i = 0; i < recentTerminalErrors.length && i < 3; i++) {
                    const te = recentTerminalErrors[i];
                    structuredErrors.push({
                        id: `terminal-${i + 1}`,
                        type: 'terminal',
                        message: te.message,
                        ...(te.detail ? { stack_trace: te.detail } : {}),
                    });
                }
            }

            await streamChat({
                prompt,
                mode: orchestrationMode,
                provider: selectedModel.provider,
                model: selectedModel.id,
                conversationHistory,
                webSearchContext,
                existingCode: existingCodeContext,
                themeContext: themeCtx,
                projectId: activeProjectId || undefined,
                errorContext: structuredErrors,
                signal: abortController.signal,

                onStep: (step) => {
                    setThinkingSteps((s) => [...s, step]);
                    // Detect phase transitions from backend: "[Phase Label]" pattern
                    const phaseMatch = step.match(/^\[(.+)\]$/);
                    if (phaseMatch) {
                        const phaseLabel = phaseMatch[1].toLowerCase();
                        // Map label back to phase key
                        const phaseMap: Record<string, string> = {
                            'setting up dependencies': 'dependencies',
                            'writing config files': 'config',
                            'creating entry points': 'entry',
                            'building app shell': 'app',
                            'writing source files': 'source',
                            'installing packages': 'install',
                            'starting dev server': 'devserver',
                            'building project': 'build',
                            'running linter': 'lint',
                            'running tests': 'test',
                            'executing command': 'shell',
                            'all actions completed': 'complete',
                        };
                        const phase = phaseMap[phaseLabel as keyof typeof phaseMap] as ScaffoldPhase;
                        if (phase) {
                            terminalStore.setPhase(phase);
                            terminalStore.addEntry('phase', step, undefined, phase);
                        } else {
                            terminalStore.addEntry('info', step);
                        }
                    } else {
                        terminalStore.addEntry('info', step);
                    }
                },

                onToken: (token) => {
                    streamingMessageRef.current += token;
                    // Throttled flush: schedule a UI update if one isn't pending
                    if (!tokenFlushTimerRef.current) {
                        tokenFlushTimerRef.current = setTimeout(() => {
                            tokenFlushTimerRef.current = null;
                            flushTokenBuffer();
                        }, 60);
                    }
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
                    statuses.forEach((s: { name: string; status: string; phase?: string }) => {
                        terminalStore.addEntry('install', `${s.name} ${s.status}`, undefined, (s.phase as ScaffoldPhase) || 'install');
                    });
                },

                onFileUpdate: (statuses) => {
                    setImplementationStatus((prev) => prev ? { ...prev, fileUpdates: statuses, phase: 'creating' } : null);
                    // Store completed files and show latest in preview
                    // NOTE: Backend sends 'completed' or 'written'. We handle both for robustness.
                    const completedFiles = statuses.filter((s: FileUpdateStatus) =>
                        (s.status === 'completed' || (s.status as string) === 'written') && s.code
                    );

                    if (completedFiles.length > 0) {
                        const newFiles: Record<string, string> = {};
                        completedFiles.forEach((f: FileUpdateStatus) => { newFiles[f.path] = f.code!; });
                        setAllGeneratedFiles((prev) => ({ ...prev, ...newFiles }));

                        const latestFile = completedFiles[completedFiles.length - 1];
                        setCurrentPreviewFile(latestFile.code!);

                        // CRITICAL: Force preview reload when files are updated
                        setIframeKey((k) => k + 1);
                        setActiveTab('preview');
                    }
                    statuses.forEach((s: FileUpdateStatus & { phase?: string }) => {
                        terminalStore.addEntry('file', `${s.path} [${s.status}]`, undefined, (s.phase as ScaffoldPhase) || undefined);
                    });
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

                    // Log to terminal with phase from backend
                    terminalStore.addEntry(
                        'command',
                        `$ ${result.command}`,
                        result.formatted || result.stdout || result.error || '',
                        (result.phase as ScaffoldPhase) || undefined
                    );

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

                    // Force refresh if the command might have changed the environment (like npm install)
                    if (result.command.includes('npm') || result.command.includes('install')) {
                        setIframeKey((k) => k + 1);
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

                onExplanation: (explanation) => {
                    streamingMessageRef.current += `\n\n### 🎨 Design Explanation\n\n${explanation}`;
                    const currentText = streamingMessageRef.current;
                    setMessages((m) => {
                        const updated = [...m];
                        const idx = streamMsgIndex.current;
                        if (idx >= 0 && idx < updated.length) {
                            updated[idx] = { ...updated[idx], content: currentText };
                        }
                        return updated;
                    });
                },

                onWebSearch: (results) => {
                    // Display web search results in thinking steps
                    setThinkingSteps((s) => [...s, `Web Search Result for "${results.query}": ${results.abstract}`]);

                    // Also append to message for visibility
                    streamingMessageRef.current += `\n\n### 🌐 Web Research\n**Query:** ${results.query}\n\n${results.abstract}\n`;
                    const currentText = streamingMessageRef.current;
                    setMessages((m) => {
                        const updated = [...m];
                        const idx = streamMsgIndex.current;
                        if (idx >= 0 && idx < updated.length) {
                            updated[idx] = { ...updated[idx], content: currentText };
                        }
                        return updated;
                    });
                },

                onError: (error) => {
                    toast.error("AI Error", { description: error });
                    terminalStore.addEntry('error', error);
                },

                onDone: (meta) => {
                    if (orchestrationMode === 'generate' && meta?.success) {
                        terminalStore.addEntry('success', 'Generation complete', undefined, 'complete');
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
                        if (activeProjectId) {
                            // Project was already created (eagerly or from a previous session)
                            updateProject(activeProjectId, { code_json: saveCode, description: prompt }).catch(() => { });
                        } else if (!isFixRequest) {
                            // Fallback: create project if eager creation was skipped or failed
                            createProject(prompt, {
                                code: saveCode,
                                provider: selectedModel.provider,
                                model: selectedModel.id,
                            }).then((project) => {
                                migrateSessionToProject(project.id);
                                setProjectId(project.id);
                                router.replace(`/projects/${project.id}`, { scroll: false });
                            }).catch(() => { });
                        }
                    }

                    // Handle chat-mode completion (fixes, updates)
                    // Show commit-like message for files updated via chat mode
                    if (orchestrationMode === 'chat' && meta?.all_files) {
                        const updatedFiles = meta.all_files as Record<string, string>;
                        if (Object.keys(updatedFiles).length > 0) {
                            setAllGeneratedFiles((prev) => ({ ...prev, ...updatedFiles }));
                            // Force preview reload
                            setIframeKey((k) => k + 1);

                            const fileNames = Object.keys(updatedFiles).map(p => p.split('/').pop());
                            terminalStore.addEntry('success', `Fixed: ${fileNames.join(', ')}`, undefined, 'complete');

                            // Add commit-like message
                            const fixedFiles = Object.keys(updatedFiles).map(p => ({
                                name: p.split('/').pop() || p,
                                path: p,
                                status: 'modified' as const,
                            }));
                            setMessages((m) => [...m, {
                                role: 'ai',
                                content: `Updated ${fixedFiles.length} file${fixedFiles.length > 1 ? 's' : ''}`,
                                isCommit: true,
                                files: fixedFiles,
                            }]);

                            // Save to project if we have one
                            if (activeProjectId) {
                                const mergedFiles = { ...allGeneratedFiles, ...updatedFiles };
                                updateProject(activeProjectId, { code_json: JSON.stringify(mergedFiles) }).catch(() => { });
                            }
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
            // Flush any remaining buffered tokens before cleaning up
            if (tokenFlushTimerRef.current) {
                clearTimeout(tokenFlushTimerRef.current);
                tokenFlushTimerRef.current = null;
            }
            flushTokenBuffer();

            generatingRef.current = false;
            setGenerating(false);
            setThinkingOpen(false);
            setSearchingWeb(false);
            abortControllerRef.current = null;

            // Navigate to the project route AFTER generation is fully complete.
            // IMPORTANT: Defer to next frame so React finishes batching the
            // onDone state updates (setAllGeneratedFiles, setMessages, etc.)
            // before this component unmounts due to the route change.
            // Without this, the component unmounts mid-batch and the new
            // StudioContent mounts with stale/empty localStorage.
            if (activeProjectId && activeProjectId !== projectId) {
                setTimeout(() => {
                    router.replace(`/projects/${activeProjectId}`, { scroll: false });
                }, 0);
            }
        }
    }, [input, searchParams, chatMode, selectedModel, generatedCode, previousCode, projectId, migrateSessionToProject, allGeneratedFiles, webSearchEnabled, flushTokenBuffer, designTheme, initialProjectId, initialPrompt, previewError, router, terminalStore]);

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
        const originalPrompt = messagesRef.current.find((m) => m.role === 'user')?.content?.replace('[Plan] ', '') || '';

        setGenerating(true);
        setThinkingSteps([]);
        setThinkingOpen(true);

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const streamMsgIndex = { current: -1 };
        setMessages((m) => {
            streamMsgIndex.current = m.length;
            tokenStreamMsgIdxRef.current = m.length;
            return [...m, { role: 'ai' as const, content: '', isThinking: true }];
        });

        try {
            await streamChat({
                prompt: originalPrompt,
                mode: 'plan_interactive',
                provider: selectedModel.provider,
                model: selectedModel.id,
                planAnswers: answers,
                themeContext: designTheme
                    ? `Theme: "${designTheme.name}"\nDescription: ${designTheme.description}\nVisual Style: ${designTheme.style}\nFont: ${designTheme.font}\n\nCOLOR MAP (named theme classes — pre-registered in tailwind.config):\n- primary: ${designTheme.colors.primary} → bg-theme-primary, text-theme-primary\n- secondary: ${designTheme.colors.secondary} → bg-theme-secondary, text-theme-secondary\n- accent: ${designTheme.colors.accent} → text-theme-accent, bg-theme-accent\n- background: ${designTheme.colors.background} → bg-theme-background\n- surface: ${designTheme.colors.surface} → bg-theme-surface\n- text: ${designTheme.colors.text} → text-theme-text\n\nDESIGN: Apply Visual Style effects to all components. Use pre-defined animation classes (animate-fadeIn, animate-slideUp, animate-scaleIn, animate-float, animate-gradient). Use pre-loaded fonts (font-sans, font-display, font-mono, font-serif, font-jakarta).`
                    : undefined,
                signal: abortController.signal,

                onStep: (step) => {
                    setThinkingSteps((s) => [...s, step]);
                    // Detect phase transitions from backend
                    const phaseMatch = step.match(/^\[(.+)\]$/);
                    if (phaseMatch) {
                        const phaseLabel = phaseMatch[1].toLowerCase();
                        const phaseMap: Record<string, string> = {
                            'setting up dependencies': 'dependencies',
                            'writing config files': 'config',
                            'creating entry points': 'entry',
                            'building app shell': 'app',
                            'writing source files': 'source',
                            'installing packages': 'install',
                            'starting dev server': 'devserver',
                            'building project': 'build',
                            'running linter': 'lint',
                            'running tests': 'test',
                            'executing command': 'shell',
                            'all actions completed': 'complete',
                        };
                        const phase = phaseMap[phaseLabel as keyof typeof phaseMap] as ScaffoldPhase;
                        if (phase) {
                            terminalStore.setPhase(phase);
                            terminalStore.addEntry('phase', step, undefined, phase);
                        } else {
                            terminalStore.addEntry('info', step);
                        }
                    } else {
                        terminalStore.addEntry('info', step);
                    }
                },

                onToken: (token) => {
                    streamingMessageRef.current += token;
                    if (!tokenFlushTimerRef.current) {
                        tokenFlushTimerRef.current = setTimeout(() => {
                            tokenFlushTimerRef.current = null;
                            flushTokenBuffer();
                        }, 60);
                    }
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
                    terminalStore.addEntry('command', `$ ${result.command}`, result.formatted || result.stdout || result.error || '', (result.phase as ScaffoldPhase) || undefined);
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
                    terminalStore.addEntry('error', error);
                },

                onDone: () => { },
            });
        } catch (error: unknown) {
            if ((error as Error).name !== 'AbortError') {
                toast.error("Plan generation failed");
            }
        } finally {
            if (tokenFlushTimerRef.current) { clearTimeout(tokenFlushTimerRef.current); tokenFlushTimerRef.current = null; }
            flushTokenBuffer();
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

        // Set previous code for diff view
        if (generatedCode) {
            setPreviousCode(generatedCode);
        }

        // Add implementing message
        setMessages((m) => [...m, {
            role: 'ai',
            content: 'Starting implementation...',
            isImplementing: true,
        }]);

        const originalPrompt = messagesRef.current.find((m) => m.role === 'user')?.content?.replace('[Plan] ', '') || '';

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            await streamChat({
                prompt: originalPrompt,
                mode: 'plan_implement',
                provider: selectedModel.provider,
                model: selectedModel.id,
                planData,
                themeContext: designTheme
                    ? `Theme: "${designTheme.name}"\nDescription: ${designTheme.description}\nStyle: ${designTheme.style}\nFont: ${designTheme.font}\n\nCOLOR MAP (named theme classes — pre-registered in tailwind.config):\n- primary: ${designTheme.colors.primary} → bg-theme-primary, text-theme-primary\n- secondary: ${designTheme.colors.secondary} → bg-theme-secondary, text-theme-secondary\n- accent: ${designTheme.colors.accent} → text-theme-accent, bg-theme-accent\n- background: ${designTheme.colors.background} → bg-theme-background\n- surface: ${designTheme.colors.surface} → bg-theme-surface\n- text: ${designTheme.colors.text} → text-theme-text\n\nDESIGN: Apply Visual Style effects. Use pre-defined animations (animate-fadeIn, animate-slideUp, etc). Use pre-loaded fonts.`
                    : undefined,
                projectId: projectId || undefined,
                signal: abortController.signal,

                onStep: (step) => {
                    setThinkingSteps((s) => [...s, step]);
                    // Detect phase transitions from backend
                    const phaseMatch = step.match(/^\[(.+)\]$/);
                    if (phaseMatch) {
                        const phaseLabel = phaseMatch[1].toLowerCase();
                        const phaseMap: Record<string, string> = {
                            'setting up dependencies': 'dependencies',
                            'writing config files': 'config',
                            'creating entry points': 'entry',
                            'building app shell': 'app',
                            'writing source files': 'source',
                            'installing packages': 'install',
                            'starting dev server': 'devserver',
                            'building project': 'build',
                            'running linter': 'lint',
                            'running tests': 'test',
                            'executing command': 'shell',
                            'all actions completed': 'complete',
                        };
                        const phase = phaseMap[phaseLabel as keyof typeof phaseMap] as ScaffoldPhase;
                        if (phase) {
                            terminalStore.setPhase(phase);
                            terminalStore.addEntry('phase', step, undefined, phase);
                        } else {
                            terminalStore.addEntry('info', step);
                        }
                    } else {
                        terminalStore.addEntry('info', step);
                    }
                },

                onInstall: (statuses) => {
                    setImplementationStatus((prev) => prev ? { ...prev, installingLibraries: statuses, phase: 'installing' } : null);
                    statuses.forEach((s: { name: string; status: string; phase?: string }) => {
                        terminalStore.addEntry('install', `${s.name} ${s.status}`, undefined, (s.phase as ScaffoldPhase) || 'install');
                    });
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
                    statuses.forEach((s: FileUpdateStatus & { phase?: string }) => {
                        terminalStore.addEntry('file', `${s.path} [${s.status}]`, undefined, (s.phase as ScaffoldPhase) || undefined);
                    });
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
                    terminalStore.addEntry('command', `$ ${result.command}`, result.formatted || result.stdout || result.error || '', (result.phase as ScaffoldPhase) || undefined);
                },

                onLogAnalysis: (analysis) => {
                    if (analysis.analysis) {
                        // Add log analysis as a thinking step for plan_implement
                        setThinkingSteps((s) => [...s, `📊 Log Analysis: ${analysis.analysis}`]);
                    }
                },

                onCode: (code) => {
                    const codeStr = typeof code === 'string' ? code : JSON.stringify(code, null, 2);

                    // CRITICAL: Capture previousCode ONLY ONCE at the start of a generation cycle.
                    // If we blindly update previousCode here, it will update on every streamed token,
                    // making previousCode == generatedCode, thus showing no diff.
                    // We check if we are already generating (which we are) and if previousCode is NOT yet set for this cycle.
                    // However, 'generating' state is true for the whole duration. 
                    // Better approach: Check if the new code is just starting (short length) OR checking if previousCode is null/empty 
                    // but we might want to keep the OLD successful code as previous.

                    // Actually, the best place to set previousCode is BEFORE calling streamChat.
                    // But if we must do it here: only set it if it's not already set to the *current* old code.
                    // The issue is 'previousCode' state update is async.

                    // CORRECT LOGIC: We should have set previousCode in handleImplementPlan before starting streaming.
                    // Here we just update generatedCode.

                    setGeneratedCode(codeStr);
                    setActiveTab('preview');
                },

                onError: (error) => {
                    toast.error("Implementation Error", { description: error });
                    terminalStore.addEntry('error', error);
                },

                onDone: (meta) => {
                    setIsImplementing(false);
                    setImplementationStatus((prev) => prev ? { ...prev, phase: 'done' } : null);

                    if (meta?.success) {
                        terminalStore.addEntry('success', 'Implementation complete', undefined, 'complete');
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
            if (tokenFlushTimerRef.current) { clearTimeout(tokenFlushTimerRef.current); tokenFlushTimerRef.current = null; }
            flushTokenBuffer();
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

        // Gather all recent error entries from terminal for full context
        const recentErrors = terminalStore.getLatestErrors();
        const terminalErrorContext = recentErrors.length > 0
            ? recentErrors.map((e) => `- ${e.message}${e.detail ? `\n  Detail: ${e.detail}` : ''}`).join('\n')
            : '';

        // Build structured code context so the AI can READ the current files before fixing
        let codeContext = '';
        const files = allGeneratedFiles;
        if (Object.keys(files).length > 0) {
            // If we know the error source file, show it first and in full
            const errorFile = previewError.source;
            const sortedPaths = Object.keys(files).sort((a, b) => {
                // Prioritize the error file at the top
                if (errorFile) {
                    if (a.includes(errorFile) || errorFile.includes(a)) return -1;
                    if (b.includes(errorFile) || errorFile.includes(b)) return 1;
                }
                return a.localeCompare(b);
            });
            codeContext = '\n\nHere are ALL the current project files. READ them carefully before fixing:\n';
            for (const filePath of sortedPaths) {
                codeContext += `\n--- FILE: ${filePath} ---\n${files[filePath]}\n--- END FILE ---\n`;
            }
        }

        // Build a targeted fix prompt
        const fixPrompt = `Fix this runtime error. Do NOT regenerate the entire application. Only fix the specific broken file(s).

ERROR:
${previewError.message}
${previewError.source ? `Source File: ${previewError.source}` : ''}
${previewError.line ? `Line: ${previewError.line}${previewError.column ? `, Column: ${previewError.column}` : ''}` : ''}
${previewError.stack ? `Stack: ${previewError.stack}` : ''}
${terminalErrorContext ? `\nTerminal Errors:\n${terminalErrorContext}` : ''}
${codeContext}
INSTRUCTIONS:
1. Read the error message and stack trace carefully.
2. Identify which file(s) contain the bug.
3. Read the full code of those files above.
4. Fix ONLY the broken file(s) — do not rewrite files that are working.
5. Return the complete corrected file(s) using <ryze_artifact> format.
6. Common fixes: add missing imports, fix undefined variables, initialize arrays with [], add optional chaining ?., fix component export names.`;

        // Use 'chat' mode explicitly to prevent full regeneration
        if (handleSendRef.current) {
            handleSendRef.current(fixPrompt, 'chat');
        }
    };

    // Register the fix-error callback with the terminal store so the @ button works
    // Use a ref to avoid re-renders — handleFixError changes every render due to previewError dep
    const handleFixErrorRef = useRef(handleFixError);
    handleFixErrorRef.current = handleFixError;
    useEffect(() => {
        const cb = () => handleFixErrorRef.current();
        terminalStore.setOnFixError(cb);
        return () => terminalStore.setOnFixError(null);
    }, [terminalStore]);

    // ── Performance: deferred preview HTML ──
    // buildPreviewHtml() is an expensive synchronous operation (heavy regex on
    // potentially 10+ merged files). Running it inline in useMemo blocks the
    // main thread and freezes the UI, especially on mount after a route change.
    //
    // Solution: compute in a deferred useEffect so the component renders the
    // shell immediately, then fills in the iframe HTML on the next frame.
    const [deferredPreviewHtml, setDeferredPreviewHtml] = useState('');
    useEffect(() => {
        // Skip entirely when preview tab isn't active
        if (activeTab !== 'preview') {
            // Don't clear — keep last preview so switching back is instant
            return;
        }
        const previewCode = previewRoute && allGeneratedFiles[previewRoute]
            ? allGeneratedFiles[previewRoute]
            : generatedCode;
        if (!previewCode && Object.keys(allGeneratedFiles).length === 0) {
            setDeferredPreviewHtml('');
            return;
        }
        // Debounce by 50ms — during streaming, files change rapidly
        if (previewBuildTimerRef.current) clearTimeout(previewBuildTimerRef.current);
        previewBuildTimerRef.current = setTimeout(() => {
            setDeferredPreviewHtml(buildPreviewHtml(previewCode, allGeneratedFiles, designTheme?.colors));
        }, 50);
        return () => { if (previewBuildTimerRef.current) clearTimeout(previewBuildTimerRef.current); };
    }, [generatedCode, previewRoute, allGeneratedFiles, designTheme?.colors, activeTab]);
    const memoizedPreviewHtml = deferredPreviewHtml;

    // Memoize the file tree so it's not rebuilt every render (used in code tab + commit messages)
    const memoizedFileTree = useMemo(
        () => buildFileTree(generatedCode, Object.keys(allGeneratedFiles).length > 0 ? allGeneratedFiles : undefined),
        [generatedCode, allGeneratedFiles]
    );

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
                            {/* Sticky Generation Status Header - Shows current action/todo above chat */}
                            {implementationStatus && implementationStatus.phase !== 'done' && (
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="sticky top-0 z-30 px-4 py-3 bg-background/80 backdrop-blur-md border-b border-white/5 shadow-sm"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse relative">
                                            <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-75" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                                                Active Task
                                            </p>
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {implementationStatus.todos.find(t => t.status === 'in_progress')?.label ||
                                                    (implementationStatus.phase === 'installing' ? 'Installing dependencies...' : 'Generating code...')}
                                            </p>
                                        </div>
                                        <div className="text-xs font-mono text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
                                            {implementationStatus.todos.filter(t => t.status === 'completed').length} / {implementationStatus.todos.length}
                                        </div>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="h-1 w-full bg-secondary mt-3 rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-blue-500"
                                            initial={{ width: '0%' }}
                                            animate={{
                                                width: `${(implementationStatus.todos.filter(t => t.status === 'completed').length / Math.max(1, implementationStatus.todos.length)) * 100}%`
                                            }}
                                            transition={{ duration: 0.5 }}
                                        />
                                    </div>
                                </motion.div>
                            )}

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
                                                                            const tree = memoizedFileTree;
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
                                            if (uiPlan) {
                                                // Open the dedicated preview page for JSON plans
                                                const contextId = getContextId();
                                                window.open(`/preview?contextId=${contextId}`, '_blank');
                                            } else {
                                                const previewCode = previewRoute && allGeneratedFiles[previewRoute]
                                                    ? allGeneratedFiles[previewRoute]
                                                    : generatedCode;
                                                if (previewCode) {
                                                    const html = buildPreviewHtml(previewCode, allGeneratedFiles, designTheme?.colors);
                                                    const blob = new Blob([html], { type: 'text/html' });
                                                    const url = URL.createObjectURL(blob);
                                                    window.open(url, '_blank');
                                                }
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

                            {/* Terminal Toggle */}
                            <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 gap-1.5 text-xs ${terminalStore.open ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
                                onClick={() => terminalStore.toggle()}
                                title="Toggle terminal"
                            >
                                <Terminal className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Terminal</span>
                                {terminalStore.entries.filter(e => e.level === 'error').length > 0 && (
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                                )}
                            </Button>

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

                    {/* Content + Terminal */}
                    <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0">
                        <ResizablePanel defaultSize={terminalStore.open ? 70 : 100} minSize={30}>
                            <div className="h-full p-6 overflow-auto bg-[url('/grid-pattern.svg')] bg-[size:40px_40px] bg-fixed">
                                {activeTab === 'preview' && (
                                    <div className={`mx-auto h-full rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 ${device === 'mobile' ? 'max-w-sm' : 'w-full'}`}>
                                        {uiPlan ? (
                                            <div className="h-full overflow-hidden bg-white rounded-2xl flex flex-col shadow-sm border border-border/50 relative">
                                                <div className="absolute top-2 right-2 z-10 px-2 py-1 bg-black/80 text-white text-[10px] rounded-full font-mono backdrop-blur-md">
                                                    Deterministic UI
                                                </div>
                                                <DynamicRenderer plan={uiPlan} />
                                            </div>
                                        ) : (generatedCode || (previewRoute && allGeneratedFiles[previewRoute])) ? (
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
                                                    srcDoc={memoizedPreviewHtml}
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
                                                    files={memoizedFileTree}
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
                        </ResizablePanel>

                        {/* Terminal Panel */}
                        {terminalStore.open && (
                            <>
                                <ResizableHandle withHandle />
                                <ResizablePanel defaultSize={30} minSize={15} maxSize={50}>
                                    <TerminalPanel />
                                </ResizablePanel>
                            </>
                        )}
                    </ResizablePanelGroup>
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

                                {/* Error Location (if available) */}
                                {(previewError.source || previewError.line) && (
                                    <div className="glass rounded-xl p-4 border border-border/50 bg-secondary/10">
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Location</p>
                                        <div className="flex flex-wrap gap-3 text-xs font-mono text-muted-foreground">
                                            {previewError.source && <span>File: <span className="text-foreground">{previewError.source}</span></span>}
                                            {previewError.line && <span>Line: <span className="text-foreground">{previewError.line}</span></span>}
                                            {previewError.column && <span>Col: <span className="text-foreground">{previewError.column}</span></span>}
                                        </div>
                                    </div>
                                )}

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
