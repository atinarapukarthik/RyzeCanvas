import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminFetchUsers, adminDeleteUser, fetchProjects } from "@/lib/api";
import { Users, FolderKanban, Server, Pencil, Trash2, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function Admin() {
  const qc = useQueryClient();
  const { data: users, isLoading: loadingUsers } = useQuery({ queryKey: ["admin-users"], queryFn: adminFetchUsers });
  const { data: projects, isLoading: loadingProjects } = useQuery({ queryKey: ["admin-projects"], queryFn: fetchProjects });

  const deleteMutation = useMutation({
    mutationFn: adminDeleteUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User deleted successfully");
    },
    onError: () => toast.error("Failed to delete user"),
  });

  const stats = [
    { label: "Total Users", value: users?.length ?? "—", icon: Users, color: "text-primary" },
    { label: "Active Projects", value: projects?.length ?? "—", icon: FolderKanban, color: "text-emerald-400" },
    { label: "Server Status", value: "Healthy", icon: Server, color: "text-emerald-400" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">System overview & user management</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="glass-card p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-xl font-bold">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* User Management */}
      <div className="glass-card p-5 space-y-4">
        <h2 className="text-sm font-semibold">User Management</h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingUsers && Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8" /></TableCell></TableRow>
              ))}
              {users?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                        {u.name.charAt(0)}
                      </div>
                      <span className="font-medium text-sm">{u.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                  <TableCell><Badge variant={u.role === "admin" ? "default" : "secondary"} className="capitalize">{u.role}</Badge></TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 text-xs ${u.status === "active" ? "text-emerald-400" : "text-muted-foreground"}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${u.status === "active" ? "bg-emerald-400" : "bg-muted-foreground"}`} />
                      {u.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>Are you sure you want to delete {u.name}? This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(u.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Project Oversight */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold">Recent AI Generations</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loadingProjects && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          {projects?.map((p) => (
            <div key={p.id} className="glass-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-medium">{p.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.userName}</p>
                </div>
                <Button variant="ghost" size="icon" className={`h-7 w-7 ${p.flagged ? "text-destructive" : "text-muted-foreground"}`}>
                  <Flag className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground truncate">{p.prompt}</p>
              <p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
