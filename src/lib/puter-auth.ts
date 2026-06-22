import { checkPuterStatus } from "@/lib/cache-service";

/** Check and log Puter authentication status. */
export async function checkPuterStatusAndLog(): Promise<void> {
  const status = await checkPuterStatus();

  if (!status.available) {
    console.warn("[Puter] Script not loaded yet");
    return;
  }

  if (status.authenticated) {
    try {
      const user = await window.puter?.auth.getUser();
      console.log(
        "[Puter] ✓ Authenticated as:",
        user?.username || user?.email || "unknown user"
      );
    } catch (error) {
      console.log("[Puter] ✓ KV ready");
    }
    return;
  }

  console.log(
    "[Puter] ⚠️ Needs authentication - popup will appear on first KV use"
  );
}
