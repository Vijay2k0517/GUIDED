/**
 * ─────────────────────────────────────────────────────────────
 *  GUIDED — Mentor Verification Page
 * ─────────────────────────────────────────────────────────────
 *  Four-state flow driven by API data:
 *    1. loading     → spinner while checking backend status
 *    2. verified    → green checkmark + link to dashboard
 *    3. pending     → amber clock + submitted LinkedIn preview
 *    4. unsubmitted → form to submit LinkedIn URL for review
 * ─────────────────────────────────────────────────────────────
 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield, Clock, CheckCircle2, ExternalLink,
  Loader2, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { getMentorVerificationStatus, postMentorVerifySubmit } from "@/lib/api";
import { toast }      from "sonner";
import { RouteGuard } from "@/components/route-guard";
import { Navbar }     from "@/components/navbar";


/* ════════════════════════════════════════════════════════════
 *  MENTOR VERIFICATION COMPONENT
 * ════════════════════════════════════════════════════════════ */

export default function MentorVerificationPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  /* ── Form + status state ── */
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [status, setStatus] = useState<"loading" | "unsubmitted" | "pending" | "verified">("loading");
  const [isSubmitting, setIsSubmitting] = useState(false);


  /* ────────────────────────────────────────────────────────
   *  Check verification status on mount
   * ──────────────────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      if (!token) {
        router.replace("/login");
        return;
      }
      const data = await getMentorVerificationStatus();
      if (data) {
        if (data.verified) setStatus("verified");
        else if (data.pending) {
          setStatus("pending");
          if (data.linkedinUrl) setLinkedinUrl(data.linkedinUrl);
        } else {
          setStatus("unsubmitted");
        }
      } else {
        setStatus("unsubmitted");
      }
    }
    load();
  }, [token, router]);


  /* ────────────────────────────────────────────────────────
   *  Submit LinkedIn URL for admin review
   * ──────────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic LinkedIn URL validation
    if (!linkedinUrl.includes("linkedin.com")) {
      toast.error("Please enter a valid LinkedIn URL");
      return;
    }

    setIsSubmitting(true);
    const res = await postMentorVerifySubmit(linkedinUrl);
    if (res) {
      setStatus("pending");
      toast.success("Verification request submitted!");
    } else {
      toast.error("Submission failed. Please try again.");
    }
    setIsSubmitting(false);
  };


  /* ════════════════════════════════════════════════════════
   *  RENDER
   * ════════════════════════════════════════════════════════ */

  return (
    <RouteGuard allowedRoles={["mentor"]}>
      <Navbar />

      <div className="mx-auto max-w-lg px-6 py-16">

        {/* ── State 1: Loading spinner ── */}
        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Checking verification status...</p>
          </div>
        )}

        {/* ── State 2: Verified — green checkmark + dashboard link ── */}
        {status === "verified" && (
          <div className="text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">You&apos;re Verified!</h1>
              <p className="mt-2 text-muted-foreground">
                Your mentor account has been verified. You can now accept mentees.
              </p>
            </div>
            <Button asChild className="h-11">
              <Link href="/mentor/dashboard">Go to Dashboard</Link>
            </Button>
          </div>
        )}

        {/* ── State 3: Pending review — amber clock + submitted URL ── */}
        {status === "pending" && (
          <div className="text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Verification Pending</h1>
              <p className="mt-2 text-muted-foreground">
                Your verification request is being reviewed by our admin team.
                You&apos;ll be able to accept mentees once approved.
              </p>
            </div>
            {linkedinUrl && (
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
                  Submitted LinkedIn
                </p>
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  {linkedinUrl}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            <Button variant="outline" asChild className="h-11">
              <Link href="/mentor/dashboard">View Dashboard (Limited)</Link>
            </Button>
          </div>
        )}

        {/* ── State 4: Unsubmitted — LinkedIn submission form ── */}
        {status === "unsubmitted" && (
          <div className="space-y-8">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h1 className="mt-6 text-2xl font-bold tracking-tight">Mentor Verification</h1>
              <p className="mt-2 text-muted-foreground">
                Hi {user?.name || "there"}! To start accepting mentees, we need to verify your profile.
              </p>
            </div>

            <div className="rounded-xl border bg-card p-5 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 text-amber-500 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Why verification?</p>
                  <p className="text-muted-foreground mt-1">
                    We verify all mentors to maintain platform quality and trust. 
                    Submit your LinkedIn URL and our admin team will review your professional background.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn Profile URL</Label>
                <Input
                  id="linkedin"
                  type="url"
                  placeholder="https://linkedin.com/in/yourprofile"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="h-11"
                  required
                />
              </div>

              <Button type="submit" className="h-11 w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Submit for Verification
                    <Shield className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        )}
      </div>
    </RouteGuard>
  );
}
