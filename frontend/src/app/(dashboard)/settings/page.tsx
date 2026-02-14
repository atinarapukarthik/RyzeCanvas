"use client";

import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import { useTheme } from "next-themes";
import { Moon, Sun, User, Cpu, Sparkles, Globe, Zap, Brain, Check, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { fetchAvailableModels, type AIModelInfo, type AIProviderInfo } from "@/lib/api";
import type { AIModel, AIProvider } from "@/components/ProviderSelector";

const PROVIDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    gemini: Sparkles,
    claude: Cpu,
    openrouter: Globe,
    ollama: Zap,
    openai: Brain,
};

export default function SettingsPage() {
    const user = useAuthStore((s) => s.user);
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const selectedModel = useUIStore((s) => s.selectedModel);
    const setSelectedModel = useUIStore((s) => s.setSelectedModel);

    const [providers, setProviders] = useState<AIProviderInfo[]>([]);
    const [models, setModels] = useState<AIModelInfo[]>([]);
    const [loadingModels, setLoadingModels] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        let cancelled = false;
        fetchAvailableModels()
            .then((data) => {
                if (cancelled) return;
                setProviders(data.providers);
                setModels(data.models);
            })
            .catch(() => {
                // Keep empty on error
            })
            .finally(() => {
                if (!cancelled) setLoadingModels(false);
            });
        return () => { cancelled = true; };
    }, []);

    if (!mounted) return null;

    const handleSelectModel = (model: AIModelInfo) => {
        setSelectedModel({
            id: model.id,
            name: model.name,
            provider: model.provider as AIProvider,
        });
    };

    // Group models by provider
    const providerIds = [...new Set(models.map((m) => m.provider))];

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage your profile and preferences</p>
            </div>

            {/* Profile */}
            <div className="glass-card p-6 space-y-5">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" /> Profile
                </h2>
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                        {user?.name?.charAt(0) ?? "U"}
                    </div>
                    <div>
                        <p className="font-medium">{user?.name}</p>
                        <p className="text-sm text-muted-foreground">{user?.email}</p>
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                            {user?.role}
                        </span>
                    </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label>Name</Label>
                        <Input defaultValue={user?.name} readOnly />
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input defaultValue={user?.email} readOnly />
                    </div>
                </div>
            </div>

            {/* AI Model Selection */}
            <div className="glass-card p-6 space-y-5">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Cpu className="h-4 w-4" /> AI Model
                </h2>
                <p className="text-xs text-muted-foreground">
                    Select the AI model to use for code generation. This selection will be reflected in the Studio.
                </p>

                {/* Current selection */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    {(() => {
                        const Icon = PROVIDER_ICONS[selectedModel.provider] || Globe;
                        return <Icon className="h-5 w-5 text-primary" />;
                    })()}
                    <div>
                        <p className="text-sm font-medium">{selectedModel.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{selectedModel.provider} provider</p>
                    </div>
                </div>

                {/* Model list by provider */}
                {loadingModels ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading available models...
                    </div>
                ) : models.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        No AI providers configured. Add API keys to your backend .env file.
                    </p>
                ) : (
                    <div className="space-y-4">
                        {providerIds.map((providerId) => {
                            const providerInfo = providers.find((p) => p.id === providerId);
                            const providerModels = models.filter((m) => m.provider === providerId);
                            const Icon = PROVIDER_ICONS[providerId] || Globe;

                            return (
                                <div key={providerId} className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Icon className="h-3.5 w-3.5 text-primary/70" />
                                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            {providerInfo?.name || providerId}
                                        </span>
                                    </div>
                                    <div className="grid gap-1.5">
                                        {providerModels.map((model) => {
                                            const isSelected = selectedModel.id === model.id;
                                            return (
                                                <button
                                                    key={model.id}
                                                    onClick={() => handleSelectModel(model)}
                                                    className={`
                                                        w-full flex items-center justify-between px-3 py-2 rounded-md text-left text-sm transition-colors
                                                        ${isSelected
                                                            ? 'bg-primary/10 border border-primary/30 text-foreground'
                                                            : 'hover:bg-secondary/50 border border-transparent text-muted-foreground hover:text-foreground'
                                                        }
                                                    `}
                                                >
                                                    <div>
                                                        <span className="font-medium">{model.name}</span>
                                                        {model.description && (
                                                            <span className="ml-2 text-xs text-muted-foreground">{model.description}</span>
                                                        )}
                                                    </div>
                                                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Theme */}
            <div className="glass-card p-6 space-y-4">
                <h2 className="text-sm font-semibold">Appearance</h2>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {theme === "dark" ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
                        <div>
                            <p className="text-sm font-medium">Dark Mode</p>
                            <p className="text-xs text-muted-foreground">Toggle between light and dark theme</p>
                        </div>
                    </div>
                    <Switch checked={theme === "dark"} onCheckedChange={() => setTheme(theme === "dark" ? "light" : "dark")} />
                </div>
            </div>
        </div>
    );
}
