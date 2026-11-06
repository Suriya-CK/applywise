/**
 * A small typed wrapper around fetch() for talking to our REST API.
 *
 * Every component calls these functions instead of using fetch directly, so the
 * base URL, JSON handling, auth header and error handling live in ONE place.
 */
import type { Application, ApplicationInput, MatchResult, Status, User } from "../types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api/v1";
const TOKEN_KEY = "applywise_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** Error thrown for any non-2xx response, carrying the HTTP status. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, string[]>,
  ) {
    super(message);
  }
}

// <T> is a "generic": the caller says what type the response body will be.
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 204) return undefined as T; // No Content (e.g. after DELETE)

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`, body.details);
  }
  return body as T;
}

const json = (data: unknown) => JSON.stringify(data);

export const api = {
  register: (name: string, email: string, password: string) =>
    request<{ user: User; token: string }>("/auth/register", { method: "POST", body: json({ name, email, password }) }),

  login: (email: string, password: string) =>
    request<{ user: User; token: string }>("/auth/login", { method: "POST", body: json({ email, password }) }),

  me: () => request<{ user: User }>("/auth/me"),

  listApplications: (status?: Status) =>
    request<{ applications: Application[] }>(`/applications${status ? `?status=${status}` : ""}`),

  createApplication: (input: ApplicationInput) =>
    request<{ application: Application }>("/applications", { method: "POST", body: json(input) }),

  updateApplication: (id: number, changes: Partial<ApplicationInput>) =>
    request<{ application: Application }>(`/applications/${id}`, { method: "PATCH", body: json(changes) }),

  deleteApplication: (id: number) => request<void>(`/applications/${id}`, { method: "DELETE" }),

  analyzeMatch: (resume: string, jobDescription: string, applicationId?: number) =>
    request<{ result: MatchResult }>("/ai/match", {
      method: "POST",
      body: json({ resume, jobDescription, applicationId }),
    }),
};
