// ============================================================
// RyzeCanvas API Layer — Real Implementation
// ============================================================

import { useAuthStore } from "@/stores/authStore"; // Access store for token

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface User {
  id: string; // Backend uses int, but we can treat as string or number. Let's align with backend: id is int. But frontend mocks used string "1".
  email: string;
  name?: string;
  full_name?: string; // Backend uses full_name
  role: "admin" | "user";
  is_active?: boolean;
  created_at?: string;
  github_username?: string;
  github_token?: string;
}

// Helper to handle mixed user type from backend vs frontend expectation
function mapUser(apiUser: any): User {
  return {
    id: apiUser.id.toString(),
    email: apiUser.email,
    name: apiUser.full_name || apiUser.name,
    full_name: apiUser.full_name,
    role: apiUser.role,
    is_active: apiUser.is_active,
    created_at: apiUser.created_at,
    github_username: apiUser.github_username,
    github_token: apiUser.github_token,
  };
}

export interface Project {
  id: string;
  title: string;
  prompt: string; // Backend doesn't have prompt in DB? It has title and description. Maybe description stores prompt?
  // Backend Project: title, description, code_json, user_id, is_public
  // Frontend Mock: title, prompt, code, userId, userName...
  // We need to map or adjust. Let's assume description = prompt for now.
  code: string; // Mapped from code_json
  userId: string;
  userName?: string;
  createdAt: string;
  flagged?: boolean; // Not in backend
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

function mapProject(apiProject: any): Project {
  return {
    id: apiProject.id.toString(),
    title: apiProject.title,
    prompt: apiProject.description || "",
    code: apiProject.code_json || "",
    userId: apiProject.user_id.toString(),
    userName: apiProject.owner_name, // Optional
    createdAt: apiProject.created_at,
    flagged: false, // Default
  };
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Helper for headers
function getHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `API Error: ${response.statusText}`);
  }
  return response.json();
}

// ---- Auth ----

export async function login(email: string, password: string): Promise<AuthResponse> {
  // 1. Get Token
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  const tokenRes = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData,
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}));
    throw new Error(err.detail || "Login failed");
  }

  const tokenData = await tokenRes.json();
  const token = tokenData.access_token;

  // 2. Get User
  const userRes = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { "Authorization": `Bearer ${token}` },
  });

  if (!userRes.ok) throw new Error("Failed to fetch user profile");

  const userData = await userRes.json();

  return { user: mapUser(userData), token };
}

export async function register(email: string, password: string, fullName: string): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  const data = await handleResponse<any>(res);
  return mapUser(data);
}

// ---- User ----

export async function updateProfile(data: Partial<User> & { password?: string }): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const userData = await handleResponse<any>(res);
  return mapUser(userData);
}


// ---- Projects ----

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE_URL}/projects/`, {
    headers: getHeaders(),
  });
  const data = await handleResponse<any[]>(res);
  return data.map(mapProject);
}

export async function createProject(prompt: string, code?: string): Promise<Project> {
  // Mapping prompt to description, code to code_json
  const payload = {
    title: prompt.slice(0, 30) || "New Project",
    description: prompt,
    code_json: code || "// Generated code",
    is_public: false
  };

  const res = await fetch(`${API_BASE_URL}/projects/`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<any>(res);
  return mapProject(data);
}

// ---- GitHub ----

export async function pushToGithub(projectId: string, repoName: string, description?: string, isPrivate: boolean = false) {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/github`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({
      repo_name: repoName,
      private: isPrivate,
      description
    })
  });

  return handleResponse<{ repo_url: string, message: string }>(res);
}

// ---- Legacy/Compat (Mock replacements) ----

export async function fetchHistory(): Promise<Project[]> {
  return fetchProjects();
}

export async function adminFetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE_URL}/admin/users`, {
    headers: getHeaders(),
  });
  const data = await handleResponse<any[]>(res);
  return data.map(mapUser);
}

export async function adminDeleteUser(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (res.ok) return { success: true };
  return { success: false };
}
