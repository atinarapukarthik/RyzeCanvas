"use client";

import { Wand2, History, Settings, ShieldCheck, LogOut, GitBranch, FolderOpen, Clock, ArrowLeft, Zap, LayoutDashboard } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuthStore } from "@/stores/authStore";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProviderSelector } from "@/components/ProviderSelector";
import { useUIStore } from "@/stores/uiStore";
import Link from "next/link";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Studio", url: "/studio", icon: Wand2 },
  { title: "History", url: "/history", icon: History },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function TopNavBar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const pathname = usePathname();
  const { githubConnected, setGithubConnected, selectedModel, setSelectedModel, githubModal, setGithubModal } = useUIStore();

  const isStudio = pathname === "/studio";
  const isAdmin = pathname === "/admin";
  const isDashboard = pathname === "/dashboard";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleGithubToggle = () => {
    if (githubConnected) {
      setGithubConnected(false);
    } else {
      setGithubModal(true);
    }
  };

  return (
    <header className={`h-16 border-b ${isDashboard ? "border-transparent bg-transparent absolute top-0 left-0 right-0 z-20" : "border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"}`}>
      <div className="h-full flex items-center justify-between px-4 gap-4">
        {/* Logo Section */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight hidden sm:inline">RyzeCanvas</span>
          {isAdmin && (
            <>
              <div className="h-5 w-px bg-border hidden sm:block" />
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold border border-primary/20">
                Admin Control
              </span>
            </>
          )}
        </div>

        {/* Navigation Items (Hidden on Studio, Admin & Dashboard) */}
        {!isStudio && !isAdmin && !isDashboard && (
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                end
                className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                activeClassName="bg-accent text-accent-foreground"
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.title}</span>
              </NavLink>
            ))}

            {user?.role === "admin" && (
              <NavLink
                to="/admin"
                end
                className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                activeClassName="bg-accent text-accent-foreground"
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </NavLink>
            )}
          </nav>
        )}

        {/* Studio Controls */}
        {isStudio && (
          <div className="flex items-center gap-2 flex-1 ml-4">
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
              <FolderOpen className="h-3.5 w-3.5" /> Projects
            </button>
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
              <Clock className="h-3.5 w-3.5" /> History
            </button>

            <div className="h-5 w-px bg-border" />

            {/* Provider Selector */}
            <ProviderSelector selectedModelId={selectedModel.id} onSelectModel={setSelectedModel} />

            <div className="h-5 w-px bg-border" />

            {/* GitHub */}
            <button
              onClick={handleGithubToggle}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs hover:bg-secondary/50 transition-colors"
            >
              <GitBranch className={`h-3.5 w-3.5 ${githubConnected ? "text-success" : "text-muted-foreground"}`} />
              <span className={`${githubConnected ? "text-success" : "text-muted-foreground"} hidden sm:inline`}>
                {githubConnected ? "Connected" : "Connect GitHub"}
              </span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${githubConnected ? "bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-muted-foreground/40"
                  }`}
              />
            </button>
          </div>
        )}

        {/* Admin Controls */}
        {isAdmin && (
          <div className="flex items-center gap-3 ml-auto">
            <Button variant="ghost" size="sm" asChild className="text-xs h-8">
              <Link href="/studio">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" /> Back to Studio
              </Link>
            </Button>
          </div>
        )}

        {/* Spacer for non-studio/admin/dashboard pages */}
        {!isStudio && !isAdmin && !isDashboard && <div className="flex-1" />}
        {isDashboard && <div className="flex-1" />}

        {/* User Profile & Logout */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
              {user?.name?.charAt(0) ?? "U"}
            </div>
            <div className="flex flex-col min-w-0 text-xs">
              <p className="font-medium truncate">{user?.name}</p>
              <p className="text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Logout"
            className="h-9 w-9"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
