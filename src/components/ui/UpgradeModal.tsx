"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
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

function formatUsd(amount: string): string {
  const n = Number(amount);
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  });
}

function usePaypalCheckoutVisible() {
  return { ready: true, visible: paypalVisible() };
}

const CREDIT_NOTES: Record<string, string> = {
  credit_1: "Pay as you go",
  credit_10: "Save 34%",
  credit_50: "Save 51%",
  credit_100: "Save 59% + Logo Branding",
};

export default function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const { ready, visible } = usePaypalCheckoutVisible();
  const { isSignedIn } = useUser();
  const { isPro, lifetime, advisoryActive } = useSubscription();
  const [redirecting, setRedirecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setRedirecting(null);
      setError(null);
    }
  }, [open]);

  async function startOneTime(productKey: ProductKey) {
    if (redirecting) return;
    setError(null);
    setRedirecting(ONE_TIME_PRODUCTS[productKey].label);
    try {
      const res = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productKey }),
      });
      const body = (await res.json()) as {
        approveUrl?: string;
        error?: string;
      };
      if (!res.ok || !body.approveUrl) {
        throw new Error(body.error || "Could not start PayPal checkout");
      }
      window.location.href = body.approveUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setRedirecting(null);
    }
  }

  async function startAdvisory() {
    if (redirecting) return;
    setError(null);
    setRedirecting("Advisory");
    try {
      const res = await fetch("/api/paypal/create-subscription", {
        method: "POST",
      });
      const body = (await res.json()) as {
        approveUrl?: string;
        error?: string;
      };
      if (!res.ok || !body.approveUrl) {
        throw new Error(body.error || "Could not start PayPal checkout");
      }
      window.location.href = body.approveUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setRedirecting(null);
    }
  }

  if (!open || !ready) return null;

  if (!visible) {
    return (
      <div className="fixed inset-0 z-[300] overflow-y-auto bg-black/70">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-200">
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
      </div>
    );
  }

  const creditsLocked = !isPro;
  const busy = Boolean(redirecting);

  return (
    <div className="fixed inset-0 z-[300] overflow-y-auto bg-black/70">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-6 text-slate-200 shadow-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="absolute right-4 top-4 rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-40"
            aria-label="Close"
          >
            ✕
          </button>

          <h2 className="pr-8 text-2xl font-bold text-white">Upgrade FeasiBuild</h2>
          <p className="mt-1 text-sm text-slate-400">
            Lifetime access, report credits, or unlimited Advisory.
          </p>

          {!isSignedIn ? (
            <a
              href="/sign-in"
              className="mt-6 block rounded-lg bg-emerald-500 px-4 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-emerald-400"
            >
              Sign in to purchase
            </a>
          ) : null}

          {busy ? (
            <p className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-300">
              Redirecting to PayPal…
            </p>
          ) : null}

          <section className="mt-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
              Professional — $99 lifetime
            </h3>
            <div
              className={`mt-3 w-full rounded-xl border p-4 ${
                lifetime
                  ? "border-slate-700 bg-slate-900/50 opacity-70"
                  : "border-emerald-500 bg-emerald-500/10"
              }`}
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
              ) : isSignedIn ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void startOneTime("professional")}
                  className="mt-4 w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
                >
                  Pay with PayPal
                </button>
              ) : null}
            </div>
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
                  <div
                    key={key}
                    className={`rounded-xl border p-4 ${
                      creditsLocked
                        ? "border-slate-700 bg-slate-900/50 opacity-40"
                        : "border-slate-700 bg-slate-900/50"
                    }`}
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
                    {!creditsLocked && isSignedIn ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void startOneTime(key)}
                        className="mt-4 w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
                      >
                        Pay with PayPal
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-8">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
              Advisory — $2,889/yr
            </h3>
            <div
              className={`mt-3 w-full rounded-xl border p-4 ${
                advisoryActive
                  ? "border-slate-700 bg-slate-900/50 opacity-70"
                  : "border-slate-700 bg-slate-900/50"
              }`}
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
              ) : isSignedIn ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void startAdvisory()}
                  className="mt-4 w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
                >
                  Subscribe with PayPal
                </button>
              ) : null}
            </div>
          </section>

          {error ? (
            <p className="mt-6 text-center text-sm text-rose-400">{error}</p>
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
  const { isSignedIn } = useUser();
  const {
    plan,
    lifetime,
    advisoryActive,
    reportCredits,
    isLoading,
  } = useSubscription();

  if (isLoading || !isSignedIn) return null;

  const badge = advisoryActive
    ? "Advisory · Unlimited"
    : lifetime || plan === "professional"
      ? `Pro • ${reportCredits} credit${reportCredits === 1 ? "" : "s"}`
      : "Explorer";

  return (
    <span
      className={`rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-semibold text-slate-200 ${
        compact ? "hidden sm:inline-flex" : "inline-flex"
      }`}
    >
      {badge}
    </span>
  );
}
