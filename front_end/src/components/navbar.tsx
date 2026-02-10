/**
 * ─────────────────────────────────────────────────────────────
 *  GUIDED — Global Navigation Bar
 * ─────────────────────────────────────────────────────────────
 *  Role-aware navbar displayed on every authenticated page.
 *  • Highlights the currently active route
 *  • Renders a compact mobile nav row on small screens
 *  • Shows role badge + logout for signed-in users, or
 *    sign-in / get-started CTAs for visitors.
 * ─────────────────────────────────────────────────────────────
 */
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Zap, LogOut, User, LayoutDashboard,
  Map, Users, ShieldCheck, Home,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";


/* ════════════════════════════════════════════════════════════
 *  CONSTANTS — role-dependent styling & route maps
 * ════════════════════════════════════════════════════════════ */

/** Tailwind classes for the coloured role badge next to the user's name. */
const roleBadgeColors: Record<string, string> = {
  candidate: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  mentor:    "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  admin:     "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

/** Shape of a single navigation link entry. */
interface NavLink {
  href: string;
  label: string;
  icon?: React.ReactNode;
}

/**
 * Each role gets its own set of primary navigation links.
 * These are rendered both in the desktop header and in
 * the mobile overflow row beneath it.
 */
const roleNavLinks: Record<string, NavLink[]> = {
  candidate: [
    { href: "/candidate/workflow", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/candidate/roadmap",  label: "Roadmap",   icon: <Map className="h-4 w-4" /> },
    { href: "/candidate/mentors",  label: "Mentors",   icon: <Users className="h-4 w-4" /> },
  ],
  mentor: [
    { href: "/mentor/dashboard",    label: "Dashboard",    icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: "/mentor/verification", label: "Verification", icon: <ShieldCheck className="h-4 w-4" /> },
  ],
  admin: [
    { href: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  ],
};


/* ════════════════════════════════════════════════════════════
 *  NAVBAR COMPONENT
 * ════════════════════════════════════════════════════════════ */

interface NavbarProps {
  /** When `true`, role-specific links are hidden (e.g. on the landing page). */
  minimal?: boolean;
}

export function Navbar({ minimal = false }: NavbarProps) {
  const { user, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  /** Clear the session and return to the landing page. */
  const handleLogout = () => {
    logout();
    router.push("/");
  };

  // Resolve which links (if any) to show for the current user's role.
  const navLinks = !minimal && user ? (roleNavLinks[user.role] || []) : [];

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">

        {/* ── Brand logo + desktop role links ── */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">GUIDED</span>
          </Link>

          {/* Desktop role-specific navigation links */}
          {navLinks.length > 0 && (
            <div className="hidden sm:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/" && pathname.startsWith(link.href));
                return (
                  <Button
                    key={link.href}
                    variant="ghost"
                    size="sm"
                    asChild
                    className={cn(
                      "gap-1.5 transition-colors",
                      isActive && "bg-accent text-accent-foreground font-medium"
                    )}
                  >
                    <Link href={link.href}>
                      {link.icon}
                      {link.label}
                    </Link>
                  </Button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right-hand toolbar: theme toggle, badges, auth ── */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {user ? (
            <>
              {/* Small "Home" icon — only visible away from the landing page */}
              {pathname !== "/" && (
                <Button variant="ghost" size="icon" className="h-9 w-9" asChild aria-label="Home">
                  <Link href="/">
                    <Home className="h-4 w-4" />
                  </Link>
                </Button>
              )}

              {/* Coloured role badge with truncated first name */}
              <Badge
                variant="outline"
                className={cn("gap-1 hidden sm:flex", roleBadgeColors[user.role] || "")}
              >
                <User className="h-3 w-3" />
                {user.name?.split(" ")[0] || user.role}
              </Badge>

              {/* Logout button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
                onClick={handleLogout}
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            /* Visitor CTAs */
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Mobile-only nav row (horizontally scrollable) ── */}
      {navLinks.length > 0 && (
        <div className="sm:hidden border-t px-4 py-1.5 flex items-center gap-1 overflow-x-auto">
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Button
                key={link.href}
                variant="ghost"
                size="sm"
                asChild
                className={cn(
                  "gap-1.5 text-xs shrink-0",
                  isActive && "bg-accent text-accent-foreground font-medium"
                )}
              >
                <Link href={link.href}>
                  {link.icon}
                  {link.label}
                </Link>
              </Button>
            );
          })}
        </div>
      )}
    </nav>
  );
}
