"use client";

import { Check, ChevronDown, Cpu, Sparkles, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export type AIProvider = "gemini" | "claude" | "openrouter" | "ollama";

export interface AIModel {
    id: string;
    name: string;
    provider: AIProvider;
}

const MODELS: AIModel[] = [
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "gemini" },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "gemini" },
    { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", provider: "claude" },
    { id: "claude-3-opus", name: "Claude 3 Opus", provider: "claude" },
    { id: "gpt-4o", name: "GPT-4o (via OpenRouter)", provider: "openrouter" },
    { id: "llama-3-70b", name: "Llama 3 70b (via OpenRouter)", provider: "openrouter" },
    { id: "llama3", name: "Llama 3 (Local)", provider: "ollama" },
    { id: "deepseek-coder", name: "DeepSeek Coder (Local)", provider: "ollama" },
];

const PROVIDER_ICONS: Record<AIProvider, React.ComponentType<{ className?: string }>> = {
    gemini: Sparkles,
    claude: Cpu,
    openrouter: Globe,
    ollama: Zap,
};

interface ProviderSelectorProps {
    selectedModelId: string;
    onSelectModel: (model: AIModel) => void;
}

export function ProviderSelector({ selectedModelId, onSelectModel }: ProviderSelectorProps) {
    const selectedModel = MODELS.find((m) => m.id === selectedModelId) || MODELS[0];
    const Icon = PROVIDER_ICONS[selectedModel.provider];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline-glow" size="sm" className="h-8 gap-2 px-3 bg-secondary/30">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium">{selectedModel.name}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 glass-strong border-border/50">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-1.5">
                    Select AI Provider
                </DropdownMenuLabel>

                {(["gemini", "claude", "openrouter", "ollama"] as AIProvider[]).map((provider) => (
                    <div key={provider}>
                        <DropdownMenuSeparator className="bg-border/30" />
                        <div className="px-2 py-1 text-[10px] font-semibold text-primary/70 uppercase">
                            {provider}
                        </div>
                        {MODELS.filter((m) => m.provider === provider).map((model) => (
                            <DropdownMenuItem
                                key={model.id}
                                onClick={() => onSelectModel(model)}
                                className="flex items-center justify-between text-xs cursor-pointer focus:bg-primary/10 focus:text-foreground"
                            >
                                {model.name}
                                {selectedModelId === model.id && <Check className="h-3 w-3 text-primary" />}
                            </DropdownMenuItem>
                        ))}
                    </div>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
