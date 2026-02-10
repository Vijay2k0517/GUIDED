/**
 * ─────────────────────────────────────────────────────────────
 *  GUIDED — Route Guard (Auth + Role gate)
 * ─────────────────────────────────────────────────────────────
 *  Wraps any page that requires authentication and / or a
 *  specific user role.  Behaviour:
 *    • Shows a centered spinner while the auth state is loading.
 *    • Redirects to /login when the user is not signed in.
 *    • Redirects to the user's own area when their role is not
 *      in the `allowedRoles` list.
 *    • Otherwise, renders `children` as-is.
 * ─────────────────────────────────────────────────────────────
 */
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type User } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";


/* ════════════════════════════════════════════════════════════
 *  ROUTE GUARD COMPONENT
 * ════════════════════════════════════════════════════════════ */

interface RouteGuardProps {
  children: React.ReactNode;
  /** Roles that are permitted to view this page. */
  allowedRoles: User["role"][];
}

export function RouteGuard({ children, allowedRoles }: RouteGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  /* ── Redirect logic (runs after auth state settles) ── */
  useEffect(() => {
    if (isLoading) return;               // wait for auth check

    if (!user) {
      router.replace("/login");          // not authenticated → login
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      // Authenticated but wrong role → send to their home area
      if (user.role === "mentor") router.replace("/mentor/dashboard");
      else if (user.role === "admin")  router.replace("/");
      else                              router.replace("/candidate/workflow");
    }
  }, [user, isLoading, allowedRoles, router]);

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  /* Guard — prevent flash of protected content while redirecting */
  if (!user || !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
