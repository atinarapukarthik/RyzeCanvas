// ============================================================
// RyzeCanvas API Layer — Mock async functions
// Replace function bodies with real fetch() calls later.
// ============================================================

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  avatar: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface Project {
  id: string;
  title: string;
  prompt: string;
  code: string;
  userId: string;
  userName: string;
  createdAt: string;
  flagged: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---- Mock Data ----

const mockUsers: User[] = [
  { id: "1", name: "Admin User", email: "admin@ryze.ai", role: "admin", avatar: "", status: "active", createdAt: "2025-12-01" },
  { id: "2", name: "Jane Doe", email: "jane@example.com", role: "user", avatar: "", status: "active", createdAt: "2026-01-10" },
  { id: "3", name: "Bob Smith", email: "bob@example.com", role: "user", avatar: "", status: "inactive", createdAt: "2026-01-15" },
  { id: "4", name: "Alice Lee", email: "alice@example.com", role: "user", avatar: "", status: "active", createdAt: "2026-02-01" },
];

const sampleCode = `import React from 'react';

const HeroSection = () => (
  <section className="flex flex-col items-center gap-6 py-20 px-4 text-center">
    <h1 className="text-5xl font-bold tracking-tight">
      Build faster with <span className="text-purple-500">RyzeCanvas</span>
    </h1>
    <p className="max-w-xl text-lg text-muted-foreground">
      Generate production-ready UI components with AI in seconds.
    </p>
    <button className="px-6 py-3 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition">
      Get Started
    </button>
  </section>
);

export default HeroSection;`;

const mockProjects: Project[] = [
  { id: "p1", title: "Hero Section", prompt: "Create a hero section with CTA", code: sampleCode, userId: "2", userName: "Jane Doe", createdAt: "2026-02-10T10:00:00Z", flagged: false },
  { id: "p2", title: "Pricing Table", prompt: "Build a 3-tier pricing table", code: sampleCode, userId: "3", userName: "Bob Smith", createdAt: "2026-02-09T14:30:00Z", flagged: false },
  { id: "p3", title: "Dashboard Cards", prompt: "Design stat cards for a dashboard", code: sampleCode, userId: "4", userName: "Alice Lee", createdAt: "2026-02-08T09:15:00Z", flagged: true },
  { id: "p4", title: "Login Form", prompt: "Create a modern login form", code: sampleCode, userId: "2", userName: "Jane Doe", createdAt: "2026-02-07T16:00:00Z", flagged: false },
];

// ---- Auth ----

export async function login(email: string, _password: string): Promise<AuthResponse> {
  await delay(800);
  const role = email.includes("admin") ? "admin" : "user";
  const user: User = {
    id: role === "admin" ? "1" : "2",
    name: role === "admin" ? "Admin User" : "Jane Doe",
    email,
    role,
    avatar: "",
    status: "active",
    createdAt: "2026-01-01",
  };
  return { user, token: "mock-jwt-token" };
}

// ---- Projects ----

export async function fetchProjects(): Promise<Project[]> {
  await delay(600);
  return [...mockProjects];
}

export async function createProject(prompt: string): Promise<Project> {
  await delay(1500);
  return {
    id: `p${Date.now()}`,
    title: prompt.slice(0, 30),
    prompt,
    code: sampleCode,
    userId: "2",
    userName: "Jane Doe",
    createdAt: new Date().toISOString(),
    flagged: false,
  };
}

// ---- History ----

export async function fetchHistory(): Promise<Project[]> {
  await delay(500);
  return [...mockProjects];
}

// ---- Admin ----

export async function adminFetchUsers(): Promise<User[]> {
  await delay(600);
  return [...mockUsers];
}

export async function adminDeleteUser(id: string): Promise<{ success: boolean }> {
  await delay(500);
  console.log("Deleted user:", id);
  return { success: true };
}
