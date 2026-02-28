/**
 * Build a self-contained HTML page that renders the given React+Tailwind code
 * inside an iframe via srcdoc. Uses CDN-loaded React 18, ReactDOM, Babel, and Tailwind CSS.
 *
 * This is extracted into its own module so it can be imported without pulling in
 * the entire studio page (which is 4000+ lines).
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
    let files = allFiles ? { ...allFiles } : {};

    // If no structured files are provided, start by adding 'code' to parse
    if (Object.keys(files).length === 0 && code.trim()) {
        files['__generated_dump__'] = code;
    }

    // Parse any file that contains a multi-file dump (e.g. LLM outputting multiple files inside one field)
    for (const [key, val] of Object.entries(files)) {
        if (typeof val === 'string' && (val.match(/(?:^|\n)\/\/\s+[\w\-\/]+\.(?:tsx|ts|jsx|js|css|json)/) || val.includes('// tsconfig.json'))) {
            delete files[key]; // Remove the unparsed blob
            const lines = val.split('\n');
            let currentFile = '';
            let currentContent: string[] = [];

            for (const line of lines) {
                const match = line.match(/^(?:\/\/|###)\s+((?:src\/|app\/|pages\/|components\/|lib\/|styles\/)?[\w\-\/]+\.(?:tsx|ts|jsx|js|css|json|html|md))$/);
                if (match) {
                    if (currentFile) {
                        files[currentFile] = currentContent.join('\n').trim();
                    }
                    currentFile = match[1].trim();
                    currentContent = [];
                } else {
                    if (currentFile || line.trim()) {
                        currentContent.push(line);
                    }
                }
            }
            if (currentFile) {
                files[currentFile] = currentContent.join('\n').trim();
            }
        }
    }

    // ── Multi-file merge ──
    let mergedCode = code;

    if (files && Object.keys(files).length > 0) {
        const componentFiles: { path: string; code: string }[] = [];
        const mainFilePaths = [
            'src/app/page.tsx', 'src/app/page.jsx',
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

        // Determine the entry point — prefer src/app/page.tsx first
        const mainFile =
            files['src/app/page.tsx'] ||
            files['src/app/page.jsx'] ||
            files['src/App.tsx'] ||
            files['src/App.jsx'] ||
            files['app/page.tsx'] ||
            files['app/page.jsx'] ||
            files['src/pages/index.tsx'] ||
            files['src/pages/index.jsx'] ||
            files['pages/index.tsx'] ||
            files['pages/index.jsx'] ||
            Object.values(files).find(v => v.includes('export default function App') || v.includes('export default function Home') || v.includes('export default function Page')) ||
            code;

        if (componentFiles.length > 0) {
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

    // Detect if the code is JSON
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

    // Extract the component name from the LAST default export
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
        const arrowFn = mergedCode.match(/(?:export\s+)?const\s+(App|Home|Page|Main)\s*(?::\s*React\.FC)?\s*=/);
        if (arrowFn) {
            componentName = arrowFn[1];
        } else {
            const standaloneFn = mergedCode.match(/^function\s+(\w+)/m);
            if (standaloneFn) componentName = standaloneFn[1];
        }
    }

    const importedNames = new Set<string>();
    const importRegex = /import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
    const defaultImportRegex = /import\s+(?:type\s+)?(\w+)\s+from\s+['"]([^'"]+)['"]/g;

    let match;
    while ((match = importRegex.exec(mergedCode)) !== null) {
        const [, names, module] = match;
        if (module !== 'react' && module !== 'react-dom') {
            names.split(',').forEach(n => {
                const alias = n.trim().split(' as ')[1]?.trim() || n.trim();
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
        .replace(/^\s*import[\s\S]*?from\s*['"][^'"]*['"];?\s*$/gm, '')
        .replace(/^\s*import\s*['"][^'"]*['"];?\s*$/gm, '')
        .replace(/^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(\w+)/gm, 'var $1 = function')
        .replace(/^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\(/gm, 'var __DefaultExport__ = function(')
        .replace(/^\s*export\s+default\s+[A-Z]\w*\s*;?\s*$/gm, '')
        .replace(/^\s*export\s+default\s+/gm, 'var __DefaultExport__ = ')
        .replace(/^\s*(?:export\s+)?class\s+(\w+)/gm, 'var $1 = class')
        .replace(/^\s*(?:export\s+)?(?:const|let)\s+/gm, 'var ')
        .replace(/^\s*(?:export\s+)?type\s+\w+(?:<[^>]*>)?\s*=\s*\{[\s\S]*?\};?\s*$/gm, '')
        .replace(/^\s*(?:export\s+)?type\s+\w+(?:<[^>]*>)?\s*=\s*[^;{]*;?\s*$/gm, '')
        .replace(/^\s*(?:export\s+)?interface\s+\w+(?:\s+extends\s+[\w,\s]+)?(?:<[^>]*>)?\s*\{[\s\S]*?\}\s*$/gm, '')
        .replace(/^\s*['"]use (?:client|server)['"];?\s*$/gm, '')
        .replace(/(?<=[(\\s,])(\w+)\s*:\s*(?:string|number|boolean|any|void|null|undefined|never|unknown|object|React\.\w+(?:<[^>]*>)?|Array<[^>]*>|Record<[^>]*>|Partial<[^>]*>|Omit<[^>]*>|Pick<[^>]*>|\w+(?:\[\])?)(?=[=,)\n])/g, '$1')
        .replace(/(\w+)\s*:\s*\{[^}]*\}/g, '$1')
        .replace(/<[A-Z]\w*(?:\s+extends\s+[^>]+)?(?:\s*,\s*[A-Z]\w*(?:\s+extends\s+[^>]+)?)*>\s*(?=\()/g, '')
        .replace(/(?<=\w)<(?:string|number|boolean|any|[A-Z]\w*)(?:\s*,\s*(?:string|number|boolean|any|[A-Z]\w*))*>\s*(?=\()/g, '')
        .replace(/\s+as\s+(?:const|string|number|boolean|any|unknown|typeof\s+\w+|\w+(?:<[^>]*>)?(?:\[\])?)(?=\b)/g, '')
        .replace(/:\s*React\.FC(?:<[^>]*>)?\s*(?==)/g, ' ')
        .replace(/:\s*(?:React\.)?(?:FC|FunctionComponent|ComponentProps|HTMLAttributes)(?:<[^>]*>)?\s*(?==)/g, ' ')
        .replace(/\)\s*:\s*(?:void|string|number|boolean|any|null|undefined|never|unknown|React\.(?:ReactNode|ReactElement|JSX\.Element)|JSX\.Element|\w+(?:<[^>]*>)?(?:\[\])?)\s*(?=\{)/g, ') ')
        .replace(/\)\s*:\s*Promise<[^>]*>\s*(?=\{)/g, ') ')
        .replace(/(?<=useState|useRef|useCallback|useMemo|useContext|useReducer)<[^>]+>/g, '')
        .replace(/!(?=\.|[|)])/g, '')
        .replace(/\s+satisfies\s+\w+(?:<[^>]*>)?/g, '')
        .replace(/\breadonly\s+(?=\w)/g, '')
        .replace(/\bkeyof\s+typeof\s+\w+/g, 'string')
        .replace(/\)\s*:\s*\w+\s+is\s+\w+(?:<[^>]*>)?\s*(?=\{)/g, ') ')
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
        .replace(/^\s*import\s+type\b[^;]*;?\s*$/gm, '');

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
        'ChevronFirst', 'ChevronLast', 'ChevronsUpDown', 'ArrowUpDown', 'Rocket',
        'Sparkles', 'BrainCircuit', 'Code2', 'FolderTree', 'ListTodo', 'Wrench',
        'ShieldCheck', 'TerminalSquare', 'Cpu', 'FileCode', 'GitBranch',
    ];

    const inlineStubNames = new Set([
        'Link', 'NavLink', 'Navigate', 'Outlet', 'Route', 'Routes', 'Router',
        'BrowserRouter', 'HashRouter', 'MemoryRouter',
    ]);
    const safeIcons = allIconNames.filter(name => !declaredNames.has(name) && !inlineStubNames.has(name));
    const iconDestructuring = safeIcons.length > 0
        ? `const { ${safeIcons.join(', ')} } = lucideReact;`
        : '// All icon names conflict with user code';

    const reactGlobals = new Set(['useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'useContext', 'createContext', 'useReducer', 'useId', 'Fragment', 'forwardRef', 'memo', 'Suspense']);
    const cdnProvided = new Set([
        'clsx', 'cn', 'twMerge',
        'useForm', 'useController', 'useFieldArray', 'useWatch', 'FormProvider', 'useFormContext',
        'BrowserRouter', 'HashRouter', 'MemoryRouter', 'Router', 'Routes', 'Route',
        'Link', 'NavLink', 'Navigate', 'Outlet',
        'useNavigate', 'useLocation', 'useParams', 'useSearchParams', 'useMatch', 'useRoutes',
        'motion', 'AnimatePresence',
        'axios', 'io',
    ]);

    const stubsToGenerate = Array.from(importedNames).filter(n =>
        /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(n) &&
        !reactGlobals.has(n) &&
        !allIconNames.includes(n) &&
        !declaredNames.has(n) &&
        !cdnProvided.has(n)
    );
    const importStubs = stubsToGenerate.length > 0
        ? stubsToGenerate.map(n => {
            if (n.startsWith('use')) {
                return `const ${n} = (...args) => { const [s, ss] = React.useState(args[0]); return typeof args[0] === 'undefined' ? [s, ss] : s; };`;
            }
            return `const ${n} = React.forwardRef((props, ref) => React.createElement('div', { ...props, ref }, props.children));`;
        }).join('\n')
        : '';

    let inlineCss = '';
    if (files && Object.keys(files).length > 0) {
        for (const [filePath, fileCode] of Object.entries(files)) {
            if (filePath.endsWith('.css') && typeof fileCode === 'string') {
                const strippedCss = fileCode
                    .replace(/@tailwind\s+\w+;?\s*/g, '')
                    .replace(/@import\s+[^;]+;?\s*/g, '')
                    .replace(/@apply\s+([^;]+);/g, (_, classes) => `/* @apply ${classes} */`)
                    .trim();
                if (strippedCss) {
                    inlineCss += `\n/* === ${filePath} === */\n${strippedCss}\n`;
                }
            }
        }
    }

    const themeColorsBlock = themeColors ? `colors: {
                        theme: {
                            primary: '${themeColors.primary || '#6366f1'}',
                            secondary: '${themeColors.secondary || '#8b5cf6'}',
                            accent: '${themeColors.accent || '#06b6d4'}',
                            background: '${themeColors.background || '#09090b'}',
                            surface: '${themeColors.surface || '#18181b'}',
                            text: '${themeColors.text || '#fafafa'}',
                        },` : 'colors: {';

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
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600;700&family=Merriweather:wght@300;400;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <style>
        body { margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        #root { min-height: 100vh; }
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
        html { scroll-behavior: smooth; }
        .glow { filter: drop-shadow(0 0 10px currentColor); }
        ${inlineCss}
    </style>
    <script>
        if (typeof tailwind !== 'undefined') { tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'system-ui', 'sans-serif'],
                        mono: ['JetBrains Mono', 'monospace'],
                        serif: ['Merriweather', 'serif'],
                        display: ['Poppins', 'sans-serif'],
                    },
                    ${themeColorsBlock}
                    },
                    animation: {
                        'fadeIn': 'fadeIn 0.6s ease-out forwards',
                        'slideUp': 'slideUp 0.8s ease-out forwards',
                        'gradient': 'gradient 6s ease infinite',
                        'float': 'float 3s ease-in-out infinite',
                        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                        'shimmer': 'shimmer 2s linear infinite',
                    },
                },
            },
        }; }
    </script>
    <script>
        window.addEventListener('error', function(event) {
            window.parent.postMessage({ type: 'preview-error', error: { message: event.message, source: event.filename, line: event.lineno, stack: event.error?.stack } }, '*');
        });
        window.addEventListener('unhandledrejection', function(event) {
            window.parent.postMessage({ type: 'preview-error', error: { message: event.reason?.message || String(event.reason), stack: event.reason?.stack } }, '*');
        });
        window.addEventListener('click', function(e) {
            const link = e.target.closest('a');
            if (link) {
                const href = link.getAttribute('href');
                if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
                if (link.href) {
                    try {
                        const url = new URL(link.href);
                        if (url.origin === window.location.origin) {
                            e.preventDefault();
                            window.parent.postMessage({ type: 'preview-navigation', path: url.pathname }, '*');
                        }
                    } catch(err) {}
                }
            }
        }, true);
    </script>
</head>
<body>
    <div id="root"></div>
    <script type="text/plain" id="app-code">
        const { useState, useEffect, useRef, useMemo, useCallback, useContext, createContext,
                useReducer, useId, Fragment, forwardRef, memo, Suspense } = React;
        var exports = {};
        var module = { exports: exports };
        const clsx = window.clsx;
        const cn = (...inputs) => clsx(...inputs);
        const twMerge = (...inputs) => clsx(...inputs);
        const { useForm, useController, useFieldArray, useWatch, FormProvider, useFormContext } = window.ReactHookForm || {};

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
            User: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
            Bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
            Settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
            Mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
            Check: '<polyline points="20 6 9 17 4 12"/>',
            Plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
            ArrowRight: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
            ArrowLeft: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
            ExternalLink: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
            Home: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
            Zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
            Globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
            Code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
            Eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
            CheckCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
            Play: '<polygon points="5 3 19 12 5 21 5 3"/>',
            Download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
            Clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
            Loader2: '<line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>',
            Trash2: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
            Users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
            Shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
            TrendingUp: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
        };
        const iconHandler = {
            get(target, prop) {
                if (prop === '__esModule') return false;
                return function LucideIcon(props) {
                    const size = props?.size || 24;
                    const pathData = lucideIconPaths[prop] || '<circle cx="12" cy="12" r="10"/>';
                    return React.createElement('svg', {
                        width: size, height: size, viewBox: '0 0 24 24',
                        fill: 'none', stroke: 'currentColor', strokeWidth: 2,
                        strokeLinecap: 'round', strokeLinejoin: 'round',
                        className: props?.className || '',
                        style: props?.style, onClick: props?.onClick,
                        dangerouslySetInnerHTML: { __html: pathData },
                    });
                };
            }
        };
        const lucideReact = new Proxy({}, iconHandler);
        ${iconDestructuring}

        ${importStubs}

        if (typeof icon === 'undefined') { var icon = (props) => React.createElement('div', props, 'Icon'); }
        if (typeof Icon === 'undefined') { var Icon = (props) => React.createElement('div', props, 'Icon'); }
        if (typeof t === 'undefined') { var t = (s) => s; }
        if (typeof image === 'undefined') { var image = 'https://placehold.co/400x300'; }
        if (typeof color === 'undefined') { var color = '#6366f1'; }
        if (typeof items === 'undefined') { var items = []; }
        if (typeof data === 'undefined') { var data = []; }
        if (typeof loading === 'undefined') { var loading = false; }
        if (typeof error === 'undefined') { var error = null; }
        if (typeof onClick === 'undefined') { var onClick = () => {}; }
        if (typeof onChange === 'undefined') { var onChange = () => {}; }
        if (typeof onSubmit === 'undefined') { var onSubmit = (e) => { if (e && e.preventDefault) e.preventDefault(); }; }

        const motion = new Proxy({}, {
            get(target, prop) {
                return React.forwardRef(function MotionComponent(props, ref) {
                    const { initial, animate, exit, transition, whileHover, whileTap, variants, ...rest } = props;
                    return React.createElement(prop, { ...rest, ref });
                });
            }
        });
        const AnimatePresence = ({ children }) => children;

        const __RouterContext__ = React.createContext({ path: '/', navigate: () => {}, params: {} });
        function BrowserRouter({ children }) {
            const [path, setPath] = React.useState(window.location.hash.slice(1) || '/');
            React.useEffect(() => {
                const onHash = () => setPath(window.location.hash.slice(1) || '/');
                window.addEventListener('hashchange', onHash);
                return () => window.removeEventListener('hashchange', onHash);
            }, []);
            const navigate = React.useCallback((to) => { if (typeof to === 'number') { window.history.go(to); return; } window.location.hash = to; }, []);
            return React.createElement(__RouterContext__.Provider, { value: { path, navigate, params: {} } }, children);
        }
        const HashRouter = BrowserRouter; const MemoryRouter = BrowserRouter; const Router = BrowserRouter;
        function Routes({ children }) {
            const { path } = React.useContext(__RouterContext__);
            const childArray = React.Children.toArray(children);
            for (const child of childArray) {
                if (child?.props?.index && path === '/') return child.props.element || child.props.children || null;
                if (child?.props?.path) {
                    const routePath = child.props.path;
                    if (routePath === '*' || routePath === path || (routePath !== '/' && path.startsWith(routePath + '/'))) {
                        return child.props.element || child.props.children || null;
                    }
                    if (routePath === '/' && path === '/') return child.props.element || child.props.children || null;
                }
            }
            const wildcard = childArray.find(c => c?.props?.path === '*');
            return wildcard ? (wildcard.props.element || wildcard.props.children || null) : null;
        }
        function Route({ element, children }) { return element || children || null; }
        function Link({ to, children, className, style, onClick, ...rest }) {
            return React.createElement('a', { href: '#' + (to || '/'), className, style, ...rest, onClick: (e) => { if (onClick) onClick(e); } }, children);
        }
        function NavLink({ to, children, className, style, ...rest }) {
            const { path } = React.useContext(__RouterContext__);
            const isActive = path === to;
            const cls = typeof className === 'function' ? className({ isActive }) : className;
            const stl = typeof style === 'function' ? style({ isActive }) : style;
            return React.createElement(Link, { to, className: cls, style: stl, ...rest }, children);
        }
        function Navigate({ to }) {
            const { navigate } = React.useContext(__RouterContext__);
            React.useEffect(() => { if (to) navigate(to); }, []);
            return null;
        }
        function Outlet() { return null; }
        function useNavigate() { return React.useContext(__RouterContext__).navigate; }
        function useLocation() { const { path } = React.useContext(__RouterContext__); return { pathname: path, search: '', hash: '', state: null }; }
        function useParams() { return React.useContext(__RouterContext__).params; }
        function useSearchParams() { return [new URLSearchParams(), () => {}]; }
        function useMatch() { return null; }

        const __mockPromise__ = Promise.resolve({ data: {}, status: 200 });
        const axios = { get: () => __mockPromise__, post: () => __mockPromise__, put: () => __mockPromise__, delete: () => __mockPromise__, patch: () => __mockPromise__, create: () => axios, defaults: { headers: { common: {} } }, interceptors: { request: { use: () => {} }, response: { use: () => {} } } };
        const io = () => ({ on: () => {}, emit: () => {}, off: () => {}, disconnect: () => {}, connect: () => {}, connected: false });

        ${codeWithoutImports}

        const __resolveAppComponent__ = () => {
            if (typeof __DefaultExport__ !== 'undefined') return __DefaultExport__;
            if (typeof ${componentName} !== 'undefined') return ${componentName};
            if (typeof App !== 'undefined') return App;
            if (typeof Home !== 'undefined') return Home;
            if (typeof Page !== 'undefined') return Page;
            if (typeof Main !== 'undefined') return Main;
            return () => React.createElement('div', { style: { padding: 40, textAlign: 'center', color: '#888', fontFamily: 'sans-serif' } }, 'No root component found. Make sure your code has an export default.');
        };
        const AppComponent = __resolveAppComponent__();
        const container = document.getElementById('root');
        try {
            if (ReactDOM.createRoot) {
                const root = ReactDOM.createRoot(container);
                root.render(React.createElement(AppComponent));
            } else {
                ReactDOM.render(React.createElement(AppComponent), container);
            }
        } catch (err) {
            console.error('Mount error:', err);
            window.parent.postMessage({ type: 'preview-error', error: { message: err?.message || String(err), stack: err?.stack, source: 'app-mount' } }, '*');
            if (container) container.innerHTML = '<div style="color:red;padding:20px">Failed to mount application. See console.</div>';
        }
    </script>

    <script>
    (function() {
        var codeEl = document.getElementById('app-code');
        if (!codeEl) return;
        var code = codeEl.textContent;

        function tryTransform(src, label) {
            try {
                var result = Babel.transform(src, { presets: ['env', 'react', 'typescript'], filename: 'app.tsx' });
                return result.code;
            } catch (e) {
                console.warn('[Babel ' + label + ']', e.message);
                return null;
            }
        }

        var compiled = tryTransform(code, 'attempt 1');
        if (!compiled) {
            var cleaned = code
                .replace(/\\)\\s*:\\s*[A-Z][\\w.]*(?:<[^>]*>)?(?:\\[\\])?\\s*(?=\\{)/g, ') ')
                .replace(/\\)\\s*:\\s*(?:void|string|number|boolean|any|null|undefined|never|unknown)\\s*(?=\\{)/g, ') ')
                .replace(/(\\w+)\\s*:\\s*(?:string|number|boolean|any|void|null|undefined|never|unknown|object)(?:\\[\\])?(?=\\s*[,)=])/g, '$1')
                .replace(/\\s+as\\s+(?:const|string|number|boolean|any|unknown|\\w+)\\b/g, '')
                .replace(/!(?=\\.|\\[|\\))/g, '');
            compiled = tryTransform(cleaned, 'attempt 2');
        }

        if (compiled) {
            try { (0, eval)(compiled); } catch (e) {
                console.error('[Preview] Runtime error:', e);
                window.parent.postMessage({ type: 'preview-error', error: { message: e.message, stack: e.stack, source: 'app-runtime' } }, '*');
            }
        } else {
            var container = document.getElementById('root');
            if (container) container.innerHTML = '<div style="color:#ff6b6b;padding:20px;font-family:monospace;">Compilation Error: Could not process the generated code.</div>';
        }
    })();
    </script>
</body>
</html>`;
}
