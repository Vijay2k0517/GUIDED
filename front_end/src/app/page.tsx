/**
 * ─────────────────────────────────────────────────────────────
 *  GUIDED — Landing Page
 * ─────────────────────────────────────────────────────────────
 *  The public-facing marketing page shown to visitors and
 *  logged-in users alike.  Composed of:
 *    Hero  →  Stats bar  →  How it works  →  Features grid
 *    →  Testimonials  →  CTA  →  Footer
 *
 *  Two smart-redirect handlers check the candidate's backend
 *  status so the user is always funnelled to the correct step
 *  of the onboarding / workflow pipeline.
 * ─────────────────────────────────────────────────────────────
 */
"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight, Target, TrendingUp, Calendar,
  CheckCircle2, Users, Star, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/lib/auth-context";
import { getCandidateStatus } from "@/lib/api";
import { toast } from "sonner";


/* ════════════════════════════════════════════════════════════
 *  STATIC CONTENT — stats, features, testimonials
 * ════════════════════════════════════════════════════════════ */

/** Headline numbers rendered in the hero stats bar. */
const stats = [
  { label: "Mentors",            value: "200+"   },
  { label: "Sessions Completed", value: "1,800+" },
  { label: "Career Outcomes",    value: "87%"    },
];

/** Value-proposition feature cards. */
const features = [
  {
    icon: Target,
    title: "Structured Roadmaps",
    description:
      "Get a personalized career roadmap based on your goals, skill gaps, and timeline.",
  },
  {
    icon: Calendar,
    title: "Scheduled Sessions",
    description:
      "Work with your mentor on a consistent schedule with clear objectives for each session.",
  },
  {
    icon: TrendingUp,
    title: "Measurable Progress",
    description:
      "Track action items, skill development, and milestones throughout your mentorship.",
  },
  {
    icon: CheckCircle2,
    title: "Verified Mentors",
    description:
      "Every mentor is vetted for real industry experience and mentorship ability.",
  },
];

/** Social-proof testimonial cards. */
const testimonials = [
  {
    name: "Alex T.",
    role: "Software Engineer at Google",
    text: "The structured approach made all the difference. My mentor helped me focus on what actually mattered for my interviews.",
    avatar: "AT",
  },
  {
    name: "Maria G.",
    role: "Product Manager at Stripe",
    text: "I went from unsure about my career direction to landing my dream PM role in 3 months. The roadmap kept me accountable.",
    avatar: "MG",
  },
  {
    name: "Ryan L.",
    role: "Data Scientist at Spotify",
    text: "Having someone who'd been through the exact process I was going through was invaluable. Worth every penny.",
    avatar: "RL",
  },
];


/* ════════════════════════════════════════════════════════════
 *  LANDING PAGE COMPONENT
 * ════════════════════════════════════════════════════════════ */

export default function LandingPage() {
  const { user } = useAuth();
  const router   = useRouter();

  /* ────────────────────────────────────────────────────────
   *  Smart redirect helpers
   * ──────────────────────────────────────────────────────── */

  /**
   * "Get Started" flow — routes the user to the appropriate
   * step based on their login state and onboarding progress.
   */
  const handleGetStarted = useCallback(async () => {
    if (!user) {
      router.push("/signup");
      return;
    }
    if (user.role !== "candidate") {
      // Non-candidate logged in → nudge to create a candidate account
      toast.info("Sign up as a candidate to generate your roadmap");
      router.push("/signup");
      return;
    }
    // Candidate — check backend for how far along they are
    try {
      const status = await getCandidateStatus();
      if (status?.hasMentor)        router.push("/candidate/workflow");
      else if (status?.hasRoadmap)  router.push("/candidate/mentors");
      else if (status?.hasOnboarded) router.push("/candidate/roadmap");
      else                           router.push("/candidate/onboarding");
    } catch {
      router.push("/candidate/onboarding");
    }
  }, [user, router]);

  /**
   * "Dashboard" shortcut — sends the logged-in user to their
   * role-appropriate dashboard (mentor or candidate).
   */
  const handleDashboard = useCallback(() => {
    if (!user) { router.push("/login"); return; }

    if (user.role === "mentor") {
      router.push(user.verified ? "/mentor/dashboard" : "/mentor/verification");
    } else {
      // Candidate — determine their furthest-reached step
      getCandidateStatus().then((status) => {
        if (status?.hasMentor)        router.push("/candidate/workflow");
        else if (status?.hasRoadmap)  router.push("/candidate/mentors");
        else if (status?.hasOnboarded) router.push("/candidate/roadmap");
        else                           router.push("/candidate/onboarding");
      }).catch(() => router.push("/candidate/onboarding"));
    }
  }, [user, router]);



  /* ════════════════════════════════════════════════════════
   *  RENDER
   * ════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-background">
      <Navbar minimal />

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient backdrop */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-24 md:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge
              variant="secondary"
              className="mb-6 gap-1.5 px-3 py-1 text-sm font-normal"
            >
              <Star className="h-3.5 w-3.5 text-primary" />
              Trusted by 2,800+ professionals
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Turn mentorship into{" "}
              <span className="text-primary">measurable career outcomes</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Stop guessing your way through career transitions. Get matched
              with verified mentors, follow structured roadmaps, and track
              real progress toward your goals.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="h-12 px-8 text-base" onClick={handleGetStarted}>
                  Generate Free Mentor Roadmap
                  <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base"
                asChild
              >
                <Link href="/signup">Become a Mentor</Link>
              </Button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mx-auto mt-20 grid max-w-lg grid-cols-3 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold tracking-tight">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="border-t bg-card py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              How GUIDED works
            </h2>
            <p className="mt-4 text-muted-foreground">
              A structured approach to mentorship that actually delivers
              results.
            </p>
          </div>
          <div className="mt-16 grid gap-12 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Share your goals",
                description:
                  "Tell us about your career aspirations, current skill level, and target timeline. We generate a free roadmap.",
              },
              {
                step: "02",
                title: "Match with a mentor",
                description:
                  "Browse verified mentors filtered by domain, experience, and availability. Choose who fits your needs.",
              },
              {
                step: "03",
                title: "Execute with structure",
                description:
                  "Follow your personalized roadmap with scheduled sessions, action items, and measurable milestones.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="mb-4 text-4xl font-bold text-primary/20">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Not just matching. Execution.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Most platforms stop at introductions. GUIDED provides the
              framework to turn mentorship into outcomes.
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border bg-card p-6 transition-colors hover:border-primary/20"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="border-t bg-card py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Real outcomes from real people
            </h2>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-xl border bg-background p-6">
                <div className="flex items-center gap-1 text-primary">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.role}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Call-to-Action Banner ── */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="relative overflow-hidden rounded-2xl bg-primary px-8 py-16 text-center text-primary-foreground">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold tracking-tight">
                Ready to accelerate your career?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-primary-foreground/80">
                Get your free personalized roadmap and see what structured
                mentorship can do for you.
              </p>
              <Button
                size="lg"
                variant="secondary"
                className="mt-8 h-12 px-8 text-base"
                onClick={handleGetStarted}
              >
                  Get Started Free
                  <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
              <Zap className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium">GUIDED</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">
              About
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; 2026 GUIDED. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
