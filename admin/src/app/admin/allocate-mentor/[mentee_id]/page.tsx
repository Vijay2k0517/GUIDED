"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  CheckCircle2,
  Shield,
  Users,
  IndianRupee,
  Briefcase,
  Check,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getAdminMentee, getAdminMentors, allocateMentor } from "@/lib/api";
import { toast } from "sonner";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function AllocateMentorPage({
  params,
}: {
  params: Promise<{ mentee_id: string }>;
}) {
  const { mentee_id } = use(params);
  const [mentee, setMentee] = useState<any>(null);
  const [allMentors, setAllMentors] = useState<any[]>([]);
  const [mentorMap, setMentorMap] = useState<Record<string, any>>({});
  const [selectedMentorId, setSelectedMentorId] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [assigned, setAssigned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    Promise.all([getAdminMentee(mentee_id), getAdminMentors()])
      .then(([m, mentors]) => {
        setMentee(m);
        const enabled = mentors.filter((mt: any) => mt.enabled !== false);
        setAllMentors(enabled);
        const mm: Record<string, any> = {};
        mentors.forEach((mt: any) => { mm[mt.id] = mt; });
        setMentorMap(mm);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [mentee_id]);

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

  const currentMentor = mentee.mentorId ? mentorMap[mentee.mentorId] : null;

  const availableMentors = allMentors.filter(
    (m: any) => m.verified && (m.currentWorkload ?? 0) < (m.maxWorkload ?? 5)
  );

  const selectedMentor = selectedMentorId ? mentorMap[selectedMentorId] : null;

  async function handleAssign() {
    if (!selectedMentorId) return;
    setAssigning(true);
    try {
      await allocateMentor(mentee_id, selectedMentorId);
      setAssigned(true);
      setConfirmDialogOpen(false);
      toast.success(
        `${selectedMentor?.name} has been assigned to ${mentee!.name}`,
        { description: "Both dashboards have been updated." }
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to assign mentor");
    } finally {
      setAssigning(false);
    }
  }

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
        <h1 className="text-2xl font-semibold text-foreground">
          Allocate Mentor
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {assigned
            ? "Mentor has been successfully assigned."
            : `Select the best mentor for ${mentee.name}'s career journey.`}
        </p>
      </div>

      {/* Success Banner */}
      {assigned && selectedMentor && (
        <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
          <CardContent className="flex items-center gap-4 pt-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
                Mentor Assigned Successfully
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                {selectedMentor.name} is now mentoring {mentee.name}. Both
                dashboards have been updated.
              </p>
            </div>
            <div className="ml-auto flex gap-2">
              <Link href={`/admin/mentees/${mentee.id}`}>
                <Button variant="outline" size="sm">
                  View Mentee
                </Button>
              </Link>
              <Link href="/admin/mentees">
                <Button size="sm">Back to Mentees</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mentee Summary */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Mentee Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                {mentee.avatar}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {mentee.name}
                </p>
                <p className="text-xs text-muted-foreground">{mentee.email}</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Target Role
                </p>
                <p className="text-sm font-medium text-foreground">
                  {mentee.targetRole}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Career Goal
                </p>
                <p className="text-sm text-foreground">
                  {mentee.careerGoal}
                </p>
              </div>
              {mentee.roadmap && (
                <>
                  {mentee.roadmap.skillGaps && mentee.roadmap.skillGaps.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Skill Gaps
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {mentee.roadmap.skillGaps.map((gap: string) => (
                          <Badge
                            key={gap}
                            variant="outline"
                            className="text-[10px]"
                          >
                            {gap}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Progress
                    </p>
                    <Progress value={mentee.roadmap.currentProgress} />
                    <p className="text-xs text-muted-foreground mt-1">
                      {mentee.roadmap.currentProgress}% complete
                    </p>
                  </div>
                </>
              )}
              {currentMentor && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Current Mentor
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {currentMentor.name}
                  </p>
                  {currentMentor.expertise && (
                    <p className="text-xs text-muted-foreground">
                      {currentMentor.expertise.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mentor Selection */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm">
              {currentMentor ? "Reassign Mentor" : "Available Mentors"}
              <Badge variant="secondary" className="ml-2">
                {availableMentors.length} available
              </Badge>
            </CardTitle>
            {currentMentor && (
              <Badge variant="outline" className="text-xs">
                <RefreshCw className="mr-1 h-3 w-3" />
                Reassignment Mode
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {allMentors.map((mentor: any) => {
              const isAvailable =
                mentor.verified && (mentor.currentWorkload ?? 0) < (mentor.maxWorkload ?? 5);
              const isSelected = selectedMentorId === mentor.id;
              const isCurrent = currentMentor?.id === mentor.id;

              return (
                <div
                  key={mentor.id}
                  className={`rounded-lg border p-4 transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : isAvailable
                      ? "border-border hover:border-primary/50"
                      : "border-border bg-muted/50 opacity-60"
                  } ${assigned ? "pointer-events-none opacity-60" : ""}`}
                  onClick={() => {
                    if (isAvailable && !assigned) {
                      setSelectedMentorId(mentor.id);
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                        {mentor.avatar}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {mentor.name}
                          </p>
                          {mentor.verified && (
                            <Shield className="h-3.5 w-3.5 text-blue-600" />
                          )}
                          {isCurrent && (
                            <Badge
                              variant="secondary"
                              className="text-[10px]"
                            >
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {mentor.bio}
                        </p>
                        {mentor.expertise && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {mentor.expertise.map((skill: string) => (
                              <Badge
                                key={skill}
                                variant="outline"
                                className="text-[10px]"
                              >
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Mentor Stats */}
                  <div className="mt-3 ml-13 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      {mentor.experience}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {mentor.rating}
                    </span>
                    <span className="flex items-center gap-1">
                      <IndianRupee className="h-3 w-3" />
                      ₹{(mentor.price ?? 0).toLocaleString("en-IN")}/session
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {mentor.currentWorkload ?? 0}/{mentor.maxWorkload ?? 5} mentees
                    </span>
                    {!isAvailable && (
                      <Badge variant="destructive" className="text-[10px]">
                        {!mentor.verified ? "Unverified" : "At Capacity"}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      {!assigned && (
        <div className="sticky bottom-0 -mx-6 border-t border-border bg-background/80 px-6 py-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              {selectedMentor ? (
                <p className="text-sm text-foreground">
                  Selected:{" "}
                  <span className="font-medium">{selectedMentor.name}</span> —
                  ₹{(selectedMentor.price ?? 0).toLocaleString("en-IN")}/session,{" "}
                  {selectedMentor.currentWorkload ?? 0}/{selectedMentor.maxWorkload ?? 5}{" "}
                  active mentees
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a mentor from the list above
                </p>
              )}
            </div>
            <Button
              disabled={!selectedMentorId || assigning}
              onClick={() => setConfirmDialogOpen(true)}
            >
              {currentMentor ? "Reassign Mentor" : "Assign Mentor"}
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Mentor Assignment</DialogTitle>
            <DialogDescription>
              {currentMentor
                ? `This will reassign ${mentee.name} from ${currentMentor.name} to ${selectedMentor?.name}.`
                : `This will assign ${selectedMentor?.name} as the mentor for ${mentee.name}.`}
            </DialogDescription>
          </DialogHeader>
          {selectedMentor && (
            <div className="rounded-lg border border-border p-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Mentee</p>
                  <p className="font-medium text-foreground">
                    {mentee.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Mentor</p>
                  <p className="font-medium text-foreground">
                    {selectedMentor.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rate</p>
                  <p className="font-medium text-foreground">
                    ₹{(selectedMentor.price ?? 0).toLocaleString("en-IN")}/session
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Workload After</p>
                  <p className="font-medium text-foreground">
                    {(selectedMentor.currentWorkload ?? 0) + 1}/
                    {selectedMentor.maxWorkload ?? 5}
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={assigning}>
              {assigning ? "Assigning..." : "Confirm Assignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
