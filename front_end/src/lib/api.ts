/**
 * ─────────────────────────────────────────────────────────────
 *  GUIDED — Frontend API Client
 * ─────────────────────────────────────────────────────────────
 *  Every outgoing request automatically attaches the JWT auth
 *  token stored in localStorage. If a request fails or times out,
 *  the caller simply receives `null` so the UI can gracefully
 *  fall back to cached / mock data.
 * ─────────────────────────────────────────────────────────────
 */

/* ── Base URL for the backend server ── */
const API_BASE = "http://localhost:8000";


/* ════════════════════════════════════════════════════════════
 *  CORE HELPERS
 * ════════════════════════════════════════════════════════════ */

/**
 * Retrieve the JWT token that was saved after login / signup.
 * Returns `null` during server-side rendering (no `window`).
 */
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("guided_token");
}

/**
 * Central fetch wrapper used by every API function below.
 *
 * What it does:
 *  1. Starts an abort timer so no request hangs forever (default 8 s).
 *  2. Attaches `Authorization: Bearer <token>` when a token exists.
 *  3. Parses the JSON response and returns it typed as `T`.
 *  4. On ANY failure (network, 4xx, 5xx, timeout) → logs the error
 *     and returns `null` instead of throwing.
 */
async function apiFetch<T>(
  path: string,
  options?: RequestInit,
  timeoutMs = 8000
): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const token = getToken();

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
    });

    clearTimeout(timer);

    /* Non-2xx → extract detail message and bail out */
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const detail = body?.detail || `HTTP ${res.status}`;
      console.error(`API ${path} returned ${res.status}:`, detail);
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    console.error(`API ${path} failed:`, err);
    return null;
  }
}


/* ════════════════════════════════════════════════════════════
 *  CANDIDATE APIs — Onboarding, Roadmap, Mentors, Checkout
 * ════════════════════════════════════════════════════════════ */

/* ── Onboarding ── */

/** Data the candidate submits during the 5-step onboarding wizard. */
export interface OnboardingPayload {
  careerGoal: string;
  targetRole: string;
  targetCompany?: string;
  skillLevel: string;
  experienceLevel: string;
  resumeUploaded?: boolean;
  name?: string;
  email?: string;
}

/** What the backend returns after onboarding is saved. */
export interface OnboardingResponse {
  message: string;
  candidateId: string;
  candidate: Record<string, unknown>;
}

/**
 * Submit the candidate's onboarding answers.
 * POST /candidate/onboarding
 */
export async function postOnboarding(
  data: OnboardingPayload
): Promise<OnboardingResponse | null> {
  return apiFetch<OnboardingResponse>("/candidate/onboarding", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/* ── Roadmap Generation ── */

/**
 * The full roadmap payload returned by the backend,
 * including AI-generated steps & skill gap analysis.
 */
export interface RoadmapResponse {
  message: string;
  candidateId: string;
  targetRole: string;
  targetCompany: string;
  skillLevel: string;
  timeline: string;
  domain: string;

  /** "gemini" = AI-generated, "mock" = template fallback */
  generatedBy: "gemini" | "mock";

  /** Ordered preparation steps the candidate should follow */
  roadmap: Array<{
    id: string;
    title: string;
    description: string;
    duration: string;
    status: "completed" | "current" | "upcoming";
  }>;

  /** Where the candidate stands vs. where they need to be */
  skillGaps: Array<{
    skill: string;
    level: number;
    target: number;
  }>;
}

/**
 * Generate (or retrieve cached) a personalised roadmap.
 * POST /candidate/generate-roadmap
 */
export async function postGenerateRoadmap(
  candidateId: string
): Promise<RoadmapResponse | null> {
  return apiFetch<RoadmapResponse>("/candidate/generate-roadmap", {
    method: "POST",
    body: JSON.stringify({ candidateId }),
  });
}

/**
 * Force-regenerate the roadmap with Gemini AI,
 * discarding any previously cached version.
 * POST /candidate/regenerate-roadmap
 */
export async function postRegenerateRoadmap(
  candidateId: string
): Promise<RoadmapResponse | null> {
  return apiFetch<RoadmapResponse>("/candidate/regenerate-roadmap", {
    method: "POST",
    body: JSON.stringify({ candidateId }),
  });
}

/* ── Mentor Discovery ── */

/** Shape of the paginated mentors list returned by GET /mentors. */
export interface MentorsResponse {
  mentors: Array<{
    id: string;
    name: string;
    role: string;
    company: string;
    avatar: string;
    experience: number;
    domain: string;
    pricePerSession: number;
    available: boolean;
    rating: number;
    sessions: number;
    bio: string;
    verified: boolean;
  }>;
  total: number;
}

/**
 * Fetch the mentor catalogue with optional search / filter params.
 * GET /mentors?search=…&domain=…&price=…&experience=…
 */
export async function getMentors(filters?: {
  search?: string;
  domain?: string;
  price?: string;
  experience?: string;
}): Promise<MentorsResponse | null> {
  const params = new URLSearchParams();

  if (filters?.search)                         params.set("search", filters.search);
  if (filters?.domain && filters.domain !== "all")       params.set("domain", filters.domain);
  if (filters?.price && filters.price !== "all")         params.set("price", filters.price);
  if (filters?.experience && filters.experience !== "all") params.set("experience", filters.experience);

  const qs = params.toString();
  return apiFetch<MentorsResponse>(`/mentors${qs ? `?${qs}` : ""}`);
}

/* ── Checkout & Payment ── */

/** What the backend returns after a successful checkout. */
export interface CheckoutResponse {
  message: string;
  mentorId: string;
  mentorName: string;
  sessionsCount: number;
  subtotal: number;
  platformFee: number;
  total: number;
}

/**
 * Confirm a mentorship purchase — locks in the mentor + creates sessions.
 * POST /candidate/checkout
 */
export async function postCheckout(
  mentorId: string,
  candidateId: string
): Promise<CheckoutResponse | null> {
  return apiFetch<CheckoutResponse>("/candidate/checkout", {
    method: "POST",
    body: JSON.stringify({ mentorId, candidateId }),
  });
}

/* ── Candidate Workflow / Dashboard ── */

/**
 * Full workflow state for the candidate's mentorship dashboard:
 * sessions, action items, roadmap progress, and stats.
 */
export interface WorkflowResponse {
  candidateId: string;
  mentorName: string;
  status: string;

  /** All sessions (completed + upcoming) */
  sessions: Array<{
    id: string;
    title: string;
    date: string;
    time: string;
    status: string;
    mentor: string;
    notes?: string;
    relative?: string;
  }>;

  /** Actionable to-do items assigned by the mentor */
  actionItems: Array<{
    id: string;
    title: string;
    completed: boolean;
    dueDate: string;
  }>;

  /** Roadmap milestones with current progress */
  roadmap: Array<{
    id: string;
    title: string;
    description: string;
    duration: string;
    status: string;
  }>;

  /** The very next session on the calendar (null if all done) */
  nextSession: {
    id: string;
    date: string;
    time: string;
    title: string;
    relative: string;
  } | null;

  /** 0-100 overall completion percentage */
  overallProgress: number;

  /** Aggregated completion counts for the dashboard cards */
  stats: {
    completedSessions: number;
    totalSessions: number;
    completedActions: number;
    totalActions: number;
    completedSteps: number;
    totalSteps: number;
  };
}

/**
 * Load the full workflow state for a given candidate.
 * GET /candidate/workflow/{candidateId}
 */
export async function getWorkflow(
  candidateId: string
): Promise<WorkflowResponse | null> {
  return apiFetch<WorkflowResponse>(
    `/candidate/workflow/${encodeURIComponent(candidateId)}`
  );
}

/**
 * Mark a session as completed (optionally with notes).
 * POST /candidate/complete-session
 */
export async function completeSession(
  sessionId: string,
  notes?: string
): Promise<{ message: string; completedSessions: number; totalSessions: number } | null> {
  return apiFetch("/candidate/complete-session", {
    method: "POST",
    body: JSON.stringify({ sessionId, notes: notes || "" }),
  });
}

/* ════════════════════════════════════════════════════════════
 *  MENTOR APIs — Dashboard, Accept / Decline requests
 * ════════════════════════════════════════════════════════════ */

/** Everything a mentor sees on their dashboard. */
export interface MentorDashboardResponse {
  mentorId: string;
  mentorName: string;

  /** Overview stats rendered in the top cards */
  mentorStats: {
    activeMentees: number;
    completedSessions: number;
    upcomingSessions: number;
    rating: number;
    earnings: number;
    responseRate: number;
  };

  /** Calendar items for the "Upcoming Sessions" list */
  upcomingSessions: Array<{
    id: string;
    mentee: string;
    topic: string;
    date: string;
    time: string;
  }>;

  /** Mentees the mentor is currently working with */
  recentMentees: Array<{
    id: string;
    name: string;
    goal: string;
    progress: number;
    sessionsCompleted: number;
    totalSessions: number;
  }>;

  /** Incoming mentorship requests waiting for accept / decline */
  mentorRequests: Array<{
    id: string;
    candidateName: string;
    candidateGoal: string;
    experience: string;
    status: string;
    submittedAt: string;
  }>;
}

/**
 * Load the mentor's full dashboard data.
 * Uses the auth token to identify the mentor — no ID parameter needed.
 * GET /mentor/dashboard
 */
export async function getMentorDashboard(): Promise<MentorDashboardResponse | null> {
  return apiFetch<MentorDashboardResponse>("/mentor/dashboard");
}

/**
 * Accept a mentorship request, which also creates a Google Calendar event.
 * POST /mentor/accept
 */
export async function postMentorAccept(
  mentorshipId: string
): Promise<{
  message: string;
  calendarUrl?: string;
  sessionDetails?: {
    date: string;
    time: string;
    mentorName: string;
    candidateName: string;
  };
} | null> {
  return apiFetch("/mentor/accept", {
    method: "POST",
    body: JSON.stringify({ mentorshipId }),
  });
}

/**
 * Decline a mentorship request.
 * POST /mentor/decline
 */
export async function postMentorDecline(
  mentorshipId: string
): Promise<{ message: string } | null> {
  return apiFetch("/mentor/decline", {
    method: "POST",
    body: JSON.stringify({ mentorshipId }),
  });
}

/* ════════════════════════════════════════════════════════════
 *  ADMIN APIs — Platform overview & mentor verification
 * ════════════════════════════════════════════════════════════ */

/** Full admin dashboard data — stats, mentors, verifications, revenue. */
export interface AdminDashboardResponse {
  /** High-level platform health numbers */
  platformStats: {
    totalUsers: number;
    activeMentorships: number;
    pendingVerifications: number;
    completedSessions: number;
    avgRating: number;
    successRate: number;
  };

  /** Complete mentor roster */
  mentors: Array<{
    id: string;
    name: string;
    role: string;
    company: string;
    avatar: string;
    experience: number;
    domain: string;
    pricePerSession: number;
    available: boolean;
    rating: number;
    sessions: number;
    bio: string;
    verified: boolean;
  }>;

  /** All mentorship requests across the platform */
  mentorRequests: Array<{
    id: string;
    candidateName: string;
    candidateGoal: string;
    experience: string;
    status: string;
    submittedAt: string;
  }>;

  /** Mentors awaiting admin approval */
  pendingVerifications: Array<{
    id: string;
    name: string;
    role: string;
    experience: number;
    submittedAt: string;
  }>;

  /** Timeline of recent platform events */
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    time: string;
  }>;

  /** Financial summary for the revenue card */
  revenue: {
    total: number;
    change: string;
    transactions: number;
    avgValue: number;
  };
}

/**
 * Load the admin dashboard.
 * GET /admin/dashboard
 */
export async function getAdminDashboard(): Promise<AdminDashboardResponse | null> {
  return apiFetch<AdminDashboardResponse>("/admin/dashboard");
}

/**
 * Approve a mentor's verification request.
 * POST /admin/verify-mentor
 */
export async function postVerifyMentor(
  mentorId: string
): Promise<{ message: string } | null> {
  return apiFetch("/admin/verify-mentor", {
    method: "POST",
    body: JSON.stringify({ mentorId }),
  });
}

/* ════════════════════════════════════════════════════════════
 *  CANDIDATE STATUS & MISCELLANEOUS
 * ════════════════════════════════════════════════════════════ */

/**
 * Quick-check of how far a candidate has progressed through
 * the onboarding → roadmap → mentor → workflow pipeline.
 * Used for smart redirects after login.
 */
export interface CandidateStatus {
  status: string;
  hasOnboarded: boolean;
  hasMentor: boolean;
  hasRoadmap: boolean;
  candidateId?: string;
}

/**
 * Check the candidate's current status for smart redirects.
 * GET /candidate/status
 */
export async function getCandidateStatus(): Promise<CandidateStatus | null> {
  return apiFetch<CandidateStatus>("/candidate/status");
}

/* ── Action Item Toggle ── */

/** Response when toggling an action item's completion state. */
export interface ToggleActionResponse {
  message: string;
  actionItemId: string;
  completed: boolean;
  completedCount: number;
  totalCount: number;
}

/**
 * Toggle an action item between completed / not-completed.
 * POST /candidate/toggle-action
 */
export async function toggleActionItem(
  candidateId: string,
  actionItemId: string,
  completed: boolean
): Promise<ToggleActionResponse | null> {
  return apiFetch<ToggleActionResponse>("/candidate/toggle-action", {
    method: "POST",
    body: JSON.stringify({ candidateId, actionItemId, completed }),
  });
}

/* ── Single Mentor Fetch ── */

/**
 * Fetch one mentor's profile by ID (used on the checkout page).
 * GET /mentors/{mentorId}
 */
export async function getMentorById(
  mentorId: string
): Promise<MentorsResponse["mentors"][0] | null> {
  return apiFetch(`/mentors/${encodeURIComponent(mentorId)}`);
}

/* ── Mentor Verification ── */

/**
 * Submit a LinkedIn URL for mentor verification.
 * POST /mentor/verify-submit
 */
export async function postMentorVerifySubmit(
  linkedinUrl: string
): Promise<{ message: string; status: string } | null> {
  return apiFetch("/mentor/verify-submit", {
    method: "POST",
    body: JSON.stringify({ linkedinUrl }),
  });
}

/**
 * Check whether the current mentor's profile has been verified.
 * GET /mentor/verification-status
 */
export async function getMentorVerificationStatus(): Promise<{
  verified: boolean;
  pending: boolean;
  linkedinUrl: string;
} | null> {
  return apiFetch("/mentor/verification-status");
}
