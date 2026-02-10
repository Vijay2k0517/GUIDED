"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Handshake,
  Clock,
  UserX,
  AlertTriangle,
  CheckCircle2,
  Flag,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getDashboardMetrics,
  getMenteeStatusChart,
  getGrowthChart,
  getAdminMentees,
  getAdminMentorships,
  getAdminMentors,
  getPendingMentors,
} from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = ["#4f46e5", "#7c7af2", "#10b981", "#f59e0b"];

interface Metrics {
  totalMentees: number;
  totalMentors: number;
  activeMentorships: number;
  pendingAllocations: number;
  unassignedMentees: number;
  stalledMentorships: number;
  completedMentorships: number;
  flaggedCount: number;
  pendingMentorApprovals: number;
}

interface PendingMentor {
  id: string;
  name: string;
  email: string;
  avatar: string;
  linkedinUrl: string;
  submittedAt: string;
}

interface ChartItem {
  name: string;
  value: number;
}

interface GrowthItem {
  month: string;
  mentees: number;
  mentorships: number;
}

interface UnassignedMentee {
  id: string;
  name: string;
  avatar: string;
  targetRole: string;
}

interface FlaggedShip {
  id: string;
  menteeId: string;
  mentorId: string;
  menteeName: string;
  status: string;
  flagReason: string | null;
  flagged: boolean;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [statusDistribution, setStatusDistribution] = useState<ChartItem[]>([]);
  const [growthData, setGrowthData] = useState<GrowthItem[]>([]);
  const [unassigned, setUnassigned] = useState<UnassignedMentee[]>([]);
  const [flagged, setFlagged] = useState<FlaggedShip[]>([]);
  const [pendingMentorsList, setPendingMentorsList] = useState<PendingMentor[]>([]);
  const [mentorMap, setMentorMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [m, sd, gd, mentees, ships, mentors, pending] = await Promise.all([
          getDashboardMetrics(),
          getMenteeStatusChart(),
          getGrowthChart(),
          getAdminMentees(),
          getAdminMentorships(),
          getAdminMentors(),
          getPendingMentors(),
        ]);
        setMetrics(m);
        setStatusDistribution(sd);
        setGrowthData(gd);
        setUnassigned(mentees.filter((c: UnassignedMentee & { mentorId: string | null }) => !c.mentorId));
        setFlagged(ships.filter((s: FlaggedShip) => s.flagged));
        setPendingMentorsList(pending);
        const mm: Record<string, string> = {};
        mentors.forEach((mt: { id: string; name: string }) => {
          mm[mt.id] = mt.name;
        });
        setMentorMap(mm);
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !metrics) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const metricCards = [
    {
      label: "Total Mentees",
      value: metrics.totalMentees,
      icon: Users,
      color: "text-primary",
      bg: "bg-accent",
    },
    {
      label: "Total Mentors",
      value: metrics.totalMentors,
      icon: UserCheck,
      color: "text-blue-700 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: "Active Mentorships",
      value: metrics.activeMentorships,
      icon: Handshake,
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      label: "Pending Allocations",
      value: metrics.pendingAllocations,
      icon: Clock,
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950",
    },
    {
      label: "Unassigned Mentees",
      value: metrics.unassignedMentees,
      icon: UserX,
      color: "text-red-700 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950",
    },
    {
      label: "Stalled",
      value: metrics.stalledMentorships,
      icon: AlertTriangle,
      color: "text-orange-700 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-950",
    },
    {
      label: "Completed",
      value: metrics.completedMentorships,
      icon: CheckCircle2,
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      label: "Pending Mentors",
      value: metrics.pendingMentorApprovals,
      icon: UserCheck,
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950",
    },
    {
      label: "Flagged",
      value: metrics.flaggedCount,
      icon: Flag,
      color: "text-red-700 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Dashboard Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor mentorship operations and key metrics at a glance.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {metricCards.map((card) => (
          <Card key={card.label} className="py-4">
            <CardContent className="flex items-center gap-3 px-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.bg}`}
              >
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {card.value}
                </p>
                <p className="text-xs text-muted-foreground">
                  {card.label}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4" />
              Platform Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" fontSize={12} stroke="#6b7280" />
                <YAxis fontSize={12} stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  dataKey="mentees"
                  fill="#4f46e5"
                  radius={[4, 4, 0, 0]}
                  name="Mentees"
                />
                <Bar
                  dataKey="mentorships"
                  fill="#7c7af2"
                  radius={[4, 4, 0, 0]}
                  name="Mentorships"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Mentee Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-8">
              <ResponsiveContainer width="50%" height={240}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    stroke="none"
                  >
                    {statusDistribution.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {statusDistribution.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-sm"
                      style={{
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    />
                    <span className="text-sm text-muted-foreground">
                      {item.name}
                    </span>
                    <span className="ml-auto text-sm font-medium text-foreground">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Mentor Approvals */}
      {pendingMentorsList.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
              <Clock className="h-4 w-4" />
              Pending Mentor Approvals
              <Badge variant="secondary" className="ml-1">
                {pendingMentorsList.length}
              </Badge>
            </CardTitle>
            <Link href="/admin/mentors">
              <Button variant="ghost" size="sm">
                Review All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingMentorsList.slice(0, 3).map((mentor) => (
              <div
                key={mentor.id}
                className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/30"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700 dark:bg-amber-900 dark:text-amber-300">
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
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Applied: {mentor.submittedAt}
                  </p>
                  <Link href="/admin/mentors">
                    <Button size="sm" variant="outline" className="mt-1">
                      Review
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
            {pendingMentorsList.length > 3 && (
              <p className="text-center text-xs text-muted-foreground">
                +{pendingMentorsList.length - 3} more pending
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Panels */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Unassigned Mentees */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm">
              Unassigned Mentees
              <Badge variant="secondary" className="ml-2">
                {unassigned.length}
              </Badge>
            </CardTitle>
            <Link href="/admin/mentees">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {unassigned.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All mentees have been assigned mentors.
              </p>
            ) : (
              unassigned.map((mentee) => (
                <div
                  key={mentee.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
                      {mentee.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {mentee.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {mentee.targetRole}
                      </p>
                    </div>
                  </div>
                  <Link href={`/admin/allocate-mentor/${mentee.id}`}>
                    <Button size="sm" variant="outline">
                      Allocate Mentor
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Flagged Mentorships */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-sm">
              Flagged Issues
              <Badge variant="destructive" className="ml-2">
                {flagged.length}
              </Badge>
            </CardTitle>
            <Link href="/admin/monitoring">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {flagged.length === 0 ? (
              <p className="text-sm text-muted-foreground">No flagged issues.</p>
            ) : (
              flagged.map((ship) => (
                <div
                  key={ship.id}
                  className="rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-900 dark:bg-red-950/30"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <p className="text-sm font-medium text-foreground">
                      {ship.menteeName} &rarr; {mentorMap[ship.mentorId] || "Unknown"}
                    </p>
                    <Badge
                      variant="destructive"
                      className="ml-auto text-[10px]"
                    >
                      {ship.status}
                    </Badge>
                  </div>
                  <p className="mt-1 ml-6 text-xs text-muted-foreground">
                    {ship.flagReason}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
