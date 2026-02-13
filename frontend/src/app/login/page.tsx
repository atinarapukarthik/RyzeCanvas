"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/stores/authStore";
import { login } from "@/lib/api";
import { toast } from "sonner";

export default function Login() {
    const [email, setEmail] = useState("user@ryze.ai");
    const [password, setPassword] = useState("password");
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(false);
    const setUser = useAuthStore((s) => s.setUser);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const finalEmail = isAdmin ? "admin@ryze.ai" : email;
            const res = await login(finalEmail, password);
            setUser(res.user);
            toast.success(`Welcome back, ${res.user.name}!`);
            router.push("/studio");
        } catch {
            toast.error("Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <div className="w-full max-w-md">
                <div className="glass-card p-8 space-y-6">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
                            <Wand2 className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">RyzeCanvas</h1>
                        <p className="text-sm text-muted-foreground">AI-Powered UI Generator</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                            <div>
                                <p className="text-sm font-medium">Simulate Admin</p>
                                <p className="text-xs text-muted-foreground">Toggle to login as admin</p>
                            </div>
                            <Switch checked={isAdmin} onCheckedChange={setIsAdmin} />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Signing in..." : "Sign In"}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
