// Mock data for the Admin Dashboard

export interface Mentee {
  id: string;
  name: string;
  email: string;
  avatar: string;
  targetRole: string;
  careerGoal: string;
  resumeUrl: string;
  status: "roadmap_generated" | "mentor_assigned" | "unassigned" | "in_progress";
  mentorId: string | null;
  roadmap: Roadmap | null;
  joinedAt: string;
}

export interface Roadmap {
  summary: string;
  skillGaps: string[];
  milestones: Milestone[];
  currentProgress: number; // 0-100
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  status: "completed" | "in_progress" | "pending";
  dueDate: string;
}

export interface Mentor {
  id: string;
  name: string;
  email: string;
  avatar: string;
  expertise: string[];
  experience: string;
  price: number;
  verified: boolean;
  enabled: boolean;
  currentWorkload: number; // number of active mentees
  maxWorkload: number;
  bio: string;
  rating: number;
  totalSessions: number;
}

export interface Mentorship {
  id: string;
  menteeId: string;
  mentorId: string;
  status: "active" | "completed" | "stalled" | "paused";
  startDate: string;
  lastSessionDate: string | null;
  sessionsCompleted: number;
  totalSessions: number;
  flagged: boolean;
  flagReason: string | null;
}

// ─── Mock Mentors ───────────────────────────────────────

export const mentors: Mentor[] = [
  {
    id: "m1",
    name: "Dr. Sarah Chen",
    email: "sarah.chen@example.com",
    avatar: "SC",
    expertise: ["Machine Learning", "Data Science", "Python"],
    experience: "12 years",
    price: 120,
    verified: true,
    enabled: true,
    currentWorkload: 3,
    maxWorkload: 5,
    bio: "Former Google ML lead, PhD in Computer Science from Stanford. Passionate about helping aspiring data scientists.",
    rating: 4.9,
    totalSessions: 247,
  },
  {
    id: "m2",
    name: "James Rodriguez",
    email: "james.r@example.com",
    avatar: "JR",
    expertise: ["Frontend Development", "React", "TypeScript", "UI/UX"],
    experience: "8 years",
    price: 90,
    verified: true,
    enabled: true,
    currentWorkload: 4,
    maxWorkload: 5,
    bio: "Senior Frontend Engineer at Meta. React contributor and open-source enthusiast.",
    rating: 4.7,
    totalSessions: 183,
  },
  {
    id: "m3",
    name: "Priya Sharma",
    email: "priya.s@example.com",
    avatar: "PS",
    expertise: ["Product Management", "Strategy", "Agile"],
    experience: "10 years",
    price: 150,
    verified: true,
    enabled: true,
    currentWorkload: 2,
    maxWorkload: 4,
    bio: "VP of Product at a Series C startup. Previously at Amazon and Microsoft.",
    rating: 4.8,
    totalSessions: 156,
  },
  {
    id: "m4",
    name: "Michael Thompson",
    email: "michael.t@example.com",
    avatar: "MT",
    expertise: ["Backend Development", "System Design", "Go", "Kubernetes"],
    experience: "15 years",
    price: 130,
    verified: true,
    enabled: true,
    currentWorkload: 1,
    maxWorkload: 3,
    bio: "Principal Engineer at Netflix. Specialist in distributed systems and scalability.",
    rating: 4.9,
    totalSessions: 312,
  },
  {
    id: "m5",
    name: "Emily Watson",
    email: "emily.w@example.com",
    avatar: "EW",
    expertise: ["Data Engineering", "SQL", "Spark", "AWS"],
    experience: "7 years",
    price: 85,
    verified: false,
    enabled: true,
    currentWorkload: 0,
    maxWorkload: 4,
    bio: "Data Engineer at Stripe. Building data pipelines at scale.",
    rating: 4.5,
    totalSessions: 67,
  },
  {
    id: "m6",
    name: "David Kim",
    email: "david.k@example.com",
    avatar: "DK",
    expertise: ["Mobile Development", "iOS", "Swift", "Flutter"],
    experience: "9 years",
    price: 110,
    verified: true,
    enabled: false,
    currentWorkload: 0,
    maxWorkload: 4,
    bio: "iOS Lead at Airbnb. Published multiple top-charting apps.",
    rating: 4.6,
    totalSessions: 134,
  },
  {
    id: "m7",
    name: "Lisa Park",
    email: "lisa.p@example.com",
    avatar: "LP",
    expertise: ["DevOps", "CI/CD", "Docker", "Terraform"],
    experience: "6 years",
    price: 95,
    verified: true,
    enabled: true,
    currentWorkload: 3,
    maxWorkload: 5,
    bio: "SRE at Datadog. Loves automating everything and teaching cloud-native practices.",
    rating: 4.7,
    totalSessions: 98,
  },
];

// ─── Mock Mentees ───────────────────────────────────────

export const mentees: Mentee[] = [
  {
    id: "c1",
    name: "Alex Johnson",
    email: "alex.j@example.com",
    avatar: "AJ",
    targetRole: "ML Engineer",
    careerGoal: "Transition from data analyst to ML engineer at a FAANG company within 12 months",
    resumeUrl: "#resume-alex",
    status: "mentor_assigned",
    mentorId: "m1",
    joinedAt: "2025-10-15",
    roadmap: {
      summary: "Structured path from data analysis to ML engineering, focusing on Python, TensorFlow, and system design for ML pipelines.",
      skillGaps: ["Deep Learning Frameworks", "MLOps", "System Design", "Advanced Python"],
      milestones: [
        { id: "ms1", title: "Complete ML Fundamentals", description: "Finish Andrew Ng's ML course and build 3 projects", status: "completed", dueDate: "2025-11-30" },
        { id: "ms2", title: "Build ML Pipeline", description: "Design and implement an end-to-end ML pipeline with CI/CD", status: "in_progress", dueDate: "2026-01-15" },
        { id: "ms3", title: "System Design for ML", description: "Study ML system design patterns and complete 5 mock interviews", status: "pending", dueDate: "2026-03-01" },
        { id: "ms4", title: "FAANG Applications", description: "Prepare and submit applications to target companies", status: "pending", dueDate: "2026-04-15" },
      ],
      currentProgress: 35,
    },
  },
  {
    id: "c2",
    name: "Maria Garcia",
    email: "maria.g@example.com",
    avatar: "MG",
    targetRole: "Senior Frontend Developer",
    careerGoal: "Level up from mid to senior frontend developer with expertise in React and system design",
    resumeUrl: "#resume-maria",
    status: "mentor_assigned",
    mentorId: "m2",
    joinedAt: "2025-11-02",
    roadmap: {
      summary: "Advancement plan focusing on advanced React patterns, performance optimization, and technical leadership.",
      skillGaps: ["React Performance", "Architecture Patterns", "Technical Leadership", "Testing Strategies"],
      milestones: [
        { id: "ms5", title: "Advanced React Patterns", description: "Master compound components, render props, and hooks patterns", status: "completed", dueDate: "2025-12-15" },
        { id: "ms6", title: "Performance Optimization", description: "Learn and apply React profiling, memoization, and code splitting", status: "completed", dueDate: "2026-01-20" },
        { id: "ms7", title: "Lead a Feature Project", description: "Take ownership of a significant feature at current job", status: "in_progress", dueDate: "2026-03-01" },
      ],
      currentProgress: 65,
    },
  },
  {
    id: "c3",
    name: "Rahul Patel",
    email: "rahul.p@example.com",
    avatar: "RP",
    targetRole: "Product Manager",
    careerGoal: "Switch from software engineering to product management at a growth-stage startup",
    resumeUrl: "#resume-rahul",
    status: "roadmap_generated",
    mentorId: null,
    joinedAt: "2025-12-10",
    roadmap: {
      summary: "Career pivot plan from engineering to PM, leveraging technical background while building product sense and business acumen.",
      skillGaps: ["Product Strategy", "User Research", "Data-Driven Decisions", "Stakeholder Management"],
      milestones: [
        { id: "ms8", title: "PM Fundamentals", description: "Complete product management certification and read key PM books", status: "in_progress", dueDate: "2026-02-01" },
        { id: "ms9", title: "Build Product Portfolio", description: "Create 2 product case studies from personal projects", status: "pending", dueDate: "2026-03-15" },
        { id: "ms10", title: "Network & Apply", description: "Attend PM meetups and apply to target companies", status: "pending", dueDate: "2026-05-01" },
      ],
      currentProgress: 15,
    },
  },
  {
    id: "c4",
    name: "Sophie Williams",
    email: "sophie.w@example.com",
    avatar: "SW",
    targetRole: "DevOps Engineer",
    careerGoal: "Become a certified DevOps engineer and land a role at a cloud-native company",
    resumeUrl: "#resume-sophie",
    status: "unassigned",
    mentorId: null,
    joinedAt: "2026-01-05",
    roadmap: null,
  },
  {
    id: "c5",
    name: "Chen Wei",
    email: "chen.w@example.com",
    avatar: "CW",
    targetRole: "Backend Engineer",
    careerGoal: "Transition from bootcamp grad to backend engineer at a mid-size tech company",
    resumeUrl: "#resume-chen",
    status: "roadmap_generated",
    mentorId: null,
    joinedAt: "2025-12-20",
    roadmap: {
      summary: "Foundational backend development path covering APIs, databases, and cloud deployment.",
      skillGaps: ["System Design", "Database Optimization", "API Security", "Cloud Services"],
      milestones: [
        { id: "ms11", title: "Master REST APIs", description: "Build 3 production-quality REST APIs with authentication", status: "completed", dueDate: "2026-01-15" },
        { id: "ms12", title: "Database Deep Dive", description: "Learn PostgreSQL optimization, indexing, and query planning", status: "in_progress", dueDate: "2026-02-28" },
        { id: "ms13", title: "Deploy to Cloud", description: "Deploy applications on AWS with proper CI/CD pipelines", status: "pending", dueDate: "2026-04-01" },
      ],
      currentProgress: 40,
    },
  },
  {
    id: "c6",
    name: "Aisha Mohammed",
    email: "aisha.m@example.com",
    avatar: "AM",
    targetRole: "Data Scientist",
    careerGoal: "Move from academic research to industry data science role",
    resumeUrl: "#resume-aisha",
    status: "mentor_assigned",
    mentorId: "m1",
    joinedAt: "2025-11-18",
    roadmap: {
      summary: "Transition from research to applied data science with focus on business impact and production ML.",
      skillGaps: ["Business Communication", "Production ML", "A/B Testing", "SQL at Scale"],
      milestones: [
        { id: "ms14", title: "Industry DS Tools", description: "Learn industry-standard tools: pandas, sklearn, and MLflow", status: "completed", dueDate: "2025-12-30" },
        { id: "ms15", title: "Business Projects", description: "Complete 3 business-oriented data science projects", status: "in_progress", dueDate: "2026-02-15" },
        { id: "ms16", title: "Interview Prep", description: "Practice case studies and technical interviews", status: "pending", dueDate: "2026-03-30" },
      ],
      currentProgress: 50,
    },
  },
  {
    id: "c7",
    name: "Tom Bradley",
    email: "tom.b@example.com",
    avatar: "TB",
    targetRole: "Full Stack Developer",
    careerGoal: "Build full-stack skills to launch a SaaS startup",
    resumeUrl: "#resume-tom",
    status: "in_progress",
    mentorId: "m2",
    joinedAt: "2025-09-28",
    roadmap: {
      summary: "Full-stack development mastery with entrepreneurial focus on building and shipping products.",
      skillGaps: ["Backend Architecture", "DevOps Basics", "Payment Integration", "User Auth"],
      milestones: [
        { id: "ms17", title: "Frontend Mastery", description: "Build complex UIs with Next.js and TypeScript", status: "completed", dueDate: "2025-11-15" },
        { id: "ms18", title: "Backend & APIs", description: "Build scalable APIs with Node.js and PostgreSQL", status: "completed", dueDate: "2026-01-01" },
        { id: "ms19", title: "Launch MVP", description: "Ship a complete SaaS MVP with auth, payments, and dashboards", status: "in_progress", dueDate: "2026-03-01" },
      ],
      currentProgress: 72,
    },
  },
  {
    id: "c8",
    name: "Nina Kowalski",
    email: "nina.k@example.com",
    avatar: "NK",
    targetRole: "iOS Developer",
    careerGoal: "Land first iOS developer job after self-teaching Swift",
    resumeUrl: "#resume-nina",
    status: "unassigned",
    mentorId: null,
    joinedAt: "2026-01-20",
    roadmap: null,
  },
];

// ─── Mock Mentorships ───────────────────────────────────

export const mentorships: Mentorship[] = [
  {
    id: "ship1",
    menteeId: "c1",
    mentorId: "m1",
    status: "active",
    startDate: "2025-10-20",
    lastSessionDate: "2026-02-05",
    sessionsCompleted: 8,
    totalSessions: 16,
    flagged: false,
    flagReason: null,
  },
  {
    id: "ship2",
    menteeId: "c2",
    mentorId: "m2",
    status: "active",
    startDate: "2025-11-10",
    lastSessionDate: "2026-02-07",
    sessionsCompleted: 10,
    totalSessions: 12,
    flagged: false,
    flagReason: null,
  },
  {
    id: "ship3",
    menteeId: "c6",
    mentorId: "m1",
    status: "active",
    startDate: "2025-11-25",
    lastSessionDate: "2026-01-28",
    sessionsCompleted: 6,
    totalSessions: 14,
    flagged: true,
    flagReason: "Mentee missed last 2 scheduled sessions",
  },
  {
    id: "ship4",
    menteeId: "c7",
    mentorId: "m2",
    status: "active",
    startDate: "2025-10-01",
    lastSessionDate: "2026-02-08",
    sessionsCompleted: 14,
    totalSessions: 16,
    flagged: false,
    flagReason: null,
  },
  {
    id: "ship5",
    menteeId: "c1",
    mentorId: "m4",
    status: "completed",
    startDate: "2025-07-01",
    lastSessionDate: "2025-09-30",
    sessionsCompleted: 10,
    totalSessions: 10,
    flagged: false,
    flagReason: null,
  },
  {
    id: "ship6",
    menteeId: "c3",
    mentorId: "m3",
    status: "stalled",
    startDate: "2025-12-15",
    lastSessionDate: "2026-01-05",
    sessionsCompleted: 2,
    totalSessions: 12,
    flagged: true,
    flagReason: "No session activity for over 30 days",
  },
];

// ─── Helper functions ───────────────────────────────────

export function getMenteeById(id: string): Mentee | undefined {
  return mentees.find((m) => m.id === id);
}

export function getMentorById(id: string): Mentor | undefined {
  return mentors.find((m) => m.id === id);
}

export function getMentorshipsByMenteeId(menteeId: string): Mentorship[] {
  return mentorships.filter((m) => m.menteeId === menteeId);
}

export function getMentorshipsByMentorId(mentorId: string): Mentorship[] {
  return mentorships.filter((m) => m.mentorId === mentorId);
}

export function getUnassignedMentees(): Mentee[] {
  return mentees.filter((m) => !m.mentorId);
}

export function getAvailableMentors(): Mentor[] {
  return mentors.filter((m) => m.enabled && m.verified && m.currentWorkload < m.maxWorkload);
}

export function getActiveMentorships(): Mentorship[] {
  return mentorships.filter((m) => m.status === "active");
}

export function getStalledMentorships(): Mentorship[] {
  return mentorships.filter((m) => m.status === "stalled");
}

export function getFlaggedMentorships(): Mentorship[] {
  return mentorships.filter((m) => m.flagged);
}

// ─── Dashboard Metrics ──────────────────────────────────

export function getDashboardMetrics() {
  const totalMentees = mentees.length;
  const totalMentors = mentors.length;
  const activeMentorships = mentorships.filter((m) => m.status === "active").length;
  const pendingAllocations = mentees.filter((m) => m.status === "roadmap_generated" && !m.mentorId).length;
  const unassignedMentees = mentees.filter((m) => !m.mentorId).length;
  const stalledMentorships = mentorships.filter((m) => m.status === "stalled").length;
  const completedMentorships = mentorships.filter((m) => m.status === "completed").length;
  const flaggedCount = mentorships.filter((m) => m.flagged).length;

  return {
    totalMentees,
    totalMentors,
    activeMentorships,
    pendingAllocations,
    unassignedMentees,
    stalledMentorships,
    completedMentorships,
    flaggedCount,
  };
}

// ─── Chart Data ─────────────────────────────────────────

export function getMenteeStatusDistribution() {
  const statuses = mentees.reduce(
    (acc, m) => {
      acc[m.status] = (acc[m.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(statuses).map(([status, count]) => ({
    name: status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    value: count,
  }));
}

export function getMonthlyMenteeGrowth() {
  return [
    { month: "Sep", mentees: 1, mentorships: 1 },
    { month: "Oct", mentees: 3, mentorships: 2 },
    { month: "Nov", mentees: 5, mentorships: 4 },
    { month: "Dec", mentees: 7, mentorships: 5 },
    { month: "Jan", mentees: 8, mentorships: 6 },
    { month: "Feb", mentees: 8, mentorships: 6 },
  ];
}
