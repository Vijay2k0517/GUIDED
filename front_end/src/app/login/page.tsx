/**
 * ─────────────────────────────────────────────────────────────
 *  GUIDED — Login Page
 * ─────────────────────────────────────────────────────────────
 *  Email + password login form with:
 *    • Smart redirect that inspects the candidate's backend
 *      progress so they always land at the right step.
 *    • Password visibility toggle.
 *    • "Demo Quick Access" buttons for judges / reviewers
 *      (pre-fills candidate@guided.dev and mentor@guided.dev).
 * ─────────────────────────────────────────────────────────────
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { Badge }  from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { getCandidateStatus } from "@/lib/api";
import { toast } from "sonner";


/* ════════════════════════════════════════════════════════════
 *  LOGIN PAGE COMPONENT
 * ════════════════════════════════════════════════════════════ */

export default function LoginPage() {
  const router   = useRouter();
  const { login } = useAuth();

  /* ── Form state ── */
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);


  /* ────────────────────────────────────────────────────────
   *  Smart redirect — inspects backend progress to decide
   *  which page the user should land on.
   * ──────────────────────────────────────────────────────── */
  const smartRedirect = async (role: string, verified: boolean) => {
    if (role === "mentor") {
      router.push(verified ? "/mentor/dashboard" : "/mentor/verification");
      return;
    }
    // Candidate — check onboarding status
    try {
      const status = await getCandidateStatus();
      if (status?.hasMentor)        router.push("/candidate/workflow");
      else if (status?.hasRoadmap)  router.push("/candidate/mentors");
      else if (status?.hasOnboarded) router.push("/candidate/roadmap");
      else                           router.push("/candidate/onboarding");
    } catch {
      router.push("/candidate/onboarding");
    }
  };


  /* ────────────────────────────────────────────────────────
   *  Form submission
   * ──────────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsLoading(true);
    const result = await login(email, password);

    if (result.success && result.user) {
      toast.success("Welcome back!");
      await smartRedirect(result.user.role, result.user.verified);
    } else {
      toast.error(result.error || "Login failed");
    }
    setIsLoading(false);
  };


  /* ────────────────────────────────────────────────────────
   *  Demo quick-login (pre-filled credentials)
   * ──────────────────────────────────────────────────────── */
  const quickLogin = async (email: string) => {
    setEmail(email);
    setPassword("password");
    setIsLoading(true);
    const result = await login(email, "password");
    if (result.success && result.user) {
      toast.success("Welcome back!");
      await smartRedirect(result.user.role, result.user.verified);
    } else {
      toast.error(result.error || "Login failed");
    }
    setIsLoading(false);
  };

  /* ════════════════════════════════════════════════════════
   *  RENDER
   * ════════════════════════════════════════════════════════ */

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* Floating theme toggle */}
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md space-y-8">
        {/* ── Logo + heading ── */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight">GUIDED</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>

        {/* ── Login form ── */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 pr-10"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="h-11 w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </div>

        {/* ── Quick access panel — for demo / judges ── */}
        <div className="rounded-xl border bg-card p-5">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Demo Quick Access
          </p>
          <div className="grid gap-2">
            <button
              onClick={() => quickLogin("candidate@guided.dev")}
              className="flex items-center justify-between rounded-lg border px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent"
            >
              <div>
                <span className="font-medium">Candidate</span>
                <span className="ml-2 text-muted-foreground">candidate@guided.dev</span>
              </div>
              <Badge variant="secondary" className="text-xs">candidate</Badge>
            </button>
            <button
              onClick={() => quickLogin("mentor@guided.dev")}
              className="flex items-center justify-between rounded-lg border px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent"
            >
              <div>
                <span className="font-medium">Mentor</span>
                <span className="ml-2 text-muted-foreground">mentor@guided.dev</span>
              </div>
              <Badge variant="secondary" className="text-xs">mentor</Badge>
            </button>

          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Password for all: <code className="rounded bg-muted px-1.5 py-0.5">password</code>
          </p>
        </div>
      </div>
    </div>
  );
}
