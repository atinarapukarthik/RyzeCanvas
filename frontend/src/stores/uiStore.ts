import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AIModel } from "@/components/ProviderSelector";

export interface DesignTheme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
  };
  style: string;
  font: string;
}

export const DESIGN_THEMES: DesignTheme[] = [
  {
    id: "modern-dark",
    name: "Modern Dark",
    description: "Sleek dark UI with subtle gradients and clean lines",
    colors: { primary: "#6366f1", secondary: "#8b5cf6", accent: "#06b6d4", background: "#09090b", surface: "#18181b", text: "#fafafa" },
    style: "Dark backgrounds, subtle borders, rounded corners, soft shadows, minimal decorations",
    font: "Inter or system sans-serif",
  },
  {
    id: "glassmorphism",
    name: "Glassmorphism",
    description: "Frosted glass panels with translucency and blur effects",
    colors: { primary: "#3b82f6", secondary: "#8b5cf6", accent: "#f472b6", background: "#0f172a", surface: "rgba(255,255,255,0.05)", text: "#f1f5f9" },
    style: "Translucent panels with backdrop-blur, glass borders (border-white/10), layered depth, gradient overlays",
    font: "Inter or Poppins",
  },
  {
    id: "neon-cyberpunk",
    name: "Neon Cyberpunk",
    description: "Bold neon accents on deep dark backgrounds with glow effects",
    colors: { primary: "#00ff88", secondary: "#ff00ff", accent: "#00d4ff", background: "#0a0a0f", surface: "#141420", text: "#e0e0ff" },
    style: "Neon glows, sharp edges, cyberpunk aesthetic, text-shadow glows, gradient borders, high contrast",
    font: "JetBrains Mono or monospace",
  },
  {
    id: "minimal-light",
    name: "Minimal Light",
    description: "Clean white design with generous whitespace and subtle accents",
    colors: { primary: "#2563eb", secondary: "#7c3aed", accent: "#059669", background: "#ffffff", surface: "#f8fafc", text: "#0f172a" },
    style: "Lots of whitespace, thin borders, subtle hover states, clean typography, light shadows",
    font: "Inter or system sans-serif",
  },
  {
    id: "warm-earth",
    name: "Warm Earth",
    description: "Natural warm tones with organic textures and cozy feel",
    colors: { primary: "#d97706", secondary: "#b45309", accent: "#16a34a", background: "#fefce8", surface: "#fef9c3", text: "#422006" },
    style: "Warm gradients, rounded corners, earthy color transitions, soft shadows, organic shapes",
    font: "Merriweather or serif",
  },
  {
    id: "ocean-breeze",
    name: "Ocean Breeze",
    description: "Cool blue tones inspired by ocean and sky gradients",
    colors: { primary: "#0ea5e9", secondary: "#06b6d4", accent: "#2dd4bf", background: "#0c4a6e", surface: "#164e63", text: "#ecfeff" },
    style: "Blue-to-teal gradients, smooth transitions, wave-like curves, translucent overlays",
    font: "Plus Jakarta Sans or sans-serif",
  },
];

interface UIState {
  sidebarOpen: boolean;
  githubConnected: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setGithubConnected: (connected: boolean) => void;
  theme: string;
  toggleTheme: () => void;
  designTheme: DesignTheme;
  setDesignTheme: (theme: DesignTheme) => void;
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
  githubModal: boolean;
  setGithubModal: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      githubConnected: false,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setGithubConnected: (connected) => set({ githubConnected: connected }),
      theme: "dark",
      toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      designTheme: DESIGN_THEMES[0],
      setDesignTheme: (theme) => set({ designTheme: theme }),
      selectedModel: { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "gemini" },
      setSelectedModel: (model) => set({ selectedModel: model }),
      githubModal: false,
      setGithubModal: (open) => set({ githubModal: open }),
    }),
    {
      name: "ui-storage",
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        theme: state.theme,
        designTheme: state.designTheme,
      }),
    }
  )
);
