/**
 * ─────────────────────────────────────────────────────────────
 *  GUIDED — Checkout / Confirm Mentorship Page
 * ─────────────────────────────────────────────────────────────
 *  Final step before a candidate is paired with a mentor.
 *  Shows:
 *    • Selected mentor's profile + bio
 *    • Mentorship plan details (duration, sessions, format)
 *    • Pricing summary (8 sessions × per-session rate + 10%
 *      platform fee)
 *    • Confirmation button → calls `postCheckout` → success UI
 * ─────────────────────────────────────────────────────────────
 */
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2, Star, Shield, Clock, AlertCircle,
} from "lucide-react";
import { Button }    from "@/components/ui/button";
import { Badge }     from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getMentorById, postCheckout } from "@/lib/api";
import { RouteGuard } from "@/components/route-guard";
import { Navbar }     from "@/components/navbar";
import { useAuth }    from "@/lib/auth-context";
import { toast }      from "sonner";


/* ════════════════════════════════════════════════════════════
 *  LOCAL TYPES
 * ════════════════════════════════════════════════════════════ */

interface MentorData {
  id: string;
  name: string;
  role: string;
  company: string;
  avatar: string;
  experience: number;
  domain: string;
  pricePerSession: number;
  available: boolean;
  rating: number;
  sessions: number;
  bio: string;
}


/* ════════════════════════════════════════════════════════════
 *  CHECKOUT PAGE COMPONENT
 * ════════════════════════════════════════════════════════════ */

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const mentorId     = searchParams.get("mentor") || "m1";
  const { user }     = useAuth();

  /* ── Page state ── */
  const [mentor, setMentor]                 = useState<MentorData | null>(null);
  const [confirmed, setConfirmed]           = useState(false);
  const [isProcessing, setIsProcessing]     = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<{
    mentorName: string;
    sessionsCount: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState("");


  /* ────────────────────────────────────────────────────────
   *  Fetch mentor details on mount
   * ──────────────────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      const res = await getMentorById(mentorId);
      if (res) setMentor(res as MentorData);
    }
    load();
  }, [mentorId]);


  /* ────────────────────────────────────────────────────────
   *  Confirm handler — creates the mentorship via API
   * ──────────────────────────────────────────────────────── */
  const handleConfirm = async () => {
    if (!user?.id || !mentor) return;
    setIsProcessing(true);
    setError("");
    const res = await postCheckout(mentorId, user.id);
    setIsProcessing(false);
    if (res) {
      setCheckoutResult({
        mentorName:    res.mentorName,
        sessionsCount: res.sessionsCount,
        total:         res.total,
      });
      setConfirmed(true);
      toast.success("Mentorship confirmed!");
    } else {
      setError("Payment failed. Please try again.");
      toast.error("Something went wrong. Please try again.");
    }
  };

  /* ════════════════════════════════════════════════════════
   *  LOADING STATE
   * ════════════════════════════════════════════════════════ */

  if (!mentor) {
    return (
      <RouteGuard allowedRoles={["candidate"]}>
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-muted-foreground">Loading mentor details...</p>
        </div>
      </RouteGuard>
    );
  }

  /* ── Pricing derived values ── */
  const sessionsCount = 8;
  const subtotal      = mentor.pricePerSession * sessionsCount;
  const platformFee   = Math.round(subtotal * 0.1);   // 10% platform cut
  const total         = subtotal + platformFee;


  /* ════════════════════════════════════════════════════════
   *  SUCCESS STATE
   * ════════════════════════════════════════════════════════ */

  if (confirmed) {
    return (
      <RouteGuard allowedRoles={["candidate"]}>
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Mentorship Confirmed
          </h1>
          <p className="mt-3 text-muted-foreground">
            You&apos;ve been matched with {checkoutResult?.mentorName || mentor.name}. They&apos;ll reach
            out within 24 hours to schedule your first session.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {checkoutResult?.sessionsCount || sessionsCount} sessions booked — Total: ₹{(checkoutResult?.total || total).toLocaleString("en-IN")}
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Button asChild>
              <Link href="/candidate/workflow">Go to Dashboard</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/candidate/roadmap">View Roadmap</Link>
            </Button>
          </div>
        </div>
      </div>
      </RouteGuard>
    );
  }

  /* ════════════════════════════════════════════════════════
   *  MAIN CHECKOUT UI
   * ════════════════════════════════════════════════════════ */

  return (
    <RouteGuard allowedRoles={["candidate"]}>
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-bold tracking-tight">
          Confirm Your Mentorship
        </h1>
        <p className="mt-2 text-muted-foreground">
          Review the details below before confirming.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          {/* Mentor info */}
          <div className="lg:col-span-3 space-y-6">
            <div className="rounded-xl border p-6">
              <h2 className="mb-4 font-semibold">Your Mentor</h2>
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {mentor.avatar}
                </div>
                <div>
                  <h3 className="font-semibold">{mentor.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {mentor.role} at {mentor.company}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      {mentor.rating}
                    </span>
                    <span>{mentor.sessions} sessions</span>
                    <span>{mentor.experience} yrs exp</span>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                {mentor.bio}
              </p>
            </div>

            <div className="rounded-xl border p-6">
              <h2 className="mb-4 font-semibold">Mentorship Plan</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">12 weeks</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sessions</span>
                  <span className="font-medium">{sessionsCount} sessions (bi-weekly)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Format</span>
                  <span className="font-medium">1-on-1 video calls</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Includes</span>
                  <span className="font-medium">Roadmap + action tracking</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing summary */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border p-6">
              <h2 className="mb-4 font-semibold">Pricing Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {sessionsCount} sessions x ₹{mentor.pricePerSession.toLocaleString("en-IN")}
                  </span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Platform fee</span>
                  <span>₹{platformFee.toLocaleString("en-IN")}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>₹{total.toLocaleString("en-IN")}</span>
                </div>
              </div>
              <Button
                className="mt-6 w-full"
                size="lg"
                onClick={handleConfirm}
                disabled={isProcessing || !mentor.available}
              >
                {isProcessing ? "Processing..." : !mentor.available ? "Mentor Unavailable" : "Confirm Mentorship"}
              </Button>
              {error && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  Satisfaction guaranteed or your money back
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Cancel anytime before the next session
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </RouteGuard>
  );
}
