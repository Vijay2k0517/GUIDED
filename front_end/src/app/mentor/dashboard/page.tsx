/**
 * ─────────────────────────────────────────────────────────────
 *  GUIDED — Mentor Dashboard
 * ─────────────────────────────────────────────────────────────
 *  Central hub for verified mentors. Shows:
 *    • Six KPI stat cards (mentees, sessions, rating, earnings…)
 *    • Google Calendar scheduling banner (after accepting)
 *    • Upcoming sessions list with "Join" buttons
 *    • Active mentees with progress bars
 *    • Mentorship requests (accept / decline)
 *    • Performance sidebar + total earnings card
 * ─────────────────────────────────────────────────────────────
 */
"use client";

import { useState, useEffect } from "react";
import {
  Calendar, CheckCircle2, Clock, Users, Star,
  TrendingUp, IndianRupee, MessageSquare,
  ArrowRight, ExternalLink,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getMentorDashboard, postMentorAccept, postMentorDecline } from "@/lib/api";
import { RouteGuard } from "@/components/route-guard";
import { Navbar }     from "@/components/navbar";
import { useAuth }    from "@/lib/auth-context";


/* ════════════════════════════════════════════════════════════
 *  MENTOR DASHBOARD COMPONENT
 * ════════════════════════════════════════════════════════════ */

export default function MentorDashboard() {
  const { user } = useAuth();

  /* ── Dashboard state ── */
  const [mentorStats, setMentorStats] = useState({
    activeMentees: 0, completedSessions: 0, upcomingSessions: 0,
    rating: 0, earnings: 0, responseRate: 0,
  });
  const [upcomingSessions, setUpcomingSessions] = useState<
    Array<{ id: string; mentee: string; topic: string; date: string; time: string }>
  >([]);
  const [recentMentees, setRecentMentees] = useState<
    Array<{ id: string; name: string; goal: string; progress: number; sessionsCompleted: number; totalSessions: number }>
  >([]);
  const [mentorRequests, setMentorRequests] = useState<
    Array<{ id: string; candidateName: string; candidateGoal: string; experience: string; status: string; submittedAt: string }>
  >([]);
  const [mentorName, setMentorName] = useState(user?.name?.split(" ")[0] || "Mentor");
  const [isLoaded, setIsLoaded]     = useState(false);
  const [calendarInfo, setCalendarInfo] = useState<{
    url: string; date: string; time: string; candidateName: string;
  } | null>(null);


  /* ────────────────────────────────────────────────────────
   *  Fetch dashboard data on mount
   * ──────────────────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      const res = await getMentorDashboard();
      if (res) {
        setMentorStats(res.mentorStats);
        setUpcomingSessions(res.upcomingSessions);
        setRecentMentees(res.recentMentees);
        setMentorRequests(res.mentorRequests);
        if (res.mentorName) setMentorName(res.mentorName.split(" ")[0]);
      }
      setIsLoaded(true);
    }
    load();
  }, []);


  /* ────────────────────────────────────────────────────────
   *  Accept / Decline mentorship request handlers
   * ──────────────────────────────────────────────────────── */
  const handleAccept = async (reqId: string) => {
    const res = await postMentorAccept(reqId);
    if (res) {
      setMentorRequests((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: "accepted" } : r))
      );
      // Show Google Calendar scheduling banner
      if (res.calendarUrl) {
        setCalendarInfo({
          url:           res.calendarUrl,
          date:          res.sessionDetails?.date || "",
          time:          res.sessionDetails?.time || "",
          candidateName: res.sessionDetails?.candidateName || "",
        });
        window.open(res.calendarUrl, "_blank");
      }
    }
  };

  const handleDecline = async (reqId: string) => {
    const res = await postMentorDecline(reqId);
    if (res) {
      setMentorRequests((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: "declined" } : r))
      );
    }
  };

  const pendingRequests = mentorRequests.filter((r) => r.status === "pending");


  /* ════════════════════════════════════════════════════════════
   *  RENDER
   * ════════════════════════════════════════════════════════════ */

  return (
    <RouteGuard allowedRoles={["mentor"]}>
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* ── Page header ── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            Mentor Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Welcome back, {mentorName}. Here&apos;s your mentorship overview.
          </p>
        </div>

        {/* ── Google Calendar scheduling banner (shown after accepting a request) ── */}
        {calendarInfo && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5 dark:border-green-800 dark:bg-green-950/30">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-800 dark:text-green-200">
                  Mentorship Accepted — Session Scheduled!
                </h3>
                <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                  First session with <strong>{calendarInfo.candidateName}</strong> on{" "}
                  <strong>{calendarInfo.date}</strong> at <strong>{calendarInfo.time}</strong>.
                  A Google Calendar event has been opened in a new tab.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300"
                    onClick={() => window.open(calendarInfo.url, "_blank")}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Open Google Calendar
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-green-600"
                    onClick={() => setCalendarInfo(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Six-card KPI stats grid ── */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Active Mentees
            </div>
            <div className="mt-2 text-2xl font-bold">
              {mentorStats.activeMentees}
            </div>
          </div>
          <div className="rounded-xl border p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              Completed
            </div>
            <div className="mt-2 text-2xl font-bold">
              {mentorStats.completedSessions}
            </div>
          </div>
          <div className="rounded-xl border p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Upcoming
            </div>
            <div className="mt-2 text-2xl font-bold">
              {mentorStats.upcomingSessions}
            </div>
          </div>
          <div className="rounded-xl border p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-4 w-4" />
              Rating
            </div>
            <div className="mt-2 text-2xl font-bold">
              {mentorStats.rating}
            </div>
          </div>
          <div className="rounded-xl border p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <IndianRupee className="h-4 w-4" />
              Earnings
            </div>
            <div className="mt-2 text-2xl font-bold">
              ₹{mentorStats.earnings.toLocaleString("en-IN")}
            </div>
          </div>
          <div className="rounded-xl border p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              Response
            </div>
            <div className="mt-2 text-2xl font-bold">
              {mentorStats.responseRate}%
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* ── Main column: sessions + mentees ── */}
          <div className="lg:col-span-2 space-y-6">
            {/* ── Upcoming sessions list ── */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">
                Upcoming Sessions
              </h2>
              <div className="space-y-3">
                {upcomingSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{session.topic}</h3>
                        <p className="text-sm text-muted-foreground">
                          with {session.mentee}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {session.date} at {session.time}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Join
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Active mentees with progress bars ── */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">Active Mentees</h2>
              <div className="space-y-3">
                {recentMentees.map((mentee) => (
                  <div key={mentee.id} className="rounded-lg border p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {mentee.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div>
                          <h3 className="font-medium">{mentee.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {mentee.goal}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {mentee.sessionsCompleted}/{mentee.totalSessions}{" "}
                        sessions
                      </Badge>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Roadmap Progress
                        </span>
                        <span className="font-medium">{mentee.progress}%</span>
                      </div>
                      <Progress value={mentee.progress} className="mt-2 h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Sidebar column ── */}
          <div className="space-y-6">
            {/* ── Mentorship requests (accept / decline) ── */}
            <div className="rounded-xl border p-6">
              <h2 className="flex items-center justify-between font-semibold">
                Mentorship Requests
                <Badge variant="secondary" className="text-xs">
                  {pendingRequests.length}{" "}
                  new
                </Badge>
              </h2>
              <div className="mt-4 space-y-4">
                {pendingRequests.length === 0 && (
                  <p className="text-sm text-muted-foreground">No pending requests</p>
                )}
                {pendingRequests
                  .map((req) => (
                    <div key={req.id} className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">
                          {req.candidateName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {req.candidateGoal}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {req.experience} experience
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="h-7 text-xs" onClick={() => handleAccept(req.id)}>
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleDecline(req.id)}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* ── Performance progress bars ── */}
            <div className="rounded-xl border p-6">
              <h2 className="font-semibold">Performance</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Mentee Success Rate
                    </span>
                    <span className="font-medium">
                      {recentMentees.length > 0
                        ? Math.round(recentMentees.reduce((a, m) => a + m.progress, 0) / recentMentees.length)
                        : 0}%
                    </span>
                  </div>
                  <Progress
                    value={recentMentees.length > 0
                      ? Math.round(recentMentees.reduce((a, m) => a + m.progress, 0) / recentMentees.length)
                      : 0}
                    className="mt-2 h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Session Completion
                    </span>
                    <span className="font-medium">
                      {mentorStats.completedSessions > 0
                        ? Math.min(100, Math.round((mentorStats.completedSessions / (mentorStats.completedSessions + mentorStats.upcomingSessions || 1)) * 100))
                        : 0}%
                    </span>
                  </div>
                  <Progress
                    value={mentorStats.completedSessions > 0
                      ? Math.min(100, Math.round((mentorStats.completedSessions / (mentorStats.completedSessions + mentorStats.upcomingSessions || 1)) * 100))
                      : 0}
                    className="mt-2 h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Response Rate
                    </span>
                    <span className="font-medium">{mentorStats.responseRate}%</span>
                  </div>
                  <Progress value={mentorStats.responseRate} className="mt-2 h-2" />
                </div>
              </div>
            </div>

            {/* ── Total earnings highlight card ── */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
              <h3 className="font-semibold">Total Earnings</h3>
              <div className="mt-2 text-3xl font-bold">₹{mentorStats.earnings.toLocaleString("en-IN")}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                <TrendingUp className="mr-1 inline h-3.5 w-3.5 text-green-600" />
                {mentorStats.activeMentees} active mentee{mentorStats.activeMentees !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </RouteGuard>
  );
}
