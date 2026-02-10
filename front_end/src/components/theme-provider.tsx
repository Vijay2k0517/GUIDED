/**
 * ─────────────────────────────────────────────────────────────
 *  GUIDED — Theme Provider
 * ─────────────────────────────────────────────────────────────
 *  Thin wrapper around `next-themes` that locks the app to a
 *  class-based light / dark toggle.  System preference is
 *  intentionally disabled so the user always gets a consistent
 *  default ("light") on first visit.
 * ─────────────────────────────────────────────────────────────
 */
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"               /* toggle via <html class="dark"> */
      defaultTheme="light"            /* first-visit default            */
      enableSystem={false}            /* ignore OS preference           */
      disableTransitionOnChange       /* prevent FOUC on theme switch   */
    >
      {children}
    </NextThemesProvider>
  );
}
