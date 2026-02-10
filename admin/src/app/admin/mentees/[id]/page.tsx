"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  Target,
  CheckCircle2,
  Clock,
  Circle,
  UserPlus,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { getAdminMentee, getAdminMentors, getAdminMentorships } from "@/lib/api";

/* eslint-disable @typescript-eslint/no-explicit-any */

const milestoneStatusIcon: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  in_progress: <Clock className="h-4 w-4 text-amber-600" />,
  pending: <Circle className="h-4 w-4 text-muted-foreground" />,
};

const milestoneStatusLabel: Record<string, string> = {
  completed: "Completed",
  in_progress: "In Progress",
  pending: "Pending",
};

export default function MenteeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [mentee, setMentee] = useState<any>(null);
  const [mentorMap, setMentorMap] = useState<Record<string, any>>({});
  const [mentorships, setMentorships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAdminMentee(id), getAdminMentors(), getAdminMentorships()])
      .then(([m, mentors, ships]) => {
        setMentee(m);
        const mm: Record<string, any> = {};
        mentors.forEach((mt: any) => { mm[mt.id] = mt; });
        setMentorMap(mm);
        setMentorships(ships.filter((s: any) => s.menteeId === id));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!mentee) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">Mentee not found.</p>
      </div>
    );
  }

  const mentor = mentee.mentorId ? mentorMap[mentee.mentorId] : null;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          href="/admin/mentees"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Mentees
        </Link>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-foreground">
              {mentee.avatar}
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {mentee.name}
              </h1>
              <p className="text-sm text-muted-foreground">{mentee.email}</p>
            </div>
          </div>
          {!mentee.mentorId && (
            <Link href={`/admin/allocate-mentor/${mentee.id}`}>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Allocate Mentor
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Target Role
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {mentee.targetRole}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Assigned Mentor
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {mentor ? mentor.name : "Not Assigned"}
            </p>
            {mentor && mentor.expertise && (
              <p className="text-xs text-muted-foreground">
                {mentor.expertise.slice(0, 2).join(", ")}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Joined
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {mentee.joinedAt
                ? new Date(mentee.joinedAt).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "N/A"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Career Goal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4" />
            Career Goal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-foreground">
            {mentee.careerGoal}
          </p>
        </CardContent>
      </Card>

      {/* Resume */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="h-4 w-4" />
            Resume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {mentee.name.replace(" ", "_")}_Resume.pdf
                </p>
                <p className="text-xs text-muted-foreground">
                  Uploaded on {mentee.joinedAt || "N/A"}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-1 h-3 w-3" />
              View Resume
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Roadmap */}
      {mentee.roadmap ? (
        <>
          {/* Progress Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">AI-Generated Roadmap</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-foreground">
                {mentee.roadmap.summary}
              </p>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Overall Progress
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {mentee.roadmap.currentProgress}%
                  </span>
                </div>
                <Progress value={mentee.roadmap.currentProgress} />
              </div>
            </CardContent>
          </Card>

          {/* Skill Gaps */}
          {mentee.roadmap.skillGaps && mentee.roadmap.skillGaps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Skill Gaps Identified</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {mentee.roadmap.skillGaps.map((gap: string) => (
                    <Badge key={gap} variant="outline" className="text-sm">
                      {gap}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Milestones */}
          {mentee.roadmap.milestones && mentee.roadmap.milestones.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Planned Milestones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                {mentee.roadmap.milestones.map((milestone: any, index: number) => (
                  <div key={milestone.id || index}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="flex items-start gap-4">
                      <div className="mt-0.5">
                        {milestoneStatusIcon[milestone.status] || milestoneStatusIcon["pending"]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-foreground">
                            {milestone.title}
                          </h4>
                          <Badge
                            variant={
                              milestone.status === "completed"
                                ? "default"
                                : milestone.status === "in_progress"
                                ? "secondary"
                                : "outline"
                            }
                            className="text-[10px]"
                          >
                            {milestoneStatusLabel[milestone.status] || "Pending"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {milestone.description}
                        </p>
                        {milestone.dueDate && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Due:{" "}
                            {new Date(milestone.dueDate).toLocaleDateString(
                              "en-IN",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No roadmap has been generated for this mentee yet.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Mentorship History */}
      {mentorships.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Mentorship History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mentorships.map((ship: any) => {
              const shipMentor = mentorMap[ship.mentorId];
              return (
                <div
                  key={ship.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {shipMentor?.name || "Unknown Mentor"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ship.sessionsCompleted}/{ship.totalSessions} sessions
                      completed
                    </p>
                  </div>
                  <Badge
                    variant={
                      ship.status === "active"
                        ? "default"
                        : ship.status === "completed"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {ship.status}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
