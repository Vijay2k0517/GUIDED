/**
 * ─────────────────────────────────────────────────────────────
 *  GUIDED — Sign-Up Page
 * ─────────────────────────────────────────────────────────────
 *  Account creation form with:
 *    • Role selector (candidate or mentor)
 *    • LinkedIn URL field for mentors (required for verification)
 *    • Password visibility toggle
 *    • Post-signup redirect to onboarding or verification
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
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";


/* ════════════════════════════════════════════════════════════
 *  STATIC ROLE OPTIONS
 * ════════════════════════════════════════════════════════════ */

const roles = [
  {
    value: "candidate",
    label: "Candidate",
    description: "Get matched with mentors and follow structured roadmaps",
  },
  {
    value: "mentor",
    label: "Mentor",
    description: "Share your expertise and guide the next generation",
  },
];


/* ════════════════════════════════════════════════════════════
 *  SIGN-UP PAGE COMPONENT
 * ════════════════════════════════════════════════════════════ */

export default function SignupPage() {
  const router    = useRouter();
  const { signup } = useAuth();

  /* ── Form state ── */
  const [name, setName]               = useState("");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [role, setRole]               = useState("candidate");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);


  /* ────────────────────────────────────────────────────────
   *  Form submission — validate, call signup(), redirect
   * ──────────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic client-side validation
    if (!name || !email || !password) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (role === "mentor" && !linkedinUrl) {
      toast.error("LinkedIn URL is required for mentors");
      return;
    }

    setIsLoading(true);
    const result = await signup({ email, password, name, role, linkedinUrl });
    setIsLoading(false);

    if (result.success) {
      toast.success(
        role === "mentor"
          ? "Account created! Your profile is pending verification."
          : "Account created! Let's set up your profile."
      );
      // Mentors → verification queue · Candidates → onboarding wizard
      if (role === "mentor") router.push("/mentor/verification");
      else                   router.push("/candidate/onboarding");
    } else {
      toast.error(result.error || "Signup failed");
    }
  };

  /* ════════════════════════════════════════════════════════
   *  RENDER
   * ════════════════════════════════════════════════════════ */

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
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
          <h1 className="mt-6 text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Join the platform that drives real career outcomes
          </p>
        </div>

        {/* ── Sign-up form ── */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role selection cards */}
          <div className="space-y-2">
            <Label>I want to join as</Label>
            <div className="grid grid-cols-2 gap-3">
              {roles.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    role === r.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className="text-sm font-semibold">{r.label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{r.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
              autoComplete="name"
            />
          </div>

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
                autoComplete="new-password"
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

          {/* LinkedIn field — conditionally shown for mentors only */}
          {role === "mentor" && (
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn URL</Label>
              <Input
                id="linkedin"
                type="url"
                placeholder="https://linkedin.com/in/yourprofile"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Required for verification. Your profile will be reviewed by an admin.
              </p>
            </div>
          )}

          <Button type="submit" className="h-11 w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Create Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
