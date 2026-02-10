// Admin Frontend API client — connects to FastAPI backend

const API_BASE = "http://localhost:8000";

let authToken: string | null = null;

// ── Auth ─────────────────────────────────────────────

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  const data = await res.json();
  authToken = data.token;
  if (typeof window !== "undefined") {
    localStorage.setItem("admin_token", data.token);
    if (data.user) {
      localStorage.setItem("admin_user", JSON.stringify(data.user));
    }
  }
  return data;
}

export function getToken(): string | null {
  if (authToken) return authToken;
  if (typeof window !== "undefined") {
    authToken = localStorage.getItem("admin_token");
  }
  return authToken;
}

export function logout() {
  authToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
  }
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function getAdminUser(): { name: string; email: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("admin_user");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });
  if (res.status === 401) {
    logout();
    throw new Error("Unauthorized — please log in again");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API error");
  }
  return res.json();
}

// ── Dashboard ────────────────────────────────────────

export async function getDashboardMetrics() {
  return apiFetch("/admin/dashboard/metrics");
}

export async function getMenteeStatusChart() {
  return apiFetch("/admin/chart/mentee-status");
}

export async function getGrowthChart() {
  return apiFetch("/admin/chart/growth");
}

// ── Mentors ──────────────────────────────────────────

export async function getAdminMentors() {
  const data = await apiFetch("/admin/mentors");
  return data.mentors;
}

export async function verifyMentor(mentorId: string) {
  return apiFetch("/admin/verify-mentor", {
    method: "POST",
    body: JSON.stringify({ mentorId }),
  });
}

export async function rejectMentor(mentorId: string, reason?: string) {
  return apiFetch("/admin/reject-mentor", {
    method: "POST",
    body: JSON.stringify({ mentorId, reason: reason || "" }),
  });
}

export async function getPendingMentors() {
  const data = await apiFetch("/admin/pending-mentors");
  return data.pendingMentors;
}

export async function enableMentor(mentorId: string) {
  return apiFetch("/admin/mentor/enable", {
    method: "POST",
    body: JSON.stringify({ mentorId }),
  });
}

export async function disableMentor(mentorId: string) {
  return apiFetch("/admin/mentor/disable", {
    method: "POST",
    body: JSON.stringify({ mentorId }),
  });
}

// ── Mentees ──────────────────────────────────────────

export async function getAdminMentees() {
  const data = await apiFetch("/admin/mentees");
  return data.mentees;
}

export async function getAdminMentee(id: string) {
  return apiFetch(`/admin/mentees/${id}`);
}

// ── Mentorships ──────────────────────────────────────

export async function getAdminMentorships() {
  const data = await apiFetch("/admin/mentorships");
  return data.mentorships;
}

export async function flagMentorship(mentorshipId: string, reason?: string) {
  return apiFetch("/admin/mentorship/flag", {
    method: "POST",
    body: JSON.stringify({ mentorshipId, reason }),
  });
}

// ── Allocate Mentor ──────────────────────────────────

export async function allocateMentor(menteeId: string, mentorId: string) {
  return apiFetch("/admin/allocate-mentor", {
    method: "POST",
    body: JSON.stringify({ menteeId, mentorId }),
  });
}
