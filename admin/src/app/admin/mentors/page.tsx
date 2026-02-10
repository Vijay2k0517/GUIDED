"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  ShieldOff,
  Star,
  Users,
  CheckCircle2,
  XCircle,
  Power,
  PowerOff,
  Linkedin,
  Clock,
  UserPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  getAdminMentors,
  getPendingMentors,
  verifyMentor,
  rejectMentor,
  enableMentor,
  disableMentor,
} from "@/lib/api";
import { toast } from "sonner";

interface MentorItem {
  id: string;
  name: string;
  email: string;
  avatar: string;
  expertise: string[];
  experience: string;
  price: number;
  verified: boolean;
  enabled: boolean;
  currentWorkload: number;
  maxWorkload: number;
  bio: string;
  rating: number;
  totalSessions: number;
  role: string;
  company: string;
}

interface PendingMentor {
  id: string;
  name: string;
  email: string;
  avatar: string;
  linkedinUrl: string;
  experience: number;
  submittedAt: string;
  role: string;
}

export default function MentorsPage() {
  const [dialogAction, setDialogAction] = useState<{
    type: "verify" | "reject" | "enable" | "disable";
    mentorId: string;
    isPending?: boolean;
  } | null>(null);

  const [rejectReason, setRejectReason] = useState("");
  const [localMentors, setLocalMentors] = useState<MentorItem[]>([]);
  const [pendingMentors, setPendingMentors] = useState<PendingMentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  async function loadData() {
    try {
      const [mentors, pending] = await Promise.all([
        getAdminMentors(),
        getPendingMentors(),
      ]);
      setLocalMentors(mentors);
      setPendingMentors(pending);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load mentors");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedMentor = dialogAction
    ? dialogAction.isPending
      ? pendingMentors.find((m) => m.id === dialogAction.mentorId)
      : localMentors.find((m) => m.id === dialogAction.mentorId)
    : null;

  async function handleAction() {
    if (!dialogAction) return;
    setActionLoading(true);

    try {
      switch (dialogAction.type) {
        case "verify":
          await verifyMentor(dialogAction.mentorId);
          setPendingMentors((prev) =>
            prev.filter((m) => m.id !== dialogAction.mentorId)
          );
          const updatedMentors = await getAdminMentors();
          setLocalMentors(updatedMentors);
          toast.success(
            `${selectedMentor?.name || "Mentor"} has been approved and verified!`
          );
          break;
        case "reject":
          await rejectMentor(dialogAction.mentorId, rejectReason);
          setPendingMentors((prev) =>
            prev.filter((m) => m.id !== dialogAction.mentorId)
          );
          toast.success(
            `${selectedMentor?.name || "Mentor"}'s application has been rejected.`
          );
          break;
        case "enable":
          await enableMentor(dialogAction.mentorId);
          setLocalMentors((prev) =>
            prev.map((m) =>
              m.id === dialogAction.mentorId ? { ...m, enabled: true } : m
            )
          );
          toast.success("Mentor account enabled");
          break;
        case "disable":
          await disableMentor(dialogAction.mentorId);
          setLocalMentors((prev) =>
            prev.map((m) =>
              m.id === dialogAction.mentorId ? { ...m, enabled: false } : m
            )
          );
          toast.success("Mentor account disabled");
          break;
      }
    } catch (err) {
      toast.error(
        "Action failed: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    }
    setActionLoading(false);
    setDialogAction(null);
    setRejectReason("");
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Mentor Management
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review mentor applications, approve registrations, and manage mentor
          accounts.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-2xl font-semibold text-foreground">
              {localMentors.length + pendingMentors.length}
            </p>
            <p className="text-xs text-muted-foreground">Total Mentors</p>
          </CardContent>
        </Card>
        <Card className="py-4 border-amber-200 dark:border-amber-800">
          <CardContent className="px-4">
            <p className="text-2xl font-semibold text-amber-600">
              {pendingMentors.length}
            </p>
            <p className="text-xs text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-2xl font-semibold text-emerald-600">
              {localMentors.filter((m) => m.verified).length}
            </p>
            <p className="text-xs text-muted-foreground">Verified</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-2xl font-semibold text-blue-600">
              {localMentors.filter((m) => m.enabled).length}
            </p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-2xl font-semibold text-red-600">
              {localMentors.filter((m) => !m.enabled).length}
            </p>
            <p className="text-xs text-muted-foreground">Disabled</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Pending Mentor Applications ── */}
      {pendingMentors.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
              <Clock className="h-4 w-4" />
              Pending Mentor Applications ({pendingMentors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingMentors.map((mentor) => (
                <div
                  key={mentor.id}
                  className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                      {mentor.avatar}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {mentor.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {mentor.email}
                      </p>
                    </div>
                    {mentor.linkedinUrl && (
                      <a
                        href={
                          mentor.linkedinUrl.startsWith("http")
                            ? mentor.linkedinUrl
                            : `https://${mentor.linkedinUrl}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <Linkedin className="h-3 w-3" />
                        LinkedIn
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        Applied: {mentor.submittedAt}
                      </p>
                      {mentor.experience > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Exp: {mentor.experience} years
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() =>
                          setDialogAction({
                            type: "verify",
                            mentorId: mentor.id,
                            isPending: true,
                          })
                        }
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setDialogAction({
                            type: "reject",
                            mentorId: mentor.id,
                            isPending: true,
                          })
                        }
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Approved Mentors Table ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4" />
            Approved Mentors ({localMentors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {localMentors.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No approved mentors yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mentor</TableHead>
                  <TableHead>Expertise</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Workload</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localMentors.map((mentor) => (
                  <TableRow key={mentor.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
                          {mentor.avatar}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {mentor.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {mentor.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {mentor.expertise.slice(0, 2).map((skill) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="text-[10px]"
                          >
                            {skill}
                          </Badge>
                        ))}
                        {mentor.expertise.length > 2 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{mentor.expertise.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {mentor.experience}
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      ₹{mentor.price.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm text-foreground">
                        <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                        {mentor.rating}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {mentor.currentWorkload}/{mentor.maxWorkload}
                    </TableCell>
                    <TableCell>
                      {mentor.enabled ? (
                        <Badge variant="outline" className="text-emerald-600">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Disabled</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {mentor.enabled ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() =>
                              setDialogAction({
                                type: "disable",
                                mentorId: mentor.id,
                              })
                            }
                          >
                            <PowerOff className="mr-1 h-3 w-3" />
                            Disable
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-600 hover:text-emerald-700"
                            onClick={() =>
                              setDialogAction({
                                type: "enable",
                                mentorId: mentor.id,
                              })
                            }
                          >
                            <Power className="mr-1 h-3 w-3" />
                            Enable
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Confirm Dialog ── */}
      <Dialog
        open={!!dialogAction}
        onOpenChange={() => {
          setDialogAction(null);
          setRejectReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction?.type === "verify" && "Approve Mentor Application"}
              {dialogAction?.type === "reject" && "Reject Mentor Application"}
              {dialogAction?.type === "enable" && "Enable Mentor Account"}
              {dialogAction?.type === "disable" && "Disable Mentor Account"}
            </DialogTitle>
            <DialogDescription>
              {dialogAction?.type === "verify" &&
                `This will approve ${selectedMentor?.name}'s application and create their mentor profile. They will become visible to candidates.`}
              {dialogAction?.type === "reject" &&
                `This will reject ${selectedMentor?.name}'s mentor application. They will be notified.`}
              {dialogAction?.type === "enable" &&
                `This will re-enable ${selectedMentor?.name}'s account, allowing them to accept mentees.`}
              {dialogAction?.type === "disable" &&
                `This will disable ${selectedMentor?.name}'s account. They will not be available for new allocations.`}
            </DialogDescription>
          </DialogHeader>

          {dialogAction?.type === "reject" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Reason for rejection (optional)
              </label>
              <Textarea
                placeholder="e.g., Incomplete profile, insufficient experience, etc."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogAction(null);
                setRejectReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant={
                dialogAction?.type === "reject" ||
                dialogAction?.type === "disable"
                  ? "destructive"
                  : "default"
              }
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
