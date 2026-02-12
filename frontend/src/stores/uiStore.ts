import { create } from "zustand";

interface UIState {
  theme: "dark" | "light";
  sidebarOpen: boolean;
  toggleTheme: () => void;
  setTheme: (t: "dark" | "light") => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: "dark",
  sidebarOpen: true,
  toggleTheme: () =>
    set((s) => {
      const next = s.theme === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      return { theme: next };
    }),
  setTheme: (t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
    set({ theme: t });
  },
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
