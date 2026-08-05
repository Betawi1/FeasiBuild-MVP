import { checkPuterStatus } from "@/lib/cache-service";

/** Check and log Puter authentication status (no polling, no whoami). */
export async function checkPuterStatusAndLog(): Promise<void> {
  try {
    const status = await checkPuterStatus();

    if (!status.available) {
      console.warn("[Puter] Script not loaded yet");
      return;
    }

    if (!status.authenticated) {
      console.log(
        "[Puter] ⚠️ Needs authentication - popup will appear on first KV use"
      );
      return;
    }

    // Prefer sync username from isSignedIn path; only call getUser once, safely
    try {
      const user = await window.puter?.auth?.getUser?.();
      console.log(
        "[Puter] ✓ Authenticated as:",
        user?.username || user?.email || "unknown user"
      );
    } catch {
      console.log("[Puter] ✓ Authenticated and ready");
    }
  } catch (error) {
    console.debug("[Puter] Status check failed (non-critical):", error);
  }
}
