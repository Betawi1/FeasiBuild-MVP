"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { paypalVisible } from "@/lib/paypal-gate";
import {
  ADVISORY_ANNUAL_PRICE,
  CREDIT_PRODUCT_KEYS,
  ONE_TIME_PRODUCTS,
  type ProductKey,
} from "@/lib/pricing";
import { useSubscription } from "@/hooks/useSubscription";

export interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

type Selectable = ProductKey | "advisory";

function formatUsd(amount: string): string {
  const n = Number(amount);
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  });
}

function usePaypalCheckoutVisible() {
  const [state, setState] = useState<{ ready: boolean; visible: boolean }>(
    () => {
      const live = process.env.NEXT_PUBLIC_PAYPAL_MODE === "live";
      return { ready: live, visible: live };
    }
  );
  useEffect(() => {
    setState({ ready: true, visible: paypalVisible() });
  }, []);
  return state;
}

const CREDIT_NOTES: Record<string, string> = {
  credit_1: "Pay as you go",
  credit_10: "Save 34%",
  credit_50: "Save 51%",
  credit_100: "Save 59% + Logo Branding",
};

const SDK_SRC = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&vault=true&intent=capture,subscription&components=buttons`;

export default function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const { ready, visible } = usePaypalCheckoutVisible();
  const { user, isSignedIn } = useUser();
  const { getToken } = useAuth();
  const { isPro, lifetime, advisoryActive } = useSubscription();
  const [selected, setSelected] = useState<Selectable>(
    lifetime ? "credit_1" : "professional"
  );
  const [sdkReady, setSdkReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const buttonHostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (lifetime && selected === "professional") setSelected("credit_1");
  }, [lifetime, selected]);

  useEffect(() => {
    if (!open || !visible) return;
    if (window.paypal) {
      setSdkReady(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src*="paypal.com/sdk/js"]'
    );
    if (existing) {
      if (window.paypal) setSdkReady(true);
      else existing.addEventListener("load", () => setSdkReady(true), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = SDK_SRC;
    script.async = true;
    script.onload = () => setSdkReady(true);
    script.onerror = () => setError("Failed to load PayPal. Try again.");
    document.body.appendChild(script);
  }, [open, visible]);

  const finishPurchase = useCallback(async () => {
    await getToken({ skipCache: true }).catch(() => undefined);
    await user?.reload();
    window.location.reload();
  }, [getToken, user]);

  useEffect(() => {
    if (!open || !visible || !sdkReady || !isSignedIn || !window.paypal) return;
    const host = buttonHostRef.current;
    if (!host) return;

    const creditsLocked = CREDIT_PRODUCT_KEYS.includes(selected as ProductKey) && !isPro;
    const professionalOwned = selected === "professional" && lifetime;
    const advisoryOwned = selected === "advisory" && advisoryActive;
    if (creditsLocked || professionalOwned || advisoryOwned) return;

    setError(null);
    host.innerHTML = "";

    const buttons =
      selected === "advisory"
        ? window.paypal.Buttons({
            style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal" },
            createSubscription: (_data, actions) => {
              const planId = process.env.NEXT_PUBLIC_PAYPAL_ADVISORY_PLAN_ID;
              if (!planId || !user?.id) {
                return Promise.reject(new Error("Missing plan or user"));
              }
              return actions.subscription.create({
                plan_id: planId,
                custom_id: user.id,
              });
            },
            onApprove: async (data) => {
              setBusy(true);
              try {
                const res = await fetch("/api/subscription/activate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ subscriptionId: data.subscriptionID }),
                });
                if (!res.ok) {
                  const body = (await res.json().catch(() => ({}))) as {
                    error?: string;
                  };
                  throw new Error(body.error || "Activation failed");
                }
                await finishPurchase();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Activation failed");
                setBusy(false);
              }
            },
            onError: (err) => {
              console.error("[PayPal] subscription error", err);
              setError("PayPal subscription failed. Try again.");
            },
          })
        : window.paypal.Buttons({
            style: { layout: "vertical", color: "gold", shape: "rect", label: "paypal" },
            createOrder: async () => {
              const res = await fetch("/api/paypal/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productKey: selected }),
              });
              const body = (await res.json()) as {
                orderID?: string;
                error?: string;
              };
              if (!res.ok || !body.orderID) {
                throw new Error(body.error || "Order creation failed");
              }
              return body.orderID;
            },
            onApprove: async (data) => {
              setBusy(true);
              try {
                const res = await fetch("/api/paypal/capture-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderID: data.orderID }),
                });
                const body = (await res.json()) as { error?: string };
                if (!res.ok) {
                  throw new Error(body.error || "Capture failed");
                }
                await finishPurchase();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Capture failed");
                setBusy(false);
              }
            },
            onError: (err) => {
              console.error("[PayPal] order error", err);
              setError("PayPal checkout failed. Try again.");
            },
          });

    void buttons.render(host).catch((err) => {
      console.error("[PayPal] render failed", err);
      setError("Could not render PayPal button.");
    });

    return () => {
      void buttons.close().catch(() => undefined);
    };
  }, [
    open,
    visible,
    sdkReady,
    isSignedIn,
    selected,
    isPro,
    lifetime,
    advisoryActive,
    user?.id,
    finishPurchase,
  ]);

  if (!open || !ready) return null;

  if (!visible) {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-200">
          <h2 className="text-lg font-semibold text-white">Upgrade</h2>
          <p className="mt-2 text-sm text-slate-400">
            Paid checkout is not available on this domain while PayPal is in
            sandbox. See pricing, or use a preview deployment to purchase.
          </p>
          <div className="mt-4 flex gap-3">
            <a
              href="/#pricing"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              See Pricing
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  const creditsLocked = !isPro;
  const showPayPal =
    isSignedIn &&
    !(selected === "professional" && lifetime) &&
    !(selected === "advisory" && advisoryActive) &&
    !(CREDIT_PRODUCT_KEYS.includes(selected as ProductKey) && creditsLocked);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-200 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white"
          aria-label="Close"
        >
          ✕
        </button>

        <h2 className="pr-8 text-2xl font-bold text-white">Upgrade FeasiBuild</h2>
        <p className="mt-1 text-sm text-slate-400">
          Lifetime access, report credits, or unlimited Advisory.
        </p>

        <section className="mt-6">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Professional — $99 lifetime
          </h3>
          <button
            type="button"
            onClick={() => setSelected("professional")}
            disabled={lifetime}
            className={`mt-3 w-full rounded-xl border p-4 text-left transition ${
              selected === "professional"
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-slate-700 bg-slate-900/50 hover:border-slate-500"
            } ${lifetime ? "cursor-default opacity-70" : ""}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold text-white">
                {ONE_TIME_PRODUCTS.professional.label}
              </span>
              <span className="text-xl font-bold text-white">
                {formatUsd(ONE_TIME_PRODUCTS.professional.amount)}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              One-time · unlocks clean reports via credit packs
            </p>
            {lifetime ? (
              <p className="mt-2 text-xs font-semibold text-emerald-400">
                Already purchased
              </p>
            ) : null}
          </button>
        </section>

        <section className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Report Credits
          </h3>
          {creditsLocked ? (
            <p className="mt-2 text-sm text-amber-300">
              Requires Professional — buy lifetime access first.
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-400">
              One credit = one clean, unwatermarked feasibility report.
            </p>
          )}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CREDIT_PRODUCT_KEYS.map((key) => {
              const product = ONE_TIME_PRODUCTS[key];
              return (
                <button
                  key={key}
                  type="button"
                  disabled={creditsLocked}
                  onClick={() => setSelected(key)}
                  className={`rounded-xl border p-4 text-left transition ${
                    selected === key
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-slate-700 bg-slate-900/50 hover:border-slate-500"
                  } ${creditsLocked ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  <p className="text-sm font-medium text-slate-300">
                    {product.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-white">
                    {formatUsd(product.amount)}
                  </p>
                  <p className="mt-2 inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                    {CREDIT_NOTES[key]}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-8">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Advisory — $2,889/yr
          </h3>
          <button
            type="button"
            onClick={() => setSelected("advisory")}
            disabled={advisoryActive}
            className={`mt-3 w-full rounded-xl border p-4 text-left transition ${
              selected === "advisory"
                ? "border-emerald-500 bg-emerald-500/10"
                : "border-slate-700 bg-slate-900/50 hover:border-slate-500"
            } ${advisoryActive ? "cursor-default opacity-70" : ""}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold text-white">
                Advisory — unlimited clean reports
              </span>
              <span className="text-xl font-bold text-white">
                {formatUsd(ADVISORY_ANNUAL_PRICE)}
                <span className="ml-1 text-sm font-medium text-slate-400">
                  /yr
                </span>
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              White-label logo branding included
            </p>
            {advisoryActive ? (
              <p className="mt-2 text-xs font-semibold text-emerald-400">
                Active subscription
              </p>
            ) : null}
          </button>
        </section>

        <div className="mt-8 min-h-[52px] rounded-xl border border-slate-800 bg-slate-950/60 p-4">
          {!isSignedIn ? (
            <a
              href="/sign-in"
              className="block rounded-lg bg-emerald-500 px-4 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Sign in to purchase
            </a>
          ) : busy ? (
            <p className="text-center text-sm text-slate-300">
              Completing purchase…
            </p>
          ) : showPayPal ? (
            <div ref={buttonHostRef} />
          ) : (
            <p className="text-center text-sm text-slate-400">
              {selected === "professional" && lifetime
                ? "Professional lifetime access is already on this account."
                : selected === "advisory" && advisoryActive
                  ? "Advisory is already active."
                  : "Select Professional first to buy report credits."}
            </p>
          )}
          {error ? (
            <p className="mt-3 text-center text-sm text-rose-400">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function UpgradeModalTrigger({
  className,
}: {
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { ready, visible } = usePaypalCheckoutVisible();
  const { isPro, isLoading } = useSubscription();

  if (isLoading || !ready || !visible || isPro) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
        }
      >
        ⚡ Upgrade to Pro
      </button>
      <UpgradeModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function UpgradeNavControl({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const { ready, visible } = usePaypalCheckoutVisible();
  const { isSignedIn } = useUser();
  const {
    plan,
    lifetime,
    advisoryActive,
    isPro,
    reportCredits,
    isLoading,
  } = useSubscription();

  if (isLoading || !isSignedIn || !ready) return null;

  const badge = advisoryActive
    ? "Advisory · Unlimited"
    : lifetime || plan === "professional"
      ? `Pro • ${reportCredits} credit${reportCredits === 1 ? "" : "s"}`
      : "Explorer";

  const showUpgrade = visible && !(isPro && advisoryActive);

  return (
    <>
      <span
        className={`rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-semibold text-slate-200 ${
          compact ? "hidden sm:inline-flex" : "inline-flex"
        }`}
      >
        {badge}
      </span>
      {showUpgrade ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 sm:px-4 sm:py-2 sm:text-sm"
        >
          Upgrade to Pro
        </button>
      ) : null}
      <UpgradeModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
