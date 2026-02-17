"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { fetchProjects, deleteProject } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore, DESIGN_THEMES, DesignTheme } from "@/stores/uiStore";
import { Scene } from "@/components/ui/neon-raymarcher";
import { PromptBox } from "@/components/ui/prompt-box";
import {
  Sparkles,
  FolderOpen,
  Code2,
  ArrowRight,
  Zap,
  Clock,
  Globe,
  Cpu,
  Trash2,
  Palette,
  Check,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const selectedModel = useUIStore((s) => s.selectedModel);
  const designTheme = useUIStore((s) => s.designTheme);
  const setDesignTheme = useUIStore((s) => s.setDesignTheme);
  const [currentMode, setCurrentMode] = useState<"plan" | "build">("build");
  const [webSearchActive, setWebSearchActive] = useState(false);
  const queryClient = useQueryClient();

  const { data: projects, isLoading, error, refetch } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    enabled: !!user,
    retry: 2,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
      toast.success("Project deleted");
    },
    onError: (err: Error) => {
      toast.error("Failed to delete project", { description: err.message });
    },
  });

  const handleDelete = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();
    if (confirm("Delete this project? This action cannot be undone.")) {
      deleteMutation.mutate(projectId);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const firstName = user?.name?.split(" ")[0] || "there";

  const handleSend = useCallback((message: string, mode: "plan" | "build" = "build", options?: { webSearch?: boolean }) => {
    const params = new URLSearchParams();
    params.set('prompt', message);
    params.set('mode', mode);
    if (options?.webSearch) params.set('webSearch', 'true');
    router.push(`/studio?${params.toString()}`);
  }, [router]);

  const handleOpenProject = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  const allProjects = projects || [];

  return (
    <div className="relative h-screen bg-black overflow-hidden">
      {/* Neon Raymarcher Background */}
      <div className="absolute inset-0 z-0">
        <ErrorBoundary fallback={<div className="w-full h-full bg-black/50" />}>
          <Scene />
        </ErrorBoundary>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-start w-full h-full pt-[12vh] px-4 overflow-y-auto pb-12 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <ErrorBoundary>
          {/* Greeting & Title */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-8"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 200 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl mb-6 shadow-2xl"
            >
              <Sparkles className="h-3.5 w-3.5 text-[hsl(234,89%,74%)]" />
              <span className="text-xs font-semibold text-white/50 tracking-wide">AI-Powered Canvas</span>
            </motion.div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight">
              {getGreeting()},{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-[hsl(234,89%,74%)] to-[hsl(280,72%,68%)]">
                {firstName}
              </span>
            </h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-white/30 text-base md:text-lg mt-4 max-w-md mx-auto leading-relaxed"
            >
              What would you like to create today?
            </motion.p>
          </motion.div>

          {/* Prompt Box */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-2xl mb-6"
          >
            <PromptBox onSend={handleSend} onModeChange={setCurrentMode} onWebSearchChange={setWebSearchActive} />
          </motion.div>

          {/* Quick Suggestion Chips */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-wrap justify-center gap-2 mb-12 max-w-2xl items-center"
          >
            <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/[0.02] border border-white/[0.05] mr-2">
              <span className="text-[10px] uppercase tracking-wider text-white/30 font-bold">
                Mode: <span className={currentMode === "plan" ? "text-amber-400" : "text-[hsl(234,89%,74%)]"}>{currentMode === "plan" ? "Plan" : "Build"}</span>
                {webSearchActive && <><span className="text-white/10 mx-1.5">|</span><Globe className="inline h-2.5 w-2.5 text-blue-400" /> <span className="text-blue-400">Web</span></>}
                <span className="text-white/10 mx-1.5">|</span><Cpu className="inline h-2.5 w-2.5 text-white/20" /> <span className="text-white/40">{selectedModel?.name || "AI"}</span>
              </span>
            </div>
            {[
              { label: "Landing page", icon: Code2 },
              { label: "Dashboard UI", icon: Zap },
              { label: "Portfolio site", icon: Sparkles },
              { label: "E-commerce page", icon: FolderOpen },
            ].map((suggestion) => (
              <button
                key={suggestion.label}
                onClick={() => handleSend(`Build a ${suggestion.label.toLowerCase()}`, currentMode)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/[0.08] text-white/50 text-sm hover:bg-white/[0.08] hover:text-white hover:border-white/20 transition-all duration-300 backdrop-blur-xl shadow-lg"
              >
                <suggestion.icon className="h-3.5 w-3.5" />
                {suggestion.label}
              </button>
            ))}
          </motion.div>

          {/* Design Theme Selector */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="w-full max-w-2xl mb-12"
          >
            <div className="flex items-center gap-2 mb-3 px-1">
              <Palette className="h-3.5 w-3.5 text-white/20" />
              <span className="text-[10px] uppercase tracking-[0.1em] text-white/30 font-bold">Design Theme</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {DESIGN_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => setDesignTheme(theme)}
                  className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all duration-300 backdrop-blur-xl text-center group ${designTheme.id === theme.id
                    ? "bg-white/[0.08] border-white/20 shadow-lg"
                    : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/10"
                    }`}
                >
                  {designTheme.id === theme.id && (
                    <div className="absolute top-1.5 right-1.5">
                      <Check className="h-3 w-3 text-[hsl(234,89%,74%)]" />
                    </div>
                  )}
                  <div className="flex gap-0.5">
                    {[theme.colors.primary, theme.colors.secondary, theme.colors.accent].map((color, i) => (
                      <div
                        key={i}
                        className="h-3 w-3 rounded-full border border-white/10"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span className={`text-[10px] font-medium leading-tight ${designTheme.id === theme.id ? "text-white/80" : "text-white/40 group-hover:text-white/60"
                    }`}>
                    {theme.name}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* Projects */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="w-full max-w-4xl"
          >
            <div className="flex items-center justify-between mb-6 px-1">
              <div className="flex items-center gap-2.5">
                <FolderOpen className="h-4 w-4 text-white/20" />
                <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-white/40">Your Projects</h2>
                {allProjects.length > 0 && (
                  <span className="text-[10px] text-white/20 font-medium">{allProjects.length}</span>
                )}
              </div>
              {allProjects.length > 0 && (
                <button
                  onClick={() => router.push("/history")}
                  className="text-[11px] font-semibold text-white/20 hover:text-white/60 transition-colors flex items-center gap-1.5 group"
                >
                  View all
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
            </div>

            {/* Error state */}
            {error && (
              <div className="flex flex-col items-center gap-3 py-10 px-4 rounded-2xl bg-white/[0.02] border border-red-500/10">
                <AlertCircle className="h-6 w-6 text-red-400/60" />
                <p className="text-sm text-white/40 text-center">Failed to load projects</p>
                <p className="text-[11px] text-white/20 text-center max-w-xs">{(error as Error).message || "Check your connection and try again."}</p>
                <button
                  onClick={() => refetch()}
                  className="flex items-center gap-1.5 px-4 py-2 mt-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-white/50 text-xs hover:bg-white/[0.1] hover:text-white transition-all"
                >
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </button>
              </div>
            )}

            {/* Loading state */}
            {isLoading && !error && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className="h-32 rounded-2xl bg-white/[0.02] border border-white/[0.05] animate-pulse"
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && allProjects.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-12 px-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                <div className="h-12 w-12 rounded-xl bg-[hsl(234,89%,74%)]/10 flex items-center justify-center border border-[hsl(234,89%,74%)]/20">
                  <Code2 className="h-6 w-6 text-[hsl(234,89%,74%)]/50" />
                </div>
                <p className="text-sm text-white/40 text-center">No projects yet</p>
                <p className="text-[11px] text-white/20 text-center max-w-xs">Type a prompt above to create your first project</p>
              </div>
            )}

            {/* Project grid */}
            {!error && allProjects.length > 0 && (
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allProjects.map((project, index) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + Math.min(index, 5) * 0.08, duration: 0.4 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleOpenProject(project.id)}
                      className="group relative flex flex-col items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/15 transition-all duration-500 backdrop-blur-2xl text-left shadow-xl cursor-pointer"
                    >
                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDelete(e, project.id)}
                        className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all duration-200"
                        title="Delete project"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>

                      <div className="flex items-center gap-4 w-full pr-6">
                        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-[hsl(234,89%,74%)]/10 text-[hsl(234,89%,74%)] shrink-0 border border-[hsl(234,89%,74%)]/20 transition-colors group-hover:bg-[hsl(234,89%,74%)]/20">
                          <Code2 className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-white truncate tracking-tight group-hover:text-[hsl(234,89%,74%)] transition-colors">
                            {project.title || project.prompt?.slice(0, 30) || "Untitled Project"}
                          </h3>
                          {project.prompt && (
                            <p className="text-[11px] text-white/30 truncate mt-1 leading-relaxed">
                              {project.prompt}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between w-full mt-auto pt-4 border-t border-white/[0.04]">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-[10px] font-medium text-white/20">
                            <Clock className="h-3 w-3" />
                            {project.createdAt
                              ? new Date(project.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })
                              : "Recently"}
                          </div>
                          {project.code && (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[hsl(234,89%,74%)]/30">
                              <Code2 className="h-3 w-3" />
                              <span className="uppercase tracking-wider">Source</span>
                            </div>
                          )}
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-white/10 group-hover:text-white/40 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </ErrorBoundary>
      </div>
    </div>
  );
}
