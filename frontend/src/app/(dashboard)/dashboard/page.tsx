"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { fetchProjects } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
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
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const selectedModel = useUIStore((s) => s.selectedModel);
  const [currentMode, setCurrentMode] = useState<"plan" | "build">("build");
  const [webSearchActive, setWebSearchActive] = useState(false);

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

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
    router.push(`/studio?project=${projectId}`);
  };

  const recentProjects = projects?.slice(0, 6) || [];

  return (
    <div className="relative min-h-screen bg-background">
      {/* Neon Raymarcher Background */}
      <div className="absolute inset-0 z-0">
        <Scene />
      </div>
      <div className="relative z-10 flex flex-col items-center justify-start w-full h-full pt-[12vh] px-4 overflow-y-auto no-scrollbar pb-12">
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
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm mb-6"
          >
            <Sparkles className="h-3.5 w-3.5 text-[hsl(234,89%,74%)]" />
            <span className="text-xs font-medium text-white/60">AI-Powered Canvas</span>
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
            className="text-white/40 text-base md:text-lg mt-3 max-w-md mx-auto"
          >
            What would you like to create today?
          </motion.p>
        </motion.div>

        {/* Prompt Box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-2xl mb-4"
        >
          <PromptBox onSend={handleSend} onModeChange={setCurrentMode} onWebSearchChange={setWebSearchActive} />
        </motion.div>

        {/* Quick Suggestion Chips */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-2 mb-10 max-w-2xl items-center"
        >
          <span className="text-xs text-white/40 mr-2 hidden sm:inline">
            Mode: <span className={currentMode === "plan" ? "text-amber-400" : "text-[hsl(234,89%,74%)]"}>{currentMode === "plan" ? "Plan" : "Build"}</span>
            {webSearchActive && <><span className="text-white/20 mx-1">·</span><Globe className="inline h-3 w-3 text-blue-400" /> <span className="text-blue-400">Web</span></>}
            <span className="text-white/20 mx-1">·</span><Cpu className="inline h-3 w-3 text-white/40" /> <span className="text-white/50">{selectedModel?.name || "AI"}</span>
          </span>
          {[
            { label: "Landing page", icon: Code2 },
            { label: "Dashboard UI", icon: Zap },
            { label: "Portfolio site", icon: Sparkles },
            { label: "E-commerce page", icon: FolderOpen },
          ].map((suggestion) => (
            <button
              key={suggestion.label}
              onClick={() => handleSend(`Build a ${suggestion.label.toLowerCase()}`, currentMode)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 text-sm hover:bg-white/10 hover:text-white/70 hover:border-white/20 transition-all duration-200 backdrop-blur-sm"
            >
              <suggestion.icon className="h-3.5 w-3.5" />
              {suggestion.label}
            </button>
          ))}
        </motion.div>

        {/* Recent Projects */}
        {(recentProjects.length > 0 || isLoading) && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="w-full max-w-4xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-white/30" />
                <h2 className="text-sm font-medium text-white/50">Your Projects</h2>
              </div>
              {recentProjects.length > 0 && (
                <button
                  onClick={() => router.push("/history")}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors flex items-center gap-1"
                >
                  View all
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className="h-28 rounded-xl bg-white/5 border border-white/5 animate-pulse"
                  />
                ))}

              {recentProjects.map((project, index) => (
                <motion.button
                  key={project.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.08, duration: 0.4 }}
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleOpenProject(project.id)}
                  className="group flex flex-col items-start gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/15 transition-all duration-200 backdrop-blur-sm text-left"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-[hsl(234,89%,74%)]/10 text-[hsl(234,89%,74%)] shrink-0">
                      <Code2 className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white truncate">
                        {project.title}
                      </h3>
                      {project.prompt && (
                        <p className="text-xs text-white/30 truncate mt-0.5">
                          {project.prompt}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex items-center gap-1 text-[10px] text-white/20">
                      <Clock className="h-3 w-3" />
                      {project.createdAt
                        ? new Date(project.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                        : "Recently"}
                    </div>
                    {project.code && (
                      <div className="flex items-center gap-1 text-[10px] text-[hsl(234,89%,74%)]/40">
                        <Code2 className="h-3 w-3" />
                        <span>Has code</span>
                      </div>
                    )}
                    <ArrowRight className="h-3 w-3 ml-auto text-white/10 group-hover:text-white/30 transition-colors" />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
