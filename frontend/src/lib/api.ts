/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================================
// RyzeCanvas API Layer
// Uses HTTP-only cookies for auth (primary) + Bearer header (fallback)
// ============================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface User {
  id: string;
  email: string;
  name?: string;
  full_name?: string;
  role: "admin" | "user";
  is_active?: boolean;
  created_at?: string;
  github_username?: string;
  github_token?: string;
}

function mapUser(apiUser: Record<string, any>): User {
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
  prompt: string;
  code: string;
  userId: string;
  userName?: string;
  createdAt: string;
  flagged?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

function mapProject(apiProject: Record<string, any>): Project {
  return {
    id: apiProject.id.toString(),
    title: apiProject.title,
    prompt: apiProject.description || "",
    code: apiProject.code_json || "",
    userId: apiProject.user_id.toString(),
    userName: apiProject.owner_name,
    createdAt: apiProject.created_at,
    flagged: false,
  };
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Helper for headers — always sends cookies via credentials: "include"
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  // Fallback: also send Bearer token from localStorage if present
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

// Retry on 401 by attempting a token refresh first
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      const data = await res.json();
      // Update localStorage fallback token
      if (data.access_token && typeof window !== "undefined") {
        localStorage.setItem("token", data.access_token);
      }
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    // Try refreshing the token once
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = tryRefreshToken();
    }
    const refreshed = await refreshPromise;
    isRefreshing = false;
    refreshPromise = null;

    if (!refreshed) {
      // Refresh failed — clear auth state and redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("auth-storage");
        window.location.href = "/login";
      }
      throw new Error("Session expired. Please log in again.");
    }
    // Refresh succeeded but we can't easily retry the original request here.
    // The caller will need to retry. Throw a retryable error.
    throw new Error("Token refreshed. Please retry.");
  }
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
    credentials: "include",
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
    credentials: "include",
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
  const data = await handleResponse<Record<string, any>>(res);
  return mapUser(data);
}

export async function forgotPassword(email: string): Promise<{ message: string; reset_token?: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return handleResponse<{ message: string; reset_token?: string }>(res);
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  return handleResponse<{ message: string }>(res);
}

// ---- User ----

export async function updateProfile(data: Partial<User> & { password?: string }): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
    credentials: "include",
  });
  const userData = await handleResponse<Record<string, any>>(res);
  return mapUser(userData);
}


// ---- Projects ----

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE_URL}/projects/`, {
    headers: getHeaders(),
    credentials: "include",
  });
  const data = await handleResponse<Record<string, any>[]>(res);
  return data.map(mapProject);
}

export async function createProject(prompt: string, options?: { code?: string, provider?: string, model?: string, webSearchEnabled?: boolean, uploadedFiles?: File[] }): Promise<Project> {
  // Mapping prompt to description, code to code_json
  const payload = {
    title: prompt.slice(0, 30) || "New Project",
    description: prompt,
    code_json: options?.code || "// Generated code",
    is_public: false,
    provider: options?.provider || "gemini",
    model: options?.model || "gemini-2.5-flash"
  };

  const res = await fetch(`${API_BASE_URL}/projects/`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const data = await handleResponse<Record<string, any>>(res);
  return mapProject(data);
}

export async function updateProject(projectId: string, updates: Partial<{ title: string, description: string, code_json: string }>): Promise<Project> {
  const payload = {
    ...(updates.title && { title: updates.title }),
    ...(updates.description && { description: updates.description }),
    ...(updates.code_json && { code_json: updates.code_json }),
  };

  const res = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const data = await handleResponse<Record<string, any>>(res);
  return mapProject(data);
}

export async function deleteProject(projectId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
    method: "DELETE",
    headers: getHeaders(),
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to delete project");
  }
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

// ---- AI Agent / Web Search ----

export interface AIModelInfo {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

export interface AIProviderInfo {
  id: string;
  name: string;
  configured: boolean;
  icon: string;
}

export interface ModelsResponse {
  providers: AIProviderInfo[];
  models: AIModelInfo[];
  default_provider: string;
}

export async function fetchAvailableModels(): Promise<ModelsResponse> {
  const res = await fetch(`${API_BASE_URL}/agent/models`, {
    headers: getHeaders(),
  });
  return handleResponse<ModelsResponse>(res);
}

export async function searchWeb(query: string): Promise<{ success: boolean; query: string; results: any }> {
  const res = await fetch(`${API_BASE_URL}/agent/web-search?query=${encodeURIComponent(query)}`, {
    headers: getHeaders(),
  });
  return handleResponse<{ success: boolean; query: string; results: any }>(res);
}

// ---- Streaming Chat (SSE) ----

export interface ChatStreamEvent {
  event: "step" | "token" | "plan" | "code" | "error" | "done" | "questions" | "plan_ready" | "install" | "file_update" | "todo" | "command" | "log_analysis" | "explanation" | "web_search";
  data: any;
}

export interface ChatStreamOptions {
  prompt: string;
  mode: "chat" | "plan" | "generate" | "plan_interactive" | "plan_implement";
  provider: string;
  model: string;
  conversationHistory?: { role: string; content: string }[];
  webSearchContext?: string;
  planAnswers?: { question: string; answer: string }[];
  planData?: Record<string, any>;
  existingCode?: string;
  themeContext?: string;
  onStep?: (step: string) => void;
  onToken?: (token: string) => void;
  onPlan?: (plan: string) => void;
  onCode?: (code: any) => void;
  onError?: (error: string) => void;
  onDone?: (meta: any) => void;
  onQuestions?: (questions: any) => void;
  onPlanReady?: (plan: any) => void;
  onInstall?: (statuses: any) => void;
  onFileUpdate?: (statuses: any) => void;
  onTodo?: (todos: any) => void;
  onCommand?: (result: any) => void;
  onLogAnalysis?: (analysis: any) => void;
  onExplanation?: (explanation: string) => void;
  onWebSearch?: (results: any) => void;
  signal?: AbortSignal;
}

/**
 * Stream chat responses from the backend via SSE.
 * Calls the provided callbacks for each event type in real time.
 */
export async function streamChat(options: ChatStreamOptions): Promise<void> {
  const {
    prompt, mode, provider, model,
    conversationHistory = [], webSearchContext,
    planAnswers, planData, existingCode, themeContext,
    onStep, onToken, onPlan, onCode, onError, onDone,
    onQuestions, onPlanReady, onInstall, onFileUpdate, onTodo,
    onCommand, onLogAnalysis, onExplanation, onWebSearch,
    signal,
  } = options;

  const payload: Record<string, any> = {
    prompt,
    mode,
    provider,
    model,
    conversation_history: conversationHistory.map((m) => ({
      role: m.role === "ai" ? "ai" : m.role,
      content: m.content,
    })),
    ...(webSearchContext ? { web_search_context: webSearchContext } : {}),
    ...(planAnswers ? { plan_answers: planAnswers } : {}),
    ...(planData ? { plan_data: planData } : {}),
    ...(existingCode ? { existing_code: existingCode } : {}),
    ...(themeContext ? { theme_context: themeContext } : {}),
  };

  const res = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
    signal,
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Chat stream failed: ${res.statusText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE lines
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;

      try {
        const payload: ChatStreamEvent = JSON.parse(trimmed.slice(6));
        switch (payload.event) {
          case "step":
            onStep?.(payload.data);
            break;
          case "token":
            onToken?.(payload.data);
            break;
          case "plan":
            onPlan?.(payload.data);
            break;
          case "code":
            onCode?.(payload.data);
            break;
          case "error":
            onError?.(payload.data);
            break;
          case "done":
            onDone?.(payload.data);
            break;
          case "questions":
            onQuestions?.(payload.data);
            break;
          case "plan_ready":
            onPlanReady?.(payload.data);
            break;
          case "install":
            onInstall?.(payload.data);
            break;
          case "file_update":
            onFileUpdate?.(payload.data);
            break;
          case "todo":
            onTodo?.(payload.data);
            break;
          case "command":
            onCommand?.(payload.data);
            break;
          case "log_analysis":
            onLogAnalysis?.(payload.data);
            break;
          case "explanation":
            onExplanation?.(payload.data);
            break;
          case "web_search":
            onWebSearch?.(payload.data);
            break;
        }
      } catch {
        // Skip malformed SSE lines
      }
    }
  }
}

/**
 * Non-streaming chat endpoint. Returns the full response as JSON.
 */
export async function sendChatMessage(
  prompt: string,
  mode: "chat" | "plan" | "generate",
  provider: string,
  model: string,
  conversationHistory: { role: string; content: string }[] = [],
  webSearchContext?: string,
): Promise<{
  success: boolean;
  mode: string;
  response: string;
  steps: string[];
  code: any;
  errors: string[];
}> {
  const payload = {
    prompt,
    mode,
    provider,
    model,
    conversation_history: conversationHistory.map((m) => ({
      role: m.role === "ai" ? "ai" : m.role,
      content: m.content,
    })),
    ...(webSearchContext ? { web_search_context: webSearchContext } : {}),
  };

  const res = await fetch(`${API_BASE_URL}/chat/message`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
}

// ---- File Upload ----

export async function uploadFile(file: File): Promise<{ success: boolean; filename: string; size: number; content_type: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: HeadersInit = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/agent/upload-file`, {
    method: "POST",
    headers,
    body: formData,
  });

  return handleResponse<{ success: boolean; filename: string; size: number; content_type: string }>(res);
}

// ---- Legacy/Compat ----

export async function logoutAPI(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignore logout errors — we clear local state anyway
  }
}

export async function fetchHistory(): Promise<Project[]> {
  return fetchProjects();
}

export async function adminFetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE_URL}/admin/users`, {
    headers: getHeaders(),
  });
  const data = await handleResponse<Record<string, any>[]>(res);
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

export async function adminCreateUser(data: any): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/admin/users`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const userData = await handleResponse<Record<string, any>>(res);
  return mapUser(userData);
}

export async function adminUpdateUser(id: string, data: any): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/admin/users/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const userData = await handleResponse<Record<string, any>>(res);
  return mapUser(userData);
}
