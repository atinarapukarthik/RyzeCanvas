import { create } from "zustand";
import { AIModel } from "@/components/ProviderSelector";

interface UIState {
  sidebarOpen: boolean;
  githubConnected: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setGithubConnected: (connected: boolean) => void;
  theme: string;
  toggleTheme: () => void;
  selectedModel: AIModel;
  setSelectedModel: (model: AIModel) => void;
  githubModal: boolean;
  setGithubModal: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  githubConnected: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setGithubConnected: (connected) => set({ githubConnected: connected }),
  theme: "dark",
  toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
  selectedModel: { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "gemini" },
  setSelectedModel: (model) => set({ selectedModel: model }),
  githubModal: false,
  setGithubModal: (open) => set({ githubModal: open }),
}));
