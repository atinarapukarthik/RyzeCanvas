import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  githubConnected: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setGithubConnected: (connected: boolean) => void;
  theme: string;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  githubConnected: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setGithubConnected: (connected) => set({ githubConnected: connected }),
  theme: "dark",
  toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
}));
