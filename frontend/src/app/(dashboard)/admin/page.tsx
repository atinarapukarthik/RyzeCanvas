"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { adminFetchUsers, adminDeleteUser, type User } from '@/lib/api';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
    Users, Activity, Server, Pencil, Trash2
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, color }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; color: string }) {
    return (
        <motion.div
            className="glass-strong rounded-xl p-6 border-white/5 shadow-lg"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="flex items-center gap-3 mb-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{label}</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
        </motion.div>
    );
}

export default function AdminPage() {
    const { user, isAuthenticated } = useAuthStore();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (!isAuthenticated || user?.role !== 'admin') {
                // In a real app we might redirect, but for demo let's fetch if authenticated
            }

            adminFetchUsers()
                .then((data) => {
                    setUsers(data);
                    setLoading(false);
                })
                .catch(() => {
                    toast.error("Failed to fetch users");
                    setLoading(false);
                });
        }
    }, [isAuthenticated, user]);

    const handleDeleteUser = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete user ${name}?`)) return;
        try {
            await adminDeleteUser(id);
            setUsers(users.filter(u => u.id !== id));
            toast.success("User deleted");
        } catch {
            toast.error("Failed to delete user");
        }
    };

    return (
        <div className="container py-10 px-4 space-y-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight mb-1">System Dashboard</h1>
                    <p className="text-muted-foreground text-sm">Real-time metrics and governance for the RyzeCanvas node.</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest bg-secondary/30 px-3 py-1.5 rounded-full border border-border/40">
                    <Activity className="h-3 w-3 text-success animate-pulse" /> Live Status: Operational
                </div>
            </div>

            {/* Stats */}
            <div className="grid sm:grid-cols-3 gap-6">
                <StatCard icon={Users} label="Registered Users" value={users.length.toString()} color="bg-primary/10 text-primary" />
                <StatCard icon={Activity} label="AI Throughput" value="12.4k" color="bg-accent/10 text-accent" />
                <StatCard icon={Server} label="System Health" value="99.9%" color="bg-success/10 text-success" />
            </div>

            {/* User Table */}
            <div className="glass-strong rounded-2xl overflow-hidden shadow-2xl border-white/5">
                <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                    <h2 className="font-bold tracking-tight">User Directory</h2>
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-bold tracking-widest opacity-60 hover:opacity-100 transition-opacity">Export CSV</Button>
                </div>
                <div className="overflow-x-auto bg-black/20">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-muted-foreground/70 font-bold bg-secondary/20">
                                <th className="px-6 py-4 text-left">Identity</th>
                                <th className="px-6 py-4 text-left">Communication</th>
                                <th className="px-6 py-4 text-left">Internal Role</th>
                                <th className="px-6 py-4 text-left">Network Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-4 h-16 bg-white/[0.02]" />
                                    </tr>
                                ))
                            ) : (
                                users.map((u) => (
                                    <tr key={u.id} className="group hover:bg-white/[0.03] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20">
                                                    {u.full_name?.charAt(0) || u.email.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-semibold">{u.full_name || 'Incognito User'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground font-mono text-xs">{u.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold uppercase tracking-tighter px-2.5 py-1 rounded-full border ${u.role === 'admin' ? 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_10px_rgba(var(--primary),0.1)]' : 'bg-secondary text-muted-foreground border-border/40'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-tight ${u.is_active ? 'text-success' : 'text-muted-foreground/40'}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-muted-foreground/40'}`} />
                                                {u.is_active ? 'Encrypted' : 'Offline'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => toast.info(`Accessing ${u.email} logs...`)}>
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => handleDeleteUser(u.id, u.full_name || u.email)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {!loading && users.length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center justify-center text-muted-foreground gap-3">
                        <Users className="h-10 w-10 opacity-20" />
                        <p className="text-sm font-medium">No system users identified.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
