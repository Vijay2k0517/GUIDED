"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Pause, Flag } from "lucide-react";
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
import { getAdminMentorships, getAdminMentees, getAdminMentors, flagMentorship } from "@/lib/api";
import { toast } from "sonner";

/* eslint-disable @typescript-eslint/no-explicit-any */

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
> = {
  active: { label: "Active", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
  accepted: { label: "Active", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
  completed: { label: "Completed", variant: "secondary", icon: <CheckCircle2 className="h-3 w-3" /> },
  stalled: { label: "Stalled", variant: "destructive", icon: <AlertTriangle className="h-3 w-3" /> },
  paused: { label: "Paused", variant: "outline", icon: <Pause className="h-3 w-3" /> },
  pending: { label: "Pending", variant: "outline", icon: <Clock className="h-3 w-3" /> },
};

export default function MonitoringPage() {
  const [filter, setFilter] = useState<string>("all");
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null);
  const [mentorships, setMentorships] = useState<any[]>([]);
  const [menteeMap, setMenteeMap] = useState<Record<string, any>>({});
  const [mentorMap, setMentorMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [flagging, setFlagging] = useState(false);

  useEffect(() => {
    Promise.all([getAdminMentorships(), getAdminMentees(), getAdminMentors()])
      .then(([ships, mentees, mentors]) => {
        setMentorships(ships);
        const mmee: Record<string, any> = {};
        mentees.forEach((m: any) => { mmee[m.id] = m; });
        setMenteeMap(mmee);
        const mtor: Record<string, any> = {};
        mentors.forEach((m: any) => { mtor[m.id] = m; });
        setMentorMap(mtor);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === "all"
      ? mentorships
      : filter === "flagged"
      ? mentorships.filter((m) => m.flagged)
      : mentorships.filter((m) => m.status === filter);

  const filters = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "stalled", label: "Stalled" },
    { key: "flagged", label: "Flagged" },
    { key: "completed", label: "Completed" },
  ];

  function handleFlag(shipId: string) {
    setSelectedShipId(shipId);
    setFlagDialogOpen(true);
  }

  async function confirmFlag() {
    if (!selectedShipId) return;
    setFlagging(true);
    try {
      await flagMentorship(selectedShipId, "Flagged by admin for review");
      setMentorships((prev) =>
        prev.map((s) =>
          s.id === selectedShipId ? { ...s, flagged: true, flagReason: "Flagged by admin for review" } : s
        )
      );
      toast.success("Mentorship has been flagged for review", {
        description: "Admin team will be notified.",
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to flag mentorship");
    } finally {
      setFlagging(false);
      setFlagDialogOpen(false);
      setSelectedShipId(null);
    }
  }

  function handleSuggestReassignment(_shipId: string) {
    toast.info("Reassignment suggestion sent", {
      description: "The operations team will review this recommendation.",
    });
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
          Mentorship Monitoring
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track active mentorships, identify stalled relationships, and flag issues.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-2xl font-semibold text-foreground">
              {mentorships.filter((m) => m.status === "active" || m.status === "accepted").length}
            </p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-2xl font-semibold text-foreground">
              {mentorships.filter((m) => m.status === "completed").length}
            </p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-2xl font-semibold text-orange-600">
              {mentorships.filter((m) => m.status === "stalled").length}
            </p>
            <p className="text-xs text-muted-foreground">Stalled</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-2xl font-semibold text-red-600">
              {mentorships.filter((m) => m.flagged).length}
            </p>
            <p className="text-xs text-muted-foreground">Flagged</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {filtered.length} mentorships
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mentee</TableHead>
                <TableHead>Mentor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Last Session</TableHead>
                <TableHead>Flagged</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((ship) => {
                const mentee = menteeMap[ship.menteeId];
                const mentor = mentorMap[ship.mentorId];
                const config = statusConfig[ship.status] || statusConfig["pending"];
                return (
                  <TableRow key={ship.id}>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">
                        {mentee?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {mentee?.targetRole || ""}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {mentor?.name || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant} className="gap-1">
                        {config.icon}
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-12 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{
                              width: `${ship.totalSessions ? (ship.sessionsCompleted / ship.totalSessions) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {ship.sessionsCompleted}/{ship.totalSessions}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ship.lastSessionDate
                        ? new Date(ship.lastSessionDate).toLocaleDateString(
                            "en-IN",
                            { month: "short", day: "numeric" }
                          )
                        : "--"}
                    </TableCell>
                    <TableCell>
                      {ship.flagged ? (
                        <div>
                          <Badge variant="destructive" className="text-[10px]">
                            Flagged
                          </Badge>
                          <p className="mt-1 text-[10px] text-muted-foreground max-w-[160px] truncate">
                            {ship.flagReason}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!ship.flagged && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleFlag(ship.id)}
                          >
                            <Flag className="mr-1 h-3 w-3" />
                            Flag
                          </Button>
                        )}
                        {(ship.status === "stalled" || ship.flagged) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleSuggestReassignment(ship.id)
                            }
                          >
                            Suggest Reassign
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      No mentorships found.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Flag Dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag Mentorship</DialogTitle>
            <DialogDescription>
              This will mark the mentorship for admin review. The mentorship
              will continue but will be monitored more closely.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFlagDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmFlag} disabled={flagging}>
              {flagging ? "Flagging..." : "Confirm Flag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
