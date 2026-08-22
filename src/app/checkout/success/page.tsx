"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";

function CheckoutSuccessInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const started = useRef(false);
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("Completing your purchase…");

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = params.get("token");
    const subscriptionId = params.get("subscription_id");

    void (async () => {
      try {
        if (subscriptionId) {
          const res = await fetch("/api/subscription/activate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscriptionId }),
          });
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            throw new Error(body.error || "Could not activate subscription");
          }
        } else if (token) {
          const res = await fetch("/api/paypal/capture-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderID: token }),
          });
          if (!res.ok) {
            const body = (await res.json().catch(() => ({}))) as {
              error?: string;
            };
            throw new Error(body.error || "Could not capture payment");
          }
        } else {
          throw new Error("Missing PayPal order or subscription id");
        }

        await user?.reload();
        setStatus("ok");
        setMessage("✅ Purchase complete! Updating your account…");
        window.setTimeout(() => {
          router.replace("/dashboard");
        }, 2500);
      } catch (err) {
        setStatus("error");
        setMessage(
          err instanceof Error ? err.message : "Purchase could not be completed"
        );
      }
    })();
  }, [params, router, user]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-200">
        <h1 className="text-xl font-semibold text-white">
          {status === "error" ? "Checkout issue" : "Checkout"}
        </h1>
        <p
          className={`mt-3 text-sm ${
            status === "error" ? "text-rose-400" : "text-slate-300"
          }`}
        >
          {message}
        </p>
        {status === "error" ? (
          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Back to dashboard
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
          Completing your purchase…
        </div>
      }
    >
      <CheckoutSuccessInner />
    </Suspense>
  );
}
