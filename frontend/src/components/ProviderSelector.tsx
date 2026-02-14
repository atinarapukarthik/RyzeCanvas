"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Cpu, Sparkles, Zap, Globe, Brain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { fetchAvailableModels } from "@/lib/api";

export type AIProvider = "gemini" | "claude" | "openrouter" | "ollama" | "openai";

export interface AIModel {
    id: string;
    name: string;
    provider: AIProvider;
}

// Static fallback models (used if API fetch fails)
const FALLBACK_MODELS: AIModel[] = [
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "gemini" },
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "gemini" },
    { id: "gemini-2.0-flash-exp", name: "Gemini 2.0 Flash (Exp)", provider: "gemini" },
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", provider: "claude" },
    { id: "gpt-4o", name: "GPT-4o", provider: "openai" },
];

const PROVIDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    gemini: Sparkles,
    claude: Cpu,
    openrouter: Globe,
    ollama: Zap,
    openai: Brain,
};

const PROVIDER_NAMES: Record<string, string> = {
    gemini: "Google Gemini",
    claude: "Anthropic Claude",
    openrouter: "OpenRouter",
    ollama: "Ollama (Local)",
    openai: "OpenAI",
};

interface ProviderSelectorProps {
    selectedModelId: string;
    onSelectModel: (model: AIModel) => void;
}

export function ProviderSelector({ selectedModelId, onSelectModel }: ProviderSelectorProps) {
    const [models, setModels] = useState<AIModel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        fetchAvailableModels()
            .then((data) => {
                if (cancelled) return;
                if (data.models && data.models.length > 0) {
                    setModels(
                        data.models.map((m) => ({
                            id: m.id,
                            name: m.name,
                            provider: m.provider as AIProvider,
                        }))
                    );
                }
            })
            .catch(() => {
                // Keep fallback models on error
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, []);

    const selectedModel = models.find((m) => m.id === selectedModelId) || models[0];
    const Icon = PROVIDER_ICONS[selectedModel?.provider] || Globe;

    // Get unique providers from available models
    const providers = [...new Set(models.map((m) => m.provider))];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline-glow" size="sm" className="h-8 gap-2 px-3 bg-secondary/30">
                    {loading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                    ) : (
                        <Icon className="h-3.5 w-3.5 text-primary" />
                    )}
                    <span className="text-xs font-medium">{selectedModel?.name || "Select Model"}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 max-h-80 overflow-y-auto glass-strong border-border/50">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-1.5">
                    Select AI Model
                </DropdownMenuLabel>

                {providers.map((provider) => (
                    <div key={provider}>
                        <DropdownMenuSeparator className="bg-border/30" />
                        <div className="px-2 py-1 text-[10px] font-semibold text-primary/70 uppercase">
                            {PROVIDER_NAMES[provider] || provider}
                        </div>
                        {models.filter((m) => m.provider === provider).map((model) => (
                            <DropdownMenuItem
                                key={model.id}
                                onClick={() => onSelectModel(model)}
                                className="flex items-center justify-between text-xs cursor-pointer focus:bg-primary/10 focus:text-foreground"
                            >
                                <span className="truncate mr-2">{model.name}</span>
                                {selectedModelId === model.id && <Check className="h-3 w-3 text-primary shrink-0" />}
                            </DropdownMenuItem>
                        ))}
                    </div>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
