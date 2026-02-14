"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/authStore';
import { adminFetchUsers, adminDeleteUser, adminCreateUser, adminUpdateUser, type User } from '@/lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Activity, Server, Pencil, Trash2, Plus, Shield, ShieldCheck, Mail, User as UserIcon
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

interface UserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    editingUser?: User | null;
}

function UserDialog({ open, onOpenChange, onSuccess, editingUser }: UserDialogProps) {
    const [formData, setFormData] = useState({
        email: '',
        full_name: '',
        role: 'user',
        password: '',
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (editingUser) {
            setFormData({
                email: editingUser.email,
                full_name: editingUser.full_name || editingUser.name || '',
                role: editingUser.role,
                password: '', // Password empty when editing
            });
        } else {
            setFormData({
                email: '',
                full_name: '',
                role: 'user',
                password: '',
            });
        }
    }, [editingUser, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingUser) {
                // If editing and password is empty, don't send it
                const updateData: any = { ...formData };
                if (!updateData.password) delete updateData.password;

                await adminUpdateUser(editingUser.id, updateData);
                toast.success("User updated successfully");
            } else {
                if (!formData.password) {
                    toast.error("Password is required for new users");
                    setLoading(false);
                    return;
                }
                await adminCreateUser(formData);
                toast.success("User created successfully");
            }
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.message || "Operation failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] glass-strong border-white/10 bg-black/90 backdrop-blur-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold tracking-tight">
                        {editingUser ? 'Modified User Identity' : 'Register New Identity'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Full Name</Label>
                            <div className="relative">
                                <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/40" />
                                <Input
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="pl-10 bg-white/[0.03] border-white/10 focus:border-primary/50 transition-colors"
                                    placeholder="e.g. John Doe"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/40" />
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="pl-10 bg-white/[0.03] border-white/10 focus:border-primary/50 transition-colors"
                                    placeholder="name@example.com"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                                {editingUser ? 'New Password (Optional)' : 'Access Password'}
                            </Label>
                            <Input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="bg-white/[0.03] border-white/10 focus:border-primary/50 transition-colors"
                                placeholder="••••••••"
                                required={!editingUser}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Access Role</Label>
                            <Select
                                value={formData.role}
                                onValueChange={(v) => setFormData({ ...formData, role: v })}
                            >
                                <SelectTrigger className="bg-white/[0.03] border-white/10 focus:border-primary/50 transition-colors">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent className="bg-neutral-900 border-white/10">
                                    <SelectItem value="user" className="focus:bg-white/5">Standard User</SelectItem>
                                    <SelectItem value="admin" className="focus:bg-white/5">System Admin</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest h-11"
                        >
                            {loading ? 'Processing...' : (editingUser ? 'Synchronize Data' : 'Initialize Account')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

export default function AdminPage() {
    const { user, isAuthenticated } = useAuthStore();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const refreshUsers = async () => {
        setLoading(true);
        try {
            const data = await adminFetchUsers();
            setUsers(data);
        } catch {
            toast.error("Failed to fetch users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (!isAuthenticated || user?.role !== 'admin') {
                // In a real app we might redirect
            }
            refreshUsers();
        }
    }, [isAuthenticated, user]);

    const handleDeleteUser = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete user ${name}?`)) return;
        try {
            await adminDeleteUser(id);
            setUsers(users.filter(u => u.id !== id));
            toast.success("User identity terminated");
        } catch {
            toast.error("Failed to delete user");
        }
    };

    const handleEditUser = (u: User) => {
        setEditingUser(u);
        setDialogOpen(true);
    };

    const handleAddUser = () => {
        setEditingUser(null);
        setDialogOpen(true);
    };

    return (
        <div className="container py-10 px-4 space-y-8 max-w-6xl mx-auto min-h-screen">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight mb-2 flex items-center gap-3">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                        System Governance
                    </h1>
                    <p className="text-muted-foreground text-sm max-w-md">Centralized management of system identities, access levels, and node computational metrics.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest bg-white/[0.03] px-4 py-2 rounded-full border border-white/5">
                        <Activity className="h-3 w-3 text-success animate-pulse" /> Live Status: Operational
                    </div>
                    <Button
                        onClick={handleAddUser}
                        className="bg-primary hover:bg-primary/90 text-[11px] font-bold uppercase tracking-widest px-6 h-10 shadow-[0_0_20px_rgba(var(--primary),0.2)]"
                    >
                        <Plus className="h-4 w-4 mr-2" /> Initialize User
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid sm:grid-cols-3 gap-6">
                <StatCard icon={Users} label="Registered Identities" value={users.length.toString()} color="bg-primary/10 text-primary border border-primary/20" />
                <StatCard icon={Activity} label="AI Node Throughput" value="12.4k" color="bg-accent/10 text-accent border border-accent/20" />
                <StatCard icon={Server} label="Cluster Health" value="99.9%" color="bg-success/10 text-success border border-success/20" />
            </div>

            {/* User Table */}
            <div className="glass-strong rounded-2xl overflow-hidden shadow-2xl border border-white/5 bg-black/40 backdrop-blur-md">
                <div className="px-6 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="space-y-1">
                        <h2 className="font-bold tracking-tight">Identity Directory</h2>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-medium">Authorized Personnel</p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-bold tracking-widest opacity-40 hover:opacity-100 transition-opacity border border-white/5">Export Index</Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/5 text-[10px] uppercase tracking-widest text-muted-foreground/70 font-bold bg-white/[0.03]">
                                <th className="px-6 py-5 text-left font-bold">Identity Profile</th>
                                <th className="px-6 py-5 text-left font-bold">Communication Line</th>
                                <th className="px-6 py-5 text-left font-bold">Clearance Level</th>
                                <th className="px-6 py-5 text-left font-bold">Protocol Status</th>
                                <th className="px-6 py-5 text-right font-bold">System Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            <AnimatePresence mode="popLayout">
                                {loading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-6 py-6 h-20 bg-white/[0.01]" />
                                        </tr>
                                    ))
                                ) : (
                                    users.map((u) => (
                                        <motion.tr
                                            key={u.id}
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            exit={{ opacity: 0 }}
                                            className="group hover:bg-white/[0.02] transition-colors"
                                        >
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-bold text-primary border border-primary/20 shadow-inner">
                                                        {u.full_name?.charAt(0) || u.email.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-white block tracking-tight">{u.full_name || 'Anonymous Entity'}</span>
                                                        <span className="text-[10px] text-muted-foreground/40 uppercase font-bold tracking-tighter">UID: {u.id.slice(0, 8)}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 font-mono text-xs text-muted-foreground/70">{u.email}</td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <Shield className={`h-3 w-3 ${u.role === 'admin' ? 'text-primary' : 'text-muted-foreground/30'}`} />
                                                    <span className={`text-[10px] font-bold uppercase tracking-tighter px-3 py-1 rounded-md border ${u.role === 'admin' ? 'bg-primary/10 text-primary border-primary/30 shadow-[0_0_15px_rgba(var(--primary),0.1)]' : 'bg-white/[0.03] text-muted-foreground/50 border-white/5'}`}>
                                                        {u.role}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex items-center gap-2 text-[10px] uppercase font-black tracking-widest ${u.is_active ? 'text-success' : 'text-muted-foreground/30'}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${u.is_active ? 'bg-success shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-white/10'}`} />
                                                    {u.is_active ? 'Active Node' : 'Suspended'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/20 transition-all" onClick={() => handleEditUser(u)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20 transition-all" onClick={() => handleDeleteUser(u.id, u.full_name || u.email)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
                {!loading && users.length === 0 && (
                    <div className="py-32 text-center flex flex-col items-center justify-center text-muted-foreground/40 gap-4">
                        <Users className="h-16 w-16 opacity-10" />
                        <div className="space-y-1">
                            <p className="text-sm font-bold uppercase tracking-widest">No Identities Found</p>
                            <p className="text-xs">The system register is currently empty.</p>
                        </div>
                    </div>
                )}
            </div>

            <UserDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSuccess={refreshUsers}
                editingUser={editingUser}
            />
        </div>
    );
}
