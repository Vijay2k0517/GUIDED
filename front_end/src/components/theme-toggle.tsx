/**
 * ─────────────────────────────────────────────────────────────
 *  GUIDED — Theme Toggle Button
 * ─────────────────────────────────────────────────────────────
 *  A small icon button that switches between light and dark
 *  themes.  Uses a `mounted` guard to prevent hydration
 *  mismatches — on the server the button renders as a blank
 *  placeholder; the real icon appears only after the first
 *  client-side paint.
 * ─────────────────────────────────────────────────────────────
 */
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // Prevent hydration mismatch — render placeholder until mounted.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <Button variant="ghost" size="icon" className="h-9 w-9" />;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />   /* show Sun when dark → click to go light */
      ) : (
        <Moon className="h-4 w-4" />  /* show Moon when light → click to go dark */
      )}
    </Button>
  );
}
