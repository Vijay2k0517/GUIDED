/**
 * ─────────────────────────────────────────────────────────────
 *  GUIDED — Admin Dashboard
 * ─────────────────────────────────────────────────────────────
 *  Platform-wide overview restricted to admin role. Shows:
 *    • Six KPI stat cards (users, mentorships, verifications…)
 *    • Pending mentor verification queue (approve / review)
 *    • Active mentors table with rating + status
 *    • Recent activity feed (sessions, sign-ups, milestones…)
 *    • Platform revenue card with month-over-month change
 *    • Mentorship request status list
 *
 *  Falls back to client-side mock data when the API returns
 *  nothing, so the page is always presentable during demos.
 * ─────────────────────────────────────────────────────────────
 */
"use client";

import { useState, useEffect } from "react";
import {
  Users, TrendingUp, Calendar, CheckCircle2,
  AlertCircle, Star, IndianRupee, BarChart3, Shield,
} from "lucide-react";
import { Button }    from "@/components/ui/button";
import { Badge }     from "@/components/ui/badge";
import { Progress }  from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  platformStats   as fallbackPlatformStats,
  mentors         as fallbackMentors,
  mentorRequests  as fallbackMentorRequests,
  type Mentor,
} from "@/lib/mock-data";
import { getAdminDashboard, postVerifyMentor } from "@/lib/api";
import { RouteGuard } from "@/components/route-guard";
import { Navbar }     from "@/components/navbar";


/* ════════════════════════════════════════════════════════════
 *  FALLBACK DATA (demo / offline mode)
 * ════════════════════════════════════════════════════════════ */

const fallbackRecentActivity = [
  { id: "act1", type: "session",   description: "Arjun Mehta completed session with Ananya Iyer", time: "2 hours ago" },
  { id: "act2", type: "signup",    description: "New mentor application: Arun Kapoor (Razorpay)",  time: "4 hours ago" },
  { id: "act3", type: "milestone", description: "Rohan Joshi completed 50% of roadmap",            time: "6 hours ago" },
  { id: "act4", type: "payment",   description: "Payment processed: ₹54,000 for 8-session package", time: "8 hours ago" },
  { id: "act5", type: "signup",    description: "New candidate registered: Nisha Verma",           time: "12 hours ago" },
];

const fallbackPendingVerifications = [
  { id: "v1", name: "Meera Kulkarni",  role: "Senior PM at Flipkart",     experience: 7, submittedAt: "2026-02-08" },
  { id: "v2", name: "Siddharth Rao",   role: "Staff Engineer at Ola",     experience: 9, submittedAt: "2026-02-07" },
  { id: "v3", name: "Deepa Menon",     role: "Design Lead at Swiggy",     experience: 6, submittedAt: "2026-02-06" },
];

const fallbackRevenue = {
  total: 1473600, change: "+23%", transactions: 247, avgValue: 5964.78,
};


/* ════════════════════════════════════════════════════════════
 *  ADMIN DASHBOARD COMPONENT
 * ════════════════════════════════════════════════════════════ */

export default function AdminDashboard() {
  /* ── State — pre-populated with fallback data ── */
  const [platformStats, setPlatformStats]             = useState(fallbackPlatformStats);
  const [mentors, setMentors]                         = useState<Mentor[]>(fallbackMentors);
  const [mentorRequests, setMentorRequests]            = useState(fallbackMentorRequests);
  const [recentActivity, setRecentActivity]            = useState(fallbackRecentActivity);
  const [pendingVerifications, setPendingVerifications] = useState(fallbackPendingVerifications);
  const [revenue, setRevenue]                          = useState(fallbackRevenue);


  /* ────────────────────────────────────────────────────────
   *  Fetch real data on mount (falls back to mock silently)
   * ──────────────────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      const res = await getAdminDashboard();
      if (res) {
        setPlatformStats(res.platformStats);
        if (res.mentors.length > 0)              setMentors(res.mentors as Mentor[]);
        if (res.mentorRequests.length > 0)       setMentorRequests(res.mentorRequests as typeof fallbackMentorRequests);
        if (res.recentActivity.length > 0)       setRecentActivity(res.recentActivity);
        if (res.pendingVerifications.length > 0) setPendingVerifications(res.pendingVerifications);
        setRevenue(res.revenue);
      }
    }
    load();
  }, []);


  /* ────────────────────────────────────────────────────────
   *  Approve a pending mentor verification
   * ──────────────────────────────────────────────────────── */
  const handleApprove = async (vId: string) => {
    const res = await postVerifyMentor(vId);
    if (res) {
      // Remove from pending list and decrement counter
      setPendingVerifications((prev) => prev.filter((v) => v.id !== vId));
      setPlatformStats((prev) => ({
        ...prev,
        pendingVerifications: prev.pendingVerifications - 1,
      }));
    }
  };


  /* ════════════════════════════════════════════════════════
   *  RENDER
   * ════════════════════════════════════════════════════════ */

  return (
    <RouteGuard allowedRoles={["admin"]}>
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* ── Page header ── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Platform overview and management
          </p>
        </div>

        {/* ── Six-card platform KPI grid ── */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Total Users
            </div>
            <div className="mt-2 text-2xl font-bold">
              {platformStats.totalUsers.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl border p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Active Mentorships
            </div>
            <div className="mt-2 text-2xl font-bold">
              {platformStats.activeMentorships}
            </div>
          </div>
          <div className="rounded-xl border p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Pending Verifications
            </div>
            <div className="mt-2 text-2xl font-bold">
              {platformStats.pendingVerifications}
            </div>
          </div>
          <div className="rounded-xl border p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Sessions
            </div>
            <div className="mt-2 text-2xl font-bold">
              {platformStats.completedSessions.toLocaleString()}
            </div>
          </div>
          <div className="rounded-xl border p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4" />
              Avg Rating
            </div>
            <div className="mt-2 text-2xl font-bold">
              {platformStats.avgRating}
            </div>
          </div>
          <div className="rounded-xl border p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              Success Rate
            </div>
            <div className="mt-2 text-2xl font-bold">
              {platformStats.successRate}%
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Main column: verifications + mentors table ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* ── Pending mentor verification queue ── */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">
                Pending Mentor Verifications
              </h2>
              <div className="space-y-3">
                {pendingVerifications.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-sm font-semibold text-amber-700">
                        {v.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <h3 className="font-medium">{v.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {v.role}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {v.experience} years exp &middot; Applied{" "}
                          {v.submittedAt}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleApprove(v.id)}>Approve</Button>
                      <Button size="sm" variant="outline">
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Active mentors table (name, rating, sessions, status) ── */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">
                Active Mentors ({mentors.length})
              </h2>
              <div className="rounded-xl border">
                <div className="grid grid-cols-5 gap-4 border-b px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <div className="col-span-2">Mentor</div>
                  <div>Rating</div>
                  <div>Sessions</div>
                  <div>Status</div>
                </div>
                {mentors.map((mentor) => (
                  <div
                    key={mentor.id}
                    className="grid grid-cols-5 items-center gap-4 border-b px-4 py-3 last:border-0"
                  >
                    <div className="col-span-2 flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {mentor.avatar}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {mentor.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {mentor.company}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      {mentor.rating}
                    </div>
                    <div className="text-sm">{mentor.sessions}</div>
                    <div>
                      {mentor.available ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-50 text-green-700 text-xs"
                        >
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Waitlist
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Sidebar column ── */}
          <div className="space-y-6">
            {/* ── Recent activity feed ── */}
            <div className="rounded-xl border p-6">
              <h2 className="mb-4 font-semibold">Recent Activity</h2>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div
                      className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        activity.type === "session"
                          ? "bg-blue-50 text-blue-600"
                          : activity.type === "signup"
                            ? "bg-green-50 text-green-600"
                            : activity.type === "milestone"
                              ? "bg-purple-50 text-purple-600"
                              : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {activity.type === "session" && (
                        <Calendar className="h-3 w-3" />
                      )}
                      {activity.type === "signup" && (
                        <Users className="h-3 w-3" />
                      )}
                      {activity.type === "milestone" && (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      {activity.type === "payment" && (
                        <IndianRupee className="h-3 w-3" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Platform revenue highlight card ── */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
              <h3 className="font-semibold">Platform Revenue</h3>
              <div className="mt-2 text-3xl font-bold">₹{revenue.total.toLocaleString("en-IN")}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                <TrendingUp className="mr-1 inline h-3.5 w-3.5 text-green-600" />
                {revenue.change} vs last month
              </p>
              <Separator className="my-4" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transactions</span>
                  <span className="font-medium">{revenue.transactions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg. Value</span>
                  <span className="font-medium">₹{revenue.avgValue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* ── Mentorship request status list ── */}
            <div className="rounded-xl border p-6">
              <h2 className="mb-4 font-semibold">Mentorship Requests</h2>
              <div className="space-y-3">
                {mentorRequests.map((req) => (
                  <div key={req.id} className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        req.status === "pending"
                          ? "bg-amber-500"
                          : "bg-green-500"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm">
                        {req.candidateName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {req.candidateGoal}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </RouteGuard>
  );
}
