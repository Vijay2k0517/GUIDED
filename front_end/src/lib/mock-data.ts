/**
 * ─────────────────────────────────────────────────────────────
 *  GUIDED — Mock / Fallback Data
 * ─────────────────────────────────────────────────────────────
 *  This file provides seed data used when the backend is
 *  unavailable or during local development. It mirrors the exact
 *  shapes returned by the real API so the UI can render
 *  identically in both online and offline scenarios.
 * ─────────────────────────────────────────────────────────────
 */


/* ════════════════════════════════════════════════════════════
 *  TYPE DEFINITIONS
 * ════════════════════════════════════════════════════════════ */

/** A mentor profile as shown in the catalogue and admin table. */
export interface Mentor {
  id: string;
  name: string;
  role: string;
  company: string;
  avatar: string;       // initials used as a placeholder avatar
  experience: number;   // years of professional experience
  domain: string;
  pricePerSession: number;
  available: boolean;
  rating: number;
  sessions: number;     // total sessions completed on the platform
  bio: string;
}

/** A single milestone in the candidate's preparation roadmap. */
export interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  duration: string;
  status: "completed" | "current" | "upcoming";
}

/** A scheduled or completed mentorship session. */
export interface Session {
  id: string;
  title: string;
  date: string;         // ISO date string (YYYY-MM-DD)
  time: string;         // human-readable time, e.g. "10:00 AM"
  status: "completed" | "upcoming" | "in-progress";
  mentor: string;
  notes?: string;
}

/** A to-do item a mentor assigns to a candidate. */
export interface ActionItem {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
}

/* ════════════════════════════════════════════════════════════
 *  MENTOR CATALOGUE (seed data)
 * ════════════════════════════════════════════════════════════ */

export const mentors: Mentor[] = [
  {
    id: "m1",
    name: "Ananya Iyer",
    role: "Senior Software Engineer",
    company: "Google",
    avatar: "AI",
    experience: 8,
    domain: "Software Engineering",
    pricePerSession: 6000,
    available: true,
    rating: 4.9,
    sessions: 142,
    bio: "Passionate about helping engineers level up their system design and coding interview skills.",
  },
  {
    id: "m2",
    name: "Vikram Desai",
    role: "Product Manager",
    company: "Flipkart",
    avatar: "VD",
    experience: 6,
    domain: "Product Management",
    pricePerSession: 7000,
    available: true,
    rating: 4.8,
    sessions: 98,
    bio: "Former founder turned PM. I help candidates break into top product roles.",
  },
  {
    id: "m3",
    name: "Priya Sharma",
    role: "Data Scientist",
    company: "Infosys",
    avatar: "PS",
    experience: 5,
    domain: "Data Science",
    pricePerSession: 5000,
    available: false,
    rating: 4.7,
    sessions: 67,
    bio: "Specialized in ML interviews and portfolio building for aspiring data scientists.",
  },
  {
    id: "m4",
    name: "Rajesh Nair",
    role: "Engineering Manager",
    company: "Amazon",
    avatar: "RN",
    experience: 10,
    domain: "Software Engineering",
    pricePerSession: 10000,
    available: true,
    rating: 5.0,
    sessions: 203,
    bio: "I coach engineers on the path to staff+ and management roles at top companies.",
  },
  {
    id: "m5",
    name: "Kavya Reddy",
    role: "UX Design Lead",
    company: "Zoho",
    avatar: "KR",
    experience: 7,
    domain: "Design",
    pricePerSession: 5500,
    available: true,
    rating: 4.9,
    sessions: 115,
    bio: "Helping designers build world-class portfolios and ace design challenges.",
  },
  {
    id: "m6",
    name: "Arun Kapoor",
    role: "Staff Engineer",
    company: "Razorpay",
    avatar: "AK",
    experience: 12,
    domain: "Software Engineering",
    pricePerSession: 12000,
    available: true,
    rating: 4.8,
    sessions: 89,
    bio: "Deep expertise in distributed systems. I help engineers think at scale.",
  },
];

/* ════════════════════════════════════════════════════════════
 *  SAMPLE ROADMAP (template)
 * ════════════════════════════════════════════════════════════ */

export const sampleRoadmap: RoadmapStep[] = [
  {
    id: "r1",
    title: "Strengthen Core Fundamentals",
    description:
      "Review data structures, algorithms, and system design basics. Focus on areas identified in skill gap analysis.",
    duration: "Weeks 1-2",
    status: "completed",
  },
  {
    id: "r2",
    title: "Build Portfolio Projects",
    description:
      "Create 2-3 targeted projects that demonstrate your skills in your target domain. Document your process.",
    duration: "Weeks 3-5",
    status: "current",
  },
  {
    id: "r3",
    title: "Mock Interviews & Feedback",
    description:
      "Complete structured mock interviews with your mentor. Receive detailed feedback on technical and behavioral responses.",
    duration: "Weeks 6-7",
    status: "upcoming",
  },
  {
    id: "r4",
    title: "Application Strategy",
    description:
      "Optimize resume, LinkedIn profile, and application materials. Develop a targeted company list with your mentor.",
    duration: "Week 8",
    status: "upcoming",
  },
  {
    id: "r5",
    title: "Interview Sprint",
    description:
      "Execute your interview strategy with ongoing mentor support. Debrief after each round for continuous improvement.",
    duration: "Weeks 9-12",
    status: "upcoming",
  },
];

/* ════════════════════════════════════════════════════════════
 *  SESSION HISTORY & UPCOMING SCHEDULE
 * ════════════════════════════════════════════════════════════ */

export const sessions: Session[] = [
  {
    id: "s1",
    title: "Goal Setting & Assessment",
    date: "2026-02-10",
    time: "10:00 AM",
    status: "completed",
    mentor: "Ananya Iyer",
    notes: "Defined 12-week goals. Identified key skill gaps in system design.",
  },
  {
    id: "s2",
    title: "System Design Deep Dive",
    date: "2026-02-14",
    time: "2:00 PM",
    status: "completed",
    mentor: "Ananya Iyer",
    notes: "Covered URL shortener design. Need to practice load balancer concepts.",
  },
  {
    id: "s3",
    title: "Portfolio Review",
    date: "2026-02-21",
    time: "10:00 AM",
    status: "upcoming",
    mentor: "Ananya Iyer",
  },
  {
    id: "s4",
    title: "Mock Interview #1",
    date: "2026-02-28",
    time: "3:00 PM",
    status: "upcoming",
    mentor: "Ananya Iyer",
  },
];

/* ════════════════════════════════════════════════════════════
 *  ACTION ITEMS (to-do list)
 * ════════════════════════════════════════════════════════════ */

export const actionItems: ActionItem[] = [
  { id: "a1", title: "Complete LeetCode medium problems (10)", completed: true, dueDate: "2026-02-12" },
  { id: "a2", title: "Read Designing Data-Intensive Applications Ch. 1-3", completed: true, dueDate: "2026-02-14" },
  { id: "a3", title: "Build REST API project with proper error handling", completed: false, dueDate: "2026-02-20" },
  { id: "a4", title: "Write system design doc for chat application", completed: false, dueDate: "2026-02-22" },
  { id: "a5", title: "Update LinkedIn with recent project work", completed: false, dueDate: "2026-02-25" },
];

/* ════════════════════════════════════════════════════════════
 *  SKILL GAP ANALYSIS (current vs. target proficiency)
 * ════════════════════════════════════════════════════════════ */

export const skillGaps = [
  { skill: "System Design", level: 35, target: 80 },
  { skill: "Algorithms", level: 55, target: 85 },
  { skill: "Behavioral Interviews", level: 40, target: 75 },
  { skill: "Communication", level: 60, target: 80 },
  { skill: "Domain Knowledge", level: 45, target: 70 },
];

/* ════════════════════════════════════════════════════════════
 *  PLATFORM-WIDE STATISTICS (admin dashboard)
 * ════════════════════════════════════════════════════════════ */

export const platformStats = {
  totalUsers: 2847,
  activeMentorships: 156,
  pendingVerifications: 12,
  completedSessions: 1893,
  avgRating: 4.8,
  successRate: 87,
};

/* ════════════════════════════════════════════════════════════
 *  MENTORSHIP REQUESTS (mentor inbox)
 * ════════════════════════════════════════════════════════════ */

export const mentorRequests = [
  {
    id: "req1",
    candidateName: "Arjun Mehta",
    candidateGoal: "Break into top tech companies as a frontend engineer",
    experience: "2 years",
    status: "pending" as const,
    submittedAt: "2026-02-08",
  },
  {
    id: "req2",
    candidateName: "Sneha Patel",
    candidateGoal: "Transition from backend to full-stack",
    experience: "4 years",
    status: "pending" as const,
    submittedAt: "2026-02-07",
  },
  {
    id: "req3",
    candidateName: "Rohan Joshi",
    candidateGoal: "Land first data science role",
    experience: "0 years (bootcamp grad)",
    status: "accepted" as const,
    submittedAt: "2026-02-05",
  },
];
