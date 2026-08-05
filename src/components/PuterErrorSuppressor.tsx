"use client";

import { useEffect } from "react";

/** Serialize unknown rejection reasons for matching (Puter often rejects plain objects). */
function rejectionText(reason: unknown): string {
  if (reason == null) return "";
  if (typeof reason === "string") return reason;
  if (reason instanceof Error) {
    return `${reason.name} ${reason.message} ${reason.stack ?? ""}`;
  }
  if (typeof reason === "object") {
    const rec = reason as Record<string, unknown>;
    const parts = [
      rec.message,
      rec.error,
      rec.code,
      rec.status,
      rec.statusCode,
      rec.url,
      rec.type,
    ]
      .filter((v) => v != null)
      .map(String);
    try {
      return `${parts.join(" ")} ${JSON.stringify(reason)}`;
    } catch {
      return parts.join(" ") || "[object Object]";
    }
  }
  return String(reason);
}

function isNonCriticalPuterNoise(reason: unknown): boolean {
  const text = rejectionText(reason).toLowerCase();
  if (!text) return false;

  const looksPuter =
    text.includes("puter") ||
    text.includes("whoami") ||
    text.includes("socket.io") ||
    text.includes("api.puter.com");

  const looksAuthNoise =
    text.includes("401") ||
    text.includes("unauthorized") ||
    text.includes("websocket") ||
    text.includes("reauth") ||
    text.includes("auth");

  // Plain `[object Object]` rejections from Puter internals after auth is already OK
  if (text === "[object object]" || text.trim() === "{}") {
    return true;
  }

  return looksPuter && looksAuthNoise;
}

/**
 * Suppresses non-critical Puter SDK noise (whoami 401 / socket.io rejections)
 * that does not affect app functionality once Puter reports authenticated.
 */
export default function PuterErrorSuppressor() {
  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!isNonCriticalPuterNoise(event.reason)) return;
      console.debug("[Puter] Suppressed non-critical rejection:", event.reason);
      event.preventDefault();
    };

    const onError = (event: ErrorEvent) => {
      const msg = `${event.message ?? ""} ${event.filename ?? ""}`.toLowerCase();
      if (
        msg.includes("puter.com") &&
        (msg.includes("websocket") ||
          msg.includes("whoami") ||
          msg.includes("401"))
      ) {
        console.debug("[Puter] Suppressed non-critical error:", event.message);
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}
