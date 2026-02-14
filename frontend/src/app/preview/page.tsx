"use client";

import { useEffect, useState, Suspense } from "react";
import React from 'react';
import dynamic from 'next/dynamic';
import { Loader2, AlertTriangle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { UIPlan } from "@/components/DynamicRenderer";

// Dynamically import DynamicRenderer to ensure client-side only context
const DynamicRenderer = dynamic(() =>
    import('@/components/DynamicRenderer').then(mod => mod.DynamicRenderer), {
    ssr: false,
    loading: () => <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
});

function PreviewContent() {
    const searchParams = useSearchParams();
    const [plan, setPlan] = useState<UIPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadPlan = () => {
            try {
                // Get context ID from URL or fallback to session storage
                const contextId = searchParams.get('contextId');
                let storageKey = 'ryze-generated-code';

                if (contextId) {
                    storageKey += `-${contextId}`;
                } else {
                    const sessionId = sessionStorage.getItem('ryze-current-session-id');
                    if (sessionId) {
                        storageKey += `-${sessionId}`;
                    }
                }

                const stored = localStorage.getItem(storageKey);

                if (!stored) {
                    setLoading(false);
                    setError("No content found to preview. Please generate a design in the Studio first.");
                    return;
                }

                // Try parsing JSON Plan
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed && typeof parsed === 'object' && parsed.layout) {
                        setPlan(parsed as UIPlan);
                        setError(null);
                    } else {
                        // It might be raw code, not a JSON plan.
                        // For now, we only support JSON plan preview here. 
                        // Raw code uses the studio's iframe preview.
                        setError("The content is code intermixed with instructions, not a pure JSON plan. Use the Code tab in Studio.");
                    }
                } catch {
                    // Not valid JSON
                    setError("Invalid content format. Expected JSON plan.");
                }

            } catch (err: unknown) {
                console.error("Preview load error:", err);
                const errorMessage = err instanceof Error ? err.message : "Failed to load preview.";
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        // Initial load
        loadPlan();

        // Listen for storage updates to refresh preview on new generation
        const handleStorage = (e: StorageEvent) => {
            if (e.key && e.key.includes('ryze-generated-code')) {
                loadPlan();
            }
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);

    }, [searchParams]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-sm font-medium">Loading Preview...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen flex-col items-center justify-center bg-background p-4 text-center">
                <div className="rounded-full bg-destructive/10 p-4 mb-4">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Preview Unavailable</h2>
                <p className="text-muted-foreground max-w-md">{error}</p>
            </div>
        );
    }

    if (!plan) return null;

    return (
        <div className="min-h-screen bg-background">
            <DynamicRenderer plan={plan} />
        </div>
    );
}

export default function PreviewPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <PreviewContent />
        </Suspense>
    );
}
