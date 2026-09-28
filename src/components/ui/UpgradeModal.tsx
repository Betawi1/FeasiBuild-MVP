"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { paypalVisible } from "@/lib/paypal-gate";
import {
  CREDIT_PRODUCT_KEYS,
  ONE_TIME_PRODUCTS,
  type ProductKey,
} from "@/lib/pricing";
import { useSubscription } from "@/hooks/useSubscription";

export interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  /** Scrolls to and highlights the 100-Pack and Unlimited Pack. */
  focus?: "custom-pages";
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

function useUpgradeModalDismiss(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCloseRef.current();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [open]);
}

function UpgradeModalFrame({
  onClose,
  panelClassName,
  children,
}: {
  onClose: () => void;
  panelClassName: string;
  children: ReactNode;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] bg-black/70" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="upgrade-modal-title"
          className={`relative ${panelClassName}`}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
          <div id="upgrade-modal-body" className="max-h-[85vh] overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

const CREDIT_NOTES: Record<string, string> = {
  credit_1: "Pay as you go",
  credit_10: "Save 20%",
  credit_50: "Save 41%",
  credit_100: "Save 61% + Logo Branding",
};

export default function UpgradeModal({
  open,
  onClose,
  focus,
}: UpgradeModalProps) {
  const { ready, visible } = usePaypalCheckoutVisible();
  const { isSignedIn } = useUser();
  const {
    isPro,
    lifetime,
    hasUnlimitedReports,
    reportCredits,
    packExpiresAt,
  } = useSubscription();
  const [redirecting, setRedirecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const packsLocked = reportCredits > 0;
  useUpgradeModalDismiss(open, onClose);

  const professional = ONE_TIME_PRODUCTS.professional;
  const unlimitedPack = ONE_TIME_PRODUCTS.unlimited;

  useEffect(() => {
    if (!open) {
      setRedirecting(null);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || focus !== "custom-pages") return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById("upgrade-100-pack");
      const scroller = document.getElementById("upgrade-modal-body");
      if (!target || !scroller) return;
      const targetRect = target.getBoundingClientRect();
      const scrollerRect = scroller.getBoundingClientRect();
      const delta =
        targetRect.top -
        scrollerRect.top -
        scrollerRect.height / 2 +
        targetRect.height / 2;
      scroller.scrollTo({ top: scroller.scrollTop + delta });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, focus]);

  async function startOneTime(productKey: ProductKey) {
    if (redirecting) return;
    if (productKey !== "professional" && packsLocked) {
      setError(
        `You still have ${reportCredits} credits remaining. You can purchase a new pack when your balance reaches 0 or your current pack expires.`
      );
      return;
    }
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

  if (!open || !ready) return null;

  if (!visible) {
    return (
      <UpgradeModalFrame
        onClose={onClose}
        panelClassName="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 text-slate-200"
      >
        <h2 id="upgrade-modal-title" className="pr-8 text-lg font-semibold text-white">
          Upgrade
        </h2>
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
      </UpgradeModalFrame>
    );
  }

  const creditsLocked = !isPro;
  const unlimitedLocked = !isPro;
  const busy = Boolean(redirecting);

  return (
    <UpgradeModalFrame
      onClose={onClose}
      panelClassName="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 text-slate-200"
    >
          <h2 id="upgrade-modal-title" className="pr-8 text-2xl font-bold text-white">
            Upgrade FeasiBuild
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Lifetime access, report credits, or the Unlimited Pack.
          </p>
          {focus === "custom-pages" ? (
            <p className="mt-3 text-sm text-amber-200">
              Custom pages are included with the 100-Pack and the Unlimited Pack.
            </p>
          ) : null}

          {packsLocked ? (
            <div className="mb-4 mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
              You have {reportCredits} credit{reportCredits > 1 ? "s" : ""}{" "}
              remaining. New packs unlock when your balance reaches 0 or your
              current pack expires.
              {isPro && packExpiresAt ? (
                <p className="mt-2 text-amber-200/90">
                  Current pack expires on: {packExpiresAt.toLocaleDateString()}
                </p>
              ) : null}
            </div>
          ) : null}

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
              Professional — {formatUsd(professional.amount)} lifetime
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
                  {professional.label}
                </span>
                <span className="text-xl font-bold text-white">
                  {formatUsd(professional.amount)}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                One-time · unlocks clean reports via 12-month credit packs
              </p>
              {isPro || lifetime ? (
                <span className="mt-3 inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
                  ✓ Owned
                </span>
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
                One credit = one clean report. Packs are valid for 12 months
                from purchase.
              </p>
            )}
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CREDIT_PRODUCT_KEYS.map((key) => {
                const product = ONE_TIME_PRODUCTS[key];
                const highlight =
                  focus === "custom-pages" && key === "credit_100";
                return (
                  <div
                    key={key}
                    id={key === "credit_100" ? "upgrade-100-pack" : undefined}
                    className={`rounded-xl border p-4 ${
                      highlight
                        ? "border-amber-400 bg-amber-500/10 ring-2 ring-amber-400"
                        : creditsLocked || packsLocked
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
                        disabled={busy || packsLocked}
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
              Unlimited Pack — {formatUsd(unlimitedPack.amount)} · 12 months
            </h3>
            <div
              id="upgrade-unlimited-pack"
              className={`mt-3 w-full rounded-xl border p-4 ${
                focus === "custom-pages"
                  ? "border-amber-400 bg-amber-500/10 ring-2 ring-amber-400"
                  : hasUnlimitedReports || unlimitedLocked || packsLocked
                    ? "border-slate-700 bg-slate-900/50 opacity-70"
                    : "border-emerald-500 bg-emerald-500/10"
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-white">
                  {unlimitedPack.label}
                </span>
                <span className="text-xl font-bold text-white">
                  {formatUsd(unlimitedPack.amount)}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                12 months of unlimited clean reports · white-label included
              </p>
              {hasUnlimitedReports ? (
                <span className="mt-3 inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
                  ✓ Owned
                </span>
              ) : unlimitedLocked ? (
                <p className="mt-3 text-sm font-semibold text-amber-300">
                  Requires Professional
                </p>
              ) : isSignedIn ? (
                <button
                  type="button"
                  disabled={busy || packsLocked}
                  onClick={() => void startOneTime("unlimited")}
                  className="mt-4 w-full rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-40"
                >
                  Pay with PayPal
                </button>
              ) : null}
            </div>
          </section>

          {error ? (
            <p className="mt-6 text-center text-sm text-rose-400">{error}</p>
          ) : null}

          <p className="mt-6 text-center text-xs text-slate-500">
            By purchasing, you agree to our{" "}
            <Link href="/terms" className="text-slate-400 underline hover:text-emerald-400">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/refund-policy"
              className="text-slate-400 underline hover:text-emerald-400"
            >
              Refund Policy
            </Link>
            .
          </p>
    </UpgradeModalFrame>
  );
}

export function UpgradeModalTrigger({
  className,
}: {
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { ready, visible } = usePaypalCheckoutVisible();
  const { isPro, hasUnlimitedReports, isLoading } = useSubscription();

  if (isLoading || !ready || !visible) return null;
  if (hasUnlimitedReports) return null;

  const label = isPro ? "➕ Buy Report Credits" : "⚡ Upgrade to Pro";

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
        {label}
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
    hasUnlimitedReports,
    reportCredits,
    isLoading,
  } = useSubscription();

  if (isLoading || !isSignedIn) return null;

  const badge = hasUnlimitedReports
    ? "Advisory • Unlimited"
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
