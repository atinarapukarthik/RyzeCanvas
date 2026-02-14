"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchHistory, deleteProject } from "@/lib/api";
import { Search, Calendar, Wand2, Trash2, ExternalLink, Code2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function HistoryPage() {
    const [search, setSearch] = useState("");
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data: projects, isLoading, error } = useQuery({
        queryKey: ["history"],
        queryFn: fetchHistory,
    });

    const deleteMutation = useMutation({
        mutationFn: deleteProject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["history"] });
            toast.success("Project deleted");
        },
        onError: (err: Error) => {
            toast.error("Failed to delete project", { description: err.message });
        },
    });

    const handleOpen = (projectId: string) => {
        router.push(`/studio?project=${projectId}`);
    };

    const handleDelete = (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation();
        if (confirm("Delete this project? This action cannot be undone.")) {
            deleteMutation.mutate(projectId);
        }
    };

    const filtered = projects?.filter(
        (p) =>
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            (p.prompt && p.prompt.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">History</h1>
                <p className="text-sm text-muted-foreground mt-1">Your past AI generations</p>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search generations..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                />
            </div>

            {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    Failed to load history. Please make sure you are logged in.
                </div>
            )}

            <ScrollArea className="h-[calc(100vh-14rem)]">
                <div className="space-y-3">
                    {isLoading &&
                        Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                    {filtered?.map((p) => (
                        <div
                            key={p.id}
                            onClick={() => handleOpen(p.id)}
                            className="glass-card p-4 flex items-start gap-4 hover:border-primary/30 transition-colors cursor-pointer group"
                        >
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Wand2 className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm">{p.title}</h3>
                                {p.prompt && (
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.prompt}</p>
                                )}
                                <div className="flex items-center gap-3 mt-2">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        {p.createdAt
                                            ? new Date(p.createdAt).toLocaleDateString(undefined, {
                                                year: "numeric",
                                                month: "short",
                                                day: "numeric",
                                            })
                                            : "Unknown date"}
                                    </div>
                                    {p.code && (
                                        <div className="flex items-center gap-1 text-xs text-primary/60">
                                            <Code2 className="h-3 w-3" />
                                            <span>Has code</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpen(p.id);
                                    }}
                                    className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                                    title="Open in Studio"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={(e) => handleDelete(e, p.id)}
                                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Delete project"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {filtered?.length === 0 && !isLoading && (
                        <div className="text-center py-12">
                            <Wand2 className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">
                                {search ? "No results found" : "No generations yet. Go to Studio to create your first one!"}
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
