/**
 * ─────────────────────────────────────────────────────────────
 *  GUIDED — Candidate Roadmap Page
 * ─────────────────────────────────────────────────────────────
 *  Displays the AI-generated (or template-based) preparation
 *  roadmap together with:
 *    • A vertical timeline of milestones (completed / current /
 *      upcoming)
 *    • A skill-gap analysis sidebar with progress bars
 *    • A goal summary card recapping the candidate's target
 *    • A CTA to find a mentor
 *
 *  The roadmap is fetched once on mount via `postGenerateRoadmap`
 *  and can be regenerated on-demand with `postRegenerateRoadmap`.
 * ─────────────────────────────────────────────────────────────
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2, Circle, Clock, Target, TrendingUp,
  ArrowRight, Sparkles, RefreshCw, Loader2,
} from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Badge }    from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { postGenerateRoadmap, postRegenerateRoadmap, type RoadmapResponse } from "@/lib/api";
import { RouteGuard } from "@/components/route-guard";
import { Navbar }     from "@/components/navbar";
import { useAuth }    from "@/lib/auth-context";
import { toast }      from "sonner";


/* ════════════════════════════════════════════════════════════
 *  LOCAL TYPES
 * ════════════════════════════════════════════════════════════ */

interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  duration: string;
  status: "completed" | "current" | "upcoming";
}

interface SkillGap {
  skill: string;
  level: number;
  target: number;
}


/* ════════════════════════════════════════════════════════════
 *  ROADMAP PAGE COMPONENT
 * ════════════════════════════════════════════════════════════ */

export default function RoadmapPage() {
  const { user } = useAuth();

  /* ── Page state ── */
  const [roadmap, setRoadmap]             = useState<RoadmapStep[]>([]);
  const [skillGaps, setSkillGaps]         = useState<SkillGap[]>([]);
  const [isLoaded, setIsLoaded]           = useState(false);
  const [generatedBy, setGeneratedBy]     = useState<"gemini" | "mock">("mock");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [goalSummary, setGoalSummary]     = useState({
    targetRole:    "",
    targetCompany: "",
    timeline:      "",
    skillLevel:    "",
    domain:        "",
  });


  /* ────────────────────────────────────────────────────────
   *  Initial data fetch (runs once on mount)
   * ──────────────────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      const candidateId = user?.id;
      if (!candidateId) return;

      const res = await postGenerateRoadmap(candidateId);
      if (res) {
        setRoadmap(res.roadmap);
        setSkillGaps(res.skillGaps);
        setGeneratedBy(res.generatedBy || "mock");
        setGoalSummary({
          targetRole:    res.targetRole    || "Software Engineer",
          targetCompany: res.targetCompany || "Top Companies",
          timeline:      res.timeline      || "12 weeks",
          skillLevel: res.skillLevel
            ? res.skillLevel.charAt(0).toUpperCase() + res.skillLevel.slice(1)
            : "Intermediate",
          domain: res.domain || "",
        });
      }
      setIsLoaded(true);
    }
    load();
  }, [user?.id]);


  /* ────────────────────────────────────────────────────────
   *  Regenerate handler (re-calls the AI pipeline)
   * ──────────────────────────────────────────────────────── */
  const handleRegenerate = async () => {
    const candidateId = user?.id;
    if (!candidateId) return;
    setIsRegenerating(true);
    try {
      const res = await postRegenerateRoadmap(candidateId);
      if (res) {
        setRoadmap(res.roadmap);
        setSkillGaps(res.skillGaps);
        setGeneratedBy(res.generatedBy || "mock");
        setGoalSummary({
          targetRole:    res.targetRole    || "Software Engineer",
          targetCompany: res.targetCompany || "Top Companies",
          timeline:      res.timeline      || "12 weeks",
          skillLevel: res.skillLevel
            ? res.skillLevel.charAt(0).toUpperCase() + res.skillLevel.slice(1)
            : "Intermediate",
          domain: res.domain || "",
        });
        toast.success(
          res.generatedBy === "gemini"
            ? "Roadmap regenerated with AI!"
            : "Roadmap regenerated (using template)"
        );
      }
    } catch {
      toast.error("Failed to regenerate roadmap");
    } finally {
      setIsRegenerating(false);
    }
  };

  /* ════════════════════════════════════════════════════════
   *  RENDER
   * ════════════════════════════════════════════════════════ */

  return (
    <RouteGuard allowedRoles={["candidate"]}>
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* ── Page header + badges + regenerate button ── */}
        <div className="mb-10">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="secondary">
              <Target className="mr-1 h-3.5 w-3.5" />
              Personalized Roadmap
            </Badge>
            {isLoaded && (
              <Badge
                variant="outline"
                className={generatedBy === "gemini"
                  ? "gap-1 border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                  : "gap-1"
                }
              >
                <Sparkles className="h-3 w-3" />
                {generatedBy === "gemini" ? "Generated by Gemini AI" : "Template-based"}
              </Badge>
            )}
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Your Personalized Mentor Roadmap
              </h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                {goalSummary.targetRole
                  ? `Based on your goal of becoming a ${goalSummary.targetRole}${goalSummary.targetCompany ? ` at ${goalSummary.targetCompany}` : ""}, here's a structured ${goalSummary.timeline || "12-week"} plan to get you there.`
                  : "Loading your personalized roadmap..."}
              </p>
            </div>
            {isLoaded && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="shrink-0 gap-1.5"
              >
                {isRegenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isRegenerating ? "Regenerating..." : "Regenerate"}
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* ── Main column: roadmap timeline ── */}
          <div className="lg:col-span-2 space-y-0">
            <h2 className="mb-6 text-lg font-semibold">Preparation Plan</h2>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[15px] top-0 h-full w-px bg-border" />

              <div className="space-y-6">
                {roadmap.map((step, index) => (
                  <div key={step.id} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className="relative z-10 flex-shrink-0">
                      {step.status === "completed" ? (
                        <CheckCircle2 className="h-8 w-8 text-primary fill-primary/10" />
                      ) : step.status === "current" ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-background">
                          <Circle className="h-3 w-3 fill-primary text-primary" />
                        </div>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-muted bg-background">
                          <Circle className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div
                      className={`flex-1 rounded-lg border p-5 ${
                        step.status === "current"
                          ? "border-primary/30 bg-primary/5"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold">{step.title}</h3>
                        <Badge
                          variant={
                            step.status === "completed"
                              ? "default"
                              : step.status === "current"
                                ? "secondary"
                                : "outline"
                          }
                          className="shrink-0 text-xs"
                        >
                          {step.status === "completed" && "Done"}
                          {step.status === "current" && "In Progress"}
                          {step.status === "upcoming" && "Upcoming"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {step.description}
                      </p>
                      <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {step.duration}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Sidebar: skill gaps + goal summary + CTA ── */}
          <div className="space-y-6">
            <div className="rounded-xl border p-6">
              <h2 className="flex items-center gap-2 font-semibold">
                <TrendingUp className="h-4 w-4 text-primary" />
                Skill Gap Analysis
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Areas to focus on based on your target role.
              </p>
              <div className="mt-6 space-y-5">
                {skillGaps.map((gap) => (
                  <div key={gap.skill}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{gap.skill}</span>
                      <span className="text-muted-foreground">
                        {gap.level}% → {gap.target}%
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={gap.level} className="h-2 flex-1" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Goal summary card */}
            <div className="rounded-xl border p-6">
              <h2 className="font-semibold">Goal Summary</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Target Role</dt>
                  <dd className="mt-0.5 font-medium">
                    {goalSummary.targetRole}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Target Companies</dt>
                  <dd className="mt-0.5 font-medium">{goalSummary.targetCompany}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Timeline</dt>
                  <dd className="mt-0.5 font-medium">{goalSummary.timeline}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Current Level</dt>
                  <dd className="mt-0.5 font-medium">{goalSummary.skillLevel}</dd>
                </div>
              </dl>
            </div>

            {/* CTA */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
              <h3 className="font-semibold">
                Ready to execute this roadmap?
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Work with a verified mentor who&apos;ll hold you accountable
                and guide you through each step.
              </p>
              <Button className="mt-4 w-full" asChild>
                <Link href="/candidate/mentors">
                  Work with a Real Mentor
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </RouteGuard>
  );
}
