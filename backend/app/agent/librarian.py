"""
Librarian Agent for RyzeCanvas.
Node 1.5: The Project Structure Authority.

This node is critical — it generates ALL boilerplate and config files
that form the foundation of the generated project. The CodeSmith (Node 3)
should never need to create package.json, tsconfig, next.config, etc.
The Librarian owns the skeleton; the CodeSmith fills it with features.
"""
import os
import re
import json
from typing import Dict, Any, List


# ──────────────────────────────────────────────────
# Boilerplate Templates (Next.js 15 + Tailwind v4)
# ──────────────────────────────────────────────────

def _package_json(manifest: Dict[str, Any]) -> str:
    """Generate a production-grade package.json from the manifest."""
    project_name = manifest.get("projectName", "ryze-project").lower().replace(" ", "-")
    deps = manifest.get("dependencies", [])

    # Core dependencies that every Next.js 15 project needs
    base_dependencies = {
        "next": "15.1.0",
        "react": "^19.0.0",
        "react-dom": "^19.0.0",
        "lucide-react": "^0.468.0",
        "clsx": "^2.1.1",
        "tailwind-merge": "^2.6.0",
    }

    # Parse any extra deps from the manifest
    for dep in deps:
        name = dep.strip()
        if name and name not in base_dependencies:
            base_dependencies[name] = "latest"

    base_dev_dependencies = {
        "typescript": "^5.7.0",
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        "@types/node": "^22.0.0",
        "tailwindcss": "^4.0.0",
        "@tailwindcss/postcss": "^4.0.0",
        "postcss": "^8.5.0",
        "eslint": "^9.0.0",
        "eslint-config-next": "15.1.0",
    }

    pkg = {
        "name": project_name,
        "version": "0.1.0",
        "private": True,
        "scripts": {
            "dev": "next dev --turbopack",
            "build": "next build",
            "start": "next start",
            "lint": "next lint"
        },
        "dependencies": base_dependencies,
        "devDependencies": base_dev_dependencies,
    }
    return json.dumps(pkg, indent=2)


def _tsconfig_json() -> str:
    """Generate tsconfig.json for Next.js 15."""
    config = {
        "compilerOptions": {
            "target": "ES2017",
            "lib": ["dom", "dom.iterable", "esnext"],
            "allowJs": True,
            "skipLibCheck": True,
            "strict": True,
            "noEmit": True,
            "esModuleInterop": True,
            "module": "esnext",
            "moduleResolution": "bundler",
            "resolveJsonModule": True,
            "isolatedModules": True,
            "jsx": "preserve",
            "incremental": True,
            "plugins": [{"name": "next"}],
            "paths": {"@/*": ["./src/*"]}
        },
        "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        "exclude": ["node_modules"]
    }
    return json.dumps(config, indent=2)


def _next_config() -> str:
    """Generate next.config.mjs."""
    return """/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
};

export default nextConfig;
"""


def _postcss_config() -> str:
    """Generate postcss.config.mjs for Tailwind v4."""
    return """/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
"""


def _tailwind_config() -> str:
    """Generate tailwind.config.ts."""
    return """import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
"""


def _globals_css(manifest: Dict[str, Any]) -> str:
    """Generate globals.css with the Architect's design system baked in."""
    ds = manifest.get("designSystem", {})
    colors = ds.get("colors", {})
    typo = ds.get("typography", {})

    primary = colors.get("primary", "#00f5ff")
    bg_dark = colors.get("backgroundDark", "#0a0a0a")
    surface = colors.get("surfaceNeutrals", "#1a1a2e")
    accent = colors.get("accent", "#7c3aed")
    heading_font = typo.get("heading", "Inter")
    body_font = typo.get("body", "Inter")

    return f"""@import "tailwindcss";

:root {{
  --color-primary: {primary};
  --color-bg-dark: {bg_dark};
  --color-surface: {surface};
  --color-accent: {accent};
  --font-heading: '{heading_font}', sans-serif;
  --font-body: '{body_font}', sans-serif;
}}

* {{
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}}

body {{
  font-family: var(--font-body);
  background: var(--color-bg-dark);
  color: #ffffff;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}}

h1, h2, h3, h4, h5, h6 {{
  font-family: var(--font-heading);
}}
"""


def _root_layout(manifest: Dict[str, Any]) -> str:
    """Generate the root layout.tsx with proper metadata and font loading."""
    project_name = manifest.get("projectName", "RyzeCanvas App")
    ds = manifest.get("designSystem", {})
    typo = ds.get("typography", {})
    heading_font = typo.get("heading", "Inter")
    body_font = typo.get("body", "Inter")

    # Sanitize font names to valid Next.js imports (e.g. "Space Grotesk" -> "Space_Grotesk")
    heading_import = heading_font.replace(" ", "_")
    body_import = body_font.replace(" ", "_")

    # If both fonts are the same, import only once
    if heading_import == body_import:
        return f"""import type {{ Metadata }} from "next";
import {{ {heading_import} }} from "next/font/google";
import "./globals.css";

const mainFont = {heading_import}({{ subsets: ["latin"] }});

export const metadata: Metadata = {{
  title: "{project_name}",
  description: "Generated by RyzeCanvas AI Orchestration Engine",
}};

export default function RootLayout({{
  children,
}}: Readonly<{{
  children: React.ReactNode;
}}>) {{
  return (
    <html lang="en">
      <body className={{mainFont.className}}>
        {{children}}
      </body>
    </html>
  );
}}
"""
    else:
        return f"""import type {{ Metadata }} from "next";
import {{ {heading_import}, {body_import} }} from "next/font/google";
import "./globals.css";

const headingFont = {heading_import}({{ subsets: ["latin"], variable: "--font-heading" }});
const bodyFont = {body_import}({{ subsets: ["latin"], variable: "--font-body" }});

export const metadata: Metadata = {{
  title: "{project_name}",
  description: "Generated by RyzeCanvas AI Orchestration Engine",
}};

export default function RootLayout({{
  children,
}}: Readonly<{{
  children: React.ReactNode;
}}>) {{
  return (
    <html lang="en" className={{`${{headingFont.variable}} ${{bodyFont.variable}}`}}>
      <body className={{bodyFont.className}}>
        {{children}}
      </body>
    </html>
  );
}}
"""


def _cn_utility() -> str:
    """Generate src/lib/utils.ts with the cn() merge utility."""
    return """import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
"""


def _next_env_dts() -> str:
    """Generate next-env.d.ts."""
    return """/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.
"""


# ──────────────────────────────────────────────────
# Librarian Agent Class
# ──────────────────────────────────────────────────

class LibrarianAgent:
    """
    Node 1.5: The Project Structure Authority.

    Responsibilities:
    1. Scaffold ALL directories needed by the project.
    2. Generate ALL config/boilerplate files (package.json, tsconfig, next.config,
       tailwind.config, postcss.config, globals.css, root layout, cn utility).
    3. Enforce naming conventions (kebab-case) on every path.
    4. Parse the manifest's fileManifest to pre-create directories for every
       declared file, so the CodeSmith never hits a "directory not found" error.

    The Librarian is the gatekeeper for project structure. Nothing gets through
    without being validated and normalized.
    """

    def __init__(self, workspace_root: str):
        self.workspace_root = workspace_root
        self.created_dirs: List[str] = []
        self.created_files: List[str] = []

    def generate_scaffolding(self, manifest: Dict[str, Any]) -> Dict[str, Any]:
        """
        Master method: Creates the entire project skeleton from the manifest.
        Returns a report of everything that was created.
        """
        self._create_directory_tree(manifest)
        self._generate_config_files(manifest)
        self._generate_boilerplate_files(manifest)

        return {
            "created_dirs": self.created_dirs,
            "created_files": self.created_files,
            "workspace": self.workspace_root,
        }

    def _create_directory_tree(self, manifest: Dict[str, Any]):
        """Create all directories: standard folders + manifest-declared file paths."""
        # Standard Next.js App Router directory structure
        standard_folders = [
            "src/app",
            "src/components/ui",
            "src/components/shared",
            "src/lib",
            "src/hooks",
            "src/types",
            "public/images",
            "public/fonts",
        ]

        # Also extract directories from the manifest's fileManifest
        file_manifest = manifest.get("fileManifest", [])
        for item in file_manifest:
            file_path = item.get("path", "")
            if file_path:
                # Normalize and get the directory part
                normalized = self.validate_path(file_path)
                dir_part = os.path.dirname(normalized)
                if dir_part and dir_part not in standard_folders:
                    standard_folders.append(dir_part)

        for folder in standard_folders:
            folder_path = os.path.join(self.workspace_root, folder)
            if not os.path.exists(folder_path):
                os.makedirs(folder_path, exist_ok=True)
                self.created_dirs.append(folder)

    def _generate_config_files(self, manifest: Dict[str, Any]):
        """Generate all project configuration files."""
        config_files = {
            "package.json": _package_json(manifest),
            "tsconfig.json": _tsconfig_json(),
            "next.config.mjs": _next_config(),
            "postcss.config.mjs": _postcss_config(),
            "tailwind.config.ts": _tailwind_config(),
            "next-env.d.ts": _next_env_dts(),
        }

        for filename, content in config_files.items():
            file_path = os.path.join(self.workspace_root, filename)
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            self.created_files.append(filename)

    def _generate_boilerplate_files(self, manifest: Dict[str, Any]):
        """Generate boilerplate source files that form the project's foundation."""
        boilerplate_files = {
            "src/app/globals.css": _globals_css(manifest),
            "src/app/layout.tsx": _root_layout(manifest),
            "src/lib/utils.ts": _cn_utility(),
        }

        for filepath, content in boilerplate_files.items():
            full_path = os.path.join(self.workspace_root, filepath)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(content)
            self.created_files.append(filepath)

    def validate_path(self, file_path: str) -> str:
        """
        Enforce kebab-case and correct structure for a given file path.
        For example: src/Components/MyButton.tsx -> src/components/ui/my-button.tsx
        """
        path_parts = file_path.replace("\\", "/").split("/")

        # Process the filename
        filename = path_parts[-1]
        name, ext = os.path.splitext(filename)

        # Convert CamelCase to kebab-case for code files
        if ext.lower() in [".tsx", ".ts", ".jsx", ".js", ".css"]:
            # Insert hyphens before uppercase letters (but not at the start)
            name = re.sub(r'(?<!^)(?=[A-Z])', '-', name).lower()
            filename = name + ext

        path_parts[-1] = filename

        # Enforce components/ui structure
        lower_parts = [p.lower() for p in path_parts]
        if "components" in lower_parts:
            components_idx = lower_parts.index("components")
            # If there's a file directly under components/ (no ui/ or shared/ subfolder)
            if (len(path_parts) > components_idx + 1 and
                    path_parts[components_idx + 1].lower() not in ["ui", "shared", "layout", "providers"]):
                # Check if next part is a file or directory
                next_part = path_parts[components_idx + 1]
                if "." in next_part:
                    # It's a file directly under components/, move to components/ui/
                    path_parts.insert(components_idx + 1, "ui")

        # Lowercase all directory segments (keep filename casing from above)
        normalized_parts = [
            p.lower() if i < len(path_parts) - 1 else p
            for i, p in enumerate(path_parts)
        ]

        return "/".join(normalized_parts)

    def get_generated_file_list(self) -> List[str]:
        """Returns the list of all files generated by the Librarian."""
        return self.created_files.copy()


def get_librarian_agent(workspace_root: str) -> LibrarianAgent:
    """Factory function for the Librarian agent."""
    return LibrarianAgent(workspace_root=workspace_root)
