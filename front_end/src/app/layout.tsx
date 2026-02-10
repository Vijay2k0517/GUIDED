/**
 * ─────────────────────────────────────────────────────────────
 *  GUIDED — Root Layout
 * ─────────────────────────────────────────────────────────────
 *  The top-level server component that wraps every page in the
 *  app.  Responsibilities:
 *    • Loads the Geist font family (sans + mono)
 *    • Wraps the tree in ThemeProvider → AuthProvider
 *    • Renders the Sonner toast container (top-right, rich)
 * ─────────────────────────────────────────────────────────────
 */
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider }  from "@/lib/auth-context";
import { Toaster }       from "@/components/ui/sonner";


/* ════════════════════════════════════════════════════════════
 *  FONTS
 * ════════════════════════════════════════════════════════════ */

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


/* ════════════════════════════════════════════════════════════
 *  SEO METADATA
 * ════════════════════════════════════════════════════════════ */

export const metadata: Metadata = {
  title: "GUIDED | Mentorship That Drives Outcomes",
  description:
    "Turn mentorship into measurable career outcomes. Get matched with verified mentors, follow structured roadmaps, and track your progress.",
};


/* ════════════════════════════════════════════════════════════
 *  LAYOUT COMPONENT
 * ════════════════════════════════════════════════════════════ */

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {/* Theme → Auth → Page tree → Toast layer */}
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
