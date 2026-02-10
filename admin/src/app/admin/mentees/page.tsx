"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, Eye, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminMentees, getAdminMentors } from "@/lib/api";

interface MenteeItem {
  id: string;
  name: string;
  email: string;
  avatar: string;
  targetRole: string;
  careerGoal: string;
  status: string;
  mentorId: string | null;
  roadmap: {
    currentProgress: number;
  } | null;
}

interface MentorItem {
  id: string;
  name: string;
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  mentor_assigned: { label: "Mentor Assigned", variant: "default" },
  roadmap_generated: { label: "Roadmap Ready", variant: "secondary" },
  unassigned: { label: "Unassigned", variant: "destructive" },
  in_progress: { label: "In Progress", variant: "outline" },
};

export default function MenteesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [mentees, setMentees] = useState<MenteeItem[]>([]);
  const [mentorMap, setMentorMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAdminMentees(), getAdminMentors()])
      .then(([m, mentors]) => {
        setMentees(m);
        const mm: Record<string, string> = {};
        mentors.forEach((mt: MentorItem) => { mm[mt.id] = mt.name; });
        setMentorMap(mm);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = mentees.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.targetRole.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = ["all", ...Object.keys(statusConfig)];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Mentees
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and manage all mentee profiles and career strategies.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {mentees.length} total
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, role, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              {statuses.map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {status === "all"
                    ? "All"
                    : statusConfig[status]?.label ?? status}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Showing {filtered.length} mentees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mentee</TableHead>
                <TableHead>Target Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Mentor</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((mentee) => {
                const mentorName = mentee.mentorId ? mentorMap[mentee.mentorId] : null;
                const config = statusConfig[mentee.status] || statusConfig["unassigned"];
                return (
                  <TableRow key={mentee.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
                          {mentee.avatar}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {mentee.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {mentee.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-foreground">
                      {mentee.targetRole}
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {mentorName ? (
                        <span className="text-sm text-foreground">
                          {mentorName}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {mentee.roadmap ? (
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{
                                width: `${mentee.roadmap.currentProgress}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {mentee.roadmap.currentProgress}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/mentees/${mentee.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="mr-1 h-3 w-3" />
                            View Strategy
                          </Button>
                        </Link>
                        {!mentee.mentorId && (
                          <Link href={`/admin/allocate-mentor/${mentee.id}`}>
                            <Button variant="outline" size="sm">
                              <UserPlus className="mr-1 h-3 w-3" />
                              Allocate
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      No mentees found matching your criteria.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
