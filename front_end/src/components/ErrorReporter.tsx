/**
 * ─────────────────────────────────────────────────────────────
 *  GUIDED — Error Reporter (iframe ↔ parent bridge)
 * ─────────────────────────────────────────────────────────────
 *  Dual-purpose component used across the entire app:
 *
 *  1. **Instrumentation layer** (every page)
 *     When the app runs inside an iframe (e.g. the Orchids
 *     visual-editor preview), this component listens for
 *     window errors, unhandled promise rejections, and the
 *     Next.js dev-overlay — forwarding each event to the
 *     parent frame via `postMessage`.
 *
 *  2. **Global error UI** (global-error.tsx only)
 *     When `error` / `reset` props are supplied, it renders
 *     a full-page "Something went wrong" screen and posts
 *     the error details to the parent frame.
 * ─────────────────────────────────────────────────────────────
 */
"use client";

import { useEffect, useRef } from "react";


/* ════════════════════════════════════════════════════════════
 *  TYPES
 * ════════════════════════════════════════════════════════════ */

type ReporterProps = {
  /** Only provided when rendered by the global-error boundary. */
  error?: Error & { digest?: string };
  /** Callback supplied by Next.js to attempt re-rendering. */
  reset?: () => void;
};


/* ════════════════════════════════════════════════════════════
 *  COMPONENT
 * ════════════════════════════════════════════════════════════ */

export default function ErrorReporter({ error, reset }: ReporterProps) {

  /* ── refs for polling the dev overlay ── */
  const lastOverlayMsg = useRef("");
  const pollRef        = useRef<NodeJS.Timeout>(undefined);

  /* ────────────────────────────────────────────────────────
   *  Effect 1 – iframe instrumentation (runs on every page)
   * ──────────────────────────────────────────────────────── */
  useEffect(() => {
    const inIframe = window.parent !== window;
    if (!inIframe) return;  // nothing to do outside an iframe

    /** Shorthand — send a structured message to the parent frame. */
    const send = (payload: unknown) => window.parent.postMessage(payload, "*");

    /* Capture uncaught window errors */
    const onError = (e: ErrorEvent) =>
      send({
        type: "ERROR_CAPTURED",
        error: {
          message: e.message,
          stack: e.error?.stack,
          filename: e.filename,
          lineno: e.lineno,
          colno: e.colno,
          source: "window.onerror",
        },
        timestamp: Date.now(),
      });

    /* Capture unhandled promise rejections */
    const onReject = (e: PromiseRejectionEvent) =>
      send({
        type: "ERROR_CAPTURED",
        error: {
          message: e.reason?.message ?? String(e.reason),
          stack: e.reason?.stack,
          source: "unhandledrejection",
        },
        timestamp: Date.now(),
      });

    /**
     * Poll for the Next.js dev-overlay dialog (only present in
     * development mode).  When new error text appears, forward it
     * to the parent frame.
     */
    const pollOverlay = () => {
      const overlay = document.querySelector("[data-nextjs-dialog-overlay]");
      const node =
        overlay?.querySelector(
          "h1, h2, .error-message, [data-nextjs-dialog-body]"
        ) ?? null;
      const txt = node?.textContent ?? node?.innerHTML ?? "";
      if (txt && txt !== lastOverlayMsg.current) {
        lastOverlayMsg.current = txt;
        send({
          type: "ERROR_CAPTURED",
          error: { message: txt, source: "nextjs-dev-overlay" },
          timestamp: Date.now(),
        });
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onReject);
    pollRef.current = setInterval(pollOverlay, 1000);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onReject);
      pollRef.current && clearInterval(pollRef.current);
    };
  }, []);

  /* ────────────────────────────────────────────────────────
   *  Effect 2 – global-error notification (only when props
   *  carry an actual Error)
   * ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!error) return;
    window.parent.postMessage(
      {
        type: "global-error-reset",
        error: {
          message: error.message,
          stack: error.stack,
          digest: error.digest,
          name: error.name,
        },
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
      },
      "*"
    );
  }, [error]);


  /* ════════════════════════════════════════════════════════
   *  RENDER
   * ════════════════════════════════════════════════════════ */

  // On ordinary pages the component is invisible (instrumentation only).
  if (!error) return null;

  // Full-page error UI for the global-error boundary.
  return (
    <html>
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-destructive">
              Something went wrong!
            </h1>
            <p className="text-muted-foreground">
              An unexpected error occurred. Please try again fixing with Orchids
            </p>
          </div>

          {/* Expandable error details — only visible in development */}
          <div className="space-y-2">
            {process.env.NODE_ENV === "development" && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  Error details
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                  {error.message}
                  {error.stack && (
                    <div className="mt-2 text-muted-foreground">
                      {error.stack}
                    </div>
                  )}
                  {error.digest && (
                    <div className="mt-2 text-muted-foreground">
                      Digest: {error.digest}
                    </div>
                  )}
                </pre>
              </details>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
