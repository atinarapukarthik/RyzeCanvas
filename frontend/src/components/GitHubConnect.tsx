"use client";

import { useState } from "react";
import { Github, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/authStore";
import { updateProfile, pushToGithub } from "@/lib/api";
import { toast } from "sonner";

interface GitHubConnectProps {
    projectId?: string;
    onSuccess?: (url: string) => void;
}

export function GitHubConnect({ projectId, onSuccess }: GitHubConnectProps) {
    const { user, setUser, token } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [githubToken, setGithubToken] = useState("");
    const [repoName, setRepoName] = useState("");
    const [isPrivate, setIsPrivate] = useState(false);

    // If user already has a token in their profile (we need to ensure user object has this field)
    // For now, let's assume if they don't have it, we ask.
    const hasToken = !!user?.github_token;

    const handleConnect = async () => {
        if (!githubToken) return;
        setLoading(true);
        try {
            if (!user) throw new Error("Not logged in");

            const updatedUser = await updateProfile({ github_token: githubToken });
            setUser(updatedUser, token || ""); // Refresh user in store
            toast.success("GitHub connected successfully!");
            if (!projectId) setIsOpen(false); // Close if just connecting
        } catch (error) {
            toast.error("Failed to connect GitHub");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handlePush = async () => {
        if (!projectId || !repoName) return;
        setLoading(true);
        try {
            const result = await pushToGithub(projectId, repoName, undefined, isPrivate);
            toast.success(result.message);
            if (onSuccess) onSuccess(result.repo_url);
            setIsOpen(false);
        } catch (error: unknown) {
            toast.error("Failed to push to GitHub", { description: error instanceof Error ? error.message : "An unknown error occurred." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Github className="h-4 w-4" />
                    {hasToken ? "Push to GitHub" : "Connect GitHub"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{hasToken ? "Push to GitHub" : "Connect GitHub Account"}</DialogTitle>
                    <DialogDescription>
                        {hasToken
                            ? "Create a new repository and push your project code."
                            : "Enter your GitHub Personal Access Token to enable integration."}
                    </DialogDescription>
                </DialogHeader>

                {!hasToken ? (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="token">Personal Access Token</Label>
                            <Input
                                id="token"
                                type="password"
                                value={githubToken}
                                onChange={(e) => setGithubToken(e.target.value)}
                                placeholder="ghp_..."
                            />
                            <p className="text-xs text-muted-foreground">
                                Generate a token with `repo` scope in GitHub Developer Settings.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="repo">Repository Name</Label>
                            <Input
                                id="repo"
                                value={repoName}
                                onChange={(e) => setRepoName(e.target.value)}
                                placeholder="my-awesome-project"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="private"
                                checked={isPrivate}
                                onChange={(e) => setIsPrivate(e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <Label htmlFor="private">Private Repository</Label>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {!hasToken ? (
                        <Button onClick={handleConnect} disabled={loading || !githubToken}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Connect
                        </Button>
                    ) : (
                        <Button onClick={handlePush} disabled={loading || !repoName}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create & Push
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
