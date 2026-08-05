"use client";

import { useEffect, useState } from "react";
import { checkPuterStatus } from "@/lib/cache-service";

type PuterUiStatus = "loading" | "ready" | "needs-auth";

export default function PuterAuthNotice() {
  const [puterStatus, setPuterStatus] = useState<PuterUiStatus>("loading");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | undefined;

    const stopPolling = () => {
      if (intervalId != null) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const pollPuter = async () => {
      try {
        const status = await checkPuterStatus();
        if (cancelled) return;

        if (!status.available) {
          setPuterStatus("loading");
          return; // keep polling until script loads
        }

        if (status.authenticated) {
          console.log("[Puter] ✓ Authenticated and ready");
          setPuterStatus("ready");
          stopPolling();
          return;
        }

        console.log(
          "[Puter] ⚠️ Needs authentication - popup will appear on first KV operation"
        );
        setPuterStatus("needs-auth");
        // Auth popup is lazy (first KV use) — no need to keep probing Puter
        stopPolling();
      } catch (error) {
        console.debug("[Puter] Auth poll failed (non-critical):", error);
      }
    };

    const timer = window.setTimeout(() => {
      void pollPuter();
    }, 2000);

    intervalId = window.setInterval(() => {
      void pollPuter();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stopPolling();
    };
  }, []);

  if (puterStatus !== "needs-auth" || dismissed) {
    return null;
  }

  return (
    <div className="mb-6 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-blue-400">
            Cloud Storage Setup Required
          </h3>
          <p className="mt-1 text-sm text-blue-300">
            When you generate your first feasibility study, you&apos;ll see a
            popup asking you to sign in to Puter. This creates your personal
            cloud storage (free tier included). All your studies will be saved
            to your Puter account. Until then, data is stored locally in your
            browser.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 text-blue-400 transition hover:text-blue-300"
          aria-label="Dismiss notification"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
