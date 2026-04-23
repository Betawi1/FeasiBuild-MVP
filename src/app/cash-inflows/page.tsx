"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useFinModelStore, {
  type CashInflows as CashInflowsSlice,
  type ProjectInfo,
} from "@/store/useFinModelStore";
import PreviewFloatingBar from "@/components/PreviewFloatingBar";
import {
  streamKeyFromPrefix,
  useStreamPrefix,
  withStreamPrefix,
} from "@/lib/stream-path";

type PaymentPlanPreset = "front_loaded" | "even" | "back_loaded";

type SalesUptakeMode = "preset" | "manual";

type Errors = Record<string, string>;

export default function CashInflowsPage() {
  const router = useRouter();
  const streamPrefix = useStreamPrefix();
  const finStream = streamKeyFromPrefix(streamPrefix);
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);

  const projectInfo = useFinModelStore((s) => s[finStream].projectInfo);
  const cashOutflows = useFinModelStore((s) => s[finStream].cashOutflows);
  const cashInflows = useFinModelStore((s) => s.cashInflows);
  const updateCashInflows = useFinModelStore((s) => s.updateCashInflows);

  const [errors, setErrors] = useState<Errors>({});

  // Sale Development stream (8 steps)
  const totalSteps = 8; // indices 0–7

  // Support deep-linking back into a specific step (e.g. /cash-inflows?step=8)
  useEffect(() => {
    const raw = searchParams?.get("step");
    if (!raw) return;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;

    // URL uses 1..8; internal state is 0..7
    const desired = Math.min(totalSteps - 1, Math.max(0, Math.round(parsed) - 1));
    setCurrentStep(desired);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live calculations for Net Proceeds card (final step)
  const totalSaleableBUA = useMemo(() => {
    return cashOutflows.buildingBUA * (cashInflows.saleableBUARatio / 100);
  }, [cashOutflows.buildingBUA, cashInflows.saleableBUARatio]);

  const grossSalesLive = useMemo(() => {
    return totalSaleableBUA * cashInflows.salesPrice;
  }, [totalSaleableBUA, cashInflows.salesPrice]);

  const deductionsPercent = useMemo(() => {
    return (
      cashInflows.buyerMix.brokerCommissionPercent +
      cashInflows.buyerMix.vatPercent +
      cashInflows.buyerMix.escrowFeePercent +
      cashInflows.buyerMix.salesDiscountPercent +
      cashInflows.defaultRate +
      (cashInflows.bulkSales.bulkSalesSharePercent *
        cashInflows.bulkSales.bulkSalesDiscountPercent) /
        100
    );
  }, [
    cashInflows.buyerMix.brokerCommissionPercent,
    cashInflows.buyerMix.vatPercent,
    cashInflows.buyerMix.escrowFeePercent,
    cashInflows.buyerMix.salesDiscountPercent,
    cashInflows.defaultRate,
    cashInflows.bulkSales.bulkSalesSharePercent,
    cashInflows.bulkSales.bulkSalesDiscountPercent,
  ]);

  const totalDeductionsLive = useMemo(() => {
    return grossSalesLive * (deductionsPercent / 100);
  }, [grossSalesLive, deductionsPercent]);

  const netProceedsLive = useMemo(() => {
    return grossSalesLive - totalDeductionsLive;
  }, [grossSalesLive, totalDeductionsLive]);

  const brokerCommissionAmount = useMemo(
    () =>
      grossSalesLive *
      (cashInflows.buyerMix.brokerCommissionPercent / 100),
    [grossSalesLive, cashInflows.buyerMix.brokerCommissionPercent]
  );
  const vatAmount = useMemo(
    () => grossSalesLive * (cashInflows.buyerMix.vatPercent / 100),
    [grossSalesLive, cashInflows.buyerMix.vatPercent]
  );
  const escrowFeeAmount = useMemo(
    () =>
      grossSalesLive * (cashInflows.buyerMix.escrowFeePercent / 100),
    [grossSalesLive, cashInflows.buyerMix.escrowFeePercent]
  );
  const salesDiscountAmount = useMemo(
    () =>
      grossSalesLive *
      (cashInflows.buyerMix.salesDiscountPercent / 100),
    [grossSalesLive, cashInflows.buyerMix.salesDiscountPercent]
  );
  const defaultRateAmount = useMemo(
    () => grossSalesLive * (cashInflows.defaultRate / 100),
    [grossSalesLive, cashInflows.defaultRate]
  );
  const bulkSalesDiscountAmount = useMemo(
    () =>
      grossSalesLive *
      (cashInflows.bulkSales.bulkSalesSharePercent / 100) *
      (cashInflows.bulkSales.bulkSalesDiscountPercent / 100),
    [
      grossSalesLive,
      cashInflows.bulkSales.bulkSalesSharePercent,
      cashInflows.bulkSales.bulkSalesDiscountPercent,
    ]
  );

  const updateFormData = (field: string, value: unknown) => {
    const paymentPlanFields = new Set([
      "cashDownPaymentPercent",
      "cashOnHandoverPercent",
      "cashDuringConstructionPercent",
      "mortgageDownPaymentPercent",
      "mortgageLtvPercent",
      "mortgageTenorYears",
      "mortgageRatePercent",
    ]);
    const salesUptakeFields = new Set([
      "salesUptakeMode",
      "salesUptakePreset",
      "manualSalesUptakeCsv",
    ]);
    const buyerMixFields = new Set([
      "cashBuyerPercent",
      "mortgageBuyerPercent",
      "brokerCommissionPercent",
      "vatPercent",
      "escrowFeePercent",
      "salesDiscountPercent",
    ]);
    const bulkSalesFields = new Set([
      "bulkSalesSharePercent",
      "bulkSalesDiscountPercent",
    ]);
    const launchTimingFields = new Set([
      "launchMonthOffset",
      "preLaunchSalesPercent",
    ]);

    if (field === "saleableBUARatio" || field === "salesPrice" || field === "defaultRate") {
      updateCashInflows({ [field]: value } as Partial<CashInflowsSlice>);
      return;
    }

    if (paymentPlanFields.has(field)) {
      updateCashInflows({
        paymentPlans: {
          ...cashInflows.paymentPlans,
          [field]: value,
        },
      });
      return;
    }

    if (salesUptakeFields.has(field)) {
      const mappedField =
        field === "salesUptakeMode"
          ? "mode"
          : field === "salesUptakePreset"
          ? "preset"
          : "manualCsv";
      updateCashInflows({
        salesUptake: {
          ...cashInflows.salesUptake,
          [mappedField]: value,
        },
      });
      return;
    }

    if (buyerMixFields.has(field)) {
      updateCashInflows({
        buyerMix: {
          ...cashInflows.buyerMix,
          [field]: value,
        },
      });
      return;
    }

    if (bulkSalesFields.has(field)) {
      updateCashInflows({
        bulkSales: {
          ...cashInflows.bulkSales,
          [field]: value,
        },
      });
      return;
    }

    if (launchTimingFields.has(field)) {
      updateCashInflows({
        launchTiming: {
          ...cashInflows.launchTiming,
          [field]: value,
        },
      });
      return;
    }
  };

  const validatePercentRange = (
    value: number,
    min: number,
    max: number,
    field: string,
    label: string,
    newErrors: Errors
  ) => {
    if (value < min || value > max || Number.isNaN(value)) {
      newErrors[field] = `${label} must be between ${min}% and ${max}%.`;
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Errors = {};

    // Step 1: Saleable BUA Ratio
    if (step === 0) {
      validatePercentRange(
        cashInflows.saleableBUARatio,
        10,
        100,
        "saleableBUARatio",
        "Saleable BUA ratio",
        newErrors
      );
    }

    // Step 2: Sales Price
    if (step === 1) {
      if (cashInflows.salesPrice <= 0) {
        newErrors.salesPrice =
          "Average sales price per sqft must be greater than 0.";
      }
    }

    // Step 3: Cash payment plan
    if (step === 2) {
        validatePercentRange(
          cashInflows.paymentPlans.cashDownPaymentPercent,
          0,
          100,
          "cashDownPaymentPercent",
          "Cash buyer down payment",
          newErrors
        );
        validatePercentRange(
          cashInflows.paymentPlans.cashOnHandoverPercent,
          0,
          100,
          "cashOnHandoverPercent",
          "Cash buyer on-handover share",
          newErrors
        );
        validatePercentRange(
          cashInflows.paymentPlans.cashDuringConstructionPercent,
          0,
          100,
          "cashDuringConstructionPercent",
          "Cash buyer during-construction share",
          newErrors
        );

        const sumCashPlan =
          cashInflows.paymentPlans.cashDownPaymentPercent +
          cashInflows.paymentPlans.cashOnHandoverPercent +
          cashInflows.paymentPlans.cashDuringConstructionPercent;
        if (Math.round(sumCashPlan) !== 100) {
          newErrors.cashPlan =
            "Cash buyer payment plan must sum to 100% of unit value.";
        }
    }

    // Step 4: Mortgage payment plan
    if (step === 3) {
        validatePercentRange(
          cashInflows.paymentPlans.mortgageDownPaymentPercent,
          0,
          100,
          "mortgageDownPaymentPercent",
          "Mortgage down payment",
          newErrors
        );
        validatePercentRange(
          cashInflows.paymentPlans.mortgageLtvPercent,
          0,
          100,
          "mortgageLtvPercent",
          "Mortgage LTV",
          newErrors
        );
        if (cashInflows.paymentPlans.mortgageTenorYears <= 0) {
          newErrors.mortgageTenorYears =
            "Mortgage tenor must be greater than 0 years.";
        }
        if (cashInflows.paymentPlans.mortgageRatePercent < 0) {
          newErrors.mortgageRatePercent =
            "Mortgage interest rate cannot be negative.";
        }
    }

    // Step 5: Sales Uptake
    if (step === 4) {
        if (cashInflows.salesUptake.mode === "manual") {
          if (!cashInflows.salesUptake.manualCsv.trim()) {
            newErrors.manualSalesUptakeCsv =
              "Please provide a CSV of monthly sales uptake percentages.";
          }
        }
    }

    // Step 6: Buyer Mix & Deductions
    if (step === 5) {
        validatePercentRange(
          cashInflows.buyerMix.cashBuyerPercent,
          0,
          100,
          "cashBuyerPercent",
          "Cash buyer share",
          newErrors
        );
        validatePercentRange(
          cashInflows.buyerMix.mortgageBuyerPercent,
          0,
          100,
          "mortgageBuyerPercent",
          "Mortgage buyer share",
          newErrors
        );
        const mix =
          cashInflows.buyerMix.cashBuyerPercent +
          cashInflows.buyerMix.mortgageBuyerPercent;
        if (Math.round(mix) !== 100) {
          newErrors.buyerMix =
            "Cash + Mortgage buyer mix must sum to 100%.";
        }
        validatePercentRange(
          cashInflows.buyerMix.brokerCommissionPercent,
          0,
          10,
          "brokerCommissionPercent",
          "Broker / agent commission",
          newErrors
        );
        validatePercentRange(
          cashInflows.buyerMix.vatPercent,
          0,
          10,
          "vatPercent",
          "VAT on sales",
          newErrors
        );
        validatePercentRange(
          cashInflows.buyerMix.escrowFeePercent,
          0,
          5,
          "escrowFeePercent",
          "Escrow / collection fees",
          newErrors
        );
        validatePercentRange(
          cashInflows.buyerMix.salesDiscountPercent,
          0,
          20,
          "salesDiscountPercent",
          "Sales discount",
          newErrors
        );
    }

    // Step 7: Default & Bulk Sales
    if (step === 6) {
        validatePercentRange(
          cashInflows.defaultRate,
          0,
          20,
          "defaultRatePercent",
          "Default rate",
          newErrors
        );
        validatePercentRange(
          cashInflows.bulkSales.bulkSalesSharePercent,
          0,
          80,
          "bulkSalesSharePercent",
          "Bulk sales share",
          newErrors
        );
        validatePercentRange(
          cashInflows.bulkSales.bulkSalesDiscountPercent,
          0,
          40,
          "bulkSalesDiscountPercent",
          "Bulk sales discount",
          newErrors
        );
    }

    // Step 8: Launch timing
    if (step === 7) {
        if (cashInflows.launchTiming.launchMonthOffset < 0) {
          newErrors.launchMonthOffset =
            "Launch month offset cannot be negative.";
        }
        validatePercentRange(
          cashInflows.launchTiming.preLaunchSalesPercent,
          0,
          50,
          "preLaunchSalesPercent",
          "Pre-launch sales",
          newErrors
        );
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    const isValid = validateStep(currentStep);
    if (!isValid) return;

    // Last step => Generate Model
    if (currentStep === totalSteps - 1) {
      // Very simplified derived inflows
      const totalSaleableBUA =
        cashOutflows.buildingBUA * (cashInflows.saleableBUARatio / 100);
      const grossSales =
        totalSaleableBUA * cashInflows.salesPrice;

      const deductionsPercent =
        cashInflows.buyerMix.brokerCommissionPercent +
        cashInflows.buyerMix.vatPercent +
        cashInflows.buyerMix.escrowFeePercent +
        cashInflows.buyerMix.salesDiscountPercent +
        cashInflows.defaultRate +
        (cashInflows.bulkSales.bulkSalesSharePercent *
          cashInflows.bulkSales.bulkSalesDiscountPercent) /
          100;

      const effectiveDeductionPct = Math.max(0, deductionsPercent);
      const netProceeds =
        grossSales * (1 - effectiveDeductionPct / 100);

      // Dynamic sales timeline (no negative months):
      // - M0 includes ALL pre-launch sales (lumped)
      // - M1..M{constructionPeriod} = construction period
      // - M{constructionPeriod+1}..M{constructionPeriod+postCompletionBuffer} = post-completion buffer
      const constructionPeriod = cashOutflows.constructionPeriod || 30;
      const postCompletionBufferMonths = 6;
      const timelineMonths = constructionPeriod + postCompletionBufferMonths; // months after M0

      // We distribute post-M0 proceeds over months 1..timelineMonths
      const months = Math.max(1, timelineMonths);
      const weights: number[] = [];
      if (cashInflows.salesUptake.mode === "manual") {
        const parts = cashInflows.salesUptake.manualCsv
          .split(",")
          .map((p) => Number(p.trim()))
          .filter((n) => !Number.isNaN(n) && n > 0);
        const sum = parts.reduce((s, n) => s + n, 0) || 1;
        for (let i = 0; i < months; i++) {
          const idx = i < parts.length ? i : parts.length - 1;
          weights.push(parts[idx] / sum);
        }
      } else {
        for (let i = 0; i < months; i++) {
          let w = 1;
          if (cashInflows.salesUptake.preset === "front_loaded") {
            w = months - i;
          } else if (cashInflows.salesUptake.preset === "back_loaded") {
            w = i + 1;
          }
          weights.push(w);
        }
        const sum = weights.reduce((s, n) => s + n, 0) || 1;
        for (let i = 0; i < months; i++) {
          weights[i] = weights[i] / sum;
        }
      }

      const preLaunchPct = Math.max(
        0,
        Math.min(100, cashInflows.launchTiming.preLaunchSalesPercent || 0)
      );
      const preLaunchAmount = netProceeds * (preLaunchPct / 100);
      const remainingProceeds = Math.max(0, netProceeds - preLaunchAmount);

      const schedule = [
        { month: 0, amount: preLaunchAmount },
        ...weights.map((w, i) => ({
          month: i + 1,
          amount: remainingProceeds * w,
        })),
      ];

      updateCashInflows({
        grossSales,
        netProceeds,
        monthlyInflowSchedule: schedule,
      });
      router.push(withStreamPrefix(streamPrefix, "/preview/cash-inflows"));
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1));
  };

  const handleBack = () => {
    if (currentStep === 0) {
      router.push(withStreamPrefix(streamPrefix, "/preview/cash-outflows"));
    } else {
      // Steps 2-8: Go to previous step within Component 2
      setCurrentStep((prev) => prev - 1);
      setErrors({});
    }
  };

  const fieldError = (name: string) => errors[name];

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12 pb-32">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            FinModel App — Component 2
          </h1>
          <p className="text-slate-400">Cash Inflows Model (Sale Development)</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>
              Step {currentStep + 1} of {totalSteps}
            </span>
            <span>
              {Math.round(((currentStep + 1) / totalSteps) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

          {/* Step Content */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 space-y-8">
          {/* Saleable BUA Ratio */}
          {currentStep === 0 && (
            <div>
              <h2 className="mb-6 text-xl font-semibold text-white">
                Saleable BUA Ratio
              </h2>
              <p className="mb-4 text-sm text-slate-400">
                Define the proportion of total built-up area (BUA) that is saleable
                (net saleable vs. common areas, plant rooms, etc.).
              </p>
              <div className="max-w-sm space-y-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Saleable BUA Ratio (% of total BUA)
                </label>
                <input
                  type="number"
                  value={cashInflows.saleableBUARatio}
                  onChange={(e) =>
                    updateFormData(
                      "saleableBUARatio",
                      Number(e.target.value) || 0
                    )
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {fieldError("saleableBUARatio") && (
                  <p className="mt-1 text-sm text-red-400">
                    {fieldError("saleableBUARatio")}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Typical residential/office projects range from 70–90% saleable BUA
                  depending on corridor and core efficiency.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Sales Price per sqft */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">
                Average Sales Price
              </h2>
              <p className="text-sm text-slate-400 mb-4">
                Set the blended average sales price per sqft for saleable units.
              </p>
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <div className="max-w-sm space-y-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Average Sales Price ({projectInfo.currency}/sqft)
                  </label>
                  <input
                    type="number"
                    value={cashInflows.salesPrice}
                    onChange={(e) =>
                      updateFormData(
                        "salesPrice",
                        Number(e.target.value) || 0
                      )
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {fieldError("averagePricePerSqft") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("averagePricePerSqft")}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    Use a weighted average across unit mixes (studios, 1BR, 2BR, etc.).
                  </p>
                </div>

                {/* Unadjusted / gross sales revenue preview */}
                <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Unadjusted Sales Revenue (Gross)
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Based on total building BUA from Component 1, saleable BUA ratio, and
                    this average sales price. Deductions (VAT, commissions, defaults) are
                    applied in later steps.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-400">
                    <div>
                      <p className="font-medium text-slate-300">
                        Total Building BUA
                      </p>
                      <p className="mt-1 text-sm font-semibold text-emerald-400">
                        {cashOutflows.buildingBUA.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}{" "}
                        sqft
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-300">
                        Saleable BUA
                      </p>
                      <p className="mt-1 text-sm font-semibold text-emerald-400">
                        {(
                          cashOutflows.buildingBUA *
                          (cashInflows.saleableBUARatio / 100)
                        ).toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}{" "}
                        sqft
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-slate-800 pt-3">
                    <p className="text-xs font-medium text-slate-300">
                      Gross Sales Revenue (before deductions)
                    </p>
                    <p className="mt-1 text-lg font-semibold text-emerald-400">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: projectInfo.currency || "AED",
                        maximumFractionDigits: 0,
                      }).format(
                        cashOutflows.buildingBUA *
                          (cashInflows.saleableBUARatio / 100) *
                          cashInflows.salesPrice
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Payment Plan (Cash Buyers) */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">
                Payment Plan — Cash Buyers
              </h2>
              <p className="text-sm text-slate-400 mb-4">
                Define the payment structure for cash buyers. Percentages must sum
                to 100% of gross sales value.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Down Payment (%)
                  </label>
                  <input
                    type="number"
                    value={cashInflows.paymentPlans.cashDownPaymentPercent}
                    onChange={(e) =>
                      updateFormData(
                        "cashDownPaymentPercent",
                        Number(e.target.value) || 0
                      )
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {fieldError("cashDownPaymentPercent") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("cashDownPaymentPercent")}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    During Construction (%)
                  </label>
                  <input
                    type="number"
                    value={cashInflows.paymentPlans.cashDuringConstructionPercent}
                    onChange={(e) =>
                      updateFormData(
                        "cashDuringConstructionPercent",
                        Number(e.target.value) || 0
                      )
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {fieldError("cashDuringConstructionPercent") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("cashDuringConstructionPercent")}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    On Handover (%)
                  </label>
                  <input
                    type="number"
                    value={cashInflows.paymentPlans.cashOnHandoverPercent}
                    onChange={(e) =>
                      updateFormData(
                        "cashOnHandoverPercent",
                        Number(e.target.value) || 0
                      )
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {fieldError("cashOnHandoverPercent") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("cashOnHandoverPercent")}
                    </p>
                  )}
                </div>
              </div>
              {fieldError("cashPlan") && (
                <p className="mt-3 text-sm text-red-400">
                  {fieldError("cashPlan")}
                </p>
              )}
            </div>
          )}

          {/* Step 4: Payment Plan (Mortgage Buyers) */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">
                Payment Plan — Mortgage Buyers
              </h2>
              <p className="text-sm text-slate-400 mb-4">
                Define the down payment and mortgage assumptions for leveraged buyers.
              </p>
              <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-white">
                  Buyer Down Payment (Direct to Developer)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">
                      Total Down Payment Amount
                    </label>
                    <input
                      type="number"
                      value={cashInflows.buyerDownPayment ?? 0}
                      onChange={(e) =>
                        updateCashInflows({
                          buyerDownPayment: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="e.g., 2000000"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      If left 0, preview falls back to % assumptions.
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">
                      Received Over (Months)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={cashInflows.downPaymentMonths?.length ?? 3}
                      onChange={(e) => {
                        const n = Math.max(1, Math.round(Number(e.target.value) || 1));
                        updateCashInflows({
                          downPaymentMonths: Array.from({ length: n }, (_, i) => i),
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="mt-1 text-xs text-slate-500">Typically M0–M2 (3 months).</p>
                  </div>
                </div>
                <div className="mt-4 rounded border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <p className="text-xs text-emerald-300">
                    Treatment: down payment is 100% direct to developer (not escrowed).
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Buyer Down Payment (% of unit price)
                    </label>
                    <input
                      type="number"
                    value={cashInflows.paymentPlans.mortgageDownPaymentPercent}
                      onChange={(e) =>
                        updateFormData(
                          "mortgageDownPaymentPercent",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {fieldError("mortgageDownPaymentPercent") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("mortgageDownPaymentPercent")}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      LTV (% of value financed)
                    </label>
                    <input
                      type="number"
                    value={cashInflows.paymentPlans.mortgageLtvPercent}
                      onChange={(e) =>
                        updateFormData(
                          "mortgageLtvPercent",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {fieldError("mortgageLtvPercent") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("mortgageLtvPercent")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Mortgage Tenor (years)
                    </label>
                    <input
                      type="number"
                    value={cashInflows.paymentPlans.mortgageTenorYears}
                      onChange={(e) =>
                        updateFormData(
                          "mortgageTenorYears",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {fieldError("mortgageTenorYears") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("mortgageTenorYears")}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Mortgage Rate (% p.a.)
                    </label>
                    <input
                      type="number"
                    value={cashInflows.paymentPlans.mortgageRatePercent}
                      onChange={(e) =>
                        updateFormData(
                          "mortgageRatePercent",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {fieldError("mortgageRatePercent") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("mortgageRatePercent")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sales Uptake Schedule */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">
                Sales Uptake Schedule
              </h2>
              <p className="text-sm text-slate-400 mb-4">
                Choose a preset sales curve or provide a custom monthly uptake profile.
              </p>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => updateFormData("salesUptakeMode", "preset")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                      cashInflows.salesUptake.mode === "preset"
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                        : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    Preset curve
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFormData("salesUptakeMode", "manual")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border ${
                      cashInflows.salesUptake.mode === "manual"
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                        : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    Manual monthly profile
                  </button>
                </div>

                {cashInflows.salesUptake.mode === "preset" && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Preset Sales Curve
                    </label>
                    <select
                      value={cashInflows.salesUptake.preset}
                      onChange={(e) =>
                        updateFormData(
                          "salesUptakePreset",
                          e.target.value as PaymentPlanPreset
                        )
                      }
                      className="w-full max-w-sm px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="front_loaded">
                        Front-loaded (strong launch / early sales)
                      </option>
                      <option value="even">Even over sales period</option>
                      <option value="back_loaded">
                        Back-loaded (slower start, stronger finish)
                      </option>
                    </select>
                    <p className="text-xs text-slate-500">
                      These presets will be translated into monthly curves in the
                      underlying Excel / engine.
                    </p>
                  </div>
                )}

                {cashInflows.salesUptake.mode === "manual" && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Manual Monthly Uptake (% of total sales per month)
                    </label>
                    <textarea
                      rows={4}
                      value={cashInflows.salesUptake.manualCsv}
                      onChange={(e) =>
                        updateFormData("manualSalesUptakeCsv", e.target.value)
                      }
                      placeholder="Example: 5, 8, 10, 10, 10, 8, 7, 6, 5, 4, 3, 2 (must sum to ~100%)"
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {fieldError("manualSalesUptakeCsv") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("manualSalesUptakeCsv")}
                      </p>
                    )}
                    <p className="text-xs text-slate-500">
                      Enter a comma-separated list of monthly percentages. They do not
                      need to sum exactly to 100% — we will normalize them.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Buyer Mix & Deductions */}
          {currentStep === 5 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">
                Buyer Mix & Deductions
              </h2>
              <p className="text-sm text-slate-400 mb-4">
                Define the mix between cash and mortgage buyers, and headline
                deductions from gross sales (agent commission, VAT, escrow fees, discounts).
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200">
                    Buyer Mix
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Cash Buyers (% of units)
                    </label>
                    <input
                      type="number"
                      value={cashInflows.buyerMix.cashBuyerPercent}
                      onChange={(e) =>
                        updateFormData(
                          "cashBuyerPercent",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {fieldError("cashBuyerPercent") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("cashBuyerPercent")}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Mortgage Buyers (% of units)
                    </label>
                    <input
                      type="number"
                      value={cashInflows.buyerMix.mortgageBuyerPercent}
                      onChange={(e) =>
                        updateFormData(
                          "mortgageBuyerPercent",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {fieldError("mortgageBuyerPercent") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("mortgageBuyerPercent")}
                      </p>
                    )}
                  </div>
                  {fieldError("buyerMix") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("buyerMix")}
                    </p>
                  )}
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-200">
                    Deductions
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Agent / Broker Commission (% of GV)
                    </label>
                    <input
                      type="number"
                      value={cashInflows.buyerMix.brokerCommissionPercent}
                      onChange={(e) =>
                        updateFormData(
                          "brokerCommissionPercent",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {fieldError("brokerCommissionPercent") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("brokerCommissionPercent")}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      VAT on Sales (% of GV)
                    </label>
                    <input
                      type="number"
                      value={cashInflows.buyerMix.vatPercent}
                      onChange={(e) =>
                        updateFormData(
                          "vatPercent",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {fieldError("vatPercent") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("vatPercent")}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Escrow / Collection Fees (% of GV)
                    </label>
                    <input
                      type="number"
                      value={cashInflows.buyerMix.escrowFeePercent}
                      onChange={(e) =>
                        updateFormData(
                          "escrowFeePercent",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {fieldError("escrowFeePercent") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("escrowFeePercent")}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Average Sales Discount (% of list price)
                    </label>
                    <input
                      type="number"
                      value={cashInflows.buyerMix.salesDiscountPercent}
                      onChange={(e) =>
                        updateFormData(
                          "salesDiscountPercent",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {fieldError("salesDiscountPercent") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("salesDiscountPercent")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Default Rate & Bulk Sales */}
          {currentStep === 6 && (
            <div>
              <h2 className="text-xl font-semibold text-white mb-6">
                Default Rate & Bulk Sales
              </h2>
              <p className="text-sm text-slate-400 mb-4">
                Capture expected buyer defaults and bulk / institutional sales.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Default Rate (% of gross sales)
                  </label>
                  <input
                    type="number"
                    value={cashInflows.defaultRate}
                    onChange={(e) =>
                      updateFormData(
                        "defaultRatePercent",
                        Number(e.target.value) || 0
                      )
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {fieldError("defaultRatePercent") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("defaultRatePercent")}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Bulk Sales Share (% of units)
                  </label>
                  <input
                    type="number"
                    value={cashInflows.bulkSales.bulkSalesSharePercent}
                    onChange={(e) =>
                      updateFormData(
                        "bulkSalesSharePercent",
                        Number(e.target.value) || 0
                      )
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {fieldError("bulkSalesSharePercent") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("bulkSalesSharePercent")}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Bulk Sales Discount (% off list)
                  </label>
                  <input
                    type="number"
                    value={cashInflows.bulkSales.bulkSalesDiscountPercent}
                    onChange={(e) =>
                      updateFormData(
                        "bulkSalesDiscountPercent",
                        Number(e.target.value) || 0
                      )
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {fieldError("bulkSalesDiscountPercent") && (
                    <p className="mt-1 text-sm text-red-400">
                      {fieldError("bulkSalesDiscountPercent")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sales Launch Timing + Summary */}
          {currentStep === 7 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-white mb-6">
                  Sales Launch Timing
                </h2>
                <p className="text-sm text-slate-400 mb-4">
                  Choose when sales begin relative to construction, and how much is
                  expected to be sold in pre-launch.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Sales Launch (months before construction start)
                    </label>
                    <input
                      type="number"
                      value={cashInflows.launchTiming.launchMonthOffset}
                      onChange={(e) =>
                        updateFormData(
                          "launchMonthOffset",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {fieldError("launchMonthOffset") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("launchMonthOffset")}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      For GCC off-plan projects, launches often occur up to 6–12 months
                      before or around construction start.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Pre-launch Sales (% of total)
                    </label>
                    <input
                      type="number"
                      value={cashInflows.launchTiming.preLaunchSalesPercent}
                      onChange={(e) =>
                        updateFormData(
                          "preLaunchSalesPercent",
                          Number(e.target.value) || 0
                        )
                      }
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    {fieldError("preLaunchSalesPercent") && (
                      <p className="mt-1 text-sm text-red-400">
                        {fieldError("preLaunchSalesPercent")}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      Used to model reservation/EOI collections before full launch.
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="border-t border-slate-800 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Summary: Cash Inflows (Sale Assets)
                </h3>

                {/* Net proceeds reconciliation */}
                <div className="mb-6 rounded-lg border border-slate-700 bg-slate-900/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Gross to Net Proceeds Reconciliation
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    This shows how gross sales are adjusted for discounts, commissions,
                    VAT, defaults and bulk sales to arrive at net developer proceeds.
                  </p>
                  <div className="mt-3 space-y-1 text-sm text-slate-300">
                    <p>
                      <span className="text-slate-400">Gross Sales (unadjusted):</span>{" "}
                      <span className="font-semibold text-emerald-400">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: projectInfo.currency || "AED",
                          maximumFractionDigits: 0,
                        }).format(grossSalesLive || 0)}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">
                        Less Discounts & Deductions:
                      </span>{" "}
                      <span className="font-semibold text-amber-400">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: projectInfo.currency || "AED",
                          maximumFractionDigits: 0,
                        }).format(
                          totalDeductionsLive || 0
                        )}
                      </span>
                    </p>
                    <p>
                      <span className="text-slate-400">Net Proceeds:</span>{" "}
                      <span className="font-semibold text-emerald-400">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: projectInfo.currency || "AED",
                          maximumFractionDigits: 0,
                        }).format(netProceedsLive || 0)}
                      </span>
                    </p>
                  </div>

                  {/* Detailed deduction breakdown */}
                  <div className="mt-4 grid gap-3 text-xs text-slate-400 md:grid-cols-2">
                    <div className="space-y-1">
                      <p>
                        <span className="text-slate-500">Broker Commission:</span>{" "}
                        <span className="font-semibold text-amber-300">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: projectInfo.currency || "AED",
                            maximumFractionDigits: 0,
                          }).format(brokerCommissionAmount || 0)}
                        </span>
                      </p>
                      <p>
                        <span className="text-slate-500">VAT:</span>{" "}
                        <span className="font-semibold text-amber-300">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: projectInfo.currency || "AED",
                            maximumFractionDigits: 0,
                          }).format(vatAmount || 0)}
                        </span>
                      </p>
                      <p>
                        <span className="text-slate-500">Escrow Fees:</span>{" "}
                        <span className="font-semibold text-amber-300">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: projectInfo.currency || "AED",
                            maximumFractionDigits: 0,
                          }).format(escrowFeeAmount || 0)}
                        </span>
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p>
                        <span className="text-slate-500">Sales Discounts:</span>{" "}
                        <span className="font-semibold text-amber-300">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: projectInfo.currency || "AED",
                            maximumFractionDigits: 0,
                          }).format(salesDiscountAmount || 0)}
                        </span>
                      </p>
                      <p>
                        <span className="text-slate-500">Defaults:</span>{" "}
                        <span className="font-semibold text-amber-300">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: projectInfo.currency || "AED",
                            maximumFractionDigits: 0,
                          }).format(defaultRateAmount || 0)}
                        </span>
                      </p>
                      <p>
                        <span className="text-slate-500">Bulk Sales Discount:</span>{" "}
                        <span className="font-semibold text-amber-300">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: projectInfo.currency || "AED",
                            maximumFractionDigits: 0,
                          }).format(bulkSalesDiscountAmount || 0)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-slate-300">
                      <span className="text-slate-400">Path:</span>{" "}
                      Sale Assets (Residential / Office / Retail)
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-400">Saleable BUA Ratio:</span>{" "}
                      {cashInflows.saleableBUARatio}%
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-400">
                        Average Price:
                      </span>{" "}
                      {cashInflows.salesPrice.toLocaleString()}{" "}
                      {projectInfo.currency}/sqft
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-400">Buyer Mix:</span>{" "}
                      {cashInflows.buyerMix.cashBuyerPercent}% cash /{" "}
                      {cashInflows.buyerMix.mortgageBuyerPercent}% mortgage
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-400">Launch Offset:</span>{" "}
                      {cashInflows.launchTiming.launchMonthOffset} months (pre-launch{" "}
                      {cashInflows.launchTiming.preLaunchSalesPercent}%)
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-300">
                      <span className="text-slate-400">
                        Cash Plan (Down / During / Handover):
                      </span>{" "}
                      {cashInflows.paymentPlans.cashDownPaymentPercent}% /{" "}
                      {cashInflows.paymentPlans.cashDuringConstructionPercent}% /{" "}
                      {cashInflows.paymentPlans.cashOnHandoverPercent}%
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-400">
                        Mortgage (LTV / Rate / Tenor):
                      </span>{" "}
                      {cashInflows.paymentPlans.mortgageLtvPercent}% /{" "}
                      {cashInflows.paymentPlans.mortgageRatePercent}% p.a. /{" "}
                      {cashInflows.paymentPlans.mortgageTenorYears} years
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-400">
                        Deductions:
                      </span>{" "}
                      {cashInflows.buyerMix.brokerCommissionPercent}% commission,{" "}
                      {cashInflows.buyerMix.vatPercent}% VAT,{" "}
                      {cashInflows.buyerMix.escrowFeePercent}% escrow,{" "}
                      {cashInflows.buyerMix.salesDiscountPercent}% discount
                    </p>
                    <p className="text-slate-300">
                      <span className="text-slate-400">
                        Default & Bulk:
                      </span>{" "}
                      {cashInflows.defaultRate}% default,{" "}
                      {cashInflows.bulkSales.bulkSalesSharePercent}% bulk @{" "}
                      {cashInflows.bulkSales.bulkSalesDiscountPercent}% discount
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <PreviewFloatingBar
        showDownload={false}
        onPreviousClick={handleBack}
        onNextClick={handleNext}
        nextLabel={
          currentStep === totalSteps - 1 ? "Generate Model →" : "Next →"
        }
      />
    </div>
  );
}

