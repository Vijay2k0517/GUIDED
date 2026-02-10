/**
 * ─────────────────────────────────────────────────────────────
 *  GUIDED — Global Error Boundary
 * ─────────────────────────────────────────────────────────────
 *  Next.js invokes this page when an uncaught error occurs
 *  outside any nested error boundary.  It simply re-exports
 *  the shared `ErrorReporter` component which handles both
 *  the visible UI and the iframe → parent error forwarding.
 * ─────────────────────────────────────────────────────────────
 */
"use client";

import ErrorReporter from "@/components/ErrorReporter";

export default ErrorReporter;
