/**
 * ─────────────────────────────────────────────────────────────
 *  GUIDED — Candidate Workflow Dashboard
 * ─────────────────────────────────────────────────────────────
 *  The primary post-checkout view for candidates. Surfaces
 *  everything they need during an active mentorship:
 *    • Overall progress ring + stats cards
 *    • Next-session highlight card
 *    • Completed / upcoming session lists (with "mark done")
 *    • Action-item checklist (optimistic toggle)
 *    • Mini roadmap timeline
 *    • Mentor info card
 *
 *  All data comes from `getWorkflow()` and is refreshed after
 *  mutating actions (toggle action item, complete session).
 * ─────────────────────────────────────────────────────────────
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Calendar, CheckCircle2, Circle, Clock, FileText,
  MessageSquare, Video, ArrowRight, TrendingUp,
  Target, Loader2,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { getWorkflow, toggleActionItem, completeSession } from "@/lib/api";
import { RouteGuard } from "@/components/route-guard";
import { Navbar }     from "@/components/navbar";
import { useAuth }    from "@/lib/auth-context";
import { toast }      from "sonner";


/* ════════════════════════════════════════════════════════════
 *  LOCAL TYPES
 * ════════════════════════════════════════════════════════════ */

interface Session {
  id: string;
  title: string;
  date: string;
  time: string;
  status: string;
  mentor: string;
  notes?: string;
  relative?: string;
}

interface ActionItem {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string;
}

interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  duration: string;
  status: string;
}


/* ════════════════════════════════════════════════════════════
 *  WORKFLOW DASHBOARD COMPONENT
 * ════════════════════════════════════════════════════════════ */

export default function WorkflowDashboard() {
  const { user } = useAuth();

  /* ── Dashboard state ── */
  const [sessions, setSessions]           = useState<Session[]>([]);
  const [actionItems, setActionItems]     = useState<ActionItem[]>([]);
  const [sampleRoadmap, setSampleRoadmap] = useState<RoadmapStep[]>([]);
  const [mentorName, setMentorName]       = useState("");
  const [nextSession, setNextSession]     = useState<{
    id: string; date: string; time: string; title: string; relative: string;
  } | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [stats, setStats] = useState({
    completedSessions: 0, totalSessions: 0,
    completedActions:  0, totalActions:  0,
    completedSteps:    0, totalSteps:    0,
  });
  const [isLoaded, setIsLoaded] = useState(false);


  /* ────────────────────────────────────────────────────────
   *  Data fetching — called on mount and after mutations
   * ──────────────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    if (!user?.id) return;
    const res = await getWorkflow(user.id);
    if (res) {
      setSessions(res.sessions as Session[]);
      setActionItems(res.actionItems as ActionItem[]);
      setSampleRoadmap(res.roadmap as RoadmapStep[]);
      if (res.mentorName)  setMentorName(res.mentorName);
      if (res.nextSession) setNextSession(res.nextSession);
      else                 setNextSession(null);
      setOverallProgress(res.overallProgress ?? 0);
      if (res.stats)       setStats(res.stats);
    }
    setIsLoaded(true);
  }, [user?.id]);

  useEffect(() => { loadData(); }, [loadData]);


  /* ────────────────────────────────────────────────────────
   *  Action-item toggle (optimistic)
   * ──────────────────────────────────────────────────────── */
  const handleToggleAction = async (itemId: string, currentCompleted: boolean) => {
    if (!user?.id) return;
    const newCompleted = !currentCompleted;
    // Optimistic update
    setActionItems((prev) =>
      prev.map((a) => (a.id === itemId ? { ...a, completed: newCompleted } : a))
    );
    setStats((s) => ({
      ...s,
      completedActions: s.completedActions + (newCompleted ? 1 : -1),
    }));
    const res = await toggleActionItem(user.id, itemId, newCompleted);
    if (!res) {
      setActionItems((prev) =>
        prev.map((a) => (a.id === itemId ? { ...a, completed: currentCompleted } : a))
      );
      setStats((s) => ({
        ...s,
        completedActions: s.completedActions + (newCompleted ? -1 : 1),
      }));
      toast.error("Failed to update action item");
    }
  };

  /* ────────────────────────────────────────────────────────
   *  Complete session handler (optimistic)
   * ──────────────────────────────────────────────────────── */

  const handleCompleteSession = async (sessionId: string) => {
    // Optimistic update
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status: "completed", relative: "Completed" } : s))
    );
    setStats((s) => ({
      ...s,
      completedSessions: s.completedSessions + 1,
    }));
    toast.success("Session marked as completed!");

    const res = await completeSession(sessionId);
    if (res) {
      // Reload full data to get updated roadmap progress, next session, etc.
      await loadData();
    } else {
      // Revert
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, status: "upcoming" } : s))
      );
      setStats((s) => ({
        ...s,
        completedSessions: s.completedSessions - 1,
      }));
      toast.error("Failed to complete session");
    }
  };

  /* ────────────────────────────────────────────────────────
   *  Date formatting helpers
   * ──────────────────────────────────────────────────────── */

  /** Human-friendly session date (e.g. "Mon, Feb 10"). */
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  /** Relative due-date label ("Due today", "Overdue", etc.). */
  const formatDueDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff < 0) return "Overdue";
      if (diff === 0) return "Due today";
      if (diff === 1) return "Due tomorrow";
      if (diff < 7) return `Due in ${diff} days`;
      return `Due ${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    } catch {
      return `Due ${dateStr}`;
    }
  };

  /* ════════════════════════════════════════════════════════
   *  LOADING STATE
   * ════════════════════════════════════════════════════════ */

  // Loading skeleton
  if (!isLoaded) {
    return (
      <RouteGuard allowedRoles={["candidate"]}>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="mx-auto max-w-6xl px-6 py-10">
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
            </div>
          </div>
        </div>
      </RouteGuard>
    );
  }

  const upcomingSessions      = sessions.filter((s) => s.status === "upcoming");
  const completedSessionsList = sessions.filter((s) => s.status === "completed");


  /* ════════════════════════════════════════════════════════
   *  MAIN DASHBOARD RENDER
   * ════════════════════════════════════════════════════════ */

  return (
    <RouteGuard allowedRoles={["candidate"]}>
      <div className="min-h-screen bg-background">
        <Navbar />

        <div className="mx-auto max-w-6xl px-6 py-10">
          {/* ── Header with overall progress ring ── */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Mentorship Dashboard</h1>
              <p className="mt-1 text-muted-foreground">
                {mentorName ? (
                  <>Your active mentorship with <span className="font-medium text-foreground">{mentorName}</span></>
                ) : (
                  "Track your mentorship progress"
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Overall Progress</p>
                <p className="text-2xl font-bold text-primary">{overallProgress}%</p>
              </div>
              <div className="relative h-14 w-14">
                <svg className="h-14 w-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" strokeWidth="4" className="stroke-muted" />
                  <circle
                    cx="28" cy="28" r="24" fill="none" strokeWidth="4"
                    strokeDasharray={`${(overallProgress / 100) * 150.8} 150.8`}
                    strokeLinecap="round"
                    className="stroke-primary transition-all duration-700"
                  />
                </svg>
                <TrendingUp className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-primary" />
              </div>
            </div>
          </div>

          {/* ── Stats row: roadmap / sessions / actions / next date ── */}
          <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-xl border p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Target className="h-4 w-4" />
                Roadmap
              </div>
              <div className="mt-1 text-2xl font-bold">
                {stats.completedSteps}/{stats.totalSteps}
              </div>
              <Progress
                value={stats.totalSteps > 0 ? (stats.completedSteps / stats.totalSteps) * 100 : 0}
                className="mt-2 h-1.5"
              />
            </div>
            <div className="rounded-xl border p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Video className="h-4 w-4" />
                Sessions
              </div>
              <div className="mt-1 text-2xl font-bold">
                {stats.completedSessions}/{stats.totalSessions}
              </div>
              <Progress
                value={stats.totalSessions > 0 ? (stats.completedSessions / stats.totalSessions) * 100 : 0}
                className="mt-2 h-1.5"
              />
            </div>
            <div className="rounded-xl border p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Action Items
              </div>
              <div className="mt-1 text-2xl font-bold">
                {stats.completedActions}/{stats.totalActions}
              </div>
              <Progress
                value={stats.totalActions > 0 ? (stats.completedActions / stats.totalActions) * 100 : 0}
                className="mt-2 h-1.5"
              />
            </div>
            <div className="rounded-xl border p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Next Session
              </div>
              {nextSession ? (
                <>
                  <div className="mt-1 text-2xl font-bold">
                    {formatDate(nextSession.date).split(", ").pop()}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {nextSession.relative} &middot; {nextSession.time}
                  </p>
                </>
              ) : (
                <div className="mt-1 text-lg font-medium text-muted-foreground">All done!</div>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* ── Main column: sessions timeline ── */}
            <div className="lg:col-span-2 space-y-6">
              {/* ── Next session highlight card ── */}
              {upcomingSessions.slice(0, 1).map((session) => (
                <div
                  key={session.id}
                  className="rounded-xl border border-primary/20 bg-primary/5 p-6"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="gap-1">
                      <Video className="h-3 w-3" />
                      Next Session
                    </Badge>
                    <span className="text-sm font-medium text-primary">
                      {session.relative || formatDate(session.date)}
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-semibold">{session.title}</h3>
                  <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(session.date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {session.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      with {session.mentor}
                    </span>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <Button size="sm">
                      <Video className="mr-1 h-4 w-4" />
                      Join Session
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCompleteSession(session.id)}
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Mark Complete
                    </Button>
                  </div>
                </div>
              ))}

              {/* ── Completed sessions list ── */}
              {completedSessionsList.length > 0 && (
                <div>
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Completed Sessions
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {completedSessionsList.length} done
                    </Badge>
                  </h2>
                  <div className="space-y-3">
                    {completedSessionsList.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-start gap-4 rounded-lg border bg-muted/30 p-4"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium">{session.title}</h3>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatDate(session.date)}
                            </span>
                          </div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {session.time}
                          </div>
                          {session.notes && (
                            <p className="mt-2 rounded-md bg-background p-2 text-sm text-muted-foreground">
                              <FileText className="mr-1 inline h-3.5 w-3.5" />
                              {session.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Remaining upcoming sessions ── */}
              {upcomingSessions.length > 0 && (
                <div>
                  <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    Upcoming Sessions
                    <Badge variant="outline" className="ml-auto text-xs">
                      {upcomingSessions.length} remaining
                    </Badge>
                  </h2>
                  <div className="space-y-3">
                    {upcomingSessions.slice(1).map((session) => (
                      <div
                        key={session.id}
                        className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/30"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium">{session.title}</h3>
                            <Badge variant="outline" className="shrink-0 text-xs">
                              {session.relative || "Upcoming"}
                            </Badge>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{formatDate(session.date)}</span>
                            <span>{session.time}</span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-xs"
                          onClick={() => handleCompleteSession(session.id)}
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Complete
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Sidebar column ── */}
            <div className="space-y-6">
              {/* ── Action items checklist with optimistic toggle ── */}
              <div className="rounded-xl border p-6">
                <h2 className="flex items-center justify-between font-semibold">
                  Action Items
                  <span className="text-sm font-normal text-muted-foreground">
                    {stats.completedActions}/{stats.totalActions}
                  </span>
                </h2>
                <Progress
                  value={stats.totalActions > 0 ? (stats.completedActions / stats.totalActions) * 100 : 0}
                  className="mt-3 h-1.5"
                />
                <div className="mt-4 space-y-3">
                  {actionItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-3">
                      <Checkbox
                        checked={item.completed}
                        className="mt-0.5"
                        onCheckedChange={() => handleToggleAction(item.id, item.completed)}
                      />
                      <div className="min-w-0">
                        <p
                          className={`text-sm ${
                            item.completed ? "text-muted-foreground line-through" : ""
                          }`}
                        >
                          {item.title}
                        </p>
                        <p
                          className={`text-xs ${
                            !item.completed && formatDueDate(item.dueDate) === "Overdue"
                              ? "text-destructive font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatDueDate(item.dueDate)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Roadmap mini-view with milestone indicators ── */}
              <div className="rounded-xl border p-6">
                <h2 className="mb-1 font-semibold">Roadmap Progress</h2>
                <p className="mb-4 text-xs text-muted-foreground">
                  {stats.completedSteps} of {stats.totalSteps} milestones completed
                </p>
                <div className="space-y-3">
                  {sampleRoadmap.map((step) => (
                    <div key={step.id} className="flex items-center gap-3">
                      {step.status === "completed" ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                      ) : step.status === "current" ? (
                        <div className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                          <Circle className="h-4 w-4 fill-primary/20 text-primary" />
                          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
                        </div>
                      ) : (
                        <Circle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                      )}
                      <span
                        className={`text-sm ${
                          step.status === "completed"
                            ? "text-muted-foreground"
                            : step.status === "current"
                              ? "font-medium"
                              : "text-muted-foreground"
                        }`}
                      >
                        {step.title}
                      </span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                  <Link href="/candidate/roadmap">
                    View Full Roadmap
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              {/* ── Mentor info card ── */}
              {mentorName && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
                  <h3 className="font-semibold">Your Mentor</h3>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {mentorName.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="font-medium">{mentorName}</p>
                      <p className="text-xs text-muted-foreground">
                        {stats.completedSessions} sessions completed
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
