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
    const [rawCode, setRawCode] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadContent = () => {
            try {
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
                        setRawCode(null);
                        setError(null);
                        return;
                    }
                } catch {
                    // Ignore JSON error, it might be raw code
                }

                // If not JSON, treat as Raw Code (React/HTML)
                // We'll wrap it in a simple HTML structure for the iframe
                setRawCode(stored);
                setPlan(null);
                setError(null);

            } catch (err: unknown) {
                console.error("Preview load error:", err);
                const errorMessage = err instanceof Error ? err.message : "Failed to load preview.";
                setError(errorMessage);
            } finally {
                setLoading(false);
            }
        };

        loadContent();

        const handleStorage = (e: StorageEvent) => {
            if (e.key && e.key.includes('ryze-generated-code')) {
                loadContent();
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

    // 1. JSON Plan Rendering
    // 1. JSON Plan Rendering
    if (plan && Array.isArray(plan.components)) {
        return (
            <div className="min-h-screen bg-background">
                <DynamicRenderer plan={plan} />
            </div>
        );
    }

    // 2. Raw Code Rendering (Iframe Sandbox)
    if (rawCode) {
        const isHTML = rawCode.trim().startsWith("<!DOCTYPE html") || rawCode.trim().startsWith("<html");

        if (isHTML) {
            return (
                <iframe
                    title="Live Preview"
                    srcDoc={rawCode}
                    className="w-full h-screen border-none bg-white"
                    sandbox="allow-scripts"
                />
            );
        }

        // Fallback: Show "Code Preview" placeholder or raw text if not HTML
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
                <div className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                        <span className="font-semibold text-sm text-slate-700">Code Preview</span>
                    </div>
                    <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-500">ReadOnly</span>
                </div>
                <div className="flex-1 p-8 overflow-auto">
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-blue-50 border border-blue-100 text-blue-800 p-4 rounded-lg mb-8 flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-blue-600" />
                            <div>
                                <h3 className="font-bold text-sm mb-1">Preview Mode Limited</h3>
                                <p className="text-sm opacity-90">
                                    The AI generated raw React code instead of a UI Plan. Detailed interactive preview is disabled in this view.
                                    <br />
                                    Please use the <strong>Workshop / Code</strong> tab to edit or run this project.
                                </p>
                            </div>
                        </div>
                        <div className="relative rounded-lg overflow-hidden shadow-xl border border-slate-200 bg-white">
                            <div className="absolute top-0 left-0 right-0 h-10 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2">
                                <div className="h-3 w-3 rounded-full bg-red-400"></div>
                                <div className="h-3 w-3 rounded-full bg-yellow-400"></div>
                                <div className="h-3 w-3 rounded-full bg-green-400"></div>
                            </div>
                            <pre className="bg-white text-slate-800 p-6 pt-14 overflow-x-auto text-sm font-mono leading-relaxed max-w-full">
                                {rawCode}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen flex-col items-center justify-center bg-background text-muted-foreground p-4">
            <div className="rounded-full bg-muted p-6 mb-4">
                <Loader2 className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Ready to Build</h3>
            <p className="max-w-sm text-center text-sm">
                No preview content available yet. Start a chat in the Studio to generate your first interface.
            </p>
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
